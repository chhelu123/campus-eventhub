// Home page: list events with search, category chips, date range and upcoming/past toggle.
const state = { search: '', category: '', from: '', to: '', when: 'upcoming' };
let debounceTimer;

function eventRow(e) {
  const { d, m, wd } = dateParts(e.date);
  let status = '';
  if (e.is_registered) status = `<span class="tag tag-ok">${icon('check')} Registered</span>`;
  else if (e.is_past) status = `<span class="tag">Completed</span>`;
  else if (e.seats_left === 0) status = `<span class="tag tag-full">Full</span>`;
  const low = !e.is_past && e.seats_left > 0 && e.seats_left <= e.capacity * 0.2;

  return `
    <a class="ev cat-${esc(e.category)}" href="/event?id=${e.id}">
      <div class="ev-date"><span class="wd">${wd}</span><span class="d">${d}</span><span class="m">${m}</span></div>
      <div>
        <span class="cat-label">${esc(e.category)}</span>
        <h3 class="ev-title">${esc(e.title)}</h3>
        <p class="ev-meta"><span>${fmtTime(e.time)}</span><span>${esc(e.venue)}</span><span>${esc(e.organizer)}</span></p>
        <p class="ev-desc">${esc(e.description)}</p>
      </div>
      <div class="ev-side">
        ${e.is_past
          ? `<span class="seats-left">${e.registered_count} attended</span>`
          : `<span class="seats-left${low ? ' low' : ''}">${e.seats_left} of ${e.capacity} seats left</span>`}
        ${status}
      </div>
    </a>`;
}

// Insert a month heading whenever the month changes, so the list reads like a calendar.
function agenda(events) {
  let lastMonth = '';
  return events.map((e) => {
    const month = monthLabel(e.date);
    const head = month !== lastMonth ? `<h3 class="month">${month}</h3>` : '';
    lastMonth = month;
    return head + eventRow(e);
  }).join('');
}

async function loadEvents() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '<div class="skeleton"></div>'.repeat(4);
  const params = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
  try {
    const { events, count } = await api('/events?' + params);
    const titles = { upcoming: 'Upcoming events', past: 'Past events', all: 'All events' };
    document.getElementById('results-title').textContent = (state.category ? state.category + ' - ' : '') + titles[state.when];
    document.getElementById('results-count').textContent = `${count} event${count === 1 ? '' : 's'}`;
    grid.innerHTML = events.length
      ? agenda(events)
      : `<div class="empty">${icon('search')}<h3>No events match your filters</h3><p>Try a different search term or clear the filters.</p></div>`;
  } catch (err) {
    grid.innerHTML = `<div class="empty"><h3>Could not load events</h3><p>${esc(err.message)}</p></div>`;
  }
}

async function loadHeroStats() {
  const { events } = await api('/events?when=upcoming');
  const seats = events.reduce((s, e) => s + e.seats_left, 0);
  const cats = new Set(events.map((e) => e.category)).size;
  document.getElementById('hero-stats').innerHTML = `
    <span><strong>${events.length}</strong> upcoming events</span>
    <span><strong>${cats}</strong> categories</span>
    <span><strong>${seats}</strong> seats still open</span>`;
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
