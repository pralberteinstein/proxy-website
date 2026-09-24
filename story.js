// Readme story: you and your EA become one face; an agent grows in the seam.
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
  const T = { a: 0, b: 800, merge: 2000, mergeEnd: 3200, agent: 3400, agentEnd: 4600 };
  const STEPS = [[T.a, '01 You'], [T.b, '02 Your EA'], [T.merge, '03 Your better half'], [T.agent, '04 + an agent in the seam']];

  let W, H, p, parts = [], seam = [], t0 = Infinity, mouse = null;

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    p = Math.max(3, Math.min(7, Math.floor(Math.min(W / 58, H / 20))));
    const y0 = Math.round((H - G * p) / 2);
    const left = Math.round(W * 0.25 - (G * p) / 2);
    const right = Math.round(W * 0.75 - (G * p) / 2);
    const mid = Math.round(W * 0.5 - (G * p) / 2);

    parts = [];
    const add = (list, ox, src, appearFrom) => list.forEach(px => {
      const keep = src === 'you' ? px.x <= 8 : px.x >= 9; // left half of you, right half of your EA
      parts.push({
        ...px, src, keep,
        sx: ox + px.x * p, sy: y0 + px.y * p,
        tx: mid + px.x * p, ty: y0 + px.y * p,
        appear: appearFrom + Math.random() * 700,
        drift: (Math.random() - 0.5) * 30, fall: 20 + Math.random() * 30,
        ox: 0, oy: 0, vx: 0, vy: 0,
      });
    });
    add(pixels(hairYou), left, 'you', T.a);
    add(pixels(hairEA), right, 'ea', T.b);

    seam = [];
    const cols = new Set(parts.filter(q => q.keep).map(q => q.y));
    [...cols].sort((a, b) => a - b).forEach((y, i) =>
      seam.push({ x: mid + 9 * p, y: y0 + y * p, at: T.agent + i * 55 }));
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

    const m = clamp((t - T.merge) / (T.mergeEnd - T.merge));
    const em = ease(m);

    for (const q of parts) {
      if (t < q.appear) continue;
      // Cursor pushes pixels away; they spring back
      if (mouse) {
        const dx = q.sx + (q.tx - q.sx) * (q.keep ? em : 0) + q.ox - mouse.x;
        const dy = q.sy + q.oy - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 900) { const f = (900 - d2) / 900; q.vx += (dx / 30) * f * 1.6; q.vy += (dy / 30) * f * 1.6; }
      }
      q.vx += -q.ox * 0.08; q.vy += -q.oy * 0.08; q.vx *= 0.8; q.vy *= 0.8;
      q.ox += q.vx; q.oy += q.vy;

      let x, y, a = clamp((t - q.appear) / 120);
      if (q.keep) { x = q.sx + (q.tx - q.sx) * em; y = q.sy; }
      else { x = q.sx + q.drift * em; y = q.sy + q.fall * em; a *= 1 - em; }
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = ink;
      const s = q.k === 'dither' ? p - 1 : p;
      ctx.fillRect(Math.round(x + q.ox), Math.round(y + q.oy), s, s);
    }
    ctx.globalAlpha = 1;

    // Agent: hollow squares climb the seam, then keep quietly checking pixels on both sides
    if (t >= T.agent) {
      ctx.strokeStyle = faint; ctx.lineWidth = 1;
      for (const s of seam) {
        if (t < s.at) continue;
        const a = clamp((t - s.at) / 150);
        ctx.globalAlpha = a;
        ctx.strokeRect(Math.round(s.x - p / 2) + 0.5, Math.round(s.y) + 0.5, p - 1, p - 1);
      }
      if (t > T.agentEnd) {
        const kept = parts.filter(q => q.keep);
        const n = 3, beat = Math.floor(t / 420);
        for (let i = 0; i < n; i++) {
          const q = kept[(beat * 7 + i * 31) % kept.length];
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = ink;
          ctx.strokeRect(Math.round(q.tx + q.ox) - 1.5, Math.round(q.ty + q.oy) - 1.5, p + 2, p + 2);
        }
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
