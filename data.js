/**
 * data.js — content, constants and configuration for "Vibecoder POV".
 * No logic here: just static data consumed by app.js / interactions.js.
 */

/* ---------------------------------------------------------------- palette */

export const PALETTE = {
  black: '#080A09',
  teal: '#123C35',
  green: '#47B99A',
  red: '#E23438',
  redShadow: '#7B1D27',
  charcoal: '#252A29',
  dust: '#69716C',
  cream: '#E8C77A',
  bone: '#D8D3C2'
};

/* ---------------------------------------------------------------- credits */

export const CREDITS = {
  max: 1000,
  start: 1000,
  /** credits burned per second while the agent is working */
  burnPerSecond: 34,
  /** credits "granted" by the fake purchase */
  refill: 1000,
  /** threshold below which the bar turns red */
  lowThreshold: 0.22
};

/* ------------------------------------------------------------- timing */

export const TIMING = {
  codingMs: 2600,          // the vibecoder is typing the prompt
  agentTickMs: 100,        // resolution of the credit drain
  logIntervalMs: 1150,     // new terminal line
  depletedMs: 1800,        // red screen
  waitingMs: 4200,         // staring into the void
  distractionIdleMs: 5200, // periodic automatic distraction
  paymentMs: 2400,         // fake payment processing
  restartMs: 1300          // dopamine refill
};

/* ------------------------------------------------------------------ tasks */

export const TASKS = [
  'Refactor the entire auth flow before lunch.',
  'Fix one small client request.',
  'Generate the landing page, backend and confidence.',
  'Deploy a feature nobody specified.',
  'Investigate why production feels emotionally unstable.',
  'Turn vague feedback into 47 commits.',
  'Make the dashboard feel more premium. Somehow.',
  'Rewrite the payment logic. It worked, but quietly.',
  'Add dark mode to a product with no users.',
  'Migrate everything to a framework released this morning.'
];

/**
 * Extra terminal lines specific to each task, keyed by the exact string in
 * TASKS. Mixed into the generic AGENT_LOGS pool during agentRunning so the
 * log feels connected to what was actually asked, not just generic noise.
 */
export const TASK_LOGS = {
  'Refactor the entire auth flow before lunch.': [
    'Auth flow refactored. Also broke logout. Investigating.',
    'Session tokens now expire out of spite.',
    'Lunch has been redefined as a state of mind.'
  ],
  'Fix one small client request.': [
    'Scope creep detected. Scope creep ignored.',
    'The "small" request now touches 14 files.',
    'Estimated 10 minutes. Elapsed: 3 hours.'
  ],
  'Generate the landing page, backend and confidence.': [
    'Landing page generated. Confidence still pending.',
    'Backend feels structurally optimistic.',
    'Confidence.js imported but never actually used.'
  ],
  'Deploy a feature nobody specified.': [
    'Feature deployed. Specification retroactively invented.',
    'Stakeholders notified. Stakeholders confused.',
    'Shipping first, asking questions never.'
  ],
  'Investigate why production feels emotionally unstable.': [
    'Production is not crashing. Production is grieving.',
    'Root cause: everything, but specifically Tuesday.',
    'Logs suggest the server is also tired.'
  ],
  'Turn vague feedback into 47 commits.': [
    'Commit 23: "fix". Commit 24: "actually fix".',
    'Feedback remains vague. Commits remain many.',
    'Git blame now points entirely at 2am.'
  ],
  'Make the dashboard feel more premium. Somehow.': [
    'Added a gradient. Billed as premium.',
    '"Premium" achieved via increased padding.',
    'Dashboard now 12% more expensive-looking.'
  ],
  'Rewrite the payment logic. It worked, but quietly.': [
    'Payment logic rewritten. Now fails loudly instead.',
    'Old bug removed. New bug hired as replacement.',
    'Refactor complete. Nobody asked for this.'
  ],
  'Add dark mode to a product with no users.': [
    'Dark mode shipped to an audience of zero.',
    'Contrast ratio: excellent. Traffic: none.',
    'The void now has a toggle.'
  ],
  'Migrate everything to a framework released this morning.': [
    'Framework docs 404. Reading the changelog on Discord instead.',
    'Breaking change discovered. Framework is 6 hours old.',
    'Migration 40% complete, framework already deprecated.'
  ]
};

/* ------------------------------------------------------- permission prompt */

export const PERMISSIONS = [
  {
    title: 'AI Agent requests permission to run a dangerously broad command.',
    detail: 'rm -rf ./doubts && git push --force --no-questions'
  },
  {
    title: 'PromptCloud wants access to deploy to production.',
    detail: 'target: prod-eu-1 · reviewers: 0 · rollback plan: optimism'
  },
  {
    title: 'TerminalMind requests access to your entire repository.',
    detail: 'scope: everything · including the folder called old_final_v3'
  },
  {
    title: 'Agent wants to install 438 dependencies. Allow?',
    detail: '412 transitive · 26 abandoned · 1 maintained by a single tired person'
  },
  {
    title: 'This action may rewrite files you forgot existed.',
    detail: 'estimated regret: moderate · estimated tokens: catastrophic'
  },
  {
    title: 'Agent requests emotional access to your repository.',
    detail: 'reads commit messages written at 3am · draws conclusions'
  },
  {
    title: 'Agent wants to refactor a file it just wrote.',
    detail: 'reason: it has grown as a person since then'
  }
];

/* -------------------------------------------------------- terminal logs */

export const AGENT_LOGS = [
  'Analyzing codebase…',
  'Thinking harder than necessary…',
  'Reading 312 files you have never opened…',
  'Writing files…',
  'Running tests…',
  'Tests are philosophically passing.',
  'Searching Stack Overflow internally…',
  'Generating elegant technical debt…',
  'Renaming variables for emotional clarity…',
  'Reconsidering the entire architecture…',
  'Deleting the fix. Writing a better fix.',
  'Deleting the better fix.',
  'Almost done. Probably.',
  'Token budget approaching existential limit.',
  'Compiling assumptions…',
  'Patching a bug that did not exist yet…',
  'Consulting docs that no longer match reality…',
  'Adding a comment nobody will read…',
  'Optimising a loop that runs once…',
  'Writing tests for the tests.'
];

export const LOG_FILES = [
  'src/auth/session.ts',
  'src/core/loop.js',
  'src/ui/panel.tsx',
  'server/routes/index.js',
  'lib/utils/maybe.ts',
  'config/production.final.v4.json',
  'src/hooks/useConfidence.ts',
  'scripts/deploy-and-hope.sh'
];

/* ------------------------------------------------------------- social feed */

export const FEED_POSTS = [
  { user: 'nightbuilder', text: 'I replaced my engineering team with seven tabs and a monthly invoice.' },
  { user: 'ship_or_die', text: 'Shipping fast is easy when nobody knows what shipped.' },
  { user: 'agentpilled', text: 'My agent made 86 commits while I stared at the wall.' },
  { user: 'burnrate', text: 'New productivity metric: credits burned per existential crisis.' },
  { user: 'founder_mode', text: 'Founder mode activated. Budget mode deactivated.' },
  { user: 'devnull', text: 'Day 41 of building in public. The public has left.' },
  { user: 'promptsmith', text: 'I no longer write code. I negotiate with it.' },
  { user: 'lateshift', text: 'The agent finished at 4am. I finished around 2019.' },
  { user: 'stackops', text: 'We do not have a roadmap, we have a subscription.' },
  { user: 'zerousers', text: 'Scaled to zero users. Infrastructure is flawless.' },
  { user: 'tokengoblin', text: 'Bought more credits. Bought more credits. Bought more credits.' },
  { user: 'quietdeploy', text: 'Nobody reviewed it, so technically nobody disagreed.' }
];

/* ----------------------------------------------------- phone notifications */

/**
 * Tiered by lifetime task count (persisted, see stats.totalTasksStarted in
 * app.js). Higher tiers unlock on top of the lower ones — they don't replace
 * them — so early "calm" notifications keep showing up even once the
 * relationship has clearly deteriorated.
 */
export const PHONE_NOTIFICATIONS = {
  calm: [
    'Client: quick small change',
    'Client: can we make it more premium?',
    'Client: just one last thing.',
    'Client: is it live yet?',
    'Client: my nephew says it should be blue.',
    'Bank: your subscription renewed.',
    'Client: sorry, one more tiny thing.'
  ],
  annoyed: [
    'Client: this is the third email today.',
    'Client: any update? Even a bad one.',
    'Client: we discussed this on the call, remember?',
    'Client: I forwarded this to my brother, he says it should be easy.'
  ],
  furious: [
    "Client: I've called four times.",
    "Client: my lawyer says 'unresponsive'.",
    'Client: consider this a final notice.',
    'Client: we need to talk. Today.'
  ]
};

/** unlock thresholds for stats.totalTasksStarted, see PHONE_NOTIFICATIONS */
export const NOTIFICATION_TIERS = {
  annoyed: 5,
  furious: 15
};

/* ---------------------------------------------- scene object one-liners */

export const OBJECT_LINES = {
  vape: ['Compiling patience…', 'Inhaling the roadmap.', 'Vapour: 100%. Clarity: 0%.', 'Buffering the soul…'],
  mug: ['Coffee level: critical.', 'Caffeine deployed to production.', 'This is the fourth one. It is 1am.', 'Warm liquid, cold repository.'],
  /** long-press variants: same objects, less restraint */
  vapeLong: [
    'Held it in like a production secret.',
    'Deep breath. The repo is still broken.',
    'Lungs at 100% capacity. Sprint at 12%.',
    'Inhaled the entire quarter.'
  ],
  mugLong: [
    'Drank it like the deadline was personal.',
    'Half the mug, gone. Half the will, too.',
    'That was not a sip. That was a decision.',
    'Chugged. The heartbeat is now a build step.'
  ],
  window: ['Outside world detected.', 'People out there are asleep. Weak.', 'The city ships nothing tonight either.', 'It has rained since the last sprint.'],
  /** shown when the window cycles into fog */
  windowFog: [
    'The city is gone. Nobody filed a ticket.',
    'Visibility: zero. Same as the roadmap.',
    'Fog rolled in. It also has no deadline.',
    'Out there, nothing. In here, also nothing.'
  ],
  lamp: ['Ambient lighting: negotiable.', 'Turning darkness on and off.', 'The lamp still works, at least.'],
  phone: ['Client is typing…', 'Do not open it. Open it.', 'Notification received. Boundaries deleted.'],
  poster: ['Move fast, invoice later.', 'Nothing is production-ready.', 'Ship it, then understand it.', 'The plan was a vibe.'],
  router: ['Internet connection: emotionally unstable.', 'Packets lost, dignity intact.', 'Have you tried unplugging your life?'],
  plant: ['Still alive. Unlike the side project.', 'Watered less often than the repo is deployed.'],
  headphones: ['Same 3 songs since the MVP.', 'Noise cancelled. Thoughts persist.'],
  snack: ['Dinner: reconsidered.', 'Crumbs in the mechanical keyboard. Again.'],
  mouse: ['Wireless. Batteries: philosophical.'],
  keyboard: ['Keys worn where the anxiety is.'],
  'monitor-side': ['Doomscrolling is a form of research.'],
  postit: [
    'Written in a moment of clarity. Illegible now.',
    '"FIX THIS" — no further context provided.',
    'A roadmap, if you squint. Do not squint.',
    'Three bullet points. All of them say "auth".'
  ],
  cat: [
    'The only one here with a healthy sleep schedule.',
    'Zero commits. Zero regrets.',
    'Has not been asked to justify its velocity.',
    'Dreaming of a codebase it will never maintain.',
    'Do not wake it. It has done nothing wrong.'
  ],
  plant2: [
    'Smaller plant. Same survival strategy: being ignored.',
    'Bought as a personality. Kept as an obligation.',
    'Photosynthesis: the only process here that ships daily.'
  ]
};

/* ------------------------------------------------------------ HUD labels */

export const STATE_LABELS = {
  idle: 'Idle',
  coding: 'Typing the prompt',
  permissionPrompt: 'Permission required',
  agentRunning: 'Agent is thinking',
  creditsDepleted: 'Credits depleted',
  waiting: 'Waiting for model',
  distraction: 'Productively distracted',
  payment: 'Processing payment',
  restart: 'Motivation reinstalled'
};

/**
 * Spontaneous lines that appear if idle lasts too long without a click —
 * the character talking to itself. See scheduleIdleMonologue() in app.js.
 */
export const IDLE_MONOLOGUE = [
  'Still here.',
  'The task isn\'t going to write itself. Neither are you, apparently.',
  'The cursor blinks. You blink back.',
  'Somewhere, a deadline is quietly expiring.',
  'This counts as thinking, technically.',
  'The monitor is warmer than the room. Draw your own conclusions.',
  'No task queued. No excuses queued either.',
  'At this rate, the plant is more productive.'
];

/**
 * Variants for the "task finished naturally" message in idle.onEnter, so
 * the terminal doesn't repeat the exact same two lines on every long run.
 */
export const TASK_DONE_LINES = [
  { ok: '✓ done.', tail: 'Nobody will review it.', next: 'Awaiting next instruction…' },
  { ok: '✓ shipped.', tail: 'Tests were "probably fine".', next: 'The backlog remains undefeated.' },
  { ok: '✓ closed.', tail: 'Scope quietly changed twice.', next: 'Standing by for the next fire.' },
  { ok: '✓ complete.', tail: 'Allegedly.', next: 'Coffee levels critical. Continuing anyway.' },
  { ok: '✓ merged.', tail: 'To main. On a Friday.', next: 'Awaiting next instruction…' }
];

/**
 * The third possible ending for an agent run: it finished, but it broke
 * something on the way out. Same shape as TASK_DONE_LINES so idle.onEnter
 * can render either without branching on the text itself.
 */
export const TASK_FAIL_LINES = [
  { ok: '✕ failed.', tail: 'Something that used to work does not anymore.', next: 'Rolling back. Somewhere. Probably.' },
  { ok: '✕ aborted.', tail: 'The agent lost confidence mid-file.', next: 'Two files left in a superposition of done.' },
  { ok: '✕ crashed.', tail: 'Stack trace points at a file nobody wrote.', next: 'Awaiting next instruction. Nervously.' },
  { ok: '✕ reverted.', tail: 'It undid the fix and kept the bug.', next: 'The repo is now older than it was.' },
  { ok: '✕ broke build.', tail: 'CI is red. CI has been red before.', next: 'Standing by, pretending this is fine.' }
];

/** shown as a speech bubble the moment a run turns out to have failed */
export const TASK_FAIL_BUBBLES = [
  'It worked on the agent\'s machine.',
  'That was not the file I meant.',
  'Undo. Undo. Undo.',
  'Who approved this? Oh.',
  'The agent is sorry. That does not help.'
];

/** probability that a run that reaches the end fails instead of succeeding */
export const FAILURE_CHANCE = 0.28;

/** phrases shown in the status line, rotated per state */
export const STATUS_FLAVOR = {
  idle: ['Task queued', 'No task. No excuses.', 'The cursor is blinking at you'],
  coding: ['Writing a prompt longer than the code', 'One more prompt and it will work'],
  permissionPrompt: ['Running dangerously broad command', 'Consent, but fast'],
  agentRunning: ['Deploying confidence, not code', 'Agent is thinking', 'Do not touch anything'],
  creditsDepleted: ['Your productivity subscription has expired', 'Credits depleted'],
  waiting: ['Waiting for model', 'Staring at the wall, professionally'],
  distraction: ['Researching competitors on a feed', 'Taking a strategic break'],
  payment: ['Charging the future', 'Payment successful. Motivation not included.'],
  restart: ['Back in the loop', 'New credits, same problem']
};

/* ------------------------------------------------------- purchase screen */

/**
 * The plan itself escalates across repeated purchases in the same session
 * (see app.purchaseCount in app.js): more asterisks, fewer promises. Price
 * stays fixed on purpose — real subscriptions don't raise the price, they
 * raise the fine print.
 */
export const PAYMENT = {
  vendor: 'TERMINALMIND',
  price: '49',
  currency: '€',
  cadence: '/ month, forever, probably',
  cta: 'Charge my card',
  processing: 'Charging…',
  done: 'Payment successful. Motivation not included.',
  tiers: [
    {
      plan: 'CREATOR // UNLIMITED*',
      asterisk: '* limited',
      bullets: [
        '1000 credits (they burn faster now)',
        'Priority queue during peak despair',
        'An agent that apologises convincingly',
        'Cancel anytime you find the button'
      ]
    },
    {
      plan: 'CREATOR // UNLIMITED**',
      asterisk: '** more limited than before',
      bullets: [
        '1000 credits (already burning)',
        'Priority queue, if others also panic less',
        'Cancel anytime you find the button'
      ]
    },
    {
      plan: 'CREATOR // UNLIMITED***',
      asterisk: '*** please stop reading the fine print',
      bullets: [
        '1000 credits, allegedly',
        'The button still exists. Somewhere.'
      ]
    },
    {
      plan: 'CREATOR // UNLIMITED****',
      asterisk: '**** there is no limit, there is also no plan',
      bullets: [
        'You get what you paid for. Again.'
      ]
    }
  ]
};

/* ----------------------------------------------------------------- sharing */

/**
 * Pre-filled posts for the share button. Kept well under the 280-char
 * limit so the URL still fits after the intent encoding appends it.
 */
export const SHARE_TEXTS = [
  'Built a 2D game that simulates my actual job: open task → sign a permission I didn\'t read → watch a progress bar → run out of credits → buy more credits → repeat.\n\nIt\'s satire. Unless you recognise yourself too well.',
  'Day 47 of building in public: shipped a game where you watch a bar fill, run out of credits, buy more credits, and watch the bar fill again.\n\nNo users. No roadmap. Just the loop.',
  'Replaced my engineering process with a hand-drawn 2D loop: task → permission → agent → credits: 0 → stare at wall → buy credits → repeat.\n\nFinally, a tech demo that\'s honest about the tech.'
];

/** shown after the share intent opens, or if it gets blocked */
export const SHARE_FEEDBACK = {
  opened: 'Go on. Tell them about the loop.',
  copied: 'Popup blocked. Copied it to your clipboard instead.',
  failed: 'Even sharing requires permission now.'
};

/* ------------------------------------------------------------ night skyline */

/** window buildings: [x, y, w, h] in viewBox coordinates */
export const SKYLINE = [
  [86, 258, 34, 120], [120, 236, 26, 142], [146, 272, 40, 106], [186, 214, 30, 164],
  [216, 250, 22, 128], [238, 198, 38, 180], [276, 268, 28, 110], [304, 232, 34, 146],
  [338, 280, 24, 98], [362, 244, 40, 134], [402, 218, 26, 160]
];

/* ----------------------------------------------------------------- tooltips */

export const TOOLTIPS = {
  'monitor-main': 'Main monitor — start / approve',
  'monitor-side': 'Second monitor — the feed',
  keyboard: 'Keyboard — Enter approves',
  vape: 'Vape — hold for a deeper drag',
  mug: 'Coffee — hold to really commit',
  window: 'Window — the outside world',
  lamp: 'Lamp — light switch',
  phone: 'Phone — the client',
  poster: 'Poster — wisdom',
  router: 'Router — emotionally unstable',
  plant: 'Plant — survivor',
  headphones: 'Headphones — noise cancelled',
  snack: 'Snack — dinner, reconsidered',
  mouse: 'Mouse — barely used',
  postit: 'Sticky notes — past you, unhelpful',
  cat: 'Cat — asleep, winning',
  plant2: 'Small plant — also ignored'
};
