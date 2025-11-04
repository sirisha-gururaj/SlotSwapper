const router = require('express').Router();
const db = require('../database.js');
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
    db.serialize(() => {
      // 2a. Create the SwapRequest record
      const sqlInsertRequest = `
        INSERT INTO SwapRequests (requesterSlotId, receiverSlotId, status) 
        VALUES (?, ?, 'PENDING')
      `;
      db.run(sqlInsertRequest, [mySlotId, theirSlotId], function (err) {
        if (err) {
          return res.status(500).json({ error: "Failed to create swap request." });
        }
        
        const swapRequestId = this.lastID;

        // 2b. Update both slots to 'SWAP_PENDING'
        const sqlUpdateEvents = "UPDATE Events SET status = 'SWAP_PENDING' WHERE id = ? OR id = ?";
        db.run(sqlUpdateEvents, [mySlotId, theirSlotId], function (err) {
          if (err) {
            // This is tricky, we'd ideally roll back. But for now, send error.
            return res.status(500).json({ error: "Failed to lock slots." });
          }
          
          res.status(201).json({
            message: "Swap request submitted successfully!",
            swapRequestId: swapRequestId,
            status: 'PENDING'
          });
        });
      });
    });

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

    // --- 1. Validation Checks ---
    
    // Find the swap request
    const swapReq = await new Promise((r) => db.get("SELECT * FROM SwapRequests WHERE id = ?", [requestId], (_, row) => r(row)));
    if (!swapReq) {
      return res.status(404).json({ error: "Swap request not found." });
    }

    // Check if it's already been handled
    if (swapReq.status !== 'PENDING') {
      return res.status(400).json({ error: "This swap request has already been handled." });
    }

    // Find the slots involved
    const receiverSlot = await new Promise((r) => db.get("SELECT * FROM Events WHERE id = ?", [swapReq.receiverSlotId], (_, row) => r(row)));
    const requesterSlot = await new Promise((r) => db.get("SELECT * FROM Events WHERE id = ?", [swapReq.requesterSlotId], (_, row) => r(row)));

    // Check if the current user is the correct person to respond
    if (receiverSlot.userId !== responderId) {
      return res.status(403).json({ error: "Forbidden. You are not the receiver of this swap request." });
    }

    // --- 2. Process the response ---

    db.serialize(() => {
      if (acceptance === false) {
        // --- 2a. Handle REJECTION ---
        
        // 1. Update SwapRequest to REJECTED
        db.run("UPDATE SwapRequests SET status = 'REJECTED' WHERE id = ?", [requestId]);
        
        // 2. Unlock both slots, set them back to SWAPPABLE
        db.run("UPDATE Events SET status = 'SWAPPABLE' WHERE id = ? OR id = ?", [receiverSlot.id, requesterSlot.id]);
        
        res.status(200).json({ message: "Swap request rejected." });

      } else {
        // --- 2b. Handle ACCEPTANCE (The core logic) ---
        
        // 1. Update SwapRequest to ACCEPTED
        db.run("UPDATE SwapRequests SET status = 'ACCEPTED' WHERE id = ?", [requestId]);

        // 2. SWAP the owners (userId) of the two events
        db.run("UPDATE Events SET userId = ? WHERE id = ?", [requesterSlot.userId, receiverSlot.id]);
        db.run("UPDATE Events SET userId = ? WHERE id = ?", [receiverSlot.userId, requesterSlot.id]);

        // 3. Set both events' status back to 'BUSY'
        db.run("UPDATE Events SET status = 'BUSY' WHERE id = ? OR id = ?", [receiverSlot.id, requesterSlot.id]);

        res.status(200).json({ message: "Swap accepted! Your calendars have been updated." });
      }
    });

  } catch (err) {
    res.status(500).json({ error: "Server error responding to swap." });
  }
});


module.exports = router;