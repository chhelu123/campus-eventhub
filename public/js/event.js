// Event details page: show one event and let the student register or cancel.
const eventId = qs('id');

function actionHtml(e, user) {
  if (e.is_past) return `<button class="btn btn-outline btn-block btn-lg" disabled>Event completed</button>`;
  if (!user) return `<a class="btn btn-primary btn-block btn-lg" href="/login?next=${encodeURIComponent('/event?id=' + e.id)}">Log in to register</a>`;
  if (e.is_registered) {
    return `<p class="registered">${icon('check')} You are registered for this event</p>
            <button class="btn btn-danger-soft btn-block" id="cancel-btn">Cancel registration</button>`;
  }
  if (e.seats_left === 0) return `<button class="btn btn-outline btn-block btn-lg" disabled>Event is full</button>`;
  return `<button class="btn btn-primary btn-block btn-lg" id="register-btn">Register for this event</button>`;
}

function render(e, user) {
  document.title = `${e.title} | Campus EventHub`;
  document.getElementById('detail').innerHTML = `
    <nav class="crumbs"><a href="/">Events</a><span>/</span>${esc(e.category)}</nav>
    <header class="detail-head cat-${esc(e.category)}">
      <span class="cat-label">${esc(e.category)}</span>
      <h1>${esc(e.title)}</h1>
      <p class="ev-meta"><span>${fmtDate(e.date)}</span><span>${fmtTime(e.time)}</span><span>${esc(e.venue)}</span></p>
    </header>
    <div class="detail">
      <article class="detail-body">
        <h2>About the event</h2>
        <p>${esc(e.description)}</p>
        <h2 style="margin-top:1.6rem">Organised by</h2>
        <p>${esc(e.organizer)}</p>
      </article>
      <aside class="factbox">
        <dl>
          <dt>Date</dt><dd>${fmtDate(e.date)}</dd>
          <dt>Time</dt><dd>${fmtTime(e.time)}</dd>
          <dt>Venue</dt><dd>${esc(e.venue)}</dd>
          <dt>Organiser</dt><dd>${esc(e.organizer)}</dd>
          <dt>Seats</dt><dd>${e.seats_left} of ${e.capacity} left</dd>
        </dl>
        ${seatsBar(e)}
        <div style="margin-top:1rem">${actionHtml(e, user)}</div>
        <p class="reg-status">${e.registered_count} student${e.registered_count === 1 ? '' : 's'} registered so far.</p>
      </aside>
    </div>`;

  const reg = document.getElementById('register-btn');
  if (reg) reg.onclick = () => act('POST', reg, 'Registration confirmed.');
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
