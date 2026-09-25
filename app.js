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

  // First time the team folder opens, Operator 001 is pre-selected and blinks for 3s
  let teamHinted = false;
  function hintTeam() {
    const item = document.querySelector('.finder-item[data-open="operator"]');
    if (!item) return;
    teamHinted = true;
    item.classList.add('selected');
    setTimeout(() => item.classList.add('blink'), 300);
  }

  function front(win) {
    if (ready && win.id === 'ledger' && !ledgerBlinked) hintLedger();
    if (win.id === 'team' && !teamHinted) hintTeam();
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

  // Method Fig. 2: the agents' share (solid) grows as the EA's (outline) shrinks, on a loop
  (() => {
    const ea = document.getElementById('share-ea'), ag = document.getElementById('share-ag'), when = document.getElementById('share-when');
    const method = document.getElementById('method');
    if (!ea) return;
    const W = 600, FROM = 0.9, TO = 0.2, RUN = 5000, HOLD = 1800;
    const set = f => {
      const x = Math.round(W * f);
      ea.setAttribute('width', Math.max(0, x - 1));
      ag.setAttribute('x', x); ag.setAttribute('width', W - x);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { set(TO); when.textContent = 'OVER TIME'; return; }
    let t0 = null;
    const tick = now => {
      if (!method.hidden) {
        if (t0 === null) t0 = now;
        const t = (now - t0) % (RUN + HOLD);
        const u = Math.min(1, t / RUN), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        set(FROM + (TO - FROM) * e);
        when.textContent = u < 0.15 ? 'START' : u < 1 ? 'OVER TIME' : 'EVENTUALLY';
      } else t0 = null;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  // Ledger: expand a task to see every step
  document.querySelectorAll('.depth').forEach(b => {
    b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open);
      b.classList.remove('blink');
      document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
    });
  });

  // Request access: emailed to the team via FormSubmit, in the background
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/pranjali@sabi.com';
  document.getElementById('access-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target, note = document.getElementById('form-note'), btn = form.querySelector('.submit');
    const data = Object.fromEntries(new FormData(form));
    btn.disabled = true;
    note.textContent = 'Sending…';
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...data, _subject: `Proxy access request: ${data.name || ''}${data.company ? ' (' + data.company + ')' : ''}`, _template: 'table', _replyto: data.email }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || String(out.success) !== 'true') throw new Error(out.message || res.status);
      note.textContent = 'Received. Thank you.';
    } catch {
      btn.disabled = false;
      note.textContent = 'That didn’t go through. Try again, or email pranjali@sabi.com.';
    }
  });

  // Draft files only show with ?preview
  if (new URLSearchParams(location.search).has('preview')) {
    document.body.classList.add('preview');
    document.getElementById('item-count').textContent = '6 items';
  }

  // Drop a few icons at random spots just right of a window, not overlapping each other
  function scatterIcons(ids, beside) {
    const d = desk.getBoundingClientRect(), b = beside.getBoundingClientRect();
    const x0 = b.right - d.left + 24, x1 = Math.min(x0 + 200, d.width * 0.8 - 100);
    const y0 = b.top - d.top, y1 = Math.min(y0 + b.height + 60, d.height - 100);
    const placed = [];
    ids.forEach(id => {
      const icon = document.querySelector(`.icon[data-open="${id}"]`);
      if (!icon) return;
      let x, y, tries = 0;
      do {
        x = x0 + Math.random() * Math.max(0, x1 - x0);
        y = y0 + Math.random() * Math.max(0, y1 - y0);
      } while (tries++ < 40 && placed.some(p => Math.hypot(p.x - x, p.y - y) < 110));
      placed.push({ x, y });
      icon.style.left = Math.round(x) + 'px';
      icon.style.top = Math.round(y) + 'px';
    });
  }

  // Phone: a different reading order through the Next links
  function phoneOrder() {
    const setNext = (from, to, label) => {
      const a = document.querySelector(`#${from} .next`);
      if (!a) return;
      a.dataset.open = to;
      a.querySelector('span:nth-child(2)').textContent = label;
    };
    setNext('readme', 'terms', 'terms.pdf');
    setNext('terms', 'method', 'method.svg');
    setNext('kai', 'access', 'request-access');
  }

  // Initial state
  const hash = location.hash.slice(1);
  const playStory = () => window.dispatchEvent(new Event('story:play'));
  if (isPhone()) {
    phoneOrder();
    open(hash || 'readme');
    playStory();
  } else {
    // Readme and terms open; method, team and trash sit loose beside terms
    open('terms');
    open('readme');
    playStory();
    scatterIcons(['method', 'team', 'trash'], document.getElementById('terms'));
    if (hash && hash !== 'readme' && hash !== 'terms') open(hash);
  }
  ready = true;
})();
