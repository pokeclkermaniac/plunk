# Plunk! — Game Design Document

> Title chosen by the owner. Before launch, search the web and app stores for existing games or toys named "Plunk" and check domain availability (e.g., plunkgame.com, playplunk.com). A short subtitle such as "Plunk! Water Toy Games" can help it stand out in search.

**Version:** 1.0 (draft)
**Date:** 2026-11-06
**Platform:** Web app (mobile browsers first, desktop supported), installable and playable offline
**Price:** Free, no ads (may change if the game takes off; the architecture leaves room for this)
**Builder:** AI coding agent (Claude Code), directed and playtested by the owner

---

## 1. Concept

A digital tribute to the classic handheld water games of the 70s–90s: a clear plastic tank of water, two plunger buttons that blast bubbles, and something to land. The game ships with **two game types**, just like the toys came in different versions:

- **Ring Toss.** Float colored rings onto pegs. This is the main game.
- **Basketball.** Blast colored balls up through hoops. This is the basketball version of the toy.

**The twist: color streaks.** Both game types share the same scoring idea. Landing the same color on a peg (or sinking the same color through a hoop) one after another builds a **streak multiplier** (x2, x3, x4…). Filling a peg or a hoop's ball tube entirely with one color pays a big **full bonus**. Land the wrong color and you **lose points** and break the streak. Every shot becomes a small decision: go for it now, or wait for the right color?

**One-line pitch:** "The water toy you remember, in ring-toss and basketball versions, with a color-matching score twist, in 90-second rounds."

### Design pillars
1. **Tactile nostalgia.** It should look, sound, and feel like the plastic toy: chunky buttons, gurgling bubbles, floaty rings, a satisfying *click* when a ring lands.
2. **Easy to pick up, hard to master.** Two buttons, no tutorial wall. Mastery comes from timing taps and managing colors.
3. **Short and replayable.** 1–2 minute rounds; "one more go" energy.
4. **Kind to every player.** Family friendly, no ads, no data collection, no pay-to-win. Boosters are earned only.

### Audience
Broad: kids, nostalgic adults who owned the toy, casual players, and score chasers. Family friendly but **not kid-directed**, which means no child-specific compliance work is needed as long as the game collects no personal data (it doesn't; it's fully offline).

---

## 2. Core gameplay

Sections 2.1–2.9 describe the shared tank and controls plus the **Ring Toss** rules. **Basketball** is in section 2.10, and it reuses everything except the targets.

### 2.1 The tank
- A single vertical tank of water viewed from the front, inside a plastic toy frame.
- **Two air jets** at the bottom, left and right, matching the toy.
- **Ring Toss:** pegs stick up from the tank floor or ledges (2–5 depending on level). Each peg holds a fixed number of rings (default 4).
- **Basketball:** 1–3 hoops with backboards near the top of the tank (see 2.10).
- Everything rests on the bottom until blasted.

### 2.2 Controls
| Input | Action |
|---|---|
| Left on-screen button (tap) | Fire left jet |
| Right on-screen button (tap) | Fire right jet |
| Keyboard `A` / `L` (or ←/→) | Same, for desktop |
| Phone tilt (optional setting, off by default) | Gently shifts the water's "gravity" sideways |

- **Every tap is equal**: no charging. Skill comes from timing and tap rhythm.
- **Air is unlimited.** Tapping fast is allowed, with a small per-jet cooldown (tunable, about 100 ms) so mashing doesn't become the only strategy.
- Buttons are drawn as big plastic plungers that visibly depress when pressed.

### 2.3 Physics feel
- **Floaty and toy-like** (owner rating 2 out of 5 on the floaty-to-snappy scale). Objects sink slowly, drift, and tumble; nothing should feel twitchy.
- Water is simulated with buoyancy and drag forces, not fluid simulation. A jet blast is a cone-shaped upward force zone above the nozzle, strongest near the nozzle and center and fading with distance.
- **Bubbles are a high priority (4/5).** Every tap releases a visible burst of bubbles that rise and wobble, paired with a gurgle sound. Bubbles are mostly visual; the force zone does the physics.

### 2.4 Rings and pegs
- In 2D, a ring is drawn as a flattened ellipse seen nearly edge-on. Physically, it's a compound body: two small solid "rim" circles joined by a rigid link, with an open gap between them that a peg can pass through.
- **Landing:** when a peg's tip passes between a ring's rims while the ring moves downward, the ring is captured. It slides down the peg to the top of that peg's stack with a satisfying *clack*. Capture should be **lenient**: being close counts.
- Rings that miss sink back to the floor and can be blasted again.

### 2.5 Scoring (initial values; all tunable in one config file)

| Event | Points |
|---|---|
| Ring lands on a peg | 10 × streak multiplier × peg multiplier |
| Streak multiplier | Count of consecutive same-color rings on *that peg*: 1st = x1, 2nd = x2, 3rd = x3, 4th = x4 (linear, no cap) |
| Wrong color lands on a peg | **−15 points**, and that peg's streak resets to x1 with the new color |
| Full peg, all one color | **Full-peg bonus: +250 × peg multiplier**, plus a big celebration (camera zoom, shake, sparkle) |
| Full peg, mixed colors | No bonus. The peg is "dead": it stays full |

**Full pegs stay full.** That's the core tension: a mistake permanently clogs a peg for the round, unless the player gets a **bomb ring** (see below), which is the only way to clear a stack.

**Rainbow rule:** an empty peg takes on the color of the first ring that lands on it.

### 2.6 Special pegs
- **Multiplier peg (x2 / x3):** a peg with a glowing badge. Everything scored on it is multiplied. It's usually placed somewhere harder to reach.

### 2.7 Special rings
| Ring | Behavior |
|---|---|
| **Rainbow (wild)** | Counts as whatever color the peg's current streak is, so it always extends the streak. |
| **Golden** | Fixed +100 bonus on landing. It matches no color, so it breaks the streak but carries no penalty. |
| **Heavy** | Sinks faster and needs more blasts to lift. Worth 3× base points. |
| **Bomb** | When it lands, it pops the entire stack on that peg, including itself, freeing the peg. No points, but it rescues dead pegs. |

Special rings appear randomly (weighted by mode and level). **No preview queue**: players see what's in the tank, and new spawns are a surprise.

### 2.8 Colors
The number of colors grows with progression: Timed and Endless start at 3 colors; levels introduce a 4th, 5th, and 6th. Each color has a distinct ring **symbol slot** reserved in the art and code so that a colorblind mode (symbols or patterns) can be added later without rework.

### 2.9 Obstacles (difficulty)
Only obstacles are used to raise difficulty (no currents or murky water for now):
- Static ledges and walls inside the tank
- Peg guards (a partial cover over a peg)
- Later levels: slowly rotating paddles

### 2.10 Basketball

This is the basketball version of the toy. It uses the same tank, jets, water physics, and plunger buttons, but **balls and hoops replace rings and pegs.**

**Setup**
- 1–3 hoops near the top of the tank, each with a backboard and a rim. They're placed so that a well-timed blast arcs a ball up and drops it through.
- Under each hoop is a clear **ball tube** that catches made baskets and shows them stacked, like the pegs show rings. Each tube holds 4 balls by default.
- Balls come in the same colors as rings, with the same symbols (for the future colorblind mode).

**How a basket counts**
- The ball must pass **downward** through the rim. It has to cross the top of the rim and then the bottom within a short window. Balls pushed up through from below don't count.
- In 2D, the rim is two small solid points (front and back of the rim) with an open gap for the ball. The net is visual only.

**Scoring (tunable)**

| Event | Points |
|---|---|
| Basket | 20 × streak multiplier × hoop multiplier |
| Streak | Consecutive same-color baskets **into the same hoop**: x1, x2, x3, x4 (linear, no cap) |
| **Swish** (no rim or backboard touch) | +10 bonus, plus a special *swish* sound |
| **Bank shot** (off the backboard, then in) | +5 bonus |
| Wrong color into a hoop | −15 points, and that hoop's streak resets to the new color |
| Full tube, all one color | **Full-tube bonus: +250 × hoop multiplier** + celebration |
| Full tube, mixed | No bonus |

**One key difference from Ring Toss:** to keep the game moving, a **full tube empties** after it scores. The balls drain back into the tank with a satisfying *whoosh*. (Full pegs in Ring Toss stay full. That's what makes Ring Toss a careful game and Basketball a fast one.)

**Special hoops and balls** (same ideas as Ring Toss):
- **Multiplier hoop (x2/x3)** with a glowing rim
- **Moving hoop**: slides slowly left and right (later levels and Versus)
- **Rainbow ball**: wild, always extends the streak
- **Golden ball**: +100, breaks the streak, no penalty
- **Heavy ball**: sinks fast, hard to lift, 3× points
- **Bomb ball**: when it goes in, it empties that hoop's tube with no points. It's mostly useful for clearing a tube that's filling with mixed colors before it scores nothing.

**Basketball feel targets**
- Balls are rounder and bouncier than rings: they roll along the floor and bounce off the rim and backboard.
- Shots should feel like *arcs*, not straight-up launches. Each jet's force cone tilts slightly inward toward the center of the tank (tunable), so players learn which jet suits which hoop.
- Rim rattles (the ball bouncing on the rim before dropping or falling out) are a key "drama" moment, so they get a sound and a tiny camera nudge.

---

## 3. Modes

Players first pick a **game type** (Ring Toss or Basketball), then a mode.

| Mode | Ring Toss | Basketball | Summary | Ends when | Build order |
|---|---|---|---|---|---|
| **Timed** | ✅ | ✅ "Shootout" | Score as much as possible in 90 seconds | Timer runs out | Ring Toss **1st (MVP)**; Basketball **2nd** |
| **Versus (local)** | ✅ | ✅ "1-on-1" | 2 players on one device, one jet each | Timer runs out | 3rd |
| **Levels** | ✅ 12 levels | ✅ 6 levels | Hand-designed challenges with goals | Goal met (win), or out of pieces / time (lose) | 4th |
| **Endless** | ✅ | Later update | Limited supply; full bonuses refill it | Out of pieces | 5th |

### 3.1 Timed — Ring Toss (MVP mode)
- 90-second rounds (tunable: 60/90/120).
- Tank starts with 8 rings across 3 colors and 3 pegs.
- When a ring lands, a new random ring drops in from the top so the tank never runs dry.
- When every peg is full, all pegs clear with a "tank clear" fanfare and bonus, so rounds don't stall.
- End screen: score, best streak, full pegs, XP earned, personal best.

### 3.1b Timed — Basketball "Shootout"
- 90-second rounds, with 2 hoops (left and right) and 5 balls in 3 colors.
- Tubes empty after filling, so the tank never stalls.
- **Final 15 seconds = "Hot Hands"**: every basket scores double, with music and visual flair. This mirrors the frantic end of an arcade basketball game.
- End screen: score, baskets, swishes, best streak, XP, personal best.

### 3.2 Levels
- Each level is a JSON file: game type, tank layout, pegs or hoops (position, capacity, multiplier, movement), obstacles, piece set, time limit (optional), and goal.
- **Ring Toss goals:** reach a score; complete N full pegs; complete a full peg of a specific color; win with no wrong-color drops.
- **Basketball goals:** make N baskets; make N swishes; fill a tube with one color; sink a basket in every hoop; beat a score before the timer ends.
- 1–3 stars per level based on score.
- **Ring Toss arc (12 levels):** 1–3 teach basics with 2 colors; 4–6 add a 3rd color and a multiplier peg; 7–9 add obstacles and special rings; 10–12 add a 4th color and combination challenges.
- **Basketball arc (6 levels):** 1 is a single hoop with one color; 2 adds a second hoop and color; 3 is a swish challenge; 4 adds a moving hoop; 5 adds a multiplier hoop and special balls; 6 is a combination challenge.
- The two level sets are shown as separate tracks on the level select screen.

### 3.3 Endless (Ring Toss)
- Starts with a supply of 20 rings. Each full-peg bonus adds +5 rings. The round ends when the supply is empty and no rings are left in the tank.
- Difficulty ramps slowly: more colors and more obstacles appear as the score rises.

### 3.4 Versus (local, same device)
- Best in landscape. Player 1 controls the left jet and Player 2 the right jet, with their buttons on opposite sides of the screen.
- **Ring Toss Versus. Shared water, separate pegs:** each player scores only on the pegs on their side, but bubbles push everything, so you can disrupt your opponent. This is the toy's original two-player chaos.
- **Basketball 1-on-1:** each player has a hoop on their own side, and all balls are shared. Sink balls through your hoop and blast them away from your opponent's. Any color scores, but same-color streaks still multiply.
- 90-second timer, highest score wins. A tie goes to a 15-second sudden-death round.

---

## 4. Progression and rewards

- **XP and player level.** Every round awards XP (based on score, plus bonuses for full pegs and new bests). Player levels unlock cosmetics, themes, and boosters.
- **No stars-to-unlock gating** on modes; all modes are open once built. Levels unlock in sequence.
- **Boosters (earned only, never bought).** Each one is a consumable granted at certain player levels and as level-star rewards:
  - **Slow-mo** (5 seconds of slow motion)
  - **Magnet** (the next ring or ball near a chosen peg or hoop is pulled in)
  - **Color swap** (recolor one ring or ball in the tank)
  - **Extra time** (+15 seconds, Timed only)
- Boosters are disabled in Versus and leaderboard-style bests, or tracked as a separate "boosted" best.

### 4.1 Cosmetics and themes
The default is a **retro plastic look faithful to the toy**. Unlockable themes reskin the whole toy: frame, buttons, water, rings, background, and optionally the sound pack.

| Theme | Notes |
|---|---|
| Retro Plastic (default) | Translucent blue water, chunky colored plastic, slightly scuffed |
| Modern Clean | Glossy, minimal, soft shadows |
| Cartoony | Thick outlines, bouncy squash-and-stretch |
| Pixel Art | Chunky pixels, chiptune-flavored sounds |
| Claymation | Lumpy, hand-made textures |
| Aquarium | Fish swimming behind the tank, sandy floor |
| Neon Arcade | Dark tank, glowing rings |
| Pool Party | Tiles, sunlight caustics |

Theme parts can also be mixed and matched as separate unlocks: **tank designs, water colors, ring styles, ball styles, background themes.** Each theme includes a matching hoop and backboard, e.g., a retro orange plastic rim, a neon rim, or a pixel-art rim.

> Question 33 asked about a "theme," meaning a story world or setting. You were right that it overlaps with question 3, so it's merged here: settings like Aquarium and Pool Party are simply themes. The game has no story or characters.

---

## 5. Presentation

### 5.1 Screen layout
- The **toy frame is always visible**: plastic body, tank window, and two plunger buttons at the bottom.
- **Portrait** (default on phones): tank fills most of the screen; buttons sit at the bottom for thumbs.
- **Landscape**: tank in the center, buttons on the left and right edges. This is the preferred layout for Versus.
- The layout scales responsively. The game world uses a fixed logical size and is letterboxed to fit.

### 5.2 Camera
Fixed by default. **Small shakes and quick zooms** on big moments: full-peg and full-tube bonuses, x4+ streaks, bomb pops, swishes, and rim rattles. A "reduce motion" setting disables both.

### 5.3 Audio
- **Sound effects (realistic toy):** gurgling bubble bursts (several variations, randomized pitch), plastic plunger clicks, ring-on-peg *clack*, ring-on-ring *tick*, wrong-color "bonk," full-peg chime and fanfare. **Basketball adds:** ball bounce on the floor, rim *clang*, backboard *thunk*, net *swish*, tube drain *whoosh*, and a Hot Hands music sting.
- **Music: lo-fi chill.** It loops softly in menus and during play, with a separate volume slider.
- Settings: master, music, and sound effects volume, plus mute.

### 5.4 Haptics (importance 4/5)
A short buzz on each jet tap, a double pulse on a landing, and a long buzz on the full-peg bonus.
> ⚠️ Browser limitation: the web Vibration API works on Android Chrome but **not on iPhone Safari**. iPhone players get audio and visual feedback only, unless the game is later wrapped as a native app (see §8).

### 5.5 Tilt
Off by default (toggle in settings). Uses the browser's device-orientation API. iPhones require a one-time permission tap. Tilt adds a gentle sideways force, never strong enough to dominate.

### 5.6 Accessibility
- Colorblind mode is **planned for a later update**, but ring symbols are designed in from the start (see §2.8).
- Reduce motion toggle (no shake or zoom).
- Large touch targets (buttons at least 64px).

---

## 6. Screens and flow

```
Title / Main menu
 ├── Play → Choose game type: Ring Toss | Basketball
 │         ├── Timed (Basketball: "Shootout")
 │         ├── Levels → Level select (Ring Toss track / Basketball track) → Level
 │         ├── Endless (Ring Toss only for now)
 │         └── Versus (2P) (Basketball: "1-on-1")
 ├── Collection (themes, tanks, water, rings, backgrounds)
 ├── Profile (level, XP bar, bests, stats)
 └── Settings (audio, haptics, tilt, reduce motion, reset progress)

In game: HUD (score, timer or rings left, streak indicator per peg) → Pause menu → Results screen
```

---

## 7. Technical direction (summary; the full plan is in DEVELOPMENT_PLAN.md)

- **Stack:** TypeScript + **Phaser 3** game framework with the built-in **Matter.js** physics engine, built with **Vite**.
- **Delivery:** static website, installable as a **PWA** (Progressive Web App) so it works offline and can be added to a phone's home screen.
- **Hosting:** any free static host (GitHub Pages, Netlify, Cloudflare Pages).
- **Saving:** local storage on the device only. No accounts, no servers, no analytics.
- **Data-driven:** all tuning numbers live in one config file, and levels and themes live in JSON files, so the owner can ask for balance changes without code rewrites.

---

## 8. Future and "if it succeeds" options
- Daily challenge (planned as a later update), alternating between Ring Toss and Basketball
- Basketball Endless mode
- Hybrid levels mixing rings, pegs, balls, and hoops in one tank
- Colorblind mode
- Wrapping the web app as a native iOS/Android app (e.g., with Capacitor) to get iPhone haptics and app store presence
- Monetization revisit (owner noted pricing is subject to change if the game succeeds). Cosmetic-only purchases would fit the "no pay-to-win" pillar.
- Online leaderboards (would require a small backend and a privacy review)

---

## 9. Legal and IP notes (not legal advice)
- Use an **original name and branding**. Don't use "Waterful," "Tomy," their logos, or packaging art.
- Game mechanics themselves generally aren't protected, but make the toy frame an **original design** rather than a replica of a specific product's look.
- AI-generated art should be prompted for original designs, never "in the style of [brand]."
- Before any commercial release, do a trademark search on the final name.

---

## 10. Owner decisions and assumptions to confirm

| # | Item | Assumption made |
|---|---|---|
| 1 | Launch date | The form returned today's date, which was probably the field's default. **No fixed date assumed**; milestones are listed in order, not by date. |
| 2 | Title | "Plunk!" as a working title |
| 3 | MVP definition | Defined in DEVELOPMENT_PLAN.md, Milestone 1 |
| 4 | Basketball scope | Its own game type with Timed (Shootout), Versus (1-on-1), and 6 levels. Ring Toss modes contain no balls; mixing them is a later idea. |
| 5 | Wrong-color penalty | −15 points |
| 6 | Timed round length | 90 seconds (both game types) |
| 7 | Peg / tube capacity | 4 rings / 4 balls |
| 8 | Full tubes empty, full pegs stay | Keeps Basketball fast and Ring Toss strategic |
