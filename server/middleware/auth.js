// Authentication middleware based on a JSON Web Token stored in an httpOnly cookie.
const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'campus-eventhub-dev-secret-change-me';
const COOKIE_NAME = 'eh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,          // not readable from page JavaScript (protects against XSS token theft)
  sameSite: 'lax',         // not sent on cross-site POSTs (basic CSRF protection)
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Create a signed token and set it as a cookie on the response.
function issueToken(res, user) {
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
}

function clearToken(res) {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: undefined });
}

// Runs on every request: if a valid cookie is present, attach req.user.
function loadUser(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = db
        .prepare('SELECT id, name, email, role, department, year FROM users WHERE id = ?')
        .get(payload.id);
      if (user) req.user = user;
    } catch {
      clearToken(res); // expired or tampered token
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access only.' });
  next();
}

module.exports = { issueToken, clearToken, loadUser, requireAuth, requireAdmin };
