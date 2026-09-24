// Readme story: you and your EA become one face; an agent learns it, line by line.
(() => {
  const canvas = document.getElementById('story');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const stepEl = document.getElementById('story-step');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const G = 18; // face grid
  const face = (x, y) => ((x - 8.5) / 5.2) ** 2 + ((y - 9.8) / 6.2) ** 2 <= 1;
  const hairYou = (x, y) =>
    (((x - 8.5) / 7) ** 2 + ((y - 6) / 5) ** 2 <= 1 && y <= 6) ||
    ((x <= 3 || x >= 14) && y >= 4 && y <= 17 && Math.abs(x - 8.5) <= 7);
  const hairEA = (x, y) =>
    (((x - 8.5) / 6.2) ** 2 + ((y - 5.5) / 3.6) ** 2 <= 1 && y <= 6) ||
    (y === 7 && x >= 4 && x <= 7);
  const features = (x, y) =>
    (y === 10 && (x === 6 || x === 7 || x === 10 || x === 11)) || (y === 13 && x >= 7 && x <= 10);

  function pixels(hair) {
    const out = [];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      if (hair(x, y)) out.push({ x, y, k: 'solid' });
      else if (features(x, y)) out.push({ x, y, k: 'solid' });
      else if (face(x, y) && (x + y) % 2 === 0) out.push({ x, y, k: 'dither' });
    }
    return out;
  }

  // Timeline (ms)
  const T = { a: 0, b: 2200, merge: 4400, mergeEnd: 5900, shift: 6900, shiftEnd: 7600, scan: 7800, scanEnd: 10200 };
  const SPREAD = 600; // how long each face takes to draw in
  const STEPS = [[T.a, '01 You'], [T.b, '02 Your EA'], [T.merge, '03 Your better half'], [T.shift, '04 An agent learns from you both']];

  let W, H, p, y0, copyX, parts = [], t0 = Infinity, mouse = null;

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    p = Math.max(3, Math.min(7, Math.floor(Math.min(W / 58, H / 20))));
    y0 = Math.round((H - G * p) / 2);
    const left = Math.round(W * 0.25 - (G * p) / 2);
    const right = Math.round(W * 0.75 - (G * p) / 2);
    const mid = Math.round(W * 0.5 - (G * p) / 2);
    const human = Math.round(W * 0.3 - (G * p) / 2);
    copyX = Math.round(W * 0.7 - (G * p) / 2);

    parts = [];
    const add = (list, ox, src, appearFrom) => list.forEach(px => {
      const keep = src === 'you' ? px.x <= 8 : px.x >= 9; // left half of you, right half of your EA
      parts.push({
        ...px, src, keep,
        sx: ox + px.x * p, sy: y0 + px.y * p,
        tx: mid + px.x * p, ty: y0 + px.y * p, hx: human + px.x * p,
        appear: appearFrom + Math.random() * SPREAD,
        drift: (Math.random() - 0.5) * 30, fall: 20 + Math.random() * 30,
        ox: 0, oy: 0, vx: 0, vy: 0,
      });
    });
    add(pixels(hairYou), left, 'you', T.a);
    add(pixels(hairEA), right, 'ea', T.b);

  }

  const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  function colors() {
    const cs = getComputedStyle(document.documentElement);
    return { ink: cs.getPropertyValue('--ink').trim() || '#111', faint: cs.getPropertyValue('--ink-3').trim() || 'rgba(0,0,0,.45)' };
  }

  function frame(now) {
    const t = reduce ? T.agentEnd + 1000 : now - t0;
    const { ink, faint } = colors();
    ctx.clearRect(0, 0, W, H);

    const em = ease(clamp((t - T.merge) / (T.mergeEnd - T.merge)));
    const es = ease(clamp((t - T.shift) / (T.shiftEnd - T.shift)));
    const scan = clamp((t - T.scan) / (T.scanEnd - T.scan)); // 0..1 down the face
    const scanY = y0 + scan * G * p;

    for (const q of parts) {
      if (t < q.appear) continue;
      // Cursor pushes pixels away; they spring back
      if (mouse) {
        const dx = (q.keep ? q.sx + (q.tx - q.sx) * em + (q.hx - q.tx) * es : q.sx) + q.ox - mouse.x;
        const dy = q.sy + q.oy - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 900) { const f = (900 - d2) / 900; q.vx += (dx / 30) * f * 1.6; q.vy += (dy / 30) * f * 1.6; }
      }
      q.vx += -q.ox * 0.08; q.vy += -q.oy * 0.08; q.vx *= 0.8; q.vy *= 0.8;
      q.ox += q.vx; q.oy += q.vy;

      let x, y, a = clamp((t - q.appear) / 120);
      if (q.keep) { x = q.sx + (q.tx - q.sx) * em + (q.hx - q.tx) * es; y = q.sy; }
      else { x = q.sx + q.drift * em; y = q.sy + q.fall * em; a *= 1 - em; }
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = ink;
      const s = q.k === 'dither' ? p - 1 : p;
      ctx.fillRect(Math.round(x + q.ox), Math.round(y + q.oy), s, s);
    }
    ctx.globalAlpha = 1;

    // Agent: a scan line reads the face; an outlined copy builds on the right, row by row
    if (t >= T.scan) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1;
      for (const q of parts) {
        if (!q.keep || q.ty >= scanY) continue;
        const s = q.k === 'dither' ? p - 2 : p - 1;
        ctx.globalAlpha = clamp((scanY - q.ty) / (p * 2));
        ctx.strokeRect(copyX + q.x * p + 0.5, q.ty + 0.5, s, s);
      }
      if (scan < 1) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = ink;
        const x0 = Math.round(W * 0.3 - (G * p) / 2) - p, x1 = copyX + G * p + p;
        ctx.fillRect(x0, Math.round(scanY), x1 - x0, 1);
      }
      ctx.globalAlpha = 1;
    }

    const step = STEPS.filter(([at]) => t >= at).pop();
    if (step && stepEl.textContent !== step[1]) stepEl.textContent = step[1];
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
