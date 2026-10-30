// "My registrations" page: list the logged-in student's registrations, split upcoming / past.
let regs = [];
let tab = 'upcoming';

function row(r) {
  const { d, m } = dateParts(r.date);
  return `
    <div class="row-item cat-${esc(r.category)}">
      <div class="row-date"><span class="d">${d}</span><span class="m">${m}</span></div>
      <div class="row-main">
        <span class="cat-label">${esc(r.category)}</span>
        <h3><a href="/event?id=${r.id}">${esc(r.title)}</a></h3>
        <p class="ev-meta"><span>${fmtDate(r.date)}</span><span>${fmtTime(r.time)}</span><span>${esc(r.venue)}</span></p>
      </div>
      <div class="row-actions">
        <span class="tag ${r.is_past ? '' : 'tag-ok'}">${r.is_past ? 'Attended' : 'Confirmed'}</span>
        <a class="btn btn-outline btn-sm" href="/event?id=${r.id}">View</a>
        ${r.is_past ? '' : `<button class="btn btn-danger-soft btn-sm" data-cancel="${r.id}">Cancel</button>`}
      </div>
    </div>`;
}

function render() {
  const upcoming = regs.filter((r) => !r.is_past);
  const past = regs.filter((r) => r.is_past).reverse();
  document.getElementById('c-upcoming').textContent = upcoming.length;
  document.getElementById('c-past').textContent = past.length;
  const items = tab === 'upcoming' ? upcoming : past;
  document.getElementById('list').innerHTML = items.length
    ? items.map(row).join('')
    : `<div class="empty">${icon('ticket')}<h3>${tab === 'upcoming' ? 'No upcoming registrations' : 'No past events yet'}</h3>
       <p>Events you register for will be listed here.</p><a class="btn btn-primary" href="/">Browse events</a></div>`;
}

async function load() {
  ({ registrations: regs } = await api('/me/registrations'));
  render();
}

(async () => {
  if (!(await initPage({ auth: 'user' }))) return;
  document.getElementById('tabs').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    tab = b.dataset.tab;
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('active', x === b));
    render();
  });
  document.getElementById('list').addEventListener('click', async (ev) => {
    const id = ev.target.dataset?.cancel;
    if (!id || !confirm('Cancel this registration?')) return;
    try {
      await api(`/events/${id}/register`, { method: 'DELETE' });
      toast('Registration cancelled.');
      load();
    } catch (err) { toast(err.message, 'error'); }
  });
  load();
})();
