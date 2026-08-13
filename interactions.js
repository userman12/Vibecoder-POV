/**
 * interactions.js — input, oggetti cliccabili, tooltip, fumetti, audio.
 * Non contiene la logica del loop: chiama i metodi esposti da app.js (`api`).
 */

import { OBJECT_LINES, TOOLTIPS, PHONE_NOTIFICATIONS } from './data.js';

/* =========================================================================
   AUDIO — tutto sintetizzato con Web Audio, nessun file esterno.
   Parte disattivato: il contesto viene creato solo al primo "unmute".
   ========================================================================= */

export function createAudio() {
  let ctx = null;
  let master = null;
  let ambience = null;
  let hum = null;
  let enabled = false;

  function noiseBuffer(seconds = 2) {
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
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

    // pioggia: rumore bianco filtrato
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
    src.connect(hp).connect(lp).connect(ambience).connect(master);
    src.start();

    // ronzio dei monitor
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 58;
    hum = ctx.createGain();
    hum.gain.value = 0.05;
    osc.connect(hum).connect(master);
    osc.start();
  }

  function env(node, peak, attack, release) {
    const t = ctx.currentTime;
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  }

  function tone({ type = 'square', freq = 440, to = null, peak = 0.12, attack = 0.005, release = 0.12, delay = 0 }) {
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
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + attack + release + 0.05);
  }

  function noiseHit(peak = 0.1, dur = 0.06, freq = 1800) {
    if (!enabled || !ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    const g = ctx.createGain();
    src.connect(bp).connect(g).connect(master);
    env(g, peak, 0.004, dur);
    src.start();
    src.stop(ctx.currentTime + dur + 0.1);
  }

  const sfx = {
    key: () => noiseHit(0.07, 0.035, 2400 + Math.random() * 900),
    click: () => noiseHit(0.05, 0.05, 1200),
    beep: () => { tone({ freq: 880, peak: 0.1, release: 0.09 }); tone({ freq: 1320, peak: 0.08, release: 0.1, delay: 0.11 }); },
    allow: () => { tone({ type: 'triangle', freq: 520, to: 900, peak: 0.11, release: 0.16 }); },
    deny: () => { tone({ type: 'sawtooth', freq: 300, to: 120, peak: 0.09, release: 0.2 }); },
    error: () => {
      tone({ type: 'sawtooth', freq: 220, to: 60, peak: 0.16, attack: 0.01, release: 0.55 });
      tone({ type: 'square', freq: 150, to: 44, peak: 0.1, attack: 0.01, release: 0.6, delay: 0.05 });
    },
    purchase: () => {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone({ type: 'triangle', freq: f, peak: 0.1, attack: 0.008, release: 0.18, delay: i * 0.075 })
      );
    },
    sip: () => noiseHit(0.06, 0.18, 420),
    puff: () => noiseHit(0.05, 0.42, 700),
    thud: () => tone({ type: 'sine', freq: 90, to: 45, peak: 0.12, release: 0.18 }),
    buzz: () => { tone({ type: 'square', freq: 130, peak: 0.06, release: 0.08 }); tone({ type: 'square', freq: 130, peak: 0.06, release: 0.08, delay: 0.14 }); }
  };

  return {
    get enabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      if (enabled) {
        boot();
        if (ctx?.state === 'suspended') ctx.resume();
        master?.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.6);
      } else if (master) {
        master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      }
      return enabled;
    },
    /** intensifica la pioggia quando fuori c'è tempesta */
    weather(storm) {
      if (!ctx || !ambience) return;
      ambience.gain.linearRampToValueAtTime(storm ? 0.3 : 0.16, ctx.currentTime + 1.2);
    },
    /** il ronzio sale mentre l'agente lavora, cala quando la stanza è morta */
    room(level) {
      if (!ctx || !hum) return;
      hum.gain.linearRampToValueAtTime(level, ctx.currentTime + 0.8);
    },
    play(name) { sfx[name]?.(); }
  };
}

/* =========================================================================
   UI di supporto: fumetto e tooltip
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
    // posizionamento: il fumetto punta verso il basso, quindi va sopra il target.
    // Il clamp è calcolato dalla metà della max-width del fumetto (24cqw, quindi
    // ±12 di margine): con un margine fisso più stretto (com'era prima, 78) gli
    // oggetti vicino al bordo destro (es. router) finivano con il fumetto
    // staccato di diversi punti percentuali dall'oggetto stesso.
    bubble.style.left = Math.min(Math.max(p.left, 12), 88) + '%';
    bubble.style.top = Math.max(p.top - 14, 4) + '%';
    bubble.style.transform = 'translateX(-50%)';
    // ri-triggera l'animazione d'ingresso
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
   Effetti d'ambiente
   ========================================================================= */

const NS = 'http://www.w3.org/2000/svg';

/** nuvola di vapore angolare sopra la testa */
export function puff(svg) {
  const layer = svg.querySelector('#vapour');
  const baseX = 812;
  const baseY = 528;
  for (let i = 0; i < 7; i++) {
    const p = document.createElementNS(NS, 'polygon');
    const s = 12 + Math.random() * 22;
    const ox = baseX + (Math.random() - 0.5) * 60;
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
    p.setAttribute('class', 'puff');
    p.style.transformBox = 'fill-box';
    p.style.transformOrigin = '50% 100%';
    p.style.animationDelay = (i * 90 + Math.random() * 120) + 'ms';
    layer.appendChild(p);
    setTimeout(() => p.remove(), 3400);
  }
}

/** popola pioggia, skyline e luci della finestra */
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

/* =========================================================================
   Binding di tutte le interazioni
   ========================================================================= */

/**
 * @param {Object} o
 * @param {SVGElement} o.svg
 * @param {HTMLElement} o.stage
 * @param {Object} o.els nodi UI già risolti da app.js
 * @param {ReturnType<createAudio>} o.audio
 * @param {Object} o.api callback verso la logica del loop
 * @param {Function} o.say fumetto
 */
export function initInteractions({ svg, stage, els, audio, api, say }) {
  const tip = createTooltip(stage, els.tooltip);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------------------------------------------------------- gesti scena */

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

  /* --------------------------------------------------- azioni per oggetto */

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

    vape: () => {
      gesture(svg.querySelector('#arm-r'), 'reach-vape', 2400);
      setTimeout(() => { puff(svg); audio.play('puff'); }, 900);
      say(pick(OBJECT_LINES.vape), 1000, 560, 'warm');
    },

    mug: () => {
      gesture(svg.querySelector('#arm-l'), 'reach-mug', 2200);
      setTimeout(() => {
        audio.play('sip');
        coffee = Math.max(0, coffee - 0.25);
        drawCoffee();
      }, 900);
      say(coffee <= 0.25 ? 'Coffee level: none. This is now a mug of intent.' : pick(OBJECT_LINES.mug), 560, 600, 'warm');
    },

    window: () => {
      gesture(svg.querySelector('#head'), 'look-window', 3000);
      const storm = stage.ownerDocument.body.dataset.weather !== 'storm';
      document.body.dataset.weather = storm ? 'storm' : 'calm';
      audio.weather(storm);
      if (storm) {
        const bolt = svg.querySelector('#lightning');
        bolt.animate(
          [{ opacity: 0 }, { opacity: 0.55 }, { opacity: 0 }, { opacity: 0.3 }, { opacity: 0 }],
          { duration: 520, easing: 'steps(2)' }
        );
        audio.play('thud');
      }
      say(pick(OBJECT_LINES.window), 250, 300);
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
      audio.play('buzz');
      say(pick(PHONE_NOTIFICATIONS), 400, 720, 'alert');
      api.clientPing();
    },

    poster: () => { say(pick(OBJECT_LINES.poster), 720, 150, 'warm'); audio.play('click'); },

    router: () => {
      stage.classList.add('glitch');
      setTimeout(() => stage.classList.remove('glitch'), 700);
      audio.play('buzz');
      say(pick(OBJECT_LINES.router), 1480, 862, 'alert');
    },

    plant: () => { say(pick(OBJECT_LINES.plant), 1430, 660); audio.play('click'); },
    headphones: () => { say(pick(OBJECT_LINES.headphones), 1160, 660); audio.play('click'); },
    snack: () => { say(pick(OBJECT_LINES.snack), 520, 740); audio.play('click'); },
    mouse: () => { say(pick(OBJECT_LINES.mouse), 1060, 660); audio.play('click'); }
  };

  /* ------------------------------------------------------------- binding */

  svg.querySelectorAll('.hot').forEach((el) => {
    const id = el.id;
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
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

  /* ---------------------------------------------------------- bottoni UI */

  els.btnStart.addEventListener('click', () => { audio.play('click'); api.startTask(); });
  els.btnBuy.addEventListener('click', () => { audio.play('click'); api.openPayment(); });
  els.btnAllow.addEventListener('click', () => api.allow());
  els.btnDeny.addEventListener('click', () => api.deny());
  els.btnPay.addEventListener('click', () => api.confirmPayment());

  els.btnMute.addEventListener('click', () => {
    const on = audio.toggle();
    els.btnMute.setAttribute('aria-pressed', String(!on));
    els.btnMute.innerHTML = on
      ? '<span aria-hidden="true">♪</span> Sound on'
      : '<span aria-hidden="true">♪</span> Sound off';
  });

  /* ----------------------------------------------------------- tastiera */

  document.addEventListener('keydown', (ev) => {
    if (ev.defaultPrevented) return;
    const typingInField = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    if (typingInField) return;

    if (ev.key === 'Enter') {
      // i bottoni gestiscono già Enter da soli
      if (document.activeElement?.tagName === 'BUTTON') return;
      ev.preventDefault();
      api.primaryAction();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      api.secondaryAction();
    } else if (ev.key.toLowerCase() === 'm') {
      els.btnMute.click();
    }
  });

  // clic a vuoto sulla stanza: piccolo feedback, niente di più
  stage.addEventListener('click', (ev) => {
    if (ev.target.closest('.hot, button, .pay')) return;
    tip.hide();
  });

  return {
    resetCoffee() { coffee = 1; drawCoffee(); },
    gesture
  };
}
