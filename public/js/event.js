// Event details page: show one event and let the student register or cancel.
const eventId = qs('id');

function actionHtml(e, user) {
  if (e.is_past) return `<button class="btn btn-outline btn-block btn-lg" disabled>Event completed</button>`;
  if (!user) return `<a class="btn btn-primary btn-block btn-lg" href="/login?next=${encodeURIComponent('/event?id=' + e.id)}">Log in to register</a>`;
  if (e.is_registered) {
    return `<div class="badge badge-success" style="width:100%;justify-content:center;padding:.6rem;margin-bottom:.6rem;font-size:.8rem">${icon('check')} You are registered</div>
            <button class="btn btn-danger-soft btn-block" id="cancel-btn">Cancel registration</button>`;
  }
  if (e.seats_left === 0) return `<button class="btn btn-outline btn-block btn-lg" disabled>Event is full</button>`;
  return `<button class="btn btn-primary btn-block btn-lg" id="register-btn">${icon('ticket')} Register now</button>`;
}

function render(e, user) {
  const info = (ic, label, value) => `<li><span class="ic">${icon(ic)}</span><div><small>${label}</small><strong>${value}</strong></div></li>`;
  document.title = `${e.title} | Campus EventHub`;
  document.getElementById('detail').innerHTML = `
    <div class="detail">
      <article class="panel">
        <div class="banner detail-banner cat-${esc(e.category)}">
          ${icon(e.category, 'cat-icon')}
          <span class="badge">${esc(e.category)}</span>
          <h1>${esc(e.title)}</h1>
        </div>
        <div class="detail-body">
          <h2>About this event</h2>
          <p>${esc(e.description)}</p>
          <h2 style="margin-top:1.5rem">Organised by</h2>
          <p>${esc(e.organizer)}</p>
        </div>
      </article>
      <aside class="panel side">
        <ul class="info-list">
          ${info('calendar', 'Date', fmtDate(e.date))}
          ${info('clock', 'Time', fmtTime(e.time))}
          ${info('pin', 'Venue', esc(e.venue))}
          ${info('building', 'Organizer', esc(e.organizer))}
          ${info('users', 'Seats', `${e.registered_count} registered &middot; ${e.seats_left} left`)}
        </ul>
        ${seatsBar(e)}
        <div style="margin-top:1rem">${actionHtml(e, user)}</div>
        <p class="reg-status">Capacity: ${e.capacity} participants</p>
      </aside>
    </div>`;

  const reg = document.getElementById('register-btn');
  if (reg) reg.onclick = () => act('POST', reg, 'You are registered! See you there.');
  const cancel = document.getElementById('cancel-btn');
  if (cancel) cancel.onclick = () => {
    if (confirm('Cancel your registration for this event?')) act('DELETE', cancel, 'Registration cancelled.');
  };
}

async function act(method, btn, okMsg) {
  btn.disabled = true;
  try {
    const { event } = await api(`/events/${eventId}/register`, { method });
    toast(okMsg);
    render(event, currentUser);
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
  }
}

(async () => {
  const user = await initPage();
  if (!eventId) { location.href = '/'; return; }
  try {
    const { event } = await api('/events/' + encodeURIComponent(eventId));
    render(event, user);
  } catch (err) {
    document.getElementById('detail').innerHTML =
      `<div class="empty"><h3>Event not found</h3><p>${esc(err.message)}</p><a class="btn btn-primary" href="/">Browse events</a></div>`;
  }
})();
