const router = require('express').Router();
const { db } = require('../database.js');
const authMiddleware = require('../middleware/authMiddleware.js');

// All routes in this file are protected
router.use(authMiddleware);

// ===========================================
//  1. GET ALL SWAPPABLE SLOTS (The "Marketplace")
//  Endpoint: GET /api/swap/swappable-slots
// ===========================================
router.get('/swappable-slots', async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // We need to find all events that are "SWAPPABLE"
    // AND do NOT belong to the current user.
    // We also "JOIN" with the Users table to get the owner's name.
    const sql = `
      SELECT E.*, U.name as ownerName
      FROM Events E
      JOIN Users U ON E.userId = U.id
      WHERE E.status = 'SWAPPABLE' AND E.userId != ?
    `;

    const slots = await new Promise((resolve, reject) => {
      db.all(sql, [currentUserId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    res.status(200).json(slots);

  } catch (err) {
    res.status(500).json({ error: "Server error fetching swappable slots." });
  }
});

// ===========================================
//  2. CREATE A NEW SWAP REQUEST
//  Endpoint: POST /api/swap/request
// ===========================================
router.post('/request', async (req, res) => {
  try {
    const { mySlotId, theirSlotId } = req.body;
    const requesterId = req.user.id;

    // --- 1. Validation Checks ---
    if (!mySlotId || !theirSlotId) {
      return res.status(400).json({ error: "Both mySlotId and theirSlotId are required." });
    }

    // Get info for *my* slot
    const mySlot = await new Promise((r) => db.get("SELECT * FROM Events WHERE id = ?", [mySlotId], (_, row) => r(row)));
    // Get info for *their* slot
    const theirSlot = await new Promise((r) => db.get("SELECT * FROM Events WHERE id = ?", [theirSlotId], (_, row) => r(row)));

    if (!mySlot || !theirSlot) {
      return res.status(404).json({ error: "One or both slots not found." });
    }

    // Check ownership
    if (mySlot.userId !== requesterId) {
      return res.status(403).json({ error: "You do not own the slot you are offering." });
    }
    if (theirSlot.userId === requesterId) {
      return res.status(400).json({ error: "You cannot swap with yourself." });
    }

    // Check status
    if (mySlot.status !== 'SWAPPABLE' || theirSlot.status !== 'SWAPPABLE') {
      return res.status(400).json({ error: "One or both slots are not currently swappable." });
    }

    // --- 2. All checks passed. Create the request and lock the slots. ---
    
    // We use db.serialize to run these commands in order, like a transaction
    // Helper function to promisify db.run
    const runDb = (sql, params) => new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        resolve(this);
      });
    });

    if (acceptance === false) {
      // --- 2a. Handle REJECTION ---
      
      // We now 'await' each step so they happen in order
      await runDb("UPDATE SwapRequests SET status = 'REJECTED' WHERE id = ?", [requestId]);
      await runDb("UPDATE Events SET status = 'SWAPPABLE' WHERE id = ? OR id = ?", [receiverSlot.id, requesterSlot.id]);
      
      const sendNotification = req.app.get('sendNotification');
      const requesterUserId = requesterSlot.userId;
      sendNotification(requesterUserId, { type: 'REQUEST_RESPONSE', status: 'REJECTED' });
      
      res.status(200).json({ message: "Swap request rejected." });

    } else {
      // --- 2b. Handle ACCEPTANCE (The core logic) ---
      
      await runDb("UPDATE SwapRequests SET status = 'ACCEPTED' WHERE id = ?", [requestId]);
      await runDb("UPDATE Events SET userId = ? WHERE id = ?", [requesterSlot.userId, receiverSlot.id]);
      await runDb("UPDATE Events SET userId = ? WHERE id = ?", [receiverSlot.userId, requesterSlot.id]);
      await runDb("UPDATE Events SET status = 'BUSY' WHERE id = ? OR id = ?", [receiverSlot.id, requesterSlot.id]);

      const sendNotification = req.app.get('sendNotification');
      const requesterUserId = requesterSlot.userId;
      sendNotification(requesterUserId, { type: 'REQUEST_RESPONSE', status: 'ACCEPTED' });
      
      res.status(200).json({ message: "Swap accepted! Your calendars have been updated." });
    }

  } catch (err) {
    res.status(500).json({ error: "Server error requesting swap." });
  }
});

// ===========================================
//  3. RESPOND TO A SWAP REQUEST (Accept / Reject)
//  Endpoint: POST /api/swap/response/:requestId
// ===========================================
router.post('/response/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { acceptance } = req.body; // true or false
    const responderId = req.user.id;

    // --- 1. PROMISIFIED DB HELPERS ---
    // We define these helpers here to 'await' our database calls
    const getDb = (sql, params) => new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    
    const runDb = (sql, params) => new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        resolve(this);
      });
    });

    // --- 2. Validation Checks (Now correctly awaited) ---
    
    // Find the swap request
    const swapReq = await getDb("SELECT * FROM SwapRequests WHERE id = ?", [requestId]);
    if (!swapReq) {
      return res.status(404).json({ error: "Swap request not found." });
    }

    // Check if it's already been handled
    if (swapReq.status !== 'PENDING') {
      return res.status(400).json({ error: "This swap request has already been handled." });
    }

    // Find the slots involved
    const receiverSlot = await getDb("SELECT * FROM Events WHERE id = ?", [swapReq.receiverSlotId]);
    const requesterSlot = await getDb("SELECT * FROM Events WHERE id = ?", [swapReq.requesterSlotId]);
    
    // Check if slots were found (e.g., not deleted)
    if (!receiverSlot || !requesterSlot) {
      return res.status(404).json({ error: "One of the events in this swap no longer exists." });
    }

    // Check if the current user is the correct person to respond
    if (receiverSlot.userId !== responderId) {
      return res.status(403).json({ error: "Forbidden. You are not the receiver of this swap request." });
    }

    // --- 3. Process the response (Now correctly awaited) ---

    if (acceptance === false) {
      // --- 3a. Handle REJECTION ---
      
      await runDb("UPDATE SwapRequests SET status = 'REJECTED' WHERE id = ?", [requestId]);
      await runDb("UPDATE Events SET status = 'SWAPPABLE' WHERE id = ? OR id = ?", [receiverSlot.id, requesterSlot.id]);
      
      const sendNotification = req.app.get('sendNotification');
      const requesterUserId = requesterSlot.userId;
      sendNotification(requesterUserId, { type: 'REQUEST_RESPONSE', status: 'REJECTED' });
      
      res.status(200).json({ message: "Swap request rejected." });

    } else {
      // --- 3b. Handle ACCEPTANCE (The core logic) ---
      
      await runDb("UPDATE SwapRequests SET status = 'ACCEPTED' WHERE id = ?", [requestId]);
      await runDb("UPDATE Events SET userId = ? WHERE id = ?", [requesterSlot.userId, receiverSlot.id]);
      await runDb("UPDATE Events SET userId = ? WHERE id = ?", [receiverSlot.userId, requesterSlot.id]);
      await runDb("UPDATE Events SET status = 'BUSY' WHERE id = ? OR id = ?", [receiverSlot.id, requesterSlot.id]);

      const sendNotification = req.app.get('sendNotification');
      const requesterUserId = requesterSlot.userId;
      sendNotification(requesterUserId, { type: 'REQUEST_RESPONSE', status: 'ACCEPTED' });
      
      res.status(200).json({ message: "Swap accepted! Your calendars have been updated." });
    }

  } catch (err) {
    // This is what was happening before:
    console.error("Error in swap response:", err);
    res.status(500).json({ error: "Server error responding to swap." });
  }
});
// ===========================================
//  4. GET MY INCOMING SWAP REQUESTS
//  Endpoint: GET /api/swap/requests/incoming
// ===========================================
router.get('/requests/incoming', async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // This query is complex:
    // 1. Find all PENDING SwapRequests.
    // 2. Join Events table to get the 'receiverSlot' info.
    // 3. Check if the 'receiverSlot' (the one I own) belongs to me.
    // 4. Join Events and Users tables again to get the *requester's* slot info and name.
    const sql = `
      SELECT 
        SR.id as swapRequestId,
        ReqSlot.id as requesterSlotId,
        ReqSlot.title as requesterSlotTitle,
        ReqSlot.startTime as requesterSlotStartTime,
        ReqUser.name as requesterName
      FROM SwapRequests SR
      JOIN Events RecSlot ON SR.receiverSlotId = RecSlot.id
      JOIN Events ReqSlot ON SR.requesterSlotId = ReqSlot.id
      JOIN Users ReqUser ON ReqSlot.userId = ReqUser.id
      WHERE 
        RecSlot.userId = ? AND SR.status = 'PENDING'
    `;

    const requests = await new Promise((resolve, reject) => {
      db.all(sql, [currentUserId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    res.status(200).json(requests);

  } catch (err) {
    res.status(500).json({ error: "Server error fetching incoming requests." });
  }
});

// ===========================================
//  5. GET MY OUTGOING SWAP REQUESTS
//  Endpoint: GET /api/swap/requests/outgoing
// ===========================================
router.get('/requests/outgoing', async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // This query is the reverse:
    // 1. Find all PENDING SwapRequests.
    // 2. Join Events table to get the 'requesterSlot' info.
    // 3. Check if the 'requesterSlot' (the one I offered) belongs to me.
    // 4. Join Events and Users tables again to get the *receiver's* slot info and name.
    const sql = `
  SELECT 
    SR.id as swapRequestId,
    SR.status, 
    RecSlot.id as receiverSlotId,
    RecSlot.title as receiverSlotTitle,
    RecSlot.startTime as receiverSlotStartTime,
    RecUser.name as receiverName
  FROM SwapRequests SR
  JOIN Events ReqSlot ON SR.requesterSlotId = ReqSlot.id
  JOIN Events RecSlot ON SR.receiverSlotId = RecSlot.id
  JOIN Users RecUser ON RecSlot.userId = RecUser.id
  WHERE 
    ReqSlot.userId = ? AND (SR.status = 'PENDING' OR SR.status = 'REJECTED' OR SR.status = 'ACCEPTED')
`;

    const requests = await new Promise((resolve, reject) => {
      db.all(sql, [currentUserId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    res.status(200).json(requests);

  } catch (err) {
    res.status(500).json({ error: "Server error fetching outgoing requests." });
  }
});

// ===========================================
//  6. DISMISS A REJECTED/ACCEPTED REQUEST (Deletes it)
//  Endpoint: DELETE /api/swap/request/:requestId
// ===========================================
router.delete('/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user.id;

    // We need to make sure the user owns one of the slots
    const swapReq = await new Promise((r) => db.get("SELECT * FROM SwapRequests WHERE id = ?", [requestId], (_, row) => r(row)));
    const requesterSlot = await new Promise((r) => db.get("SELECT * FROM Events WHERE id = ?", [swapReq.requesterSlotId], (_, row) => r(row)));

    // Only the original requester can dismiss their own outgoing requests
    if (requesterSlot.userId !== currentUserId) {
      return res.status(403).json({ error: "Forbidden. You cannot dismiss this request." });
    }

    // Delete the request
    db.run("DELETE FROM SwapRequests WHERE id = ?", [requestId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json({ message: "Request dismissed." });
    });

  } catch (err) {
    res.status(500).json({ error: "Server error dismissing request." });
  }
});

module.exports = router;
