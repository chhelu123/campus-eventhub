// Campus EventHub - Express server entry point.
// Serves the REST API under /api and the static frontend from /public.
const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');

require('./db'); // opens the database, creates tables and seeds data on first run
const { loadUser } = require('./middleware/auth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));   // parse JSON request bodies
app.use(cookieParser());                     // parse the auth cookie
app.use(loadUser);                           // attach req.user when logged in

// REST API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/me', require('./routes/me'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

// Frontend (HTML/CSS/JS). "/event" also matches "event.html" thanks to the extensions option.
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html')));

// Central error handler: malformed JSON, unexpected database errors, etc.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Campus EventHub running at http://localhost:${PORT}`);
});
