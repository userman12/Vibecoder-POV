/**
 * interactions.js — input, clickable objects, tooltips, speech bubbles, audio.
 * Contains no loop logic: calls the methods exposed by app.js (`api`).
 */

import { OBJECT_LINES, TOOLTIPS } from './data.js';

/* =========================================================================
   AUDIO — everything synthesized with Web Audio, no external files.

   Signal flow:
     sources ─┬─────────────────────────► master ─► destination
              └─► reverbSend ─► convolver ─► reverbReturn ─┘

   A send/return reverb (rather than putting everything through the
   convolver) keeps transients like key clicks sharp while still placing
   them in the same room as the rain and the hum — otherwise the sounds
   read as separately "pasted on" rather than sharing a space.

   The context is only created on the first unmute/resume, because
   browsers refuse to start an AudioContext without a user gesture.
   ========================================================================= */

/** default target for master gain when unmuted (0..1) */
const DEFAULT_VOLUME = 0.6;

export function createAudio({ muted = true, volume = DEFAULT_VOLUME } = {}) {
  let ctx = null;
  let master = null;
  let ambience = null;   // rain
  let city = null;       // distant traffic
  let hum = null;        // monitor hum
  let reverbSend = null;
  let enabled = !muted;  // desired state; the context may not exist yet
  let level = clamp01(volume);
  let hornTimer = null;

  function clamp01(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), 1) : DEFAULT_VOLUME;
  }

  /** exponentialRampToValueAtTime cannot reach 0, so floor every target */
  const audible = (v) => Math.max(v, 0.0001);

  function noiseBuffer(seconds = 2) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /**
   * Synthetic impulse response: white noise under an exponential decay
   * envelope. Crude compared to a sampled room, but it costs nothing to
   * ship and gives the scene a small, closed, slightly dead space —
   * which is exactly the room being depicted.
   */
  function impulseBuffer(seconds = 1.1, decay = 3.4) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function boot() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    // --- reverb send/return ---
    const convolver = ctx.createConvolver();
    convolver.buffer = impulseBuffer();
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.9;
    reverbSend = ctx.createGain();
    reverbSend.gain.value = 1;
    reverbSend.connect(convolver).connect(reverbReturn).connect(master);

    // --- rain: filtered white noise ---
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(3);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 950;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 260;
    ambience = ctx.createGain();
    ambience.gain.value = 0.16;
    src.connect(hp).connect(lp).connect(ambience);
    ambience.connect(master);
    ambience.connect(reverbSend);
    src.start();

    // --- distant city: same noise trick, but only the low rumble survives
    //     the filter, which reads as traffic several streets away ---
    const citySrc = ctx.createBufferSource();
    citySrc.buffer = noiseBuffer(4);
    citySrc.loop = true;
    const cityLp = ctx.createBiquadFilter();
    cityLp.type = 'lowpass';
    cityLp.frequency.value = 190;
    const cityHp = ctx.createBiquadFilter();
    cityHp.type = 'highpass';
    cityHp.frequency.value = 45;
    city = ctx.createGain();
    city.gain.value = 0.1;
    citySrc.connect(cityHp).connect(cityLp).connect(city);
    city.connect(master);
    city.connect(reverbSend);
    citySrc.start();

    // --- monitor hum ---
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 58;
    hum = ctx.createGain();
    hum.gain.value = 0.05;
    osc.connect(hum).connect(master);
    osc.start();

    scheduleHorn();
  }

  /** a lone car horn every 18-45s, so the city never sounds like a loop */
  function scheduleHorn() {
    clearTimeout(hornTimer);
    hornTimer = setTimeout(() => {
      if (enabled && ctx) {
        const base = 210 + Math.random() * 90;
        tone({ type: 'sawtooth', freq: base, peak: 0.022, attack: 0.05, release: 0.5, wet: 1.4 });
        tone({ type: 'sawtooth', freq: base * 1.5, peak: 0.014, attack: 0.05, release: 0.45, wet: 1.4 });
      }
      scheduleHorn();
    }, 18000 + Math.random() * 27000);
  }

  function env(node, peak, attack, release) {
    const t = ctx.currentTime;
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  }

  /** `wet` scales how much of this sound is fed to the reverb send */
  function tone({ type = 'square', freq = 440, to = null, peak = 0.12, attack = 0.005, release = 0.12, delay = 0, wet = 0.35 }) {
    if (!enabled || !ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + attack + release);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + release);
    osc.connect(g);
    g.connect(master);
    if (wet > 0 && reverbSend) {
      const send = ctx.createGain();
      send.gain.value = wet;
      g.connect(send).connect(reverbSend);
    }
    osc.start(t0);
    osc.stop(t0 + attack + release + 0.05);
  }

  function noiseHit(peak = 0.1, dur = 0.06, freq = 1800, wet = 0.3) {
    if (!enabled || !ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    const g = ctx.createGain();
    src.connect(bp).connect(g);
    g.connect(master);
    if (wet > 0 && reverbSend) {
      const send = ctx.createGain();
      send.gain.value = wet;
      g.connect(send).connect(reverbSend);
    }
    env(g, peak, 0.004, dur);
    src.start();
    src.stop(ctx.currentTime + dur + 0.1);
  }

  const sfx = {
    key: () => noiseHit(0.07, 0.035, 2400 + Math.random() * 900),
    /** softer, jittered variant used for continuous typing during `coding` */
    type: () => noiseHit(0.035 + Math.random() * 0.03, 0.022 + Math.random() * 0.018, 2100 + Math.random() * 1500, 0.18),
    click: () => noiseHit(0.05, 0.05, 1200),
    beep: () => { tone({ freq: 880, peak: 0.1, release: 0.09 }); tone({ freq: 1320, peak: 0.08, release: 0.1, delay: 0.11 }); },
    allow: () => { tone({ type: 'triangle', freq: 520, to: 900, peak: 0.11, release: 0.16 }); },
    deny: () => { tone({ type: 'sawtooth', freq: 300, to: 120, peak: 0.09, release: 0.2 }); },
    error: () => {
      tone({ type: 'sawtooth', freq: 220, to: 60, peak: 0.16, attack: 0.01, release: 0.55, wet: 0.6 });
      tone({ type: 'square', freq: 150, to: 44, peak: 0.1, attack: 0.01, release: 0.6, delay: 0.05, wet: 0.6 });
    },
    purchase: () => {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone({ type: 'triangle', freq: f, peak: 0.1, attack: 0.008, release: 0.18, delay: i * 0.075, wet: 0.5 })
      );
    },
    sip: () => noiseHit(0.06, 0.18, 420),
    /** long press: a longer, greedier pull */
    sipLong: () => { noiseHit(0.075, 0.5, 380); noiseHit(0.045, 0.3, 300, 0.45); },
    puff: () => noiseHit(0.05, 0.42, 700, 0.5),
    /** long press: a deeper drag with more room tail on it */
    puffLong: () => { noiseHit(0.062, 0.95, 620, 0.8); noiseHit(0.03, 0.6, 900, 0.6); },
    thud: () => tone({ type: 'sine', freq: 90, to: 45, peak: 0.12, release: 0.18, wet: 0.7 }),
    /** phone: high and quick, a notification asking politely */
    buzzPhone: () => {
      tone({ type: 'square', freq: 320, peak: 0.045, attack: 0.004, release: 0.05 });
      tone({ type: 'square', freq: 320, peak: 0.045, attack: 0.004, release: 0.05, delay: 0.1 });
    },
    /** router: low and dirty, mains hum with a fault in it */
    buzzRouter: () => {
      tone({ type: 'sawtooth', freq: 88, to: 74, peak: 0.075, attack: 0.008, release: 0.22, wet: 0.55 });
      tone({ type: 'square', freq: 45, peak: 0.05, attack: 0.01, release: 0.3, delay: 0.03, wet: 0.55 });
    },
    /** dry countdown click while the credits run out — deliberately quiet,
        it repeats up to twice a second and must not become the loudest thing */
    tick: () => tone({ type: 'sine', freq: 660, to: 540, peak: 0.028, attack: 0.002, release: 0.055, wet: 0.22 })
  };

  function applyLevel(ramp = 0.6) {
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(
      audible(enabled ? level : 0),
      ctx.currentTime + ramp
    );
  }

  return {
    get enabled() { return enabled; },
    get volume() { return level; },

    /**
     * Starts (or resumes) the context. Must be called from inside a user
     * gesture handler — that's the whole reason the intro card exists.
     * Safe to call repeatedly.
     */
    resume() {
      if (!enabled) return false;
      boot();
      if (ctx?.state === 'suspended') ctx.resume();
      applyLevel(0.9);
      return !!ctx;
    },

    toggle() {
      enabled = !enabled;
      if (enabled) {
        boot();
        if (ctx?.state === 'suspended') ctx.resume();
        applyLevel(0.6);
      } else {
        applyLevel(0.25);
      }
      return enabled;
    },

    /** 0..1; takes effect immediately if the sound is already on */
    setVolume(v) {
      level = clamp01(v);
      applyLevel(0.12);
      return level;
    },

    /** intensifies the rain when there's a storm outside */
    weather(kind) {
      if (!ctx || !ambience) return;
      // A named state, not a boolean: the window cycles three ways now, and
      // 'calm' as a string is truthy — a boolean check would hear calm as a storm.
      const rain = { storm: 0.3, fog: 0.06, calm: 0.16 }[kind] ?? 0.16;
      // fog muffles the traffic almost entirely; a storm merely thins it out
      const traffic = { storm: 0.055, fog: 0.02, calm: 0.1 }[kind] ?? 0.1;
      ambience.gain.linearRampToValueAtTime(rain, ctx.currentTime + 1.2);
      if (city) city.gain.linearRampToValueAtTime(traffic, ctx.currentTime + 1.2);
    },

    /** the hum rises while the agent is working, fades when the room is dead */
    room(lvl) {
      if (!ctx || !hum) return;
      hum.gain.linearRampToValueAtTime(lvl, ctx.currentTime + 0.8);
    },

    play(name) { sfx[name]?.(); }
  };
}

/* =========================================================================
   Support UI: speech bubble and tooltip
   ========================================================================= */

const VB = { w: 1600, h: 1000 };
const pct = (x, y) => ({ left: (x / VB.w) * 100, top: (y / VB.h) * 100 });

export function createSpeaker(stage, bubble, bubbleText) {
  let hideTimer = null;

  return function say(text, vbX = 800, vbY = 480, tone = '') {
    const p = pct(vbX, vbY);
    bubbleText.textContent = text;
    bubble.className = 'bubble' + (tone ? ' is-' + tone : '');
    bubble.hidden = false;
    // positioning: the bubble points downward, so it sits above the target.
    // The clamp is derived from half the bubble's max-width (24cqw, so ±12
    // of margin): with a tighter fixed margin (78, as it was before), objects
    // near the right edge (e.g. the router) ended up with the bubble sitting
    // several percentage points away from the object itself.
    bubble.style.left = Math.min(Math.max(p.left, 12), 88) + '%';
    bubble.style.top = Math.max(p.top - 14, 4) + '%';
    bubble.style.transform = 'translateX(-50%)';
    // re-trigger the entry animation
    bubble.style.animation = 'none';
    void bubble.offsetWidth;
    bubble.style.animation = '';
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { bubble.hidden = true; }, 2600);
  };
}

function createTooltip(stage, tip) {
  return {
    show(text, ev) {
      if (!text) return;
      const r = stage.getBoundingClientRect();
      tip.textContent = text;
      tip.hidden = false;
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      tip.style.left = Math.min(x + 16, r.width - tip.offsetWidth - 8) + 'px';
      tip.style.top = Math.max(y - 34, 6) + 'px';
    },
    hide() { tip.hidden = true; }
  };
}

/* =========================================================================
   Ambient effects
   ========================================================================= */

const NS = 'http://www.w3.org/2000/svg';

/**
 * Angular vapor cloud above the head.
 * @param {boolean} strong bigger, wider, longer-lived cloud — used by the
 *        long-press variant so holding actually looks like a deeper drag
 */
export function puff(svg, strong = false) {
  const layer = svg.querySelector('#vapour');
  const baseX = 812;
  const baseY = 528;
  const count = strong ? 13 : 7;
  const scale = strong ? 1.55 : 1;
  for (let i = 0; i < count; i++) {
    const p = document.createElementNS(NS, 'polygon');
    const s = (12 + Math.random() * 22) * scale;
    const ox = baseX + (Math.random() - 0.5) * 60 * scale;
    const oy = baseY - i * 9 + (Math.random() - 0.5) * 18;
    p.setAttribute('points', [
      `${ox},${oy - s}`,
      `${ox + s},${oy - s * 0.4}`,
      `${ox + s * 0.6},${oy + s * 0.7}`,
      `${ox - s * 0.7},${oy + s * 0.5}`,
      `${ox - s},${oy - s * 0.3}`
    ].join(' '));
    p.setAttribute('fill', '#69716C');
    p.setAttribute('opacity', '0');
    p.setAttribute('class', 'puff' + (strong ? ' puff-big' : ''));
    p.style.transformBox = 'fill-box';
    p.style.transformOrigin = '50% 100%';
    p.style.animationDelay = (i * (strong ? 70 : 90) + Math.random() * 120) + 'ms';
    layer.appendChild(p);
    setTimeout(() => p.remove(), strong ? 4200 : 3400);
  }
}

/** populates rain, skyline and window lights */
export function buildWindow(svg, skyline) {
  const sky = svg.querySelector('#skyline');
  const lights = svg.querySelector('#cityLights');
  const rain = svg.querySelector('#rain');

  skyline.forEach(([x, y, w, h], i) => {
    const b = document.createElementNS(NS, 'rect');
    b.setAttribute('x', x); b.setAttribute('y', y);
    b.setAttribute('width', w); b.setAttribute('height', h);
    b.setAttribute('fill', i % 2 ? '#0A1F1C' : '#0D2724');
    sky.appendChild(b);

    const cols = Math.max(1, Math.floor(w / 11));
    const rows = Math.max(2, Math.floor(h / 16));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (Math.random() > 0.26) continue;
        const l = document.createElementNS(NS, 'rect');
        l.setAttribute('x', x + 4 + c * 11);
        l.setAttribute('y', y + 8 + r * 16);
        l.setAttribute('width', 4);
        l.setAttribute('height', 6);
        l.setAttribute('fill', Math.random() > 0.75 ? '#E8C77A' : '#47B99A');
        l.setAttribute('class', 'citylight');
        l.style.animationDuration = (3 + Math.random() * 9).toFixed(2) + 's';
        l.style.animationDelay = (Math.random() * 6).toFixed(2) + 's';
        l.setAttribute('opacity', 0.5 + Math.random() * 0.5);
        lights.appendChild(l);
      }
    }
  });

  for (let i = 0; i < 46; i++) {
    const d = document.createElementNS(NS, 'line');
    const x = 80 + Math.random() * 360;
    const y = 100 + Math.random() * 40;
    d.setAttribute('x1', x); d.setAttribute('y1', y);
    d.setAttribute('x2', x - 4); d.setAttribute('y2', y + 22);
    d.setAttribute('class', 'drop');
    d.style.transformBox = 'fill-box';
    d.style.animationDuration = (0.55 + Math.random() * 0.5).toFixed(2) + 's';
    d.style.animationDelay = (-Math.random() * 1.2).toFixed(2) + 's';
    rain.appendChild(d);
  }
}

/** builds the fake spreadsheet grid once, from BOSS_SHEET in data.js */
export function buildBossSheet(root, sheet) {
  root.querySelector('.boss-title').textContent = sheet.title;
  root.querySelector('.boss-cellref').textContent = sheet.cell;
  root.querySelector('.boss-formulaval').textContent = sheet.formula;

  const grid = root.querySelector('.boss-grid');
  sheet.columns.forEach((label) => {
    const cell = document.createElement('div');
    cell.className = 'boss-cell head';
    cell.textContent = label;
    grid.appendChild(cell);
  });
  sheet.rows.forEach((row, r) => {
    row.forEach((val, c) => {
      const cell = document.createElement('div');
      const warn = sheet.warnCells.some(([wr, wc]) => wr === r && wc === c);
      cell.className = 'boss-cell' + (c === 0 ? ' label' : '') + (warn ? ' warn' : '');
      cell.textContent = val;
      grid.appendChild(cell);
    });
  });
}

/* =========================================================================
   Wiring up all interactions
   ========================================================================= */

/**
 * @param {Object} o
 * @param {SVGElement} o.svg
 * @param {HTMLElement} o.stage
 * @param {Object} o.els UI nodes already resolved by app.js
 * @param {ReturnType<createAudio>} o.audio
 * @param {Object} o.api callbacks into the loop logic
 * @param {Function} o.say speech bubble
 */
export function initInteractions({ svg, stage, els, audio, api, say }) {
  const tip = createTooltip(stage, els.tooltip);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------------------------------------------------------- scene gestures */

  function gesture(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  }

  let coffee = 1;
  const coffeeRect = svg.querySelector('#coffee');
  const COFFEE_TOP = 652;
  const COFFEE_H = 54;

  function drawCoffee() {
    const h = COFFEE_H * coffee;
    coffeeRect.setAttribute('y', COFFEE_TOP + (COFFEE_H - h));
    coffeeRect.setAttribute('height', Math.max(h, 0));
  }

  /* --------------------------------------------------- per-object actions */

  const actions = {
    'monitor-main': () => api.pokeMonitor(),

    'monitor-side': () => {
      api.scrollFeed();
      gesture(svg.querySelector('#head'), 'look-side', 2600);
      say(pick(OBJECT_LINES['monitor-side']), 1240, 300);
      audio.play('click');
    },

    keyboard: () => {
      if (api.awaitingPermission()) { api.allow(); return; }
      api.typeBurst();
      audio.play('key');
      say(pick(OBJECT_LINES.keyboard), 820, 700);
    },

    /** @param {boolean} strong set by a long press — a deeper drag */
    vape: (strong = false) => {
      gesture(svg.querySelector('#arm-r'), 'reach-vape', 2400);
      setTimeout(() => {
        puff(svg, strong);
        audio.play(strong ? 'puffLong' : 'puff');
      }, 900);
      say(
        strong ? pick(OBJECT_LINES.vapeLong) : pick(OBJECT_LINES.vape),
        1000, 560, 'warm'
      );
    },

    /** @param {boolean} strong set by a long press — drains the mug faster */
    mug: (strong = false) => {
      gesture(svg.querySelector('#arm-l'), 'reach-mug', 2200);
      const empty = coffee <= 0;
      setTimeout(() => {
        audio.play(strong ? 'sipLong' : 'sip');
        coffee = Math.max(0, coffee - (strong ? 0.5 : 0.25));
        drawCoffee();
      }, 900);
      say(
        empty ? 'Coffee level: none. This is now a mug of intent.'
          : strong ? pick(OBJECT_LINES.mugLong) : pick(OBJECT_LINES.mug),
        560, 600, 'warm'
      );
    },

    window: () => {
      gesture(svg.querySelector('#head'), 'look-window', 3000);

      // calm → storm → fog → calm
      const order = ['calm', 'storm', 'fog'];
      const current = document.body.dataset.weather || 'calm';
      const next = order[(order.indexOf(current) + 1) % order.length];
      document.body.dataset.weather = next;
      audio.weather(next);

      if (next === 'storm') {
        const bolt = svg.querySelector('#lightning');
        bolt.animate(
          [{ opacity: 0 }, { opacity: 0.55 }, { opacity: 0 }, { opacity: 0.3 }, { opacity: 0 }],
          { duration: 520, easing: 'steps(2)' }
        );
        audio.play('thud');
      }

      say(pick(OBJECT_LINES[next === 'fog' ? 'windowFog' : 'window']), 250, 300);
    },

    lamp: () => {
      const on = document.body.dataset.lamp === 'on';
      document.body.dataset.lamp = on ? 'off' : 'on';
      audio.play('click');
      say(on ? 'Darkness restored.' : pick(OBJECT_LINES.lamp), 420, 420, 'warm');
    },

    phone: () => {
      gesture(svg.querySelector('#arm-l'), 'reach-phone', 2100);
      const notif = svg.querySelector('#phoneNotif');
      notif.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }], { duration: 2600, easing: 'steps(2)' });
      audio.play('buzzPhone');
      say(api.pickPhoneNotification(), 400, 720, 'alert');
      api.clientPing();
    },

    poster: () => { say(pick(OBJECT_LINES.poster), 720, 150, 'warm'); audio.play('click'); },

    router: () => {
      stage.classList.add('glitch');
      setTimeout(() => stage.classList.remove('glitch'), 700);
      audio.play('buzzRouter');
      say(pick(OBJECT_LINES.router), 1480, 862, 'alert');
    },

    postit: () => { say(pick(OBJECT_LINES.postit), 540, 220, 'warm'); audio.play('click'); },

    cat: () => {
      // it stirs, it does not wake — the joke only works if it stays asleep
      gesture(svg.querySelector('#cat-body'), 'cat-stir', 1800);
      say(pick(OBJECT_LINES.cat), 1270, 880);
      audio.play('sip'); // a soft, low, breathy sound doubles nicely as a purr
    },

    plant2: () => { say(pick(OBJECT_LINES.plant2), 140, 760); audio.play('click'); },

    plant: () => { say(pick(OBJECT_LINES.plant), 1430, 660); audio.play('click'); },
    headphones: () => { say(pick(OBJECT_LINES.headphones), 1160, 660); audio.play('click'); },
    snack: () => { say(pick(OBJECT_LINES.snack), 520, 740); audio.play('click'); },
    mouse: () => { say(pick(OBJECT_LINES.mouse), 1060, 660); audio.play('click'); }
  };

  /* ------------------------------------------------------------- event binding */

  /** objects whose action takes a `strong` flag when held down */
  const HOLDABLE = new Set(['vape', 'mug']);
  const HOLD_MS = 480;

  svg.querySelectorAll('.hot').forEach((el) => {
    const id = el.id;
    let holdTimer = null;
    let heldFired = false;

    function endHold() {
      clearTimeout(holdTimer);
      holdTimer = null;
      el.classList.remove('is-holding');
    }

    if (HOLDABLE.has(id)) {
      el.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0 && ev.pointerType === 'mouse') return;
        heldFired = false;
        el.classList.add('is-holding');
        holdTimer = setTimeout(() => {
          heldFired = true;
          el.classList.remove('is-holding');
          actions[id]?.(true);
        }, HOLD_MS);
      });
      // pointerup alone isn't enough: releasing outside the element, a
      // cancelled gesture (scroll/context menu) or the pointer leaving all
      // have to disarm the timer, or it fires after the user let go
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) =>
        el.addEventListener(type, endHold)
      );
    }

    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      // a completed long press already ran the action; swallow the click
      // the browser sends afterwards so it doesn't fire a second time
      if (heldFired) { heldFired = false; return; }
      actions[id]?.();
    });
    el.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      ev.stopPropagation();
      actions[id]?.();
    });
    el.addEventListener('mouseenter', (ev) => tip.show(TOOLTIPS[id], ev));
    el.addEventListener('mousemove', (ev) => tip.show(TOOLTIPS[id], ev));
    el.addEventListener('mouseleave', () => tip.hide());
    el.addEventListener('focus', () => tip.hide());
  });

  /* ---------------------------------------------------------- UI buttons */

  els.btnStart.addEventListener('click', () => { audio.play('click'); api.startTask(); });
  els.btnBuy.addEventListener('click', () => { audio.play('click'); api.openPayment(); });
  els.btnAllow.addEventListener('click', () => api.allow());
  els.btnDeny.addEventListener('click', () => api.deny());
  els.btnPay.addEventListener('click', () => api.confirmPayment());

  els.btnMute.addEventListener('click', () => {
    api.syncSound(audio.toggle());
  });

  els.vol.addEventListener('input', () => {
    api.setVolume(Number(els.vol.value) / 100);
  });

  els.btnShare.addEventListener('click', () => {
    audio.play('click');
    api.shareLoop();
  });

  /* --------------------------------------------------------- easter egg */

  const KONAMI = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'
  ];
  let konamiPos = 0;

  function konami(key) {
    // compare case-insensitively so Caps Lock / Shift don't break the run
    const want = KONAMI[konamiPos];
    const got = key.length === 1 ? key.toLowerCase() : key;
    if (got === want) {
      konamiPos++;
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        triggerEgg();
      }
      return true;
    }
    // a wrong key restarts the sequence, but if it happens to be the first
    // key of a fresh attempt (e.g. ↑↑↑) that attempt should still count
    konamiPos = got === KONAMI[0] ? 1 : 0;
    return false;
  }

  function triggerEgg() {
    svg.querySelectorAll('.hot').forEach((el, i) => {
      setTimeout(() => {
        el.classList.add('egg-flash');
        setTimeout(() => el.classList.remove('egg-flash'), 700);
      }, i * 45);
    });
    audio.play('purchase');
    say('Nice. Now get back to work.', 800, 430, 'warm');
  }

  /* ----------------------------------------------------------- boss key */

  function showBossKey() {
    if (!els.bossKey.hidden) return; // ignore OS key-repeat while held
    els.bossKey.hidden = false;
  }
  function hideBossKey() {
    els.bossKey.hidden = true;
  }

  /* ----------------------------------------------------------- keyboard */

  document.addEventListener('keydown', (ev) => {
    if (ev.defaultPrevented) return;
    const typingInField = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    if (typingInField) return;

    // the sequence is checked first, and swallows its own keys so that the
    // trailing "a"/"b" and the arrows don't also reach the handlers below.
    // This also means completing Konami on its own trailing "b" can never
    // also trigger the boss key in the same keystroke — they stay separate.
    if (konami(ev.key)) {
      ev.preventDefault();
      return;
    }

    if (ev.key === 'Enter') {
      // buttons already handle Enter on their own
      if (document.activeElement?.tagName === 'BUTTON') return;
      ev.preventDefault();
      api.primaryAction();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      api.secondaryAction();
    } else if (ev.key.toLowerCase() === 'm') {
      els.btnMute.click();
    } else if (ev.key.toLowerCase() === 'b') {
      showBossKey();
    }
  });

  // held, not toggled: the cover story should vanish the instant the key
  // is let go, same as a real panic button
  document.addEventListener('keyup', (ev) => {
    if (ev.key.toLowerCase() === 'b') hideBossKey();
  });

  // empty click on the room: small feedback, nothing more
  stage.addEventListener('click', (ev) => {
    if (ev.target.closest('.hot, button, .pay')) return;
    tip.hide();
  });

  return {
    resetCoffee() { coffee = 1; drawCoffee(); },
    gesture
  };
}
