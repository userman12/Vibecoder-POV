/**
 * stateMachine.js — minimal, verifiable finite state machine.
 *
 * Rules:
 *  - only one valid transition at a time;
 *  - any undeclared transition is rejected (and logged in dev);
 *  - the previous state's onExit always runs before the new state's onEnter;
 *  - subscribers receive { from, to, payload } after onEnter.
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

/** Graph of allowed transitions. */
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
   * @param {string} initial starting state
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

  /** true if the transition to `to` is declared in the graph. */
  can(to) {
    return (TRANSITIONS[this.state] || []).includes(to);
  }

  /**
   * Performs the transition. Returns true if it happened, false if rejected.
   * @param {string} to
   * @param {*} payload passed to onExit/onEnter and to subscribers
   */
  to(to, payload = null) {
    if (!STATES.includes(to)) {
      console.warn(`[fsm] unknown state: ${to}`);
      return false;
    }
    if (!this.can(to)) {
      if (this.debug) console.warn(`[fsm] rejected transition: ${this.state} → ${to}`);
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

  /** Forces a state, bypassing the graph (used only by the global reset). */
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
 * Small scheduler: groups timers so they can all be cleared on every state
 * change, preventing "ghost" transitions from orphaned timers.
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
