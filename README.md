# Vibecoder POV

An accurate simulation of modern developer work: watching a progress bar until the money runs out.

**[▶ Try the live demo](https://userman12.github.io/Vibecoder-POV/)**

---

## About

Vibecoder POV is a 2D narrative mini-game, drawn in a hand-inked storybook style (inspiration:
Don't Starve / Edward Gorey), telling the life cycle of a developer who outsourced thinking to an
AI agent: open a task, sign a permission you didn't read, watch a bar fill while credits burn,
run out of credits mid-thought, stare at the wall, buy more credits, repeat. No data is collected,
no account is required, no real AI agent was consulted in the making of this loop — just inline
SVG, CSS and vanilla JavaScript, zero dependencies.

It's satire, but if you recognize yourself too well it might be a documentary.

---

An interactive, satirical 2D experience: a dark room at night, a vibecoder seen from behind at
their desk, and the endless loop of **task → permission → agent → credits depleted → distraction
→ purchase → task**.

Style: hand-inked comic-noir/gothic, in the vein of Don't Starve. Thick ink outlines on every
shape, a warm desaturated umber palette, cross-hatching for shadows. Inline SVG, no external
dependencies.

---

## Running it

You need a static server (the project uses ES modules, so `file://` won't work).

```bash
# any of these will do
python3 -m http.server 8080
npx serve .
php -S localhost:8080
```

Then open <http://localhost:8080>. Built for desktop and landscape tablets.

---

## Controls

| Input | Effect |
| --- | --- |
| **Start task** / click the main monitor | starts the loop |
| <kbd>Enter</kbd> | primary action: approve the permission, start a task, open the purchase screen |
| <kbd>Esc</kbd> | deny the permission, close the purchase screen |
| <kbd>Tab</kbd> | walks through the interactive objects in the scene |
| <kbd>M</kbd> | mute / unmute |
| click on objects | vape, mug, window, lamp, phone, poster, router, plant, headphones, snack, mouse |

Audio is off by default, synthesized with the Web Audio API: no external files.

---

## The loop (60–90 s)

```
        ┌──────────────────────────── restart ◀── payment
        ▼                                            ▲
      idle ──start task──▶ coding ──2.6s──▶ permissionPrompt
        ▲                    │                  │        │
        │                    └──── cancel ◀──────┘ deny   │ allow
        │                                                ▼
        └──── task complete ◀──────────────────── agentRunning
                                                         │ credits = 0
                                                         ▼
                       distraction ◀──4.2s── waiting ◀── creditsDepleted
                            │  ▲  │                          │
                            └──┘  └──────── buy credits ─────┘
```

Transitions are declared in `stateMachine.js` (`TRANSITIONS`): any jump not present in the graph
is rejected, so no inconsistent state can ever be reached. Every `onEnter` clears the previous
state's timers (`Timers.clear()`), so no orphaned timer can advance the scene on its own.

Agent run duration: a random 24–34 s. Credits burn at 34/s out of 1000 → sometimes the task
finishes in time (back to `idle` with credits left), sometimes the agent dies mid-thought.

---

## Files

| File | Contents |
| --- | --- |
| `index.html` | inline SVG scene, HTML overlays for the two screens, HUD, controls, payment modal |
| `styles.css` | palette, layout, scene states, character animations |
| `data.js` | tasks, permission prompts, logs, feed posts, notifications, one-liners, palette, timing, credits |
| `stateMachine.js` | FSM + grouped timer scheduler |
| `interactions.js` | click/hover/keyboard, tooltips, speech bubbles, objects, audio, rain and vapor |
| `roughen.js` | the "hand-drawn" pass: jitters the scene's outlines with deterministic noise |
| `app.js` | bootstrap, rendering, credits, loop, wiring between scene, state machine and interactions |

---

## How the style is achieved

- **Hand-drawn outlines**: `roughen.js` runs once at boot over all 100+ polygons in the scene,
  subdividing every edge and displacing the points with a seeded PRNG — the jitter is
  deterministic (same drawing on every reload) but no line is ever perfectly straight. A second,
  slightly offset pass (`data-ink="2"`) retraces the main silhouettes, like a line drawn twice.
- **Palette**: warm desaturated umber (`#241D18`…`#6B5238`) over near-black ink (`#0B0907`).
  Separation between planes comes from the outline, not from fill contrast — which is why bodies
  can sit lighter than the background without losing legibility.
- **Shadows**: cross-hatched pen strokes (`#hatch`, `#hatchCross`, `#hatchTight`) instead of flat
  fills, in the spirit of Edward Gorey.
- **Light**: diagonal beams and blurred halos in `mix-blend-mode: screen` for monitor green, alert
  red and lamp cream — the only three color accents allowed in the palette, because in this room
  they're the only artificial light sources.
- **Animation**: short CSS keyframes and `steps()` almost everywhere (flicker, glitch, alert,
  camera shake) for a dry, nervous motion; only breathing and arm gestures use soft easing.
- **Monitor text**: HTML positioned in percentages over the SVG and tilted with `rotateX` /
  `rotateY`, computed from the actual ratio between the drawn panel's edges (not an eyeballed
  value) so the text locks exactly onto the glass's perspective.

---

## Accessibility

- Every object in the scene is a `role="button"` with `tabindex` and `aria-label`; <kbd>Enter</kbd>
  and <kbd>Space</kbd> activate it.
- States are never communicated by color alone: the HUD always spells out the agent's status in
  full text, the terminal uses text markers (`⚠`, `✓`, `✕`), and the credit bar shows the number.
- The terminal is a `role="log"` with `aria-live="polite"`.
- Focus is always visible (`:focus-visible`), with a cream-colored dashed outline on scene objects.
- `prefers-reduced-motion: reduce` zeroes out animations and transitions.

---

## Extending it

- New copy: everything lives in `data.js` (tasks, prompts, logs, feed, notifications,
  `OBJECT_LINES`).
- New clickable object: add a `<g id="…" class="hot" tabindex="0" role="button">` with a
  `<rect class="hit">` inside, then an entry in `TOOLTIPS` and one in `actions` inside
  `initInteractions`.
- New state: add it to `STATES` and `TRANSITIONS`, then write the `onEnter`/`onExit` handler in
  `app.js`.
- Loop pacing: `TIMING` and `CREDITS` in `data.js`.

No real brand is reproduced: the names (`TERMINALMIND`, `PromptCloud`), the feed UI and the
payment screen are all parodic inventions.
