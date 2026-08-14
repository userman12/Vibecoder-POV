/**
 * app.js — bootstrap, main loop, UI rendering.
 * Owns the state (credits, task) and the state machine; interactions.js
 * only calls the methods exposed on `api`.
 */

import {
  CREDITS, TIMING, TASKS, TASK_LOGS, PERMISSIONS, AGENT_LOGS, LOG_FILES,
  FEED_POSTS, STATE_LABELS, STATUS_FLAVOR, PAYMENT, SKYLINE,
  PHONE_NOTIFICATIONS, NOTIFICATION_TIERS, IDLE_MONOLOGUE,
  TASK_DONE_LINES, TASK_FAIL_LINES, TASK_FAIL_BUBBLES, FAILURE_CHANCE,
  SHARE_TEXTS, SHARE_FEEDBACK
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
  btnShare: $('#btnShare'),
  btnMuteLabel: $('#btnMuteLabel'),
  sound: $('.sound'),
  vol: $('#vol'),
  intro: $('#intro'),
  btnEnter: $('#btnEnter'),
  btnAllow: $('#btnAllow'),
  btnDeny: $('#btnDeny'),
  btnPay: $('#btnPay'),
  payWrap: $('#payWrap'),
  flash: $('#flash'),
  bubble: $('#bubble'),
  bubbleText: $('#bubbleText'),
  tooltip: $('#tooltip')
};

const say = createSpeaker(els.stage, els.bubble, els.bubbleText);
const timers = new Timers();

/* --------------------------------------------------------------- persistence */

/**
 * The only state that survives a reload. Kept separate from `app` (which is
 * session-only) so it's obvious at a glance what's durable. Wrapped in
 * try/catch because localStorage can throw in private browsing / sandboxed
 * iframes — a lost stat is harmless, a crashed boot is not.
 */
const STATS_KEY = 'vibecoderpov:stats';

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { totalTasksStarted: Number(parsed.totalTasksStarted) || 0 };
  } catch {
    return { totalTasksStarted: 0 };
  }
}

function saveStats() {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
}

const stats = loadStats();

/**
 * Audio preferences. Separate key from stats: these are settings the user
 * chose, not a record of what they did, and they're read at a different
 * moment (before the audio module exists rather than during the loop).
 *
 * Note that `muted: false` does NOT mean sound plays immediately on load —
 * browsers require a user gesture before an AudioContext can start. The
 * intro card's "enter" click is that gesture; see enterScene() below.
 */
const PREFS_KEY = 'vibecoderpov:prefs';

function loadPrefs() {
  const fallback = { muted: true, volume: 0.6 };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const vol = Number(parsed.volume);
    return {
      muted: parsed.muted !== false,
      volume: Number.isFinite(vol) ? Math.min(Math.max(vol, 0), 1) : fallback.volume
    };
  } catch {
    return fallback;
  }
}

function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

const prefs = loadPrefs();

// created after prefs so the persisted mute/volume are its starting values
const audio = createAudio({ muted: prefs.muted, volume: prefs.volume });

/* ------------------------------------------------------------------- state */

const app = {
  credits: CREDITS.start,
  task: null,
  permission: null,
  taskCount: 0,
  purchaseCount: 0, // resets on reload — the payment screen escalates per session, not for life
  clock: 60 * 60 + 7 * 60, // 01:07:00, in seconds
  runEndsAt: 0,
  progressEl: null,
  paymentOpen: false,
  lastFocus: null
};

/* ------------------------------------------------------- terminal (render) */

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
 * The progress line always stays at the bottom and is rewritten continuously:
 * no timestamp, otherwise the terminal clock would appear to run backwards
 * every time the line gets pushed back down under new log entries.
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

/* ---------------------------------------------------------------- credits */

function renderCredits() {
  const ratio = clamp(app.credits / CREDITS.max, 0, 1);
  els.credFill.style.width = (ratio * 100).toFixed(1) + '%';
  els.credNum.textContent = Math.max(0, Math.round(app.credits));
  document.body.dataset.credits =
    app.credits <= 0 ? 'empty' : ratio < CREDITS.lowThreshold ? 'low' : 'ok';
}

/* --------------------------------------------------------------- feed side */

/**
 * The feed grows one post at a time. When the panel is full it starts over
 * with a fresh list: same content, shuffled order, so the next cycle
 * doesn't repeat the sequence just seen.
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

/** adds a post; if it no longer fits, clears the panel and starts a fresh list */
function scrollFeed() {
  if (feedPos >= feedQueue.length) newFeedList();
  els.feed.appendChild(buildPost(feedQueue[feedPos++]));

  // real measurement instead of a fixed post count: texts have different
  // lengths, so the panel fills up with 3, 4 or 5 posts depending on the case
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

/* ----------------------------------------------------------------- effects */

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
   STATE MACHINE
   ========================================================================= */

const sm = new StateMachine('idle', {

  idle: {
    onEnter(from, payload) {
      timers.clear();
      els.termTyped.textContent = '';
      audio.room(0.05);
      if (from === 'agentRunning') {
        const failed = !!payload?.failed;
        const outcome = pick(failed ? TASK_FAIL_LINES : TASK_DONE_LINES);
        addLine(`<span class="${failed ? 't-bad' : 't-ok'}">${outcome.ok}</span> <span class="t-dim">${outcome.tail}</span>`);
        addLine(`<span class="t-dim">${outcome.next}</span>`);
        if (failed) {
          audio.play('deny');
          shake();
          say(pick(TASK_FAIL_BUBBLES), 800, 430, 'alert');
        }
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
      scheduleIdleMonologue();
    },
    onExit() {
      // idle has no timers of its own besides the monologue, but clearing
      // here guarantees it can never fire a "Still here." bubble while the
      // scene has already moved on to coding/permissionPrompt/etc.
      timers.clear();
    }
  },

  coding: {
    onEnter() {
      app.task = pick(TASKS);
      app.taskCount++;
      stats.totalTasksStarted++;
      saveStats();
      setHud('coding');
      setButtons('coding');
      audio.room(0.06);
      clearTerm();
      addLine(`<span class="t-dim">new task ·</span> ${app.task}`);

      // typing the prompt, character by character
      const text = app.task.toLowerCase();
      let i = 0;
      const step = Math.max(24, Math.floor(TIMING.codingMs / (text.length + 6)));
      timers.every(step, () => {
        if (i >= text.length) return;
        const ch = text[i++];
        els.termTyped.textContent += ch;
        // a click on (almost) every character instead of every third one:
        // the gaps are what make it read as typing rather than as a metronome,
        // so spaces stay silent and a few keystrokes are randomly dropped
        if (ch !== ' ' && Math.random() > 0.12) audio.play('type');
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
      let lastTickAt = 0;

      timers.every(TIMING.agentTickMs, () => {
        const now = performance.now();
        app.credits -= CREDITS.burnPerSecond * (TIMING.agentTickMs / 1000);
        renderCredits();

        // Audible countdown once credits get low: the bar already pulses,
        // but only while you're looking at it. Tied to agentRunning because
        // that's the only state where credits are actually draining —
        // ticking while nothing is being spent would just be noise.
        const left = app.credits / CREDITS.max;
        if (left > 0 && left < CREDITS.lowThreshold) {
          // interval closes from 1s down to ~0.42s as it approaches zero,
          // so the pulse quickens instead of staying metronomic
          const urgency = 1 - left / CREDITS.lowThreshold;
          const gap = 1000 - urgency * 580;
          if (now - lastTickAt >= gap) {
            lastTickAt = now;
            audio.play('tick');
          }
        }

        const ratio = (now - started) / duration;
        if (app.progressEl) {
          app.progressEl.innerHTML = `<span class="t-dim">agent</span> ${bar(ratio)}`;
        }

        if (app.credits <= 0) {
          app.credits = 0;
          renderCredits();
          sm.to('creditsDepleted');
        } else if (now >= app.runEndsAt) {
          // a run that reaches the end can still have broken something.
          // The outcome rides along as the transition payload rather than
          // as a new state — idle.onEnter is where the verdict is printed,
          // and the FSM already carries payloads through to onEnter.
          sm.to('idle', { failed: Math.random() < FAILURE_CHANCE });
        }
      });

      timers.every(TIMING.logIntervalMs, () => {
        const roll = Math.random();
        const taskLogs = TASK_LOGS[app.task];
        if (roll < 0.28) {
          addLine(`<span class="t-ok">+</span> wrote <span class="t-warn">${pick(LOG_FILES)}</span>`);
        } else if (roll < 0.38) {
          addLine(`<span class="t-warn">! </span><span class="t-dim">${pick(LOG_FILES)} conflicts with itself</span>`);
        } else if (taskLogs && roll < 0.58) {
          // logs tied to the actual task, not just generic noise
          addLine(`<span class="t-dim">${pick(taskLogs)}</span>`);
        } else {
          addLine(`<span class="t-dim">${pick(AGENT_LOGS)}</span>`);
        }
        // the progress line must stay at the bottom
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
      app.purchaseCount++; // next time the payment screen opens, the plan escalates
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

/* -------------------------------------------------- automatic distractions */

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

/**
 * If idle lasts too long without the user starting anything, the character
 * talks to itself. Re-arms after every firing with a new random delay, and
 * only speaks if still idle by the time the timer lands (idle.onExit clears
 * the pending timer too, this check is the second line of defense for any
 * race at the exact moment of a transition).
 */
function scheduleIdleMonologue() {
  const delay = 20000 + Math.random() * 15000;
  timers.after(delay, () => {
    if (sm.state !== 'idle') return;
    say(pick(IDLE_MONOLOGUE), 800, 440);
    scheduleIdleMonologue();
  });
}

/**
 * Notification tone escalates with lifetime tasks started (persisted, see
 * `stats`). Higher tiers are added on TOP of the calm pool, not swapped in,
 * so a burnt-out client can still occasionally send something mundane.
 */
function pickPhoneNotification() {
  const pool = [...PHONE_NOTIFICATIONS.calm];
  if (stats.totalTasksStarted >= NOTIFICATION_TIERS.annoyed) pool.push(...PHONE_NOTIFICATIONS.annoyed);
  if (stats.totalTasksStarted >= NOTIFICATION_TIERS.furious) pool.push(...PHONE_NOTIFICATIONS.furious);
  return pick(pool);
}

/* --------------------------------------------------------------- payment */

/**
 * Rebuilds the payment screen's text for the current tier. Called every
 * time the screen opens (not just once at boot) so repeat purchases in the
 * same session show a plan with more asterisks and fewer promises.
 */
function buildPaymentPanel() {
  const tier = PAYMENT.tiers[Math.min(app.purchaseCount, PAYMENT.tiers.length - 1)];
  els.payWrap.querySelector('.pay-plan').textContent = tier.plan;
  els.payWrap.querySelector('.pay-asterisk').textContent = tier.asterisk;
  els.payWrap.querySelector('.pay-cur').textContent = PAYMENT.currency;
  els.payWrap.querySelector('.pay-num').textContent = PAYMENT.price;
  els.payWrap.querySelector('.pay-cad').textContent = PAYMENT.cadence;
  const list = els.payWrap.querySelector('.pay-list');
  list.innerHTML = '';
  tier.bullets.forEach((b) => {
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
  buildPaymentPanel();
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

/* ----------------------------------------------------------------- sound UI */

/** mirrors the audio module's state onto the controls, and persists it */
function syncSound(on) {
  els.btnMute.setAttribute('aria-pressed', String(!on));
  els.btnMuteLabel.textContent = on ? 'Sound on' : 'Sound off';
  els.sound.dataset.on = String(on);
  els.vol.disabled = !on; // collapsed by CSS; also keep it out of the tab order
  prefs.muted = !on;
  savePrefs();
}

function setVolume(v) {
  prefs.volume = audio.setVolume(v);
  savePrefs();
}

/* -------------------------------------------------------------------- share */

/**
 * Opens a pre-filled post. Runs inside the click handler so the popup
 * blocker treats it as user-initiated; if it's blocked anyway (window.open
 * returns null, or returns a window that never gets focus) we fall back to
 * the clipboard rather than silently doing nothing.
 */
function shareLoop() {
  const text = pick(SHARE_TEXTS);
  const url = window.location.href.split('#')[0];
  const intent = 'https://twitter.com/intent/tweet?text=' +
    encodeURIComponent(text) + '&url=' + encodeURIComponent(url);

  let win = null;
  try {
    win = window.open(intent, '_blank', 'noopener,noreferrer,width=600,height=520');
  } catch { /* handled below */ }

  if (win) {
    say(SHARE_FEEDBACK.opened, 800, 430, 'warm');
    return;
  }

  const clip = window.navigator?.clipboard;
  if (!clip) { say(SHARE_FEEDBACK.failed, 800, 430, 'alert'); return; }
  clip.writeText(`${text}\n\n${url}`)
    .then(() => say(SHARE_FEEDBACK.copied, 800, 430, 'warm'))
    .catch(() => say(SHARE_FEEDBACK.failed, 800, 430, 'alert'));
}

/* --------------------------------------------------------------------- intro */

let entered = false;

/**
 * Dismisses the title card. This runs inside a user gesture, which is the
 * only moment a browser will let an AudioContext start — so a persisted
 * "sound on" preference is honoured here rather than at load time.
 */
function enterScene() {
  if (entered) return;
  entered = true;

  if (!prefs.muted) audio.resume();
  audio.play('click');

  els.intro.classList.add('is-leaving');
  setTimeout(() => { els.intro.hidden = true; }, 460);

  // only start counting idle time once the scene is actually visible,
  // otherwise the monologue can fire behind the title card
  scheduleIdleMonologue();
  els.btnStart.focus({ preventScroll: true });
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

  /** click on the main monitor: does the sensible thing for the current state */
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

  /** global Enter */
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

  /** global Esc */
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

  pickPhoneNotification,

  syncSound,
  setVolume,
  shareLoop,

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
  // first thing: turn the crisp polygons into hand-drawn strokes
  roughenScene(els.svg, { amp: 2.6, seg: 24 });
  buildWindow(els.svg, SKYLINE);
  scrollFeed(); // the feed starts with a single post and grows
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

  // reflect the persisted audio preferences on the controls. The sound
  // itself can't start yet (no user gesture); enterScene() does that.
  // Note the FSM never runs idle.onEnter for the initial state — its
  // constructor only assigns `this.state` without firing lifecycle hooks,
  // which is also why setHud/setButtons above are duplicated manually —
  // so the idle monologue is armed from enterScene() instead.
  els.vol.value = String(Math.round(prefs.volume * 100));
  syncSound(!prefs.muted);

  els.btnEnter.addEventListener('click', enterScene);
  els.intro.addEventListener('click', enterScene);
  // Capture phase on purpose: interactions.js registers its global keydown
  // handler before boot() runs, so on Enter it would otherwise fire first
  // and start a task behind the still-visible title card.
  document.addEventListener('keydown', (ev) => {
    if (entered) return;
    if (ev.key === 'Tab') return; // let focus move without dismissing
    ev.preventDefault();
    ev.stopPropagation();
    enterScene();
  }, true);
  els.btnEnter.focus({ preventScroll: true });

  // the feed lives its own life
  setInterval(() => {
    if (['idle', 'waiting', 'distraction'].includes(sm.state)) scrollFeed();
  }, 7000);

  // client notification at irregular intervals
  setInterval(() => {
    if (sm.state === 'agentRunning' && Math.random() < 0.5) {
      const notif = els.svg.querySelector('#phoneNotif');
      notif.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 2400, easing: 'steps(2)' });
      audio.play('buzzPhone');
    }
  }, 12000);
}

boot();

// handy in the console to inspect the loop
window.vibe = { sm, app, api };
