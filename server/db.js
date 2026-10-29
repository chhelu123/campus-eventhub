// Database layer: opens the SQLite file with Node's built-in node:sqlite module,
// creates the tables on first run and seeds an admin, demo students and events.
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'eventhub.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

const CATEGORIES = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar'];

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    department    TEXT,
    year          TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    date        TEXT    NOT NULL,          -- YYYY-MM-DD
    time        TEXT    NOT NULL,          -- HH:MM (24h)
    venue       TEXT    NOT NULL,
    organizer   TEXT    NOT NULL,
    capacity    INTEGER NOT NULL CHECK (capacity > 0),
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    registered_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, event_id)
  );

  CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
  CREATE INDEX IF NOT EXISTS idx_reg_event   ON registrations(event_id);
`);

// Returns a YYYY-MM-DD string `offset` days from today (local time).
function dayFromToday(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function seed() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return; // already seeded
  db.exec('BEGIN');

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, department, year) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const adminId = insertUser.run(
    'EventHub Admin', 'admin@eventhub.com', bcrypt.hashSync('admin123', 10), 'admin', 'Student Affairs', null
  ).lastInsertRowid;

  const students = [
    ['Aarav Sharma', 'aarav@student.edu', 'Computer', 'TY'],
    ['Priya Deshmukh', 'priya@student.edu', 'IT', 'SY'],
    ['Rohan Patil', 'rohan@student.edu', 'Mechanical', 'TY'],
    ['Sneha Kulkarni', 'sneha@student.edu', 'E&TC', 'FY'],
    ['Karan Mehta', 'karan@student.edu', 'Computer', 'Final Year'],
  ];
  const studentHash = bcrypt.hashSync('student123', 10);
  const studentIds = students.map(([name, email, dept, yr]) =>
    insertUser.run(name, email, studentHash, 'student', dept, yr).lastInsertRowid
  );

  const events = [
    ['CodeSprint 2026 - 24h Hackathon',
      'A 24-hour team hackathon where teams of 2-4 build solutions to real campus and civic problems. Mentors from industry, free meals through the night and prizes worth Rs 50,000. Bring your laptop and your best ideas.',
      'Technical', 9, '09:00', 'Main Computer Lab, Block A', 'Computer Society (CSI)', 120],
    ['Rhythm - Annual Cultural Night',
      'An evening of dance, music, drama and stand-up performances by students from every department. Open to all students; group performance registrations close a week before the event.',
      'Cultural', 16, '18:00', 'Open Air Theatre', 'Cultural Committee', 400],
    ['Inter-Department Cricket League',
      'Eight department teams battle it out in a T10 knock-out format. Register as a player or volunteer; selected squads will be announced on the notice board.',
      'Sports', 12, '07:30', 'College Cricket Ground', 'Sports Council', 80],
    ['Hands-on Workshop: Git & GitHub',
      'Learn version control the practical way - commits, branches, pull requests and resolving merge conflicts - and publish your first project on GitHub. Laptops with Git installed are required.',
      'Workshop', 5, '14:00', 'Seminar Hall 2', 'Google Developer Student Club', 60],
    ['Guest Talk: Careers in AI & Data Science',
      'An industry data scientist talks about the skills recruiters look for, building a portfolio, and how generative AI is changing software jobs. Followed by an open Q&A session.',
      'Seminar', 7, '11:00', 'Main Auditorium', 'Training & Placement Cell', 250],
    ['Robotics Expo & Line-Follower Race',
      'Showcase your robots and compete in the line-follower race. Teams of up to 3; bot dimensions must not exceed 25 x 25 cm. Certificates for all participants.',
      'Technical', 21, '10:00', 'Workshop Building, Ground Floor', 'Robotics Club', 40],
    ['Photography Walk & Contest',
      'A guided photography walk around campus during golden hour, followed by an on-the-spot contest. Phone and DSLR categories; best entries are printed for the annual exhibition.',
      'Cultural', 3, '16:30', 'Main Gate (assembly point)', 'Shutterbug Photography Club', 30],
    ['Workshop: Building REST APIs with Node.js',
      'Build and test a REST API using Node.js and Express, connect it to a database and call it from a web page with fetch(). Ideal preparation for the Web Programming mini project.',
      'Workshop', -6, '10:00', 'Lab 304, Block B', 'Department of Computer Engineering', 50],
  ];
  const insertEvent = db.prepare(
    `INSERT INTO events (title, description, category, date, time, venue, organizer, capacity, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const eventIds = events.map(([title, desc, cat, offset, time, venue, org, cap]) =>
    insertEvent.run(title, desc, cat, dayFromToday(offset), time, venue, org, cap, adminId).lastInsertRowid
  );

  // A few sample registrations so counts and registrant lists are not empty.
  const insertReg = db.prepare('INSERT INTO registrations (user_id, event_id) VALUES (?, ?)');
  const plan = [[0, [0, 3, 4]], [1, [0, 1, 6]], [2, [2, 5]], [3, [1, 4, 6]], [4, [0, 3, 7]]];
  for (const [s, evs] of plan) for (const e of evs) insertReg.run(studentIds[s], eventIds[e]);

  db.exec('COMMIT');
  console.log('Database seeded: 1 admin, 5 students, 8 events.');
}

seed();

const today = () => dayFromToday(0);

module.exports = { db, CATEGORIES, today };
