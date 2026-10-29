// /api/me - data belonging to the logged-in user.
const express = require('express');
const { db, today } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/me/registrations
router.get('/registrations', requireAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT e.id, e.title, e.category, e.date, e.time, e.venue, e.organizer, e.capacity,
            r.registered_at,
            (SELECT COUNT(*) FROM registrations x WHERE x.event_id = e.id) AS registered_count
     FROM registrations r JOIN events e ON e.id = r.event_id
     WHERE r.user_id = ?
     ORDER BY e.date ASC, e.time ASC`
  ).all(req.user.id);
  const t = today();
  res.json({ registrations: rows.map((r) => ({ ...r, is_past: r.date < t })) });
});

module.exports = router;
