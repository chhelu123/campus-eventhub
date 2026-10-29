// /api/admin - dashboard statistics for the admin panel.
const express = require('express');
const { db, today } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', requireAdmin, (req, res) => {
  const one = (sql, ...p) => db.prepare(sql).get(...p).n;
  res.json({
    totalEvents: one('SELECT COUNT(*) AS n FROM events'),
    upcomingEvents: one('SELECT COUNT(*) AS n FROM events WHERE date >= ?', today()),
    totalRegistrations: one('SELECT COUNT(*) AS n FROM registrations'),
    totalStudents: one("SELECT COUNT(*) AS n FROM users WHERE role = 'student'"),
  });
});

module.exports = router;
