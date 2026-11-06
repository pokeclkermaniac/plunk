# Playtesting guide

How to test each part of Plunk! and what to tell the agent afterward. Plain words are perfect: "rings feel too heavy" is all it takes.

## Before you start

- Play on a **phone** (portrait and landscape) and on a **desktop** (keyboard: `A`/`L` or the arrow keys).
- Turn the sound on. The bubbles, clacks and chimes are half the toy.
- On Android, vibration should buzz on each tap. iPhone browsers don't allow vibration, so that's expected.
- Use **Settings → Reset progress** if you want to test the "brand new player" experience again.

## Ring Toss (Timed): play 10 rounds, then answer

1. Do rings feel too heavy, too light, or right?
2. Is landing a ring too hard, too easy, or right?
3. Did you find yourself *thinking* about colors, or just hoping?
4. Did the wrong-color penalty feel fair?
5. Did you want to play "one more"?

## Basketball (Shootout): play 10 rounds, then answer

1. Do shots arc nicely, or do balls just shoot straight up?
2. Are baskets too hard, too easy, or right?
3. Do swishes feel special?
4. Is the color streak as fun here as in Ring Toss?
5. Does Hot Hands (the last 15 seconds, double points) make the ending exciting?

## Also worth checking

- **Levels:** is each level's goal clear? Are the star targets fair? Which level felt like a difficulty spike?
- **Endless:** does it last long enough? Do the new colors and obstacles arrive too fast or too slow?
- **Versus / 1-on-1:** with a friend in landscape, can you both reach your buttons comfortably?
- **Juice:** too much screen shake? Try **Settings → Reduce motion**.
- **Tilt:** turn it on in Settings and tilt the phone. It should nudge the water gently and never take over.
- **Install:** on the published link, use "Add to Home Screen", then turn on airplane mode and play.

## Complaint → knob (all in `src/config/tuning.ts`)

| If it feels like… | Knob(s) | Direction |
|---|---|---|
| Rings/balls sink too fast | `BUOYANCY_RATIO` | raise (0.72 now; 1.0 = never sinks) |
| Everything is too floaty / slow | `BUOYANCY_RATIO`, `WATER_FRICTION_AIR` | lower |
| One tap doesn't do enough | `JET_IMPULSE` | raise (1.3 now) |
| Jets are too wild | `JET_IMPULSE`, `JET_RANDOM_KICK`, `JET_SPREAD` | lower |
| Jet is too narrow | `JET_CONE_ANGLE_DEG`, `JET_NOZZLE_WIDTH` | raise |
| Mashing is too strong | `JET_COOLDOWN_MS` | raise |
| Landing rings is too hard | `CAPTURE_MAX_ANGLE_DEG`, `CAPTURE_LENIENCY_PX` | raise |
| Heavy rings are impossible | `HEAVY_BUOYANCY_RATIO`, `HEAVY_JET_DIVISOR` | raise / lower |
| Balls don't arc toward hoops | `JET_TILT_DEG_BASKETBALL` | raise (8 now) |
| Balls too bouncy / dead | `BALL_RESTITUTION` | lower / raise |
| Baskets too strict | `BASKET_WINDOW_MS`, `BASKET_DEPTH` | raise / lower |
| Wrong color too harsh | `WRONG_COLOR_PENALTY` | lower (15 now) |
| Full bonus too big/small | `FULL_PEG_BONUS`, `FULL_TUBE_BONUS` | |
| Rounds too short/long | Settings → Timed round length (60/90/120), or `TIMED_ROUND_SECONDS` | |
| Too many/few special rings | `SPECIAL_RING_CHANCE`, `SPECIAL_WEIGHTS` | |
| Shake too strong | `SHAKE_SMALL`, `SHAKE_BIG`, `ZOOM_BIG` | lower |
| Leveling up is too slow | `XP_LEVEL_BASE`, `XP_LEVEL_GROWTH` | lower |

Level layouts, goals and star targets are in `src/data/levels/*.json`.

## Developer helpers

With `npm run dev` running:

- `node scripts/verify.mjs`: plays real rounds in a headless browser and checks landings, bombs, tank clear, swishes, tube drains, the "no scoring from below" rule, Hot Hands, boosters, level completion and saving, Endless refills and Versus scoring.
- `node scripts/tour.mjs <folder> [landscape]`: screenshots every screen.
- `node scripts/probe.mjs`: measures how high taps lift a piece.
- Add `?debug` to the URL to expose the running round as `window.__plunk`, or `?physics` to draw physics bodies.
