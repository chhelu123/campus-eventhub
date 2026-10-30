// Admin panel: stats, events table, create / edit / delete events and view registrants.
let events = [];
let editingId = null;
let lastRegistrants = null;
async function loadStats() {
  const s = await api('/admin/stats');
  const card = (value, label) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`;
  document.getElementById('stats').innerHTML =
    card(s.totalEvents, 'Total events') +
    card(s.upcomingEvents, 'Upcoming') +
    card(s.totalRegistrations, 'Registrations') +
    card(s.totalStudents, 'Registered students');
}

function renderRows() {
  const q = document.getElementById('admin-search').value.trim().toLowerCase();
  const list = events.filter((e) => !q || (e.title + e.venue + e.organizer + e.category).toLowerCase().includes(q));
  document.getElementById('rows').innerHTML = list.length ? list.map((e) => `
    <tr>
      <td><div class="t-title">${esc(e.title)}</div><div class="t-sub">${esc(e.venue)}</div></td>
      <td class="cat-${esc(e.category)}"><span class="dot" style="background:var(--cat)"></span>${esc(e.category)}</td>
      <td>${fmtDate(e.date)}<div class="t-sub">${fmtTime(e.time)}${e.is_past ? ' &middot; completed' : ''}</div></td>
      <td style="min-width:150px">${seatsBar(e)}<span class="t-sub">${e.registered_count} / ${e.capacity}</span></td>
      <td><div class="actions">
        <button class="btn btn-outline btn-sm" data-act="regs" data-id="${e.id}" title="Registrants">${icon('list')}<span class="hide-sm">Registrants</span></button>
        <button class="btn btn-outline btn-sm" data-act="edit" data-id="${e.id}" title="Edit">${icon('edit')}</button>
        <button class="btn btn-danger-soft btn-sm" data-act="del" data-id="${e.id}" title="Delete">${icon('trash')}</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="5" class="muted" style="text-align:center;padding:2rem">No events found.</td></tr>';
}

async function loadEvents() {
  ({ events } = await api('/events?when=all'));
  events.sort((a, b) => b.date.localeCompare(a.date)); // newest first
  renderRows();
}

/* ---------- Create / edit dialog ---------- */
const dlg = document.getElementById('event-dialog');
const form = document.getElementById('event-form');

function openForm(e = null) {
  editingId = e?.id ?? null;
  form.reset();
  form.querySelectorAll('.field').forEach((f) => { f.classList.remove('invalid'); f.querySelector('.error').textContent = ''; });
  document.getElementById('event-error').classList.add('hidden');
  document.getElementById('dialog-title').textContent = e ? 'Edit event' : 'New event';
  if (e) for (const k of ['title', 'category', 'capacity', 'date', 'time', 'venue', 'organizer', 'description']) form.elements[k].value = e[k];
  dlg.showModal();
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const ok = validateForm(form, {
    title: [[(v) => v.length >= 3, 'Title must be at least 3 characters']],
    category: [[(v) => v, 'Choose a category']],
    capacity: [[(v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Enter a capacity of at least 1']],
    date: [[(v) => v, 'Choose a date'], [(v) => editingId || v >= todayYMD(), 'Date cannot be in the past']],
    time: [[(v) => v, 'Choose a time']],
    venue: [[(v) => v, 'Venue is required']],
    organizer: [[(v) => v, 'Organizer is required']],
    description: [[(v) => v.length >= 10, 'Description must be at least 10 characters']],
  });
  if (!ok) return;
  const body = Object.fromEntries(new FormData(form));
  body.capacity = Number(body.capacity);
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  try {
    if (editingId) await api('/events/' + editingId, { method: 'PUT', body });
    else await api('/events', { method: 'POST', body });
    dlg.close();
    toast(editingId ? 'Event updated.' : 'Event created.');
    await Promise.all([loadEvents(), loadStats()]);
  } catch (err) {
    const box = document.getElementById('event-error');
    box.textContent = err.message;
    box.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
});

/* ---------- Registrants dialog ---------- */
async function showRegistrants(id) {
  const data = await api(`/events/${id}/registrants`);
  lastRegistrants = data;
  document.getElementById('reg-title').textContent = `Registrants - ${data.event.title}`;
  document.getElementById('reg-body').innerHTML = data.registrants.length ? `
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Dept / Year</th><th>Registered on</th></tr></thead>
      <tbody>${data.registrants.map((r, i) => `
        <tr><td>${i + 1}</td><td class="t-title">${esc(r.name)}</td><td>${esc(r.email)}</td>
        <td>${esc(r.department || '-')} ${r.year ? '&middot; ' + esc(r.year) : ''}</td>
        <td class="t-sub">${new Date(r.registered_at.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>`).join('')}
      </tbody></table></div>
    <p class="muted" style="padding:.8rem 1.4rem;margin:0">${data.registrants.length} of ${data.event.capacity} seats filled</p>`
    : `<div class="empty" style="margin:1.4rem;border-style:dashed">${icon('users')}<h3>No registrations yet</h3></div>`;
  document.getElementById('reg-dialog').showModal();
}

function downloadCsv() {
  if (!lastRegistrants) return;
  const lines = [['Name', 'Email', 'Department', 'Year', 'Registered at']]
    .concat(lastRegistrants.registrants.map((r) => [r.name, r.email, r.department || '', r.year || '', r.registered_at]))
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: lastRegistrants.event.title.replace(/[^a-z0-9]+/gi, '_') + '_registrants.csv',
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

(async () => {
  if (!(await initPage({ auth: 'admin' }))) return;
  const { categories } = await api('/events/categories');
  document.getElementById('f-category').innerHTML =
    '<option value="">Select...</option>' + categories.map((c) => `<option>${esc(c)}</option>`).join('');

  document.getElementById('new-event').onclick = () => openForm();
  document.getElementById('admin-search').oninput = renderRows;
  document.getElementById('csv-btn').onclick = downloadCsv;
  document.querySelectorAll('dialog [data-close]').forEach((b) => (b.onclick = () => b.closest('dialog').close()));

  document.getElementById('rows').addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button[data-act]');
    if (!btn) return;
    const e = events.find((x) => x.id === Number(btn.dataset.id));
    if (btn.dataset.act === 'edit') openForm(e);
    if (btn.dataset.act === 'regs') showRegistrants(e.id).catch((err) => toast(err.message, 'error'));
    if (btn.dataset.act === 'del') {
      if (!confirm(`Delete "${e.title}"? All ${e.registered_count} registrations will also be removed.`)) return;
      try {
        await api('/events/' + e.id, { method: 'DELETE' });
        toast('Event deleted.');
        await Promise.all([loadEvents(), loadStats()]);
      } catch (err) { toast(err.message, 'error'); }
    }
  });

  await Promise.all([loadStats(), loadEvents()]);
})();
