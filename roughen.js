/**
 * roughen.js — passata "disegnato a mano" sulla geometria della scena.
 *
 * Don't Starve non ha linee rette: ogni contorno trema, si ispessisce e a
 * volte è ripassato due volte. Invece di simularlo con un filtro SVG (che
 * andrebbe ricalcolato a ogni frame sugli elementi animati), qui la
 * irregolarità viene *cotta nella geometria* una volta sola al boot:
 * ogni spigolo viene suddiviso e i punti intermedi spostati con rumore.
 *
 * Il rumore è deterministico (PRNG con seme): il disegno è sempre lo stesso
 * a ogni ricarica, come una tavola disegnata, non un effetto casuale.
 */

/** PRNG mulberry32: piccolo, veloce, ripetibile. */
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

/** somma dei caratteri: due elementi diversi ricevono semi diversi ma stabili */
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
 * Suddivide ogni spigolo e sposta i punti.
 * I vertici originali si muovono poco (0.35×) per non perdere gli angoli:
 * le forme restano spigolose, ma nessun lato è più perfettamente dritto.
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

/** perimetro approssimato, serve a scalare il tremolio sulla taglia dell'oggetto */
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
 * @param {number} [opts.amp]  tremolio massimo in unità viewBox
 * @param {number} [opts.seg]  lunghezza del segmento di suddivisione
 */
export function roughenScene(svg, opts = {}) {
  const baseAmp = opts.amp ?? 2.4;
  const baseSeg = opts.seg ?? 26;
  let count = 0;

  const shapes = [...svg.querySelectorAll('polygon, polyline')];

  shapes.forEach((el, idx) => {
    // i clip-path dentro <defs> devono restare esatti, altrimenti il tremolio
    // ritaglia via il contenuto invece di decorarne il bordo
    if (el.dataset.rough === '0' || el.classList.contains('hit') || el.closest('defs')) return;

    const closed = el.tagName.toLowerCase() === 'polygon';
    const pts = parsePoints(el.getAttribute('points'));
    if (pts.length < 2) return;

    // oggetti piccoli tremano meno, altrimenti si sfaldano
    const per = perimeter(pts, closed);
    const scale = Math.min(1, Math.max(0.42, per / 620));
    const amp = (Number(el.dataset.amp) || baseAmp) * scale;
    const seg = Number(el.dataset.seg) || baseSeg;

    const key = (el.id || el.parentElement?.id || 'n') + ':' + idx;
    const rng = makeRng(seedFrom(key));

    el.setAttribute('points', fmt(roughPoints(pts, { closed, amp, seg, rng })));
    count++;

    // contorno ripassato una seconda volta, leggermente fuori registro
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
