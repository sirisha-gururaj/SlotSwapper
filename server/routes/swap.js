// src/server/routes/swap.js
const router = require('express').Router();
const { query } = require('../database.js');
const authMiddleware = require('../middleware/authMiddleware.js');

router.use(authMiddleware);

router.get('/swappable-slots', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const sql = `
      SELECT 
        E.*, 
        CASE 
          WHEN U.name IS NOT NULL AND U.name != '' THEN U.name 
          ELSE SPLIT_PART(U.email, '@', 1) 
        END as ownerName
      FROM events E
      JOIN users U ON E."userId" = U.id
      WHERE E.status = 'SWAPPABLE' AND E."userId" != $1
    `;
    const result = await query(sql, [currentUserId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching swappable slots." });
  }
});

router.post('/request', async (req, res) => {
  try {
    const { mySlotId, theirSlotId } = req.body;
    const requesterId = req.user.id;
    if (!mySlotId || !theirSlotId) {
      return res.status(400).json({ error: "Both slot IDs are required." });
    }

    const mySlotRes = await query("SELECT * FROM events WHERE id = $1", [mySlotId]);
    const mySlot = mySlotRes.rows[0];
    const theirSlotRes = await query("SELECT * FROM events WHERE id = $1", [theirSlotId]);
    const theirSlot = theirSlotRes.rows[0];

    if (!mySlot || !theirSlot) {
      return res.status(404).json({ error: "One or both slots not found." });
    }
    if (mySlot.userId !== requesterId) {
      return res.status(403).json({ error: "You do not own the slot you are offering." });
    }
    if (theirSlot.userId === requesterId) {
      return res.status(400).json({ error: "You cannot swap with yourself." });
    }
    if (mySlot.status !== 'SWAPPABLE' || theirSlot.status !== 'SWAPPABLE') {
      return res.status(400).json({ error: "One or both slots are not currently swappable." });
    }

    const sqlInsertRequest = `
      INSERT INTO swaprequests ("requesterSlotId", "receiverSlotId", status) 
      VALUES ($1, $2, 'PENDING')
      RETURNING id
    `;
    const reqResult = await query(sqlInsertRequest, [mySlotId, theirSlotId]);
    const swapRequestId = reqResult.rows[0].id;

    const sqlUpdateEvents = "UPDATE events SET status = 'SWAP_PENDING' WHERE id = $1 OR id = $2";
    await query(sqlUpdateEvents, [mySlotId, theirSlotId]);
    
    const sendNotification = req.app.get('sendNotification');
    sendNotification(theirSlot.userId, { type: 'NEW_REQUEST' });
    const broadcast = req.app.get('broadcast');
    broadcast({ type: 'MARKETPLACE_UPDATE' }, requesterId); // Tell everyone else
    res.status(201).json({
      message: "Swap request submitted successfully!",
      swapRequestId: swapRequestId, status: 'PENDING'
    });
  } catch (err) {
    res.status(500).json({ error: "Server error requesting swap." });
  }
});

router.post('/response/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { acceptance } = req.body;
    const responderId = req.user.id;

    const getDb = (sql, params) => query(sql, params).then(res => res.rows[0]);
    const runDb = (sql, params) => query(sql, params);

    const swapReq = await getDb("SELECT * FROM swaprequests WHERE id = $1", [requestId]);
    if (!swapReq) return res.status(404).json({ error: "Swap request not found." });
    if (swapReq.status !== 'PENDING') return res.status(400).json({ error: "Request already handled." });

    const receiverSlot = await getDb("SELECT * FROM events WHERE id = $1", [swapReq.receiverSlotId]);
    const requesterSlot = await getDb("SELECT * FROM events WHERE id = $1", [swapReq.requesterSlotId]);
    if (!receiverSlot || !requesterSlot) return res.status(404).json({ error: "Event no longer exists." });
    if (receiverSlot.userId !== responderId) return res.status(403).json({ error: "Forbidden." });

    if (acceptance === false) {
      await runDb("UPDATE swaprequests SET status = 'REJECTED' WHERE id = $1", [requestId]);
      await runDb("UPDATE events SET status = 'SWAPPABLE' WHERE id = $1 OR id = $2", [receiverSlot.id, requesterSlot.id]);
      
      const sendNotification = req.app.get('sendNotification');
      sendNotification(requesterSlot.userId, { type: 'REQUEST_RESPONSE', status: 'REJECTED' });
      res.status(200).json({ message: "Swap request rejected." });
      const broadcast = req.app.get('broadcast');
      broadcast({ type: 'MARKETPLACE_UPDATE' }, responderId);
    } else {
      await runDb("UPDATE swaprequests SET status = 'ACCEPTED' WHERE id = $1", [requestId]);
      await runDb('UPDATE events SET "userId" = $1 WHERE id = $2', [requesterSlot.userId, receiverSlot.id]);
      await runDb('UPDATE events SET "userId" = $1 WHERE id = $2', [receiverSlot.userId, requesterSlot.id]);
      await runDb("UPDATE events SET status = 'BUSY' WHERE id = $1 OR id = $2", [receiverSlot.id, requesterSlot.id]);

      const sendNotification = req.app.get('sendNotification');
      sendNotification(requesterSlot.userId, { type: 'REQUEST_RESPONSE', status: 'ACCEPTED' });
      const broadcast = req.app.get('broadcast');
      broadcast({ type: 'MARKETPLACE_UPDATE' }, responderId);
      res.status(200).json({ message: "Swap accepted! Your calendars have been updated." });
    }
  } catch (err) {
    console.error("Error in swap response:", err);
    res.status(500).json({ error: "Server error responding to swap." });
  }
});

router.get('/requests/incoming', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const sql = `
      SELECT 
        SR.id as swapRequestId,
        ReqSlot.id as requesterSlotId,
        ReqSlot.title as requesterSlotTitle,
        ReqSlot."startTime" as requesterSlotStartTime,
        CASE 
          WHEN ReqUser.name IS NOT NULL AND ReqUser.name != '' THEN ReqUser.name 
          ELSE SPLIT_PART(ReqUser.email, '@', 1) 
        END as requesterName
      FROM swaprequests SR
      JOIN events RecSlot ON SR."receiverSlotId" = RecSlot.id
      JOIN events ReqSlot ON SR."requesterSlotId" = ReqSlot.id
      JOIN users ReqUser ON ReqSlot."userId" = ReqUser.id
      WHERE 
        RecSlot."userId" = $1 AND SR.status = 'PENDING'
    `;
    const result = await query(sql, [currentUserId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching incoming requests." });
  }
});

router.get('/requests/outgoing', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const sql = `
      SELECT 
        SR.id as swapRequestId,
        SR.status, 
        RecSlot.id as receiverSlotId,
        RecSlot.title as receiverSlotTitle,
        RecSlot."startTime" as receiverSlotStartTime,
        CASE 
          WHEN RecUser.name IS NOT NULL AND RecUser.name != '' THEN RecUser.name 
          ELSE SPLIT_PART(RecUser.email, '@', 1) 
        END as receiverName
      FROM swaprequests SR
      JOIN events ReqSlot ON SR."requesterSlotId" = ReqSlot.id
      JOIN events RecSlot ON SR."receiverSlotId" = RecSlot.id
      JOIN users RecUser ON RecSlot."userId" = RecUser.id
      WHERE 
        ReqSlot."userId" = $1 AND (SR.status = 'PENDING' OR SR.status = 'REJECTED' OR SR.status = 'ACCEPTED')
    `;
    const result = await query(sql, [currentUserId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching outgoing requests." });
  }
});

router.delete('/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user.id;

    const swapReqRes = await query("SELECT * FROM swaprequests WHERE id = $1", [requestId]);
    const swapReq = swapReqRes.rows[0];
    if (!swapReq) return res.status(404).json({ error: "Not found." });

    const reqSlotRes = await query("SELECT * FROM events WHERE id = $1", [swapReq.requesterSlotId]);
    const requesterSlot = reqSlotRes.rows[0];
    if (requesterSlot.userId !== currentUserId) return res.status(403).json({ error: "Forbidden." });

    await query("DELETE FROM swaprequests WHERE id = $1", [requestId]);
    res.status(200).json({ message: "Request dismissed." });
  } catch (err) {
    res.status(500).json({ error: "Server error dismissing request." });
  }
});

module.exports = router;