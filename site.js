(() => {
  // Clock and EA status (Mon–Fri 9–6 PT, weekends urgent only)
  const clock = document.getElementById('clock');
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
  const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
  tick(); setStatus();
  setInterval(() => { tick(); if (new Date().getSeconds() === 0) setStatus(); }, 1000);

  // Task steps expand in place
  document.querySelectorAll('.depth').forEach(b => {
    b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open);
      document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
    });
  });

  // Who does the work: the agents' share (solid) grows while in view, on a loop
  (() => {
    const ea = document.getElementById('share-ea'), ag = document.getElementById('share-ag'), when = document.getElementById('share-when');
    if (!ea) return;
    const W = 600, FROM = 0.9, TO = 0.2, RUN = 5000, HOLD = 1800;
    const set = f => {
      const x = Math.round(W * f);
      ea.setAttribute('width', Math.max(0, x - 1));
      ag.setAttribute('x', x); ag.setAttribute('width', W - x);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { set(TO); when.textContent = 'EVENTUALLY'; return; }
    let visible = false, t0 = null;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) t0 = null; }).observe(ea.closest('figure'));
    const loop = now => {
      if (visible) {
        if (t0 === null) t0 = now;
        const t = (now - t0) % (RUN + HOLD);
        const u = Math.min(1, t / RUN), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        set(FROM + (TO - FROM) * e);
        when.textContent = u < 0.15 ? 'START' : u < 1 ? 'OVER TIME' : 'EVENTUALLY';
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  })();

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
})();
