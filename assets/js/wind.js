// Windswept tree background.
// A tree is generated once from a fixed seed, then posed in N wind positions.
// Scrolling steps through the poses (at most ~12 per second, so it moves like
// stop-motion) and the tree freezes as soon as scrolling stops.
(function () {
  const svg = document.querySelector('.wind');
  if (!svg) return;
  const host = svg.querySelector('.frames');

  const D = Math.PI / 180;
  const STEP = 45;          // px of scrolling per pose
  const FRAME_MS = 85;      // minimum time between poses
  const GUST = [0.12, 0.3, 0.52, 0.74, 0.92, 1, 0.82, 0.6, 0.4, 0.22];
  const N = GUST.length;
  const COLOR = { tree: '#bababa', grassBack: '#e2e2e2', grassFront: '#c8c8c8' };

  // Small seeded random generator, so the tree looks the same on every visit.
  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- tree shape (built once) ----------
  const TREE = {
    seed: 29, trunkAngle: -74, trunkLen: 125, trunkWidth: 30, trunkCurve: 9, curl: 3, wiggle: 18,
    split3: 0.3, trunkSpread: 50, spread: 40, windTarget: -30, windPull: 0.14,
    lenMin: 0.7, lenVar: 0.18, upwindCut: 0.5, clampMin: -165, clampMax: -8,
    maxDepth: 8, renderDepth: 7, minLen: 7,
  };

  function buildTree(p) {
    const R = rng(p.seed);
    function grow(absStart, len, width, depth) {
      const curve = depth === 0 ? p.trunkCurve : (R() - 0.5) * p.wiggle + p.curl;
      const segs = depth < 2 ? 6 : depth < 4 ? 4 : 3;
      const b = { len, width, depth, curve, segs, kids: [], rel: 0 };
      const endAbs = absStart + curve;
      if (depth < p.maxDepth && len > p.minLen) {
        const n = depth === 0 ? 3 : (R() < p.split3 ? 3 : 2);
        const spread = depth === 0 ? p.trunkSpread : p.spread;
        for (let i = 0; i < n; i++) {
          let a = endAbs + (i / (n - 1) - 0.5) * spread * 1.2 + (R() - 0.5) * spread * 0.7;
          a += (p.windTarget - a) * p.windPull;          // prevailing wind pulls the crown downwind
          let l = len * (p.lenMin + R() * p.lenVar);
          if (a < -105) l *= p.upwindCut + R() * 0.15;   // windward side stays stunted
          else if (a > -75) l *= 1.08;                   // leeward side streams out
          a = clamp(a, p.clampMin, p.clampMax);
          const kid = grow(a, l, width * (0.64 + R() * 0.08), depth + 1);
          kid.rel = a - endAbs;
          b.kids.push(kid);
        }
      }
      return b;
    }
    const root = grow(p.trunkAngle, p.trunkLen, p.trunkWidth, 0);
    root.rel = p.trunkAngle;
    return root;
  }

  // ---------- one wind pose of the tree ----------
  const flex = d => 1.2 + d * 1.0;   // thin twigs bend more than the trunk
  function poseTree(root, g, seed, maxDepth) {
    const J = rng(seed), buckets = new Map();
    const box = { x0: 1e9, x1: -1e9, y0: 1e9 };
    (function walk(b, x, y, a) {
      const k = b.segs, l = b.len / k, w1 = b.width * 0.72;
      for (let i = 0; i < k; i++) {
        // wind pushes hardest on parts that stand across it; every twig also gets a small per-frame nudge
        a += (b.curve + g * flex(b.depth) * -Math.sin(a * D)) / k + (J() - 0.5) * 2 * (0.3 + b.depth * 0.65);
        const nx = x + Math.cos(a * D) * l, ny = y + Math.sin(a * D) * l;
        const w = Math.max(0.5, Math.round((b.width + (w1 - b.width) * (i + 0.5) / k) * 0.55 * 4) / 4);
        const key = w.toFixed(2);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push('M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'L' + nx.toFixed(1) + ' ' + ny.toFixed(1));
        if (nx < box.x0) box.x0 = nx; if (nx > box.x1) box.x1 = nx; if (ny < box.y0) box.y0 = ny;
        x = nx; y = ny;
      }
      for (const c of b.kids) if (c.depth <= maxDepth) walk(c, x, y, a + c.rel);
    })(root, 0, 0, root.rel);
    return { buckets, box };
  }

  // ---------- grass: low tufts, fuller near the tree, thinning toward the edges ----------
  function buildGrass(seed) {
    const R = rng(seed), blades = [];
    let x = -2600;
    while (x < 2600) {
      const d = Math.abs(x), near = Math.exp(-Math.pow(d / 600, 2)), far = Math.exp(-Math.pow(d / 1300, 2));
      x += (4 + R() * 12) / (0.3 + 0.7 * Math.max(far, near));
      if (R() > 0.2 + 0.8 * far) continue;
      const H = (14 + R() * 26) * (0.45 + 0.55 * far) * (1 + 0.6 * near), n = 5 + (R() * 8 | 0), back = R() < 0.4, by = 2 + R() * 6;
      for (let i = 0; i < n; i++)
        blades.push({ x: x + (R() - 0.5) * 12, y: by + R() * 3, h: H * (0.45 + R() * 0.55), lean: 0.2 + R() * 0.3,
                      fan: (R() - 0.5) * 0.3, bend: 0.6 + R() * 0.7, back });
    }
    return blades;
  }
  function poseGrass(blades, g, seed) {
    const J = rng(seed), back = [], front = [];
    for (const b of blades) {
      const tip = b.fan + (b.lean + g * 0.5 + (J() - 0.5) * 0.14) * b.bend * 1.4, root = b.fan * 0.6 + b.lean * 0.3;
      const y = b.back ? b.y - 3 : b.y, h = b.back ? b.h * 0.8 : b.h;
      const qx = b.x + Math.sin(root) * h * 0.55, qy = y - h * 0.55;
      const tx = b.x + Math.sin(tip) * h, ty = y - Math.cos(tip) * h * 0.95;
      (b.back ? back : front).push('M' + b.x.toFixed(1) + ' ' + y.toFixed(1) + 'Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1));
    }
    return { back: back.join(''), front: front.join('') };
  }

  // ---------- render every pose once ----------
  const tree = buildTree(TREE);
  const poses = GUST.map((g, i) => poseTree(tree, g, 1000 + i * 17, TREE.renderDepth));
  const grass = buildGrass(5);
  const box = poses.reduce((b, p) => ({ x0: Math.min(b.x0, p.box.x0), x1: Math.max(b.x1, p.box.x1), y0: Math.min(b.y0, p.box.y0) }),
                           { x0: 1e9, x1: -1e9, y0: 1e9 });
  const pad = 40;
  // the trunk base (y = 0) sits on the bottom edge of the screen
  svg.setAttribute('viewBox', [box.x0 - pad, box.y0 - pad, box.x1 - box.x0 + 2 * pad, -box.y0 + pad + 2].map(v => v.toFixed(0)).join(' '));
  const gt = 'translate(' + ((box.x0 + box.x1) / 2).toFixed(1) + ' 0)';

  let html = '';
  poses.forEach((p, i) => {
    const gr = poseGrass(grass, GUST[i], 2000 + i * 31);
    html += '<g class="frame"><path class="grass" transform="' + gt + '" d="' + gr.back + '" stroke="' + COLOR.grassBack + '" stroke-width=".85"/>';
    for (const [w, segs] of p.buckets) html += '<path d="' + segs.join('') + '" stroke="' + COLOR.tree + '" stroke-width="' + w + '"/>';
    html += '<path class="grass" transform="' + gt + '" d="' + gr.front + '" stroke="' + COLOR.grassFront + '" stroke-width=".85"/></g>';
  });
  host.innerHTML = html;
  const frames = [...host.querySelectorAll('.frame')];
  let cur = 0;
  frames[0].classList.add('on');
  function show(i) { frames[cur].classList.remove('on'); cur = i; frames[cur].classList.add('on'); }

  // ---------- scrolling drives the wind ----------
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let acc = 0, lastY = scrollY, lastSwap = 0, ticking = false;
  function feed(d) {
    acc = Math.min(acc + Math.abs(d), STEP * 3);
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
  }
  function tick(t) {
    if (acc >= STEP && t - lastSwap >= FRAME_MS) { acc -= STEP; lastSwap = t; show((cur + 1) % N); }
    if (acc >= STEP) requestAnimationFrame(tick); else ticking = false;
  }
  const cantScroll = () => document.documentElement.scrollHeight <= innerHeight + 1;
  addEventListener('scroll', () => { feed(scrollY - lastY); lastY = scrollY; }, { passive: true });
  addEventListener('wheel', e => { if (cantScroll()) feed(e.deltaY); }, { passive: true });
  let touchY = null;
  addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', e => {
    if (cantScroll() && touchY != null) { feed(e.touches[0].clientY - touchY); touchY = e.touches[0].clientY; }
  }, { passive: true });
})();
