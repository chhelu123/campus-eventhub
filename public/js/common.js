// Shared frontend helpers: API wrapper, navbar, toasts, formatting and icons.

/* ---------- API wrapper around fetch() ---------- */
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    credentials: 'same-origin', // send the auth cookie
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ---------- Icons (inline SVG, stroke style) ---------- */
const ICON_PATHS = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  // category icons
  Technical: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  Cultural: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  Sports: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  Workshop: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>',
  Seminar: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
};
function icon(name, cls = 'icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

/* ---------- Formatting helpers ---------- */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function parseDate(ymd) { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d); }
function fmtDate(ymd) {
  return parseDate(ymd).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(hm) {
  const [h, m] = hm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function dateParts(ymd) { const d = parseDate(ymd); return { d: d.getDate(), m: MONTHS[d.getMonth()] }; }
function todayYMD() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function seatsBar(e) {
  const pct = Math.min(100, Math.round((e.registered_count / e.capacity) * 100));
  const cls = pct >= 100 ? 'full' : pct >= 80 ? 'warn' : '';
  return `<div class="bar ${cls}"><span style="width:${pct}%"></span></div>`;
}
function qs(name) { return new URLSearchParams(location.search).get(name); }

/* ---------- Toast notifications ---------- */
function toast(message, type = 'success') {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'success' ? 'check' : 'alert')}<span>${esc(message)}</span>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ---------- Layout: header + footer ---------- */
let currentUser = null;

function renderHeader() {
  const page = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const link = (href, label) => {
    const active = (href === '/' ? page === '/' || page === '/index' : page === href) ? 'active' : '';
    return `<a href="${href}" class="${active}">${label}</a>`;
  };
  const u = currentUser;
  const initials = u ? u.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '';
  document.getElementById('site-header').innerHTML = `
    <div class="site-header">
      <nav class="container nav" id="nav">
        <a class="brand" href="/"><span class="brand-mark">${icon('calendar')}</span><span>Campus <b>EventHub</b></span></a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Menu">${icon('menu')}</button>
        <div class="nav-links">
          ${link('/', 'Events')}
          ${u && u.role !== 'admin' ? link('/my', 'My Registrations') : ''}
          ${u?.role === 'admin' ? link('/admin', 'Admin Panel') : ''}
        </div>
        <div class="nav-user">
          ${u ? `
            <div class="avatar">${esc(initials)}</div>
            <div class="user-meta"><strong>${esc(u.name)}${u.role === 'admin' ? '<span class="role-pill">Admin</span>' : ''}</strong><small>${esc(u.email)}</small></div>
            <button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>`
          : `<a class="btn btn-ghost btn-sm" href="/login">Log in</a><a class="btn btn-primary btn-sm" href="/signup">Sign up</a>`}
        </div>
      </nav>
    </div>`;
  document.getElementById('nav-toggle').onclick = () => document.getElementById('nav').classList.toggle('open');
  const lo = document.getElementById('logout-btn');
  if (lo) lo.onclick = async () => { await api('/auth/logout', { method: 'POST' }); location.href = '/'; };
}

function renderFooter() {
  const f = document.getElementById('site-footer');
  if (f) f.innerHTML = `<div class="site-footer"><div class="container">
    <span>&copy; ${new Date().getFullYear()} Campus EventHub &middot; Web Programming Mini Project</span>
    <span>Built with Node.js, Express &amp; SQLite</span></div></div>`;
}

// Call at the top of every page. `auth`: null | 'user' | 'admin'.
async function initPage({ auth = null } = {}) {
  try { currentUser = (await api('/auth/me')).user; } catch { currentUser = null; }
  if (auth && !currentUser) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search); return null; }
  if (auth === 'admin' && currentUser.role !== 'admin') { location.href = '/'; return null; }
  renderHeader();
  renderFooter();
  return currentUser;
}

/* ---------- Simple client-side form validation ---------- */
// rules: { fieldName: [ [testFn, 'message'], ... ] }  -> returns true when valid
function validateForm(form, rules) {
  let ok = true;
  for (const [name, checks] of Object.entries(rules)) {
    const input = form.elements[name];
    const field = input.closest('.field');
    const errEl = field.querySelector('.error');
    const failed = checks.find(([test]) => !test(input.value.trim(), form));
    field.classList.toggle('invalid', Boolean(failed));
    errEl.textContent = failed ? failed[1] : '';
    if (failed && ok) { input.focus(); ok = false; }
  }
  return ok;
}
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
