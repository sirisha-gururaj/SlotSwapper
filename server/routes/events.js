const router = require('express').Router();
const { db } = require('../database.js');
// Import our "bouncer"
const authMiddleware = require('../middleware/authMiddleware.js');

// ===========================================
//  1. CREATE A NEW EVENT
//  Endpoint: POST /api/events
//  This route is PROTECTED
// ===========================================
// We put 'authMiddleware' here. Express will run it *before* running our main logic.
router.post('/', authMiddleware, (req, res) => {
  try {
    // Get event data from the request body
    const { title, startTime, endTime } = req.body;

    // We can get the userId from 'req.user' because the middleware added it!
    const userId = req.user.id;

    // 1. Check for missing fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: "Please provide title, startTime, and endTime." });
    }

    // 2. Insert the new event
    // All new events start as 'BUSY' by default
    const sql = `
      INSERT INTO Events (title, startTime, endTime, status, userId) 
      VALUES (?, ?, ?, 'BUSY', ?)
    `;

    db.run(sql, [title, startTime, endTime, userId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 3. Send back the newly created event
      res.status(201).json({
        message: "Event created successfully!",
        eventId: this.lastID,
        title,
        startTime,
        endTime,
        status: 'BUSY',
        userId
      });
    });

  } catch (err) {
    res.status(500).json({ error: "Server error creating event." });
  }
});

// ===========================================
//  2. GET ALL *MY* EVENTS
//  Endpoint: GET /api/events/my-events
//  This route is PROTECTED
// ===========================================
router.get('/my-events', authMiddleware, async (req, res) => {
  try {
    // The middleware gives us the logged-in user's ID
    const userId = req.user.id;

    // Find all events that belong to this user
    const events = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM Events WHERE userId = ?", [userId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    res.status(200).json(events);

  } catch (err) {
    res.status(500).json({ error: "Server error fetching events." });
  }
});

// ===========================================
//  3. UPDATE AN EVENT'S STATUS
//  Endpoint: PATCH /api/events/:eventId/status
//  This route is PROTECTED
// ===========================================
// We will use this to change 'BUSY' to 'SWAPPABLE'
router.patch('/:eventId/status', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // 1. Check for valid status
    if (!['BUSY', 'SWAPPABLE'].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Can only set to 'BUSY' or 'SWAPPABLE'." });
    }

    // 2. Find the event
    const event = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM Events WHERE id = ?", [eventId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    // 3. Check if event exists
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    // 4. Check if this user *owns* the event
    if (event.userId !== userId) {
      return res.status(403).json({ error: "Forbidden. You do not own this event." });
    }

    // 5. Update the event's status
    db.run("UPDATE Events SET status = ? WHERE id = ?", [status, eventId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json({ message: "Event status updated successfully.", newStatus: status });
    });

  } catch (err) {
    res.status(500).json({ error: "Server error updating event status." });
  }
});

// ===========================================
//  4. UPDATE A FULL EVENT (Title, Time)
//  Endpoint: PUT /api/events/:eventId
//  This route is PROTECTED
// ===========================================
router.put('/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, startTime, endTime } = req.body;
    const userId = req.user.id;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: "Title, startTime, and endTime are required." });
    }

    // 1. Find the event
    const event = await new Promise((r) => db.get("SELECT * FROM Events WHERE id = ?", [eventId], (_, row) => r(row)));

    // 2. Check if event exists
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    // 3. Check if this user *owns* the event
    if (event.userId !== userId) {
      return res.status(403).json({ error: "Forbidden. You do not own this event." });
    }

    // 4. Check that the event is not in a pending swap
    if (event.status === 'SWAP_PENDING') {
      return res.status(400).json({ error: "Cannot edit an event that is in a pending swap." });
    }

    // 5. Update the event
    const sql = `
      UPDATE Events 
      SET title = ?, startTime = ?, endTime = ? 
      WHERE id = ? AND userId = ?
    `;
    db.run(sql, [title, startTime, endTime, eventId, userId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json({ message: "Event updated successfully." });
    });

  } catch (err) {
    res.status(500).json({ error: "Server error updating event." });
  }
});

// ===========================================
//  5. DELETE AN EVENT
//  Endpoint: DELETE /api/events/:eventId
//  This route is PROTECTED
// ===========================================
router.delete('/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // 1. Find the event
    const event = await new Promise((r) => db.get("SELECT * FROM Events WHERE id = ?", [eventId], (_, row) => r(row)));

    // 2. Check if event exists
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    // 3. Check if this user *owns* the event
    if (event.userId !== userId) {
      return res.status(403).json({ error: "Forbidden. You do not own this event." });
    }

    // 4. Check that the event is not in a pending swap
    if (event.status === 'SWAP_PENDING') {
      return res.status(400).json({ error: "Cannot delete an event that is in a pending swap." });
    }

    // 5. Delete the event
    // (We should also delete any related swap requests, but for this
    // challenge, just deleting the event is fine if it's not pending)
    db.run("DELETE FROM Events WHERE id = ? AND userId = ?", [eventId, userId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json({ message: "Event deleted successfully." });
    });

  } catch (err) {
    res.status(500).json({ error: "Server error deleting event." });
  }
});

module.exports = router;