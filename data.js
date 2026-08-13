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

export const PHONE_NOTIFICATIONS = [
  'Client: quick small change',
  'Client: can we make it more premium?',
  'Client: just one last thing.',
  'Client: is it live yet?',
  'Client: my nephew says it should be blue.',
  'Bank: your subscription renewed.',
  'Client: sorry, one more tiny thing.'
];

/* ---------------------------------------------- scene object one-liners */

export const OBJECT_LINES = {
  vape: ['Compiling patience…', 'Inhaling the roadmap.', 'Vapour: 100%. Clarity: 0%.', 'Buffering the soul…'],
  mug: ['Coffee level: critical.', 'Caffeine deployed to production.', 'This is the fourth one. It is 1am.', 'Warm liquid, cold repository.'],
  window: ['Outside world detected.', 'People out there are asleep. Weak.', 'The city ships nothing tonight either.', 'It has rained since the last sprint.'],
  lamp: ['Ambient lighting: negotiable.', 'Turning darkness on and off.', 'The lamp still works, at least.'],
  phone: ['Client is typing…', 'Do not open it. Open it.', 'Notification received. Boundaries deleted.'],
  poster: ['Move fast, invoice later.', 'Nothing is production-ready.', 'Ship it, then understand it.', 'The plan was a vibe.'],
  router: ['Internet connection: emotionally unstable.', 'Packets lost, dignity intact.', 'Have you tried unplugging your life?'],
  plant: ['Still alive. Unlike the side project.', 'Watered less often than the repo is deployed.'],
  headphones: ['Same 3 songs since the MVP.', 'Noise cancelled. Thoughts persist.'],
  snack: ['Dinner: reconsidered.', 'Crumbs in the mechanical keyboard. Again.'],
  mouse: ['Wireless. Batteries: philosophical.'],
  keyboard: ['Keys worn where the anxiety is.'],
  'monitor-side': ['Doomscrolling is a form of research.']
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

export const PAYMENT = {
  vendor: 'TERMINALMIND',
  plan: 'CREATOR // UNLIMITED*',
  asterisk: '* limited',
  price: '49',
  currency: '€',
  cadence: '/ month, forever, probably',
  bullets: [
    '1000 credits (they burn faster now)',
    'Priority queue during peak despair',
    'An agent that apologises convincingly',
    'Cancel anytime you find the button'
  ],
  cta: 'Charge my card',
  processing: 'Charging…',
  done: 'Payment successful. Motivation not included.'
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
  vape: 'Vape — compile patience',
  mug: 'Coffee — critical levels',
  window: 'Window — the outside world',
  lamp: 'Lamp — light switch',
  phone: 'Phone — the client',
  poster: 'Poster — wisdom',
  router: 'Router — emotionally unstable',
  plant: 'Plant — survivor',
  headphones: 'Headphones — noise cancelled',
  snack: 'Snack — dinner, reconsidered',
  mouse: 'Mouse — barely used'
};
