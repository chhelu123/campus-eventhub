// Home page: list events with search, category chips, date range and upcoming/past toggle.
const state = { search: '', category: '', from: '', to: '', when: 'upcoming' };
let debounceTimer;

function eventCard(e) {
  const { d, m } = dateParts(e.date);
  let status = '';
  if (e.is_registered) status = `<span class="badge status ok">${icon('check')} Registered</span>`;
  else if (e.is_past) status = `<span class="badge status">Completed</span>`;
  else if (e.seats_left === 0) status = `<span class="badge status">Full</span>`;

  return `
    <a class="card" href="/event?id=${e.id}">
      <div class="banner cat-${esc(e.category)}">
        ${icon(e.category, 'cat-icon')}
        <span class="badge">${esc(e.category)}</span>
        ${status}
        <div class="date-badge"><span class="d">${d}</span><span class="m">${m}</span></div>
      </div>
      <div class="card-body">
        <h3>${esc(e.title)}</h3>
        <p class="meta"><span>${icon('clock')}${fmtTime(e.time)}</span><span>${icon('pin')}${esc(e.venue)}</span></p>
        <p class="desc">${esc(e.description)}</p>
      </div>
      <div class="card-foot">
        <div class="seats">${seatsBar(e)}<small>${e.is_past ? `${e.registered_count} attended` : `${e.seats_left} of ${e.capacity} seats left`}</small></div>
        <span class="link-arrow">Details &rarr;</span>
      </div>
    </a>`;
}

async function loadEvents() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '<div class="skeleton"></div>'.repeat(3);
  const params = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
  try {
    const { events, count } = await api('/events?' + params);
    const titles = { upcoming: 'Upcoming events', past: 'Past events', all: 'All events' };
    document.getElementById('results-title').textContent = (state.category ? state.category + ' - ' : '') + titles[state.when];
    document.getElementById('results-count').textContent = `${count} event${count === 1 ? '' : 's'} found`;
    grid.innerHTML = events.length
      ? events.map(eventCard).join('')
      : `<div class="empty" style="grid-column:1/-1">${icon('search')}<h3>No events match your filters</h3><p>Try a different search term or clear the filters.</p></div>`;
  } catch (err) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Could not load events</h3><p>${esc(err.message)}</p></div>`;
  }
}

async function loadHeroStats() {
  const { events } = await api('/events?when=upcoming');
  const seats = events.reduce((s, e) => s + e.seats_left, 0);
  const cats = new Set(events.map((e) => e.category)).size;
  document.getElementById('hero-stats').innerHTML = `
    <div><strong>${events.length}</strong><span>Upcoming events</span></div>
    <div><strong>${cats}</strong><span>Categories</span></div>
    <div><strong>${seats}</strong><span>Seats available</span></div>`;
}

async function setupFilters() {
  const { categories } = await api('/events/categories');
  const chips = document.getElementById('chips');
  const when = document.getElementById('when');
  categories.forEach((c) => when.insertAdjacentHTML('beforebegin', `<button type="button" class="chip" data-cat="${esc(c)}">${esc(c)}</button>`));

  chips.addEventListener('click', (ev) => {
    const chip = ev.target.closest('.chip');
    if (!chip) return;
    chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
    state.category = chip.dataset.cat;
    loadEvents();
  });
  when.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    when.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    state.when = b.dataset.when;
    loadEvents();
  });
  document.getElementById('search').addEventListener('input', (ev) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { state.search = ev.target.value.trim(); loadEvents(); }, 250);
  });
  for (const id of ['from', 'to']) {
    document.getElementById(id).addEventListener('change', (ev) => {
      state[id] = ev.target.value;
      if (state.from && state.to && state.from > state.to) return toast('"From" date must be before "To" date', 'error');
      loadEvents();
    });
  }
  document.getElementById('reset').addEventListener('click', () => {
    document.getElementById('filters').reset();
    Object.assign(state, { search: '', category: '', from: '', to: '', when: 'upcoming' });
    chips.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    when.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x.dataset.when === 'upcoming'));
    loadEvents();
  });
}

(async () => {
  await initPage();
  await setupFilters();
  loadHeroStats();
  loadEvents();
})();
