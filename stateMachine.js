/**
 * stateMachine.js — macchina a stati finiti minimale e verificabile.
 *
 * Regole:
 *  - una sola transizione valida alla volta;
 *  - ogni transizione non dichiarata viene rifiutata (e loggata in dev);
 *  - onExit dello stato precedente gira sempre prima di onEnter del nuovo;
 *  - i subscriber ricevono { from, to, payload } dopo onEnter.
 */

export const STATES = [
  'idle',
  'coding',
  'permissionPrompt',
  'agentRunning',
  'creditsDepleted',
  'waiting',
  'distraction',
  'payment',
  'restart'
];

/** Grafo delle transizioni consentite. */
export const TRANSITIONS = {
  idle: ['coding'],
  coding: ['permissionPrompt', 'idle'],
  permissionPrompt: ['agentRunning', 'idle'],
  agentRunning: ['creditsDepleted', 'idle'],
  creditsDepleted: ['waiting', 'payment'],
  waiting: ['distraction', 'payment'],
  distraction: ['payment', 'distraction'],
  payment: ['restart'],
  restart: ['idle']
};

export class StateMachine {
  /**
   * @param {string} initial stato di partenza
   * @param {Object<string, {onEnter?:Function, onExit?:Function}>} handlers
   */
  constructor(initial = 'idle', handlers = {}) {
    if (!STATES.includes(initial)) throw new Error(`Unknown initial state: ${initial}`);
    this.state = initial;
    this.previous = null;
    this.handlers = handlers;
    this.listeners = new Set();
    this.debug = false;
    this.history = [initial];
  }

  /** true se la transizione verso `to` è dichiarata nel grafo. */
  can(to) {
    return (TRANSITIONS[this.state] || []).includes(to);
  }

  /**
   * Esegue la transizione. Ritorna true se avvenuta, false se rifiutata.
   * @param {string} to
   * @param {*} payload passato a onExit/onEnter e ai subscriber
   */
  to(to, payload = null) {
    if (!STATES.includes(to)) {
      console.warn(`[fsm] stato inesistente: ${to}`);
      return false;
    }
    if (!this.can(to)) {
      if (this.debug) console.warn(`[fsm] transizione rifiutata: ${this.state} → ${to}`);
      return false;
    }

    const from = this.state;
    this.handlers[from]?.onExit?.(to, payload);
    this.previous = from;
    this.state = to;
    this.history.push(to);
    if (this.history.length > 40) this.history.shift();
    this.handlers[to]?.onEnter?.(from, payload);

    for (const fn of this.listeners) fn({ from, to, payload });
    return true;
  }

  /** Forza uno stato ignorando il grafo (usato solo dal reset globale). */
  reset(to = 'idle') {
    const from = this.state;
    this.handlers[from]?.onExit?.(to, null);
    this.previous = from;
    this.state = to;
    this.history = [to];
    this.handlers[to]?.onEnter?.(from, null);
    for (const fn of this.listeners) fn({ from, to, payload: null, forced: true });
  }

  /** @param {(e:{from:string,to:string,payload:*})=>void} fn */
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  is(...states) {
    return states.includes(this.state);
  }
}

/**
 * Piccolo scheduler: raggruppa i timer per poterli azzerare a ogni
 * cambio di stato, evitando transizioni "fantasma" da timer orfani.
 */
export class Timers {
  constructor() {
    this.ids = new Set();
    this.intervals = new Set();
  }

  after(ms, fn) {
    const id = setTimeout(() => {
      this.ids.delete(id);
      fn();
    }, ms);
    this.ids.add(id);
    return id;
  }

  every(ms, fn) {
    const id = setInterval(fn, ms);
    this.intervals.add(id);
    return id;
  }

  clear() {
    for (const id of this.ids) clearTimeout(id);
    for (const id of this.intervals) clearInterval(id);
    this.ids.clear();
    this.intervals.clear();
  }
}
