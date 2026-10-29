"""Builds report/report.html (the printable project report) from a template,
re-using the JavaScript snippets from README.md so both documents stay identical.
Usage:  py report/build_report.py
Then print:  chrome --headless=new --no-pdf-header-footer --print-to-pdf=REPORT.pdf file:///<path>/report/report.html"""
import html, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
readme = (ROOT / "README.md").read_text(encoding="utf-8")
section9 = readme.split("\n## 9.")[1].split("\n## 10.")[0]
snippets = [html.escape(s.strip("\n")) for s in re.findall(r"```js\n(.*?)```", section9, re.S)]
assert len(snippets) == 6, len(snippets)

schema = """CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  department    TEXT,
  year          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL,
  date        TEXT NOT NULL,          -- YYYY-MM-DD
  time        TEXT NOT NULL,          -- HH:MM
  venue       TEXT NOT NULL,
  organizer   TEXT NOT NULL,
  capacity    INTEGER NOT NULL CHECK (capacity > 0),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE registrations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, event_id)
);"""

endpoints = [
    ("POST", "/api/auth/signup", "Public", "Create a student account and log in"),
    ("POST", "/api/auth/login", "Public", "Log in with email and password (sets cookie)"),
    ("POST", "/api/auth/logout", "Public", "Clear the login cookie"),
    ("GET", "/api/auth/me", "Public", "Current user, or null"),
    ("GET", "/api/events", "Public", "List events; query: search, category, from, to, when"),
    ("GET", "/api/events/categories", "Public", "Allowed categories"),
    ("GET", "/api/events/:id", "Public", "One event with seats left / registered flags"),
    ("POST", "/api/events/:id/register", "Logged in", "Register for an event"),
    ("DELETE", "/api/events/:id/register", "Logged in", "Cancel own registration"),
    ("GET", "/api/me/registrations", "Logged in", "My registered events"),
    ("POST", "/api/events", "Admin", "Create an event"),
    ("PUT", "/api/events/:id", "Admin", "Update an event"),
    ("DELETE", "/api/events/:id", "Admin", "Delete an event (cascades registrations)"),
    ("GET", "/api/events/:id/registrants", "Admin", "Students registered for an event"),
    ("GET", "/api/admin/stats", "Admin", "Dashboard totals"),
]
ep_rows = "\n".join(
    f'<tr><td><span class="m m-{m.lower()}">{m}</span></td><td><code>{html.escape(p)}</code></td><td>{a}</td><td>{d}</td></tr>'
    for m, p, a, d in endpoints)

shots = [
    ("01-home.png", "Home page - list of upcoming events with search and filters"),
    ("02-search-filter.png", "Searching \"hack\" within the Technical category"),
    ("03-signup-validation.png", "Sign-up form showing client-side validation errors"),
    ("04-signup-filled.png", "Sign-up form filled in by a new student"),
    ("05-event-details.png", "Event details page (logged in, before registering)"),
    ("06-event-registered.png", "After clicking \"Register now\" - confirmation and updated seats"),
    ("07-home-logged-in.png", "Home page when logged in - \"Registered\" badges on cards"),
    ("08-my-registrations.png", "My Registrations page"),
    ("09-login.png", "Login page with the admin credentials"),
    ("10-admin-dashboard.png", "Admin panel - statistics and events table"),
    ("11-admin-create-event.png", "Admin creating a new event"),
    ("12-admin-event-created.png", "New event added (top row) with success message"),
    ("13-admin-registrants.png", "Registrant list for an event, with CSV download"),
    ("14-new-event-listed.png", "The new event is immediately visible to students"),
    ("15-mobile-home.png", "Responsive layout on a 390 px wide mobile screen"),
    ("16-api-response.png", "REST API tested from the command line with curl"),
]
figs = []
for i, (f, cap) in enumerate(shots, 1):
    cls = "fig mobile" if "mobile" in f else ("fig tall" if "api" in f else "fig")
    figs.append(f'<figure class="{cls}"><img src="../screenshots/{f}" alt="{html.escape(cap)}">'
                f'<figcaption>Figure {i}: {html.escape(cap)}</figcaption></figure>')
figures = "\n".join(figs)

explanations = [
    "Express passes every request through a chain of <b>middleware</b>: the JSON body and cookies are parsed, then <code>loadUser</code> checks the login cookie. Paths starting with <code>/api</code> go to the route modules (the REST API); everything else is served from <code>public/</code> as static files.",
    "<code>node:sqlite</code> is SQLite built into Node.js, so no database server or native add-on is needed. <code>CREATE TABLE IF NOT EXISTS</code> creates the tables on the first run. Foreign keys with <code>ON DELETE CASCADE</code> and <code>UNIQUE (user_id, event_id)</code> keep the data consistent, and all queries use <b>prepared statements</b> with placeholders, which prevents SQL injection.",
    "At sign-up the password is hashed with <b>bcrypt</b>, so the real password is never stored. At login <code>bcrypt.compareSync</code> checks it; on success a <b>JSON Web Token</b> (user id + role, signed with a secret) is stored in an <b>httpOnly cookie</b> that page scripts cannot read. <code>requireAuth</code> / <code>requireAdmin</code> protect routes and answer 401 / 403.",
    "<code>getEvent</code> loads the event with a live registration count. The route checks the business rules in order - event exists, not in the past, not already registered, seats left - then inserts the row and returns <code>201 Created</code> with the updated event so the page refreshes the seat count without reloading.",
    "All pages use the small <code>api()</code> helper around <code>fetch()</code>: it sends JSON with the login cookie, parses the response and turns error responses into JavaScript errors carrying the server message. The Register button calls <code>POST</code> (or <code>DELETE</code> to cancel) and re-renders the page with the returned data, showing a toast message.",
    "Each form field has a list of rules (a test function and a message). <code>validateForm</code> highlights invalid fields and shows the message under them, catching mistakes instantly. The server repeats the important checks because client-side validation can be bypassed.",
]
code_titles = [
    "Server setup - server/index.js",
    "Database - server/db.js",
    "Authentication - routes/auth.js and middleware/auth.js",
    "A route with business rules - registering for an event",
    "Frontend fetch() - public/js/common.js and event.js",
    "Client-side form validation - public/js/auth.js",
]
code_html = "\n".join(
    f'<h3>8.{i} {html.escape(t)}</h3><pre><code>{s}</code></pre><p class="explain"><b>Explanation:</b> {e}</p>'
    for i, (t, s, e) in enumerate(zip(code_titles, snippets, explanations), 1))

TEMPLATE = (ROOT / "report" / "report.template.html").read_text(encoding="utf-8")
out = (TEMPLATE.replace("{{ENDPOINT_ROWS}}", ep_rows)
               .replace("{{SCHEMA_SQL}}", html.escape(schema))
               .replace("{{CODE_SECTIONS}}", code_html)
               .replace("{{FIGURES}}", figures))
(ROOT / "report" / "report.html").write_text(out, encoding="utf-8", newline="\n")
print("wrote report/report.html", len(out))
