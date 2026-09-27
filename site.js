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

})();
