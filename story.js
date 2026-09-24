// Readme story: you leave the room, your EA steps into your outline, an agent learns from them.
(() => {
  const canvas = document.getElementById('story');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const stepEl = document.getElementById('story-step');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const G = 18; // face grid
  const face = (x, y) => ((x - 8.5) / 5.2) ** 2 + ((y - 9.8) / 6.2) ** 2 <= 1;
  const hair = (x, y) =>
    (((x - 8.5) / 6.2) ** 2 + ((y - 5.5) / 3.6) ** 2 <= 1 && y <= 6) ||
    (y === 7 && x >= 4 && x <= 7);
  const features = (x, y) =>
    (y === 10 && (x === 6 || x === 7 || x === 10 || x === 11)) || (y === 13 && x >= 7 && x <= 10);

  function pixels(shape) {
    const out = [];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      if (shape(x, y) || features(x, y)) out.push({ x, y, k: 'solid' });
      else if (face(x, y) && (x + y) % 2 === 0) out.push({ x, y, k: 'dither' });
    }
    return out;
  }

  // Timeline (ms)
  const T = {
    you: 0, ea: 2200,
    leave: 4400, leaveEnd: 5200,      // your face fades to an outline
    step: 5400, stepEnd: 6700,        // your EA slides into it
    scan: 7900, scanEnd: 10300,       // an agent reads them, row by row
  };
  const SPREAD = 600;
  const STEPS = [[T.you, '01 You'], [T.ea, '02 Your EA'], [T.leave, '03 They think like you'], [T.scan - 300, '04 An agent learns from them']];

  let W, H, p, y0, youX, eaX, you = [], ea = [], t0 = Infinity, mouse = null;

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    p = Math.max(3, Math.min(7, Math.floor(Math.min(W / 58, H / 20))));
    y0 = Math.round((H - G * p) / 2);
    youX = Math.round(W * 0.3 - (G * p) / 2);
    eaX = Math.round(W * 0.7 - (G * p) / 2);
    const mk = (list, start) => list.map(px => ({ ...px, appear: start + Math.random() * SPREAD, ox: 0, oy: 0, vx: 0, vy: 0 }));
    // Same silhouette for both, so your EA fits your outline exactly
    you = mk(pixels(hair), T.you);
    ea = mk(pixels(hair), T.ea);
  }

  const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  function colors() {
    const cs = getComputedStyle(document.documentElement);
    return { ink: cs.getPropertyValue('--ink').trim() || '#111', faint: cs.getPropertyValue('--ink-3').trim() || 'rgba(0,0,0,.45)' };
  }

  // Cursor pushes pixels away; they spring back
  function nudge(q, x, y) {
    if (mouse) {
      const dx = x + q.ox - mouse.x, dy = y + q.oy - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 900) { const f = (900 - d2) / 900; q.vx += (dx / 30) * f * 1.6; q.vy += (dy / 30) * f * 1.6; }
    }
    q.vx += -q.ox * 0.08; q.vy += -q.oy * 0.08; q.vx *= 0.8; q.vy *= 0.8;
    q.ox += q.vx; q.oy += q.vy;
  }

  function frame(now) {
    const t = reduce ? T.scanEnd + 1000 : now - t0;
    const { ink, faint } = colors();
    ctx.clearRect(0, 0, W, H);

    const leave = ease(clamp((t - T.leave) / (T.leaveEnd - T.leave)));
    const step = ease(clamp((t - T.step) / (T.stepEnd - T.step)));
    const scan = clamp((t - T.scan) / (T.scanEnd - T.scan));
    const scanY = y0 + scan * G * p;

    // You: solid, then an outline once you've left
    for (const q of you) {
      if (t < q.appear) continue;
      const x = youX + q.x * p, y = y0 + q.y * p;
      nudge(q, x, y);
      const a = clamp((t - q.appear) / 120);
      const X = Math.round(x + q.ox), Y = Math.round(y + q.oy);
      const s = q.k === 'dither' ? p - 1 : p;
      if (leave < 1) { ctx.globalAlpha = a * (1 - leave); ctx.fillStyle = ink; ctx.fillRect(X, Y, s, s); }
      if (leave > 0 && q.k === 'solid') {
        ctx.globalAlpha = leave; ctx.strokeStyle = faint; ctx.lineWidth = 1;
        ctx.strokeRect(X + 0.5, Y + 0.5, p - 1, p - 1);
      }
    }

    // Your EA: solid, then slides into your outline
    for (const q of ea) {
      if (t < q.appear) continue;
      const x = eaX + (youX - eaX) * step + q.x * p, y = y0 + q.y * p;
      nudge(q, x, y);
      ctx.globalAlpha = clamp((t - q.appear) / 120);
      ctx.fillStyle = ink;
      const s = q.k === 'dither' ? p - 1 : p;
      ctx.fillRect(Math.round(x + q.ox), Math.round(y + q.oy), s, s);
    }

    // Agent: a scan line reads your EA; an outlined copy builds where they stood
    if (t >= T.scan) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1;
      for (const q of ea) {
        const qy = y0 + q.y * p;
        if (qy >= scanY) continue;
        const s = q.k === 'dither' ? p - 2 : p - 1;
        ctx.globalAlpha = clamp((scanY - qy) / (p * 2));
        ctx.strokeRect(eaX + q.x * p + 0.5, qy + 0.5, s, s);
      }
      if (scan < 1) {
        ctx.globalAlpha = 1; ctx.fillStyle = ink;
        const x0 = youX - p, x1 = eaX + G * p + p;
        ctx.fillRect(x0, Math.round(scanY), x1 - x0, 1);
      }
    }
    ctx.globalAlpha = 1;

    const cur = STEPS.filter(([at]) => t >= at).pop();
    if (cur && stepEl.textContent !== cur[1]) stepEl.textContent = cur[1];
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; });
  canvas.addEventListener('pointerleave', () => { mouse = null; });
  const play = () => { layout(); t0 = performance.now(); };
  canvas.addEventListener('click', play);
  window.addEventListener('story:play', play);
  new ResizeObserver(() => layout()).observe(canvas);

  layout();
  requestAnimationFrame(frame);
})();
