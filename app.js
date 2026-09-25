(() => {
  const desk = document.getElementById('desk');
  const isPhone = () => matchMedia('(max-width: 720px)').matches;
  let z = 10;

  // Clock
  const clock = document.getElementById('clock');
  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  // EA status follows working hours: Mon–Fri 9–6 PT, weekends urgent only
  const status = document.getElementById('status');
  const statusText = document.getElementById('status-text');
  const setStatus = () => {
    const pt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(new Date());
    const day = pt.find(p => p.type === 'weekday').value;
    const hour = parseInt(pt.find(p => p.type === 'hour').value, 10) % 24;
    const weekend = day === 'Sat' || day === 'Sun';
    const online = !weekend && hour >= 9 && hour < 18;
    status.classList.toggle('off', !online);
    statusText.textContent = online ? 'EA online' : weekend ? 'Weekend · urgent only' : 'Back at 9 AM PT';
  };
  tick();
  setStatus();
  setInterval(() => { tick(); if (new Date().getSeconds() === 0) setStatus(); }, 1000);

  // Windows
  const wins = [...document.querySelectorAll('.win')];

  function place(win) {
    if (win.dataset.placed || isPhone()) return;
    const r = desk.getBoundingClientRect();
    const x = (parseFloat(win.dataset.x) / 100) * r.width;
    const y = (parseFloat(win.dataset.y) / 100) * r.height;
    win.style.left = Math.max(8, Math.min(x, r.width - win.offsetWidth - 8)) + 'px';
    win.style.top = Math.max(8, Math.min(y, r.height - win.offsetHeight - 8)) + 'px';
    win.dataset.placed = '1';
  }

  // First time the ledger comes forward (after load), its first "steps" button blinks for 3s
  let ready = false, ledgerBlinked = false;
  function hintLedger() {
    const b = document.querySelector('.ledger .depth');
    if (!b) return;
    ledgerBlinked = true;
    setTimeout(() => b.classList.add('blink'), 400);
  }

  function front(win) {
    if (ready && win.id === 'ledger' && !ledgerBlinked) hintLedger();
    wins.forEach(w => w.classList.remove('front'));
    win.classList.add('front');
    win.style.zIndex = ++z;
    document.querySelectorAll('.icon').forEach(i => i.classList.toggle('active', i.dataset.open === win.id));
  }

  function open(id) {
    const win = document.getElementById(id);
    if (!win) return;
    const wasHidden = win.hidden;
    win.hidden = false;
    place(win);
    front(win);
    if (wasHidden && id === 'ledger') playLedger();
    history.replaceState(null, '', '#' + id);
  }

  function close(win) {
    win.hidden = true;
    win.classList.remove('front');
    const top = wins.filter(w => !w.hidden).sort((a, b) => b.style.zIndex - a.style.zIndex)[0];
    if (top) front(top);
    else {
      document.querySelectorAll('.icon').forEach(i => i.classList.remove('active'));
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  wins.forEach(win => {
    win.addEventListener('pointerdown', () => front(win));
    win.querySelector('.close').addEventListener('click', e => { e.stopPropagation(); close(win); });
  });

  // Drag windows by title bar, icons anywhere (click still opens)
  function draggable(el, handle, onClick) {
    handle.addEventListener('pointerdown', e => {
      if (isPhone() || e.target.closest('.close')) return;
      const r = desk.getBoundingClientRect();
      const start = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop };
      let moved = false;
      handle.setPointerCapture(e.pointerId);
      const move = ev => {
        const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        moved = true;
        el.style.left = Math.max(0, Math.min(start.l + dx, r.width - el.offsetWidth)) + 'px';
        el.style.top = Math.max(0, Math.min(start.t + dy, r.height - 28)) + 'px';
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        if (!moved && onClick) onClick();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  wins.forEach(win => draggable(win, win.querySelector('.win-bar')));

  document.querySelectorAll('.icon').forEach(icon => {
    const openIt = () => open(icon.dataset.open);
    draggable(icon, icon, openIt);
    icon.addEventListener('click', e => { if (isPhone() || e.detail === 0) openIt(); });
  });

  document.querySelectorAll('a[data-open]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); open(a.dataset.open); });
  });

  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'Escape') {
      const f = document.querySelector('.win.front');
      if (f) close(f);
    }
    if (e.key === 'g') desk.classList.toggle('grid');
  });

  // Ledger rows arrive one by one
  let played = false;
  function playLedger() {
    const rows = [...document.querySelectorAll('.ledger tbody tr')];
    if (played || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      rows.forEach(r => r.classList.add('in'));
      return;
    }
    played = true;
    rows.forEach((r, i) => setTimeout(() => r.classList.add('in'), 180 * i + 150));
  }

  // Ledger: expand a task to see every step
  document.querySelectorAll('.depth').forEach(b => {
    b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open);
      b.classList.remove('blink');
      document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
    });
  });

  // Form (not wired to a backend yet)
  document.getElementById('access-form').addEventListener('submit', e => {
    e.preventDefault();
    const note = document.getElementById('form-note');
    note.textContent = 'Received. Thank you.';
    e.target.querySelector('.submit').disabled = true;
  });

  // Draft files only show with ?preview
  if (new URLSearchParams(location.search).has('preview')) {
    document.body.classList.add('preview');
    document.getElementById('item-count').textContent = '6 items';
  }

  // Initial state
  const hash = location.hash.slice(1);
  const playStory = () => window.dispatchEvent(new Event('story:play'));
  if (isPhone()) {
    open(hash || 'readme');
    playStory();
  } else {
    // Readme on top from the start; ledger loads behind it
    open('ledger');
    open('readme');
    playStory();
    if (hash && hash !== 'readme' && hash !== 'ledger') open(hash);
  }
  ready = true;
})();
