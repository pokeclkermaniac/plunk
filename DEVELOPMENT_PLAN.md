# Plunk! — Development Plan for an AI Coding Agent

This plan is written for **Claude Code** (or a similar agent) to build the game described in `GDD.md`. The owner is **not writing code**: they will run the game, playtest, and give feedback. The agent is responsible for all code, tooling, and placeholder assets.

---

## 0. How to use this plan (for the owner)

1. Create an empty folder (or GitHub repo) and put `GDD.md` and `DEVELOPMENT_PLAN.md` in it.
2. Open Claude Code in that folder and paste:

   > Read GDD.md and DEVELOPMENT_PLAN.md. Follow the "Agent operating rules" and start Milestone 0. When a milestone is done, stop, tell me how to run and test it, and wait for my feedback before starting the next one.

3. After each milestone, play it on your phone and desktop, then tell the agent what felt good and bad in plain words ("rings feel too heavy," "the left button is hard to hit").

---

## 1. Agent operating rules

1. **The GDD is the source of truth.** If something is unclear, pick the simplest option that fits the design pillars, write it down in `DECISIONS.md`, and keep going. Ask the owner only about things that change how the game *feels*.
2. **Work one milestone at a time.** End each one with a running build, a short summary, and testing instructions written for a non-programmer.
3. **Put every tuning number in `src/config/tuning.ts`.** That includes physics, scoring, timers, and spawn rates, so feel changes are one-line edits.
4. **Keep it data-driven.** Levels go in `src/data/levels/*.json` and themes in `src/data/themes/*.json`.
5. **Use placeholder art first.** Simple shapes and colors until Milestone 6. Never block on art.
6. **Test logic, playtest feel.** Write unit tests (Vitest) for scoring, stacking, and save data. Physics feel is judged by the owner.
7. **Commit often** with clear messages. Keep a `CHANGELOG.md` the owner can read.
8. **Performance budget:** steady 60 fps on a mid-range phone from about 2021. Cap physics bodies and bubble particles accordingly.
9. **No network calls at runtime, no analytics, no third-party trackers.** Fully offline.
10. **Original IP only.** No "Waterful"/"Tomy" names, logos, or replicated product art.

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript | Catches mistakes; well-supported by AI agents |
| Game framework | **Phaser 3** | Mature 2D web framework: scenes, input, audio, tweens, camera shake/zoom built in |
| Physics | **Matter.js** (built into Phaser) | Rigid bodies, compound bodies, constraints, sensors — all needed for rings and pegs |
| Build tool | Vite | Fast dev server; easy phone testing over local Wi‑Fi |
| Offline/install | `vite-plugin-pwa` | Service worker + manifest → installable, works offline |
| Tests | Vitest | Unit tests for game logic |
| Save data | `localStorage` (versioned JSON) | Simple, offline, no accounts |
| Hosting | GitHub Pages, Netlify, or Cloudflare Pages | Free static hosting |

---

## 3. Project structure

```
/
├── GDD.md
├── DEVELOPMENT_PLAN.md
├── DECISIONS.md          # agent logs judgment calls here
├── CHANGELOG.md
├── index.html
├── public/
│   ├── icons/            # PWA icons
│   └── assets/
│       ├── themes/<theme-id>/   # sprites per theme
│       └── audio/
├── src/
│   ├── main.ts           # Phaser game config + boot
│   ├── config/
│   │   └── tuning.ts     # ALL numbers that affect feel
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── MenuScene.ts
│   │   ├── GameScene.ts  # the tank
│   │   ├── HudScene.ts   # overlaid UI
│   │   ├── ResultsScene.ts
│   │   ├── CollectionScene.ts
│   │   └── SettingsScene.ts
│   ├── game/
│   │   ├── Water.ts          # buoyancy + drag applied each step
│   │   ├── Jet.ts            # force cone + bubble emitter
│   │   ├── Ring.ts           # compound body + color/type
│   │   ├── Peg.ts            # capture sensor, stack, capacity
│   │   ├── Target.ts         # shared "stack target" base: color stack, capacity, multiplier, emptyWhenFull
│   │   ├── Hoop.ts           # Target subclass: rim points, backboard, top→bottom pass detection, ball tube
│   │   ├── Ball.ts           # round bouncy body + color/type
│   │   ├── Obstacles.ts
│   │   ├── Spawner.ts        # mode- and game-type-dependent piece spawning
│   │   └── Scoring.ts        # PURE logic shared by both game types, fully unit-tested
│   ├── gametypes/
│   │   ├── RingToss.ts       # pegs + rings layout/rules config
│   │   └── Basketball.ts     # hoops + balls layout/rules config
│   ├── modes/
│   │   ├── TimedMode.ts      # works for both game types
│   │   ├── LevelMode.ts
│   │   ├── EndlessMode.ts
│   │   └── VersusMode.ts
│   ├── systems/
│   │   ├── SaveSystem.ts     # versioned save + migration
│   │   ├── Progression.ts    # XP, levels, unlocks, boosters
│   │   ├── ThemeManager.ts
│   │   ├── AudioManager.ts
│   │   ├── Haptics.ts        # wraps navigator.vibrate, no-ops if unsupported
│   │   └── Tilt.ts           # DeviceOrientation + iOS permission flow
│   └── data/
│       ├── levels/ringtoss-01.json … ringtoss-12.json
│       ├── levels/basketball-01.json … basketball-06.json
│       └── themes/retro-plastic.json …
└── tests/
    ├── scoring.test.ts
    ├── stacking.test.ts
    ├── basketball.test.ts
    └── save.test.ts
```

---

## 4. Key technical designs

### 4.1 Water (buoyancy + drag)
Every physics step, for each dynamic body inside the water area:
- Apply an upward buoyancy force equal to `gravity × mass × BUOYANCY_RATIO` (≈ 0.85, so things sink slowly).
- Use a high `frictionAir` (≈ 0.06) for drag and some angular damping.
- Heavy rings and balls use a lower buoyancy ratio (≈ 0.6).
- Balls get higher `restitution` (bounciness, ≈ 0.5) and lower friction than rings so they roll and bounce.

### 4.2 Jets
- A tap creates a short-lived (≈ 250 ms) **force zone**: a cone above the nozzle.
- Bodies inside the cone get an upward impulse that scales with closeness to the nozzle and the cone's center line, plus a small random sideways kick so motion stays organic.
- At the same time, emit 15–25 bubble particles (visual only) that rise with wobble and pop at the surface.
- Per-jet cooldown: `JET_COOLDOWN_MS` (≈ 100).
- Each jet has a configurable tilt (`JET_TILT_DEG`), set to 0 for Ring Toss and about 8° inward for Basketball so shots arc toward the hoops.

### 4.3 Rings and capture (highest-risk feature; prototype first)
- A ring is a **compound body**: two small circles (the left and right rims) joined rigidly, with a visual ellipse sprite on top. The gap between the rims is wider than a peg.
- Each peg has a **capture sensor** at its tip.
- **Capture rule:** the peg tip lies horizontally between the ring's rims, the ring's center is above the tip, the ring is moving downward, and the ring's tilt is under `CAPTURE_MAX_ANGLE` (lenient, ≈ 50°).
- **On capture:** remove the ring from free physics, tween it down the peg to `stackTop` (with a little bounce), play the clack, and call `Scoring.onRingLanded(peg, ring)`.
- Stacked rings are static decorations. The peg's stack is pure data: an array of ring colors and types.

### 4.4 Scoring (pure, deterministic, unit-tested)
`Scoring.ts` holds no Phaser imports. Inputs are the peg state and the ring; outputs are the points delta, events (`streak`, `wrongColor`, `fullPegBonus`, `pegDead`, `bombClear`), and the new peg state. Implement the rules in GDD §2.5–2.7 exactly. Test cases must include:
- Streak x1→x4 on a 4-capacity peg, plus the full-peg bonus
- Wrong color: −15 and the streak resets
- Rainbow extends the streak
- Golden: +100, breaks the streak, no penalty
- Heavy: 3× base
- Bomb: clears the stack, frees the peg, no points
- Multiplier peg applies to every component
- Score never shows a negative total (clamp at 0, logged in DECISIONS.md)

### 4.5 Shared target model (important for Basketball)
Pegs and hoops are both **stack targets**: a list of landed colors and types, a capacity, a multiplier, and an `emptyWhenFull` flag (false for pegs, true for hoop tubes). `Scoring.ts` operates on this shared model only, so the streak, penalty, full bonus, and special-piece rules are written **once** and both game types get them. Per-type differences (base points, swish and bank bonuses, whether full targets empty) come from the game-type config.

### 4.6 Hoops and baskets
- **Rim:** two small static circles (front and back rim points) with a gap wider than a ball. The net is a visual sprite that sways when a ball passes through.
- **Backboard:** a static rectangle behind and above the rim, with moderate restitution.
- **Basket detection:** a top sensor across the rim opening and a bottom sensor just below it. A basket counts only if the ball crosses top → bottom within `BASKET_WINDOW_MS` (≈ 500) while moving downward.
- **Swish:** no contact with the rim points or backboard between the ball's last jet impulse and the basket. **Bank:** backboard contact, then a basket.
- **Ball tube:** after a basket, the ball is removed from free physics and tweened into the tube under the hoop (stacked, like rings on a peg). When the tube is full: score it, play the drain animation, and respawn the balls into the tank from the bottom.
- **Moving hoop:** a kinematic body that moves on a path defined in level JSON.
- **Rim rattle:** two or more rim contacts within 400 ms trigger the rattle sound and a small camera nudge.

### 4.7 Input and layout
- On-screen plunger buttons are Phaser interactive objects with multi-touch enabled (needed for Versus and for tapping both jets at once).
- Keyboard: `A`/`←` = left, `L`/`→` = right.
- Fixed logical resolution (e.g., 720×1280 for portrait) with Phaser Scale Manager `FIT`. In landscape, reposition the buttons to the sides.

### 4.8 Save data
```ts
interface SaveData {
  version: number;
  xp: number; level: number;
  bests: { ringTimed: number; basketballTimed: number; endless: number; levels: Record<string, {stars: number; best: number}> };
  stats: { rings: number; baskets: number; swishes: number; fullPegs: number; fullTubes: number };
  unlocked: { themes: string[]; tanks: string[]; water: string[]; rings: string[]; balls: string[]; backgrounds: string[] };
  equipped: { theme: string; tank: string; water: string; rings: string; balls: string; background: string };
  boosters: Record<string, number>;
  settings: { master: number; music: number; sfx: number; haptics: boolean; tilt: boolean; reduceMotion: boolean };
}
```
Include version migration from day one.

### 4.9 Themes
A theme JSON maps each slot (frame, buttons, water tint, ring sprites and ball sprites per color plus symbol, peg, hoop/rim/backboard/net/tube, background, optional sound pack) to asset paths. `ThemeManager` swaps textures without restarting the game. Every theme must provide all slots; a missing slot falls back to Retro Plastic.

---

## 5. Milestones

Each milestone ends with: a working build, a summary, "how to test on your phone" steps, and a list of tuning knobs the owner can ask to change.

### Milestone 0 — Setup (small)
- Vite + TypeScript + Phaser 3 project, ESLint/Prettier, Vitest.
- Empty Boot → Menu → Game scene flow.
- Dev server reachable from a phone on the same Wi‑Fi (`vite --host`), with instructions for the owner.
- Optional: deploy to GitHub Pages so the owner can test from a link.
- **Done when:** the owner can open a "Hello tank" screen on their phone.

### Milestone 1 — The fun test (MVP): Ring Toss Timed greybox ⭐
This milestone answers the only question that matters right now: **is it fun?**
- Tank with water physics, 2 jets with on-screen and keyboard controls, and bubble particles.
- 3 pegs (capacity 4), 8 rings in 3 colors. (No balls or hoops yet.)
- Build pegs on the shared `Target` model from §4.5 from the start, so Basketball can reuse it.
- Ring capture, the stacking rules, and the scoring from §4.4, with unit tests.
- 90-second timer; new ring drops in on each landing; tank-clear when all pegs are full.
- Minimal HUD: score, timer, a streak badge per peg, floating "+30 x3!" score popups.
- Basic sounds (bubble, click, clack, bonk, chime), placeholder or synthesized is fine.
- Results screen with score and best (saved locally).
- Simple-shape art in a rough plastic-toy frame.
- **Done when:** the owner plays 10 rounds and can answer the playtest questions below.

**Playtest questions for the owner after Milestone 1:**
1. Do rings feel too heavy, too light, or right?
2. Is landing a ring too hard, too easy, or right?
3. Did you find yourself *thinking* about colors, or just hoping?
4. Did the wrong-color penalty feel fair?
5. Did you want to play "one more"?

**Tuning loop:** the agent adjusts `tuning.ts` based on the answers, and the owner retests. Repeat until it feels right **before** moving on.

### Milestone 2 — Juice and feel
- Camera shake and zoom on big moments, with reduce-motion support.
- Haptics wrapper (Android works; iOS no-ops gracefully).
- Plunger press animation, ring bounce, peg glow on streaks, full-peg celebration.
- Lo-fi music loop with volume controls; settings screen.
- Optional tilt with the iOS permission flow.
- **Done when:** a round *feels* like playing a toy.

### Milestone 3 — Basketball Shootout 🏀
Prove the second game type is fun, reusing everything from Milestones 1–2.
- Game-type select on the Play menu (Ring Toss / Basketball).
- Balls, hoops (rim, backboard, net, tube), and basket detection per §4.6, plus jet tilt.
- Basketball scoring: streaks, wrong-color penalty, swish and bank bonuses, full tube bonus, tubes empty when full. Covered in `basketball.test.ts`.
- Shootout mode: 90 seconds, 2 hoops, 5 balls in 3 colors, and "Hot Hands" double points in the final 15 seconds.
- Basketball sounds: bounce, rim clang, backboard thunk, swish, tube whoosh, rim rattle.
- Separate personal best.
- **Done when:** the owner plays 10 Shootout rounds and answers the questions below.

**Basketball playtest questions:**
1. Do shots arc nicely, or do balls just shoot straight up?
2. Are baskets too hard, too easy, or right?
3. Do swishes feel special?
4. Is the color streak as fun here as in Ring Toss?
5. Does Hot Hands make the ending exciting?

### Milestone 4 — Special pieces, special targets, obstacles
- Rainbow, Golden, Heavy, and Bomb rings **and balls**, with spawn weights in config.
- Multiplier pegs and multiplier hoops; moving hoops.
- Obstacles: static ledges/walls, peg guards, rotating paddles.
- Color count driven by config so it can grow.
- **Done when:** every special works and is covered by tests.

### Milestone 5 — Modes
- **Versus:** local 2-player in landscape. Ring Toss Versus (per-player pegs, shared water) and Basketball 1-on-1 (a hoop per player, shared balls), with sudden death on a tie.
- **Levels:** JSON loader, goal types for both game types from GDD §3.2, star rating, level select with two tracks, **12 Ring Toss + 6 Basketball levels** following the suggested arcs.
- **Endless (Ring Toss):** ring supply, refills on full-peg bonuses, slow difficulty ramp.
- **Done when:** every mode in the GDD §3 table is playable from the menu.

### Milestone 6 — Art pass (AI-generated assets)
- Produce an **asset list** (§6) and **prompt sheet** for the owner to generate images with an AI image tool, or generate SVG/procedural art directly where that's practical.
- Replace placeholders with Retro Plastic theme art.
- Set up the asset pipeline: consistent sizes, a texture atlas, compression.
- **Done when:** the default theme looks like a finished game.

### Milestone 7 — Progression and cosmetics
- XP from both game types, player levels, and an unlock table (themes, tank/water/ring/ball/background pieces, earned boosters).
- Collection screen with equip and preview.
- Profile screen with stats.
- Boosters: Slow-mo, Magnet, Color swap, Extra time (each works in both game types). Earned only, with separate "boosted" bests.
- At least 3 additional themes (suggested: Modern Clean, Cartoony, Pixel Art), with more added over time.
- **Done when:** a new player can see and work toward unlocks.

### Milestone 8 — Ship it
- PWA: manifest, icons, offline caching, "add to home screen" prompt.
- Performance pass on a real mid-range phone.
- Cross-browser check: iPhone Safari, Android Chrome, desktop Chrome/Firefox/Safari.
- Short first-time hint overlay ("Tap the buttons to blast bubbles!").
- Deploy to a public URL.
- **Done when:** a friend can open a link, install it, and play offline.

### Later (post-launch backlog)
Daily challenge · Basketball Endless · Hybrid ring + basketball levels · Colorblind mode (symbols are already in the ring and ball art) · More themes (Claymation, Aquarium, Neon Arcade, Pool Party) · More levels · Native wrapper via Capacitor (for iPhone haptics and app stores) · Optional monetization revisit

---

## 6. Asset list (for Milestone 6)

**Per theme:**
- Toy frame (portrait and landscape variants), tank window, water tint and surface line
- Left and right plunger buttons (up and pressed states)
- Rings: one sprite per color (6 colors) with an embossed symbol (● ▲ ■ ◆ ★ ♥), plus Rainbow, Golden, Heavy, and Bomb
- Balls: one sprite per color (same 6 colors and symbols), plus Rainbow, Golden, Heavy, and Bomb
- Peg, multiplier-peg badge (x2, x3)
- Hoop rim, backboard, net (with a sway animation), ball tube, multiplier-hoop glow
- Obstacles: ledge, peg guard, paddle
- Bubble particle, sparkle particle
- Background

**Global UI:** logo/wordmark (original), menu buttons, HUD font, star icons, booster icons, PWA icons (192 and 512 px)

**Audio:** 4–6 bubble burst variations · plunger click · ring clack on peg · ring tick on ring · wrong-color bonk · streak rising tones (x2, x3, x4) · full-peg chime and fanfare · ball bounce · rim clang · backboard thunk · net swish · tube drain whoosh · Hot Hands sting · bomb pop · timer warning · results jingle · 1–2 lo-fi music loops. Use original or properly licensed sounds (e.g., CC0) and log every source in `CREDITS.md`.

**Art direction prompt seed (Retro Plastic):**
"Original 1980s-style handheld water toy, translucent cyan water in a chunky glossy plastic shell, primary-color plastic rings and balls with embossed symbols, a small orange plastic basketball hoop with a white backboard (Basketball version), slight scuffs and highlights, soft studio lighting, front-on orthographic view, clean edges, transparent background, no text, no logos."

---

## 7. Starting tuning values (`tuning.ts`)

| Key | Start value | Notes |
|---|---|---|
| `BUOYANCY_RATIO` | 0.85 | Higher = floatier |
| `HEAVY_BUOYANCY_RATIO` | 0.6 | |
| `WATER_FRICTION_AIR` | 0.06 | Drag |
| `JET_IMPULSE` | tune in Milestone 1 | Main feel knob |
| `JET_CONE_ANGLE_DEG` | 30 | |
| `JET_DURATION_MS` | 250 | |
| `JET_COOLDOWN_MS` | 100 | |
| `CAPTURE_MAX_ANGLE_DEG` | 50 | Higher = easier landing |
| `PEG_CAPACITY` | 4 | |
| `BASE_POINTS` | 10 | |
| `WRONG_COLOR_PENALTY` | 15 | |
| `FULL_PEG_BONUS` | 250 | |
| `GOLDEN_BONUS` | 100 | |
| `HEAVY_MULT` | 3 | |
| `BASKET_POINTS` | 20 | Basketball base points |
| `SWISH_BONUS` | 10 | |
| `BANK_BONUS` | 5 | |
| `TUBE_CAPACITY` | 4 | |
| `FULL_TUBE_BONUS` | 250 | |
| `BASKET_WINDOW_MS` | 500 | |
| `BALL_RESTITUTION` | 0.5 | Bounciness |
| `JET_TILT_DEG` | 0 rings / 8 basketball | Inward tilt |
| `HOT_HANDS_SECONDS` | 15 | Final-seconds double points |
| `SHOOTOUT_START_BALLS` | 5 | |
| `TIMED_ROUND_SECONDS` | 90 | |
| `TIMED_START_RINGS` | 8 | |
| `ENDLESS_START_SUPPLY` | 20 | |
| `ENDLESS_REFILL_ON_FULL_PEG` | 5 | |
| `SPECIAL_RING_CHANCE` | 0.08 | Split among the 4 types |

---

## 8. Definition of done (whole project, v1.0)
- [ ] Both game types (Ring Toss and Basketball) and all modes in GDD §3 playable on iPhone Safari, Android Chrome, and desktop
- [ ] Steady frame rate on a mid-range phone
- [ ] Works offline after first load; installable
- [ ] 18 levels with stars (12 Ring Toss + 6 Basketball)
- [ ] Retro Plastic theme plus at least 3 unlockable themes
- [ ] XP, levels, unlocks, and earned boosters saved locally
- [ ] Scoring rules fully unit-tested
- [ ] No ads, no tracking, no network calls
- [ ] Original name and art; `CREDITS.md` complete
