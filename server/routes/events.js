// src/server/routes/events.js
const router = require('express').Router();
const { query } = require('../database.js');
const authMiddleware = require('../middleware/authMiddleware.js');

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, startTime, endTime } = req.body;
    const userId = req.user.id;
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: "Please provide title, startTime, and endTime." });
    }

    const sql = `
      INSERT INTO events (title, "startTime", "endTime", status, "userId") 
      VALUES ($1, $2, $3, 'BUSY', $4)
      RETURNING id
    `;
    
    const result = await query(sql, [title, startTime, endTime, userId]);
    
    res.status(201).json({
      message: "Event created successfully!",
      eventId: result.rows[0].id,
      title, startTime, endTime, status: 'BUSY', userId
    });
  } catch (err) {
    res.status(500).json({ error: "Server error creating event." });
  }
});

router.get('/my-events', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query('SELECT * FROM events WHERE "userId" = $1', [userId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching events." });
  }
});

router.patch('/:eventId/status', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!['BUSY', 'SWAPPABLE'].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const eventResult = await query("SELECT * FROM events WHERE id = $1", [eventId]);
    const event = eventResult.rows[0];
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }
    if (event.userId !== userId) {
      return res.status(403).json({ error: "Forbidden. You do not own this event." });
    }

    await query("UPDATE events SET status = $1 WHERE id = $2", [status, eventId]);
    res.status(200).json({ message: "Event status updated successfully.", newStatus: status });
  } catch (err) {
    res.status(500).json({ error: "Server error updating event status." });
  }
});

router.put('/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, startTime, endTime } = req.body;
    const userId = req.user.id;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const eventResult = await query("SELECT * FROM events WHERE id = $1", [eventId]);
    const event = eventResult.rows[0];
    if (!event) return res.status(404).json({ error: "Event not found." });
    if (event.userId !== userId) return res.status(403).json({ error: "Forbidden." });
    if (event.status === 'SWAP_PENDING') return res.status(400).json({ error: "Cannot edit pending event." });

    const sql = `
      UPDATE events 
      SET title = $1, "startTime" = $2, "endTime" = $3 
      WHERE id = $4 AND "userId" = $5
    `;
    await query(sql, [title, startTime, endTime, eventId, userId]);
    res.status(200).json({ message: "Event updated successfully." });
  } catch (err) {
    res.status(500).json({ error: "Server error updating event." });
  }
});

router.delete('/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const eventResult = await query("SELECT * FROM events WHERE id = $1", [eventId]);
    const event = eventResult.rows[0];
    if (!event) return res.status(404).json({ error: "Event not found." });
    if (event.userId !== userId) return res.status(403).json({ error: "Forbidden." });
    if (event.status === 'SWAP_PENDING') return res.status(400).json({ error: "Cannot delete pending event." });

    await query('DELETE FROM events WHERE id = $1 AND "userId" = $2', [eventId, userId]);
    res.status(200).json({ message: "Event deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Server error deleting event." });
  }
});

module.exports = router;