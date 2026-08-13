/**
 * roughen.js — a "hand-drawn" pass over the scene's geometry.
 *
 * Don't Starve has no straight lines: every outline shakes, thickens, and
 * is sometimes retraced twice. Instead of simulating that with an SVG
 * filter (which would need recalculating every frame on animated elements),
 * the irregularity is *baked into the geometry* once, at boot: every edge
 * is subdivided and its intermediate points displaced with noise.
 *
 * The noise is deterministic (seeded PRNG): the drawing is always the same
 * on every reload, like a drawn plate, not a random effect.
 */

/** mulberry32 PRNG: small, fast, repeatable. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** character sum: two different elements get different but stable seeds */
function seedFrom(str, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function parsePoints(attr) {
  const nums = (attr || '').trim().split(/[\s,]+/).map(Number).filter((n) => !Number.isNaN(n));
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}

const fmt = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/**
 * Subdivides every edge and displaces the points.
 * Original vertices move only a little (0.35×) so corners aren't lost:
 * shapes stay angular, but no side is ever perfectly straight anymore.
 */
function roughPoints(pts, { closed, amp, seg, rng }) {
  if (pts.length < 2) return pts;
  const out = [];
  const last = closed ? pts.length : pts.length - 1;

  for (let i = 0; i < last; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.round(len / seg));

    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const j = k === 0 ? amp * 0.35 : amp;
      out.push([
        a[0] + dx * t + (rng() * 2 - 1) * j,
        a[1] + dy * t + (rng() * 2 - 1) * j
      ]);
    }
  }
  if (!closed) {
    const e = pts[pts.length - 1];
    out.push([e[0] + (rng() * 2 - 1) * amp * 0.35, e[1] + (rng() * 2 - 1) * amp * 0.35]);
  }
  return out;
}

/** approximate perimeter, used to scale the jitter to the object's size */
function perimeter(pts, closed) {
  let p = 0;
  const last = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    p += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return p;
}

const NS = 'http://www.w3.org/2000/svg';

/**
 * @param {SVGElement} svg
 * @param {Object} [opts]
 * @param {number} [opts.amp]  maximum jitter in viewBox units
 * @param {number} [opts.seg]  subdivision segment length
 */
export function roughenScene(svg, opts = {}) {
  const baseAmp = opts.amp ?? 2.4;
  const baseSeg = opts.seg ?? 26;
  let count = 0;

  const shapes = [...svg.querySelectorAll('polygon, polyline')];

  shapes.forEach((el, idx) => {
    // clip-paths inside <defs> must stay exact, otherwise the jitter
    // clips away content instead of just decorating its edge
    if (el.dataset.rough === '0' || el.classList.contains('hit') || el.closest('defs')) return;

    const closed = el.tagName.toLowerCase() === 'polygon';
    const pts = parsePoints(el.getAttribute('points'));
    if (pts.length < 2) return;

    // small objects jitter less, otherwise they fall apart visually
    const per = perimeter(pts, closed);
    const scale = Math.min(1, Math.max(0.42, per / 620));
    const amp = (Number(el.dataset.amp) || baseAmp) * scale;
    const seg = Number(el.dataset.seg) || baseSeg;

    const key = (el.id || el.parentElement?.id || 'n') + ':' + idx;
    const rng = makeRng(seedFrom(key));

    el.setAttribute('points', fmt(roughPoints(pts, { closed, amp, seg, rng })));
    count++;

    // outline retraced a second time, slightly out of register
    if (el.dataset.ink === '2') {
      const ghost = document.createElementNS(NS, 'polyline');
      const rng2 = makeRng(seedFrom(key, 977));
      const gp = roughPoints(pts, { closed: false, amp: amp * 1.5, seg: seg * 1.4, rng: rng2 });
      if (closed) gp.push(gp[0]);
      ghost.setAttribute('points', fmt(gp));
      ghost.setAttribute('class', 'sketch');
      ghost.setAttribute('fill', 'none');
      ghost.setAttribute('pointer-events', 'none');
      ghost.setAttribute('transform', `translate(${(rng2() * 3 - 1.5).toFixed(1)}, ${(rng2() * 3 - 1.5).toFixed(1)})`);
      el.parentNode.insertBefore(ghost, el.nextSibling);
    }
  });

  return count;
}
