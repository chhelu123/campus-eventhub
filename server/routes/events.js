// /api/events - browse events (public), register / cancel (students), manage events (admin).
const express = require('express');
const { db, CATEGORIES, today } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Shared SELECT that adds the live registration count and whether the current user is registered.
const EVENT_SELECT = `
  SELECT e.*,
         (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registered_count,
         EXISTS (SELECT 1 FROM registrations r WHERE r.event_id = e.id AND r.user_id = :uid) AS is_registered
  FROM events e`;

function shape(e) {
  return {
    ...e,
    is_registered: Boolean(e.is_registered),
    seats_left: Math.max(e.capacity - e.registered_count, 0),
    is_past: e.date < today(),
  };
}

function getEvent(id, uid) {
  const row = db.prepare(`${EVENT_SELECT} WHERE e.id = :id`).get({ id: Number(id), uid: uid ?? 0 });
  return row ? shape(row) : null;
}

// Validates and normalises the body sent when an admin creates or edits an event.
function validateEvent(body) {
  const e = {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    category: String(body.category || '').trim(),
    date: String(body.date || '').trim(),
    time: String(body.time || '').trim(),
    venue: String(body.venue || '').trim(),
    organizer: String(body.organizer || '').trim(),
    capacity: Number(body.capacity),
  };
  if (e.title.length < 3) return { error: 'Title must be at least 3 characters.' };
  if (e.description.length < 10) return { error: 'Description must be at least 10 characters.' };
  if (!CATEGORIES.includes(e.category)) return { error: `Category must be one of: ${CATEGORIES.join(', ')}.` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || isNaN(Date.parse(e.date))) return { error: 'Please give a valid date.' };
  if (!/^\d{2}:\d{2}$/.test(e.time)) return { error: 'Please give a valid time (HH:MM).' };
  if (!e.venue) return { error: 'Venue is required.' };
  if (!e.organizer) return { error: 'Organizer is required.' };
  if (!Number.isInteger(e.capacity) || e.capacity < 1 || e.capacity > 10000) {
    return { error: 'Capacity must be a whole number between 1 and 10000.' };
  }
  return { event: e };
}

// GET /api/events/categories
router.get('/categories', (req, res) => res.json({ categories: CATEGORIES }));

// GET /api/events?search=&category=&from=&to=&when=upcoming|past|all
router.get('/', (req, res) => {
  const q = (key, def = '') => (typeof req.query[key] === 'string' ? req.query[key] : def);
  const [search, category, from, to, when] = [q('search'), q('category'), q('from'), q('to'), q('when', 'upcoming')];
  const where = [];
  const params = { uid: req.user?.id ?? 0 };

  if (search.trim()) {
    where.push('(e.title LIKE :q OR e.description LIKE :q OR e.venue LIKE :q OR e.organizer LIKE :q)');
    params.q = `%${search.trim()}%`;
  }
  if (category && CATEGORIES.includes(category)) { where.push('e.category = :category'); params.category = category; }
  if (from) { where.push('e.date >= :from'); params.from = from; }
  if (to) { where.push('e.date <= :to'); params.to = to; }
  if (when === 'upcoming') { where.push('e.date >= :today'); params.today = today(); }
  if (when === 'past') { where.push('e.date < :today'); params.today = today(); }

  const sql = `${EVENT_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY e.date ${when === 'past' ? 'DESC' : 'ASC'}, e.time ASC`;
  const events = db.prepare(sql).all(params).map(shape);
  res.json({ count: events.length, events });
});

// GET /api/events/:id
router.get('/:id', (req, res) => {
  const event = getEvent(req.params.id, req.user?.id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  res.json({ event });
});

// POST /api/events/:id/register  (logged-in users)
router.post('/:id/register', requireAuth, (req, res) => {
  const event = getEvent(req.params.id, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  if (event.is_past) return res.status(400).json({ error: 'This event has already taken place.' });
  if (event.is_registered) return res.status(409).json({ error: 'You are already registered for this event.' });
  if (event.seats_left <= 0) return res.status(409).json({ error: 'Sorry, this event is full.' });

  db.prepare('INSERT INTO registrations (user_id, event_id) VALUES (?, ?)').run(req.user.id, event.id);
  res.status(201).json({ message: 'Registered successfully.', event: getEvent(event.id, req.user.id) });
});

// DELETE /api/events/:id/register  (cancel own registration)
router.delete('/:id/register', requireAuth, (req, res) => {
  const event = getEvent(req.params.id, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  if (event.is_past) return res.status(400).json({ error: 'Registrations for past events cannot be cancelled.' });

  const { changes } = db
    .prepare('DELETE FROM registrations WHERE user_id = ? AND event_id = ?')
    .run(req.user.id, event.id);
  if (!changes) return res.status(404).json({ error: 'You are not registered for this event.' });
  res.json({ message: 'Registration cancelled.', event: getEvent(event.id, req.user.id) });
});

// ---------- Admin only ----------

// POST /api/events
router.post('/', requireAdmin, (req, res) => {
  const { event, error } = validateEvent(req.body);
  if (error) return res.status(400).json({ error });
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO events (title, description, category, date, time, venue, organizer, capacity, created_by)
     VALUES (:title, :description, :category, :date, :time, :venue, :organizer, :capacity, :created_by)`
  ).run({ ...event, created_by: req.user.id });
  res.status(201).json({ event: getEvent(lastInsertRowid, req.user.id) });
});

// PUT /api/events/:id
router.put('/:id', requireAdmin, (req, res) => {
  const existing = getEvent(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Event not found.' });
  const { event, error } = validateEvent(req.body);
  if (error) return res.status(400).json({ error });
  if (event.capacity < existing.registered_count) {
    return res.status(400).json({
      error: `Capacity cannot be lower than the ${existing.registered_count} students already registered.`,
    });
  }
  db.prepare(
    `UPDATE events SET title = :title, description = :description, category = :category, date = :date,
       time = :time, venue = :venue, organizer = :organizer, capacity = :capacity
     WHERE id = :id`
  ).run({ ...event, id: existing.id });
  res.json({ event: getEvent(existing.id, req.user.id) });
});

// DELETE /api/events/:id  (registrations are removed by ON DELETE CASCADE)
router.delete('/:id', requireAdmin, (req, res) => {
  const { changes } = db.prepare('DELETE FROM events WHERE id = ?').run(Number(req.params.id));
  if (!changes) return res.status(404).json({ error: 'Event not found.' });
  res.json({ message: 'Event deleted.' });
});

// GET /api/events/:id/registrants
router.get('/:id/registrants', requireAdmin, (req, res) => {
  const event = getEvent(req.params.id, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  const registrants = db.prepare(
    `SELECT u.id, u.name, u.email, u.department, u.year, r.registered_at
     FROM registrations r JOIN users u ON u.id = r.user_id
     WHERE r.event_id = ? ORDER BY r.registered_at ASC, r.id ASC`
  ).all(event.id);
  res.json({ event: { id: event.id, title: event.title, capacity: event.capacity }, registrants });
});

module.exports = router;
