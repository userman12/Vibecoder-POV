/**
 * app.js — bootstrap, loop principale, rendering della UI.
 * Possiede lo stato (crediti, task) e la macchina a stati; interactions.js
 * si limita a chiamare i metodi esposti in `api`.
 */

import {
  CREDITS, TIMING, TASKS, PERMISSIONS, AGENT_LOGS, LOG_FILES,
  FEED_POSTS, STATE_LABELS, STATUS_FLAVOR, PAYMENT, SKYLINE
} from './data.js';
import { StateMachine, Timers } from './stateMachine.js';
import { createAudio, createSpeaker, initInteractions, buildWindow, puff } from './interactions.js';
import { roughenScene } from './roughen.js';

/* ----------------------------------------------------------------- helpers */

const $ = (sel) => document.querySelector(sel);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

const els = {
  stage: $('#stage'),
  svg: $('#scene'),
  term: $('#term'),
  termTyped: $('#termTyped'),
  caret: $('#caret'),
  scrMode: $('#scrMode'),
  credFill: $('#credFill'),
  credNum: $('#credNum'),
  permPanel: $('#permPanel'),
  permTitle: $('#permTitle'),
  permDetail: $('#permDetail'),
  deadPanel: $('#deadPanel'),
  feed: $('#feed'),
  hudTask: $('#hudTask'),
  hudStateText: $('#hudStateText'),
  hudFlavor: $('#hudFlavor'),
  hint: $('#hint'),
  btnStart: $('#btnStart'),
  btnBuy: $('#btnBuy'),
  btnMute: $('#btnMute'),
  btnAllow: $('#btnAllow'),
  btnDeny: $('#btnDeny'),
  btnPay: $('#btnPay'),
  payWrap: $('#payWrap'),
  flash: $('#flash'),
  bubble: $('#bubble'),
  bubbleText: $('#bubbleText'),
  tooltip: $('#tooltip')
};

const audio = createAudio();
const say = createSpeaker(els.stage, els.bubble, els.bubbleText);
const timers = new Timers();

/* ------------------------------------------------------------------- stato */

const app = {
  credits: CREDITS.start,
  task: null,
  permission: null,
  taskCount: 0,
  clock: 60 * 60 + 7 * 60, // 01:07:00, in secondi
  runEndsAt: 0,
  progressEl: null,
  paymentOpen: false,
  lastFocus: null
};

/* ------------------------------------------------------- terminale (render) */

const MAX_LINES = 8;

function stamp() {
  app.clock += 3 + Math.floor(Math.random() * 9);
  const h = Math.floor(app.clock / 3600) % 24;
  const m = Math.floor(app.clock / 60) % 60;
  const s = app.clock % 60;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}

function addLine(html, cls = '') {
  const el = document.createElement('div');
  el.className = 'term-line ' + cls;
  el.innerHTML = `<span class="t-time">${stamp()}</span> ${html}`;
  els.term.appendChild(el);
  while (els.term.children.length > MAX_LINES) els.term.firstElementChild.remove();
  [...els.term.children].forEach((c, i, a) => c.classList.toggle('is-old', i < a.length - 3));
  return el;
}

function clearTerm() {
  els.term.innerHTML = '';
  app.progressEl = null;
}

/**
 * La riga di avanzamento resta sempre in fondo e viene riscritta di continuo:
 * niente timestamp, altrimenti l'orologio del terminale sembrerebbe tornare
 * indietro ogni volta che la riga viene rispinta sotto ai nuovi log.
 */
function addProgressLine() {
  const el = document.createElement('div');
  el.className = 'term-line term-progress';
  el.innerHTML = `<span class="t-dim">agent</span> ${bar(0)}`;
  els.term.appendChild(el);
  while (els.term.children.length > MAX_LINES) els.term.firstElementChild.remove();
  return el;
}

function bar(ratio) {
  const total = 18;
  const on = Math.round(clamp(ratio, 0, 1) * total);
  return `<span class="term-bar">${'█'.repeat(on)}${'░'.repeat(total - on)}</span> ${String(Math.round(ratio * 100)).padStart(3)}%`;
}

/* ---------------------------------------------------------------- crediti */

function renderCredits() {
  const ratio = clamp(app.credits / CREDITS.max, 0, 1);
  els.credFill.style.width = (ratio * 100).toFixed(1) + '%';
  els.credNum.textContent = Math.max(0, Math.round(app.credits));
  document.body.dataset.credits =
    app.credits <= 0 ? 'empty' : ratio < CREDITS.lowThreshold ? 'low' : 'ok';
}

/* --------------------------------------------------------------- feed side */

/**
 * Il feed cresce un post alla volta. Quando il pannello è pieno riparte da
 * zero con una lista nuova: stessi contenuti, ordine rimescolato, così il
 * ciclo successivo non ripete la sequenza appena vista.
 */
let feedQueue = [];
let feedPos = 0;

function newFeedList() {
  feedQueue = [...FEED_POSTS];
  for (let i = feedQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [feedQueue[i], feedQueue[j]] = [feedQueue[j], feedQueue[i]];
  }
  feedPos = 0;
}

function buildPost(post) {
  const el = document.createElement('article');
  el.className = 'post';
  el.innerHTML =
    `<div class="post-user">@${post.user}</div>` +
    `<div class="post-text">${post.text}</div>`;
  return el;
}

/** aggiunge un post; se non ci sta più, svuota e ricomincia da una lista nuova */
function scrollFeed() {
  if (feedPos >= feedQueue.length) newFeedList();
  els.feed.appendChild(buildPost(feedQueue[feedPos++]));

  // misura reale invece di un numero fisso di post: i testi hanno lunghezze
  // diverse, quindi il pannello si riempie con 3, 4 o 5 post a seconda dei casi
  if (els.feed.scrollHeight > els.feed.clientHeight) {
    els.feed.innerHTML = '';
    newFeedList();
    els.feed.appendChild(buildPost(feedQueue[feedPos++]));
  }
}

/* --------------------------------------------------------------------- HUD */

function setHud(state) {
  els.hudStateText.textContent = STATE_LABELS[state] || state;
  els.hudFlavor.textContent = pick(STATUS_FLAVOR[state] || ['']);
  els.scrMode.textContent = state.replace(/([A-Z])/g, ' $1').toLowerCase();
  els.hudTask.textContent = app.task || '— no task —';
}

function setButtons(state) {
  els.btnStart.disabled = state !== 'idle';
  const broke = ['creditsDepleted', 'waiting', 'distraction'].includes(state) && app.credits <= 0;
  els.btnBuy.hidden = !broke;
  els.hint.hidden = state !== 'permissionPrompt';
}

/* ----------------------------------------------------------------- effetti */

function flash(warm = false) {
  els.flash.classList.toggle('warm', warm);
  els.flash.classList.remove('on');
  void els.flash.offsetWidth;
  els.flash.classList.add('on');
}

function shake() {
  els.stage.classList.remove('shake');
  void els.stage.offsetWidth;
  els.stage.classList.add('shake');
  setTimeout(() => els.stage.classList.remove('shake'), 800);
}

/* =========================================================================
   MACCHINA A STATI
   ========================================================================= */

const sm = new StateMachine('idle', {

  idle: {
    onEnter(from) {
      timers.clear();
      els.termTyped.textContent = '';
      audio.room(0.05);
      if (from === 'agentRunning') {
        addLine('<span class="t-ok">✓ done.</span> <span class="t-dim">Nobody will review it.</span>', '');
        addLine('<span class="t-dim">Awaiting next instruction…</span>');
      } else if (from === 'restart') {
        clearTerm();
        addLine('<span class="t-ok">session restored.</span> <span class="t-dim">the loop continues.</span>');
      } else if (from === 'coding') {
        addLine('<span class="t-dim">request cancelled. The doubt remains.</span>');
      } else {
        addLine('<span class="t-dim">idle. The cursor is blinking at you.</span>');
      }
      app.task = null;
      setHud('idle');
      setButtons('idle');
    }
  },

  coding: {
    onEnter() {
      app.task = pick(TASKS);
      app.taskCount++;
      setHud('coding');
      setButtons('coding');
      audio.room(0.06);
      clearTerm();
      addLine(`<span class="t-dim">new task ·</span> ${app.task}`);

      // digitazione del prompt, carattere per carattere
      const text = app.task.toLowerCase();
      let i = 0;
      const step = Math.max(24, Math.floor(TIMING.codingMs / (text.length + 6)));
      timers.every(step, () => {
        if (i >= text.length) return;
        els.termTyped.textContent += text[i++];
        if (i % 3 === 0) audio.play('key');
      });
      timers.after(TIMING.codingMs, () => sm.to('permissionPrompt'));
    },
    onExit() {
      timers.clear();
    }
  },

  permissionPrompt: {
    onEnter() {
      app.permission = pick(PERMISSIONS);
      els.permTitle.textContent = app.permission.title;
      els.permDetail.textContent = app.permission.detail;
      els.permPanel.hidden = false;
      setHud('permissionPrompt');
      setButtons('permissionPrompt');
      audio.play('beep');
      audio.room(0.09);
      addLine('<span class="t-bad">⚠ permission required</span>');
      els.btnAllow.focus({ preventScroll: true });
    },
    onExit() {
      els.permPanel.hidden = true;
      timers.clear();
    }
  },

  agentRunning: {
    onEnter() {
      els.termTyped.textContent = '';
      setHud('agentRunning');
      setButtons('agentRunning');
      audio.room(0.14);
      addLine('<span class="t-ok">granted.</span> <span class="t-dim">agent has the keys now.</span>');
      app.progressEl = addProgressLine();

      const duration = 24000 + Math.random() * 10000;
      const started = performance.now();
      app.runEndsAt = started + duration;

      timers.every(TIMING.agentTickMs, () => {
        const now = performance.now();
        app.credits -= CREDITS.burnPerSecond * (TIMING.agentTickMs / 1000);
        renderCredits();

        const ratio = (now - started) / duration;
        if (app.progressEl) {
          app.progressEl.innerHTML = `<span class="t-dim">agent</span> ${bar(ratio)}`;
        }

        if (app.credits <= 0) {
          app.credits = 0;
          renderCredits();
          sm.to('creditsDepleted');
        } else if (now >= app.runEndsAt) {
          sm.to('idle');
        }
      });

      timers.every(TIMING.logIntervalMs, () => {
        const roll = Math.random();
        if (roll < 0.28) {
          addLine(`<span class="t-ok">+</span> wrote <span class="t-warn">${pick(LOG_FILES)}</span>`);
        } else if (roll < 0.38) {
          addLine(`<span class="t-warn">! </span><span class="t-dim">${pick(LOG_FILES)} conflicts with itself</span>`);
        } else {
          addLine(`<span class="t-dim">${pick(AGENT_LOGS)}</span>`);
        }
        // il progress deve restare in fondo
        if (app.progressEl) els.term.appendChild(app.progressEl);
        audio.play('key');
      });
    },
    onExit() {
      timers.clear();
      app.progressEl = null;
    }
  },

  creditsDepleted: {
    onEnter() {
      els.deadPanel.hidden = false;
      setHud('creditsDepleted');
      setButtons('creditsDepleted');
      audio.play('error');
      audio.room(0.02);
      flash();
      shake();
      addLine('<span class="t-bad">✕ credits depleted.</span> <span class="t-dim">agent stopped mid-thought.</span>');
      timers.after(TIMING.depletedMs, () => sm.to('waiting'));
    },
    onExit() {
      els.deadPanel.hidden = true;
      timers.clear();
    }
  },

  waiting: {
    onEnter() {
      setHud('waiting');
      setButtons('waiting');
      addLine('<span class="t-dim">nothing is happening. Aggressively.</span>');
      timers.after(TIMING.waitingMs, () => sm.to('distraction'));
    },
    onExit() { timers.clear(); }
  },

  distraction: {
    onEnter() {
      setHud('distraction');
      setButtons('distraction');
      doDistraction();
      timers.after(TIMING.distractionIdleMs, () => sm.to('distraction'));
    },
    onExit() { timers.clear(); }
  },

  payment: {
    onEnter() {
      setHud('payment');
      setButtons('payment');
      els.btnPay.disabled = true;
      els.btnPay.textContent = PAYMENT.processing;
      timers.after(TIMING.paymentMs, () => {
        els.btnPay.textContent = PAYMENT.done;
        audio.play('purchase');
        timers.after(500, () => sm.to('restart'));
      });
    },
    onExit() { timers.clear(); }
  },

  restart: {
    onEnter() {
      closePayment();
      app.credits = CREDITS.refill;
      renderCredits();
      setHud('restart');
      setButtons('restart');
      audio.room(0.14);
      flash(true);
      interactionsApi?.resetCoffee();
      say('Payment successful. Motivation not included.', 800, 420, 'warm');
      timers.after(TIMING.restartMs, () => sm.to('idle'));
    },
    onExit() { timers.clear(); }
  }
});

/* -------------------------------------------------- distrazioni automatiche */

let lastDistraction = -1;

function doDistraction() {
  const options = [
    () => {
      interactionsApi.gesture(els.svg.querySelector('#arm-r'), 'reach-vape', 2400);
      setTimeout(() => { puff(els.svg); audio.play('puff'); }, 900);
      say('Compiling patience…', 1000, 560, 'warm');
    },
    () => {
      interactionsApi.gesture(els.svg.querySelector('#arm-l'), 'reach-mug', 2200);
      setTimeout(() => audio.play('sip'), 900);
      say('Coffee level: critical.', 560, 600, 'warm');
    },
    () => {
      interactionsApi.gesture(els.svg.querySelector('#head'), 'look-side', 2600);
      scrollFeed();
      say('Researching competitors. On a feed.', 1240, 300);
    },
    () => {
      interactionsApi.gesture(els.svg.querySelector('#head'), 'look-window', 3000);
      say('Outside world detected.', 250, 300);
    }
  ];
  let i = Math.floor(Math.random() * options.length);
  if (i === lastDistraction) i = (i + 1) % options.length;
  lastDistraction = i;
  options[i]();
}

/* --------------------------------------------------------------- pagamento */

function buildPaymentPanel() {
  els.payWrap.querySelector('.pay-plan').textContent = PAYMENT.plan;
  els.payWrap.querySelector('.pay-cur').textContent = PAYMENT.currency;
  els.payWrap.querySelector('.pay-num').textContent = PAYMENT.price;
  els.payWrap.querySelector('.pay-cad').textContent = PAYMENT.cadence;
  const list = els.payWrap.querySelector('.pay-list');
  list.innerHTML = '';
  PAYMENT.bullets.forEach((b) => {
    const li = document.createElement('li');
    li.textContent = b;
    list.appendChild(li);
  });
  els.btnPay.textContent = PAYMENT.cta;
}

function openPayment() {
  if (app.paymentOpen || app.credits > 0) return;
  app.paymentOpen = true;
  app.lastFocus = document.activeElement;
  els.btnPay.disabled = false;
  els.btnPay.textContent = PAYMENT.cta;
  els.payWrap.hidden = false;
  els.btnPay.focus({ preventScroll: true });
}

function closePayment() {
  if (!app.paymentOpen) return;
  app.paymentOpen = false;
  els.payWrap.hidden = true;
  if (app.lastFocus && document.contains(app.lastFocus)) app.lastFocus.focus({ preventScroll: true });
}

/* ---------------------------------------------------------------- API loop */

const api = {
  startTask() {
    if (sm.state !== 'idle') return;
    if (app.credits <= 0) { openPayment(); return; }
    sm.to('coding');
  },

  allow() {
    if (sm.state !== 'permissionPrompt') return;
    audio.play('allow');
    sm.to('agentRunning');
  },

  deny() {
    if (sm.state !== 'permissionPrompt') return;
    audio.play('deny');
    say('Denied. The task remains, quietly.', 800, 420);
    addLine('<span class="t-dim">denied. Agent is disappointed but understanding.</span>');
    sm.to('idle');
  },

  awaitingPermission() { return sm.state === 'permissionPrompt'; },

  /** clic sul monitor principale: fa la cosa sensata per lo stato corrente */
  pokeMonitor() {
    switch (sm.state) {
      case 'idle': api.startTask(); break;
      case 'permissionPrompt': api.allow(); break;
      case 'agentRunning': say('Do not touch anything.', 800, 420); break;
      case 'coding': say('One more prompt and it will work.', 800, 420); break;
      case 'creditsDepleted':
      case 'waiting':
      case 'distraction': openPayment(); break;
      default: break;
    }
  },

  openPayment,

  confirmPayment() {
    if (sm.state === 'payment') return;
    sm.to('payment');
  },

  /** Enter globale */
  primaryAction() {
    if (app.paymentOpen) { api.confirmPayment(); return; }
    switch (sm.state) {
      case 'permissionPrompt': api.allow(); break;
      case 'idle': api.startTask(); break;
      case 'creditsDepleted':
      case 'waiting':
      case 'distraction': openPayment(); break;
      default: break;
    }
  },

  /** Esc globale */
  secondaryAction() {
    if (app.paymentOpen && sm.state !== 'payment') { closePayment(); return; }
    if (sm.state === 'permissionPrompt') api.deny();
  },

  typeBurst() {
    if (!['coding', 'idle'].includes(sm.state)) return;
    const junk = 'const await fix() => retry;';
    els.termTyped.textContent += junk[Math.floor(Math.random() * junk.length)];
  },

  clientPing() {
    if (sm.state === 'agentRunning') {
      addLine('<span class="t-bad">⚠ scope changed by external human.</span>');
    }
  },

  scrollFeed
};

/* ------------------------------------------------------------------- boot */

const interactionsApi = initInteractions({
  svg: els.svg,
  stage: els.stage,
  els,
  audio,
  api,
  say
});

function boot() {
  document.body.dataset.weather = 'calm';
  document.body.dataset.lamp = 'on';
  // prima cosa: trasforma i poligoni netti in tratto disegnato a mano
  roughenScene(els.svg, { amp: 2.6, seg: 24 });
  buildWindow(els.svg, SKYLINE);
  buildPaymentPanel();
  scrollFeed();   // il feed parte da un solo post e cresce
  renderCredits();

  sm.subscribe(({ to }) => {
    document.body.dataset.state = to;
  });
  document.body.dataset.state = sm.state;

  clearTerm();
  addLine('<span class="t-dim">session resumed. 3 tabs recovered. 1 regret.</span>');
  addLine('<span class="t-dim">idle. The cursor is blinking at you.</span>');
  setHud('idle');
  setButtons('idle');

  // il feed vive di vita propria
  setInterval(() => {
    if (['idle', 'waiting', 'distraction'].includes(sm.state)) scrollFeed();
  }, 7000);

  // notifica del cliente a intervalli irregolari
  setInterval(() => {
    if (sm.state === 'agentRunning' && Math.random() < 0.5) {
      const notif = els.svg.querySelector('#phoneNotif');
      notif.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 2400, easing: 'steps(2)' });
      audio.play('buzz');
    }
  }, 12000);
}

boot();

// utile in console per ispezionare il loop
window.vibe = { sm, app, api };
