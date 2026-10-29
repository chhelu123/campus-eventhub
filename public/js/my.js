// "My registrations" page: list the logged-in student's registrations, split upcoming / past.
let regs = [];
let tab = 'upcoming';

function row(r) {
  const { d, m } = dateParts(r.date);
  return `
    <div class="row-item">
      <div class="row-date cat-${esc(r.category)}"><span class="d">${d}</span><span class="m">${m}</span></div>
      <div class="row-main">
        <h3><a href="/event?id=${r.id}" style="color:inherit">${esc(r.title)}</a></h3>
        <p class="meta">
          <span>${icon('calendar')}${fmtDate(r.date)}</span>
          <span>${icon('clock')}${fmtTime(r.time)}</span>
          <span>${icon('pin')}${esc(r.venue)}</span>
        </p>
      </div>
      <div class="row-actions">
        <span class="badge ${r.is_past ? 'badge-muted' : 'badge-success'}">${r.is_past ? 'Attended' : 'Confirmed'}</span>
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
       <p>Find something interesting and register in one click.</p><a class="btn btn-primary" href="/">Browse events</a></div>`;
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
