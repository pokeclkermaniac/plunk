# Decisions log

Judgment calls made where the GDD or plan left room. Each one is the simplest option that fits the design pillars, and each can be changed on request.

## Scoring

1. **Score never shows negative.** The running total is clamped at 0 (`applyDelta`). A wrong color at 0 points just stays at 0.
2. **Multiplier pegs/hoops multiply everything**, including the wrong-color penalty (x2 peg → −30). The plan says "applies to every component."
3. **Hot Hands doubles positive points only.** Penalties are never doubled, so the finale stays exciting rather than punishing.
4. **Swish/bank bonuses are paid even on a wrong-color basket.** A great shot still feels great; the penalty still applies.
5. **Wrong color scores no base points**, just −15. The new color then starts a fresh x1 streak (GDD §2.5).
6. **Golden** resets the target's streak to "empty". The next ring of any color starts fresh at x1 with no penalty. A golden in a full stack makes it "mixed", so there is no full bonus.
7. **Rainbow on an empty peg** starts a wild x1 streak. The next colored ring adopts it as x2. A stack of all rainbows counts as one color for the full bonus.
8. **Bomb can land on a full (dead) peg.** It's the only way to rescue one, as the GDD intends. Bombs score nothing, not even swish bonuses.
9. **Heavy** = 3× the streak points (10 × streak × 3). The heavy multiplier doesn't apply to penalties.
10. **Tank clear** (every peg full) pays **+300** (`TANK_CLEAR_BONUS`) and empties all pegs. In Versus it works per player, on that player's pegs only.

## Physics and feel

11. **Fixed 60 Hz physics step driven by real elapsed time.** Phaser's smoothed frame delta under-reports on slow frames, which would put weaker phones in slow motion. Steps are capped per frame to avoid a "spiral of death".
12. **Sloped tank floor.** The floor slopes down toward each jet nozzle, like the real toy, so missed pieces slide back over a jet instead of getting stuck in corners.
13. **Starting tuning** (from the plan, adjusted after automated probing): `BUOYANCY_RATIO` 0.72 (plan said 0.85, which was too slow to sink), `JET_IMPULSE` 1.3, `GRAVITY_Y` 2. One tap lifts a ring about 120–240 px; eight rapid taps lift it about 550 px.
14. **Ring capture** uses the plan's rule (tip between the rims, moving down, tilt < 50°) plus a lenient fallback: a ring already threaded on a peg below its tip is captured too.
15. **Stacked rings get a solid "stack block"**, so loose rings bounce off a stack instead of passing through it.
16. **Start pieces rest low near the jets** and never straight above a peg, so nobody gets free points at the start. New pieces drop in from the top, away from pegs and hoop openings.

## Basketball

17. **Side-view hoops:** backboards are mounted on the tank walls (or free-standing for moving hoops), with the rim sticking out into the tank. Jets lean 8° inward. A ball that rises on the outer side of a jet gets pushed outward toward that side's hoop, so players learn which jet suits which hoop.
18. **No scoring from below:** a ball that crosses the rim upward is disqualified for that hoop until it leaves the hoop's column.
19. **Ball tube is visual only** (no collision), mounted under the hoop on the back wall.
20. **Ball supply:** at least 3 balls stay loose in the tank (a new one drops in after a basket if needed). Drained tube balls return to the tank from the bottom, up to 8 loose balls. This keeps the GDD's "tubes drain back into the tank" without ever stalling.
21. **1-on-1:** any color scores base points (no penalty); same-color streaks still multiply (GDD §3.4).

## Modes

22. **Versus tie:** a 15-second sudden-death round. If it's still tied after that, the result is a draw.
23. **Levels end the moment the goal is met.** A completion bonus is then added: +10 per second left and +25 per unused ring/ball. Stars come from the final score; 1 star = goal met.
24. **Level failure:** the timer runs out, the pieces run out, or (on "no wrong colors" levels) one wrong-color ring lands.
25. **Endless difficulty ramp** (score thresholds in `src/modes/EndlessMode.ts`): a 4th color at 600, a ledge at 1400, a 5th color at 2400, a rotating paddle at 3600, all 6 colors at 5000, another ledge at 7000.
26. **Basketball Endless** shows as "Coming in a later update" (GDD build order).

## Presentation

27. **Fixed logical sizes:** 720×1280 in portrait and 1280×720 in landscape, letterboxed with Phaser FIT. The game swaps sizes when the device rotates, mid-round included.
28. **All art is procedural** (Canvas 2D drawn from theme JSON colors) and **all audio is synthesized** (Web Audio). Nothing is blocked on art, there are no licensing worries, and themes are pure data. `docs/ASSETS.md` keeps the asset list and prompt sheet in case hand-made art is wanted later.
29. **Pixel Art theme** draws its textures at 1/3 resolution and scales them up with nearest-neighbor filtering.
30. **Mix-and-match:** equipping a whole theme also equips every part of it that's unlocked. Parts (tank, water, rings, balls, background) can be swapped one by one in Collection.

## Progression

31. **New players start with 1 of each booster** so they can try them. All further boosters are earned through player levels and first-time 3-star level clears.
32. **Boosted bests** are tracked separately whenever a booster was used in that round. Boosters are disabled in Versus.
33. **XP** = score ÷ 10 + 15 per full bonus + 50 for a new best + 20 per level star. Level-up cost is 120 + 60 × (level − 1).

## Save data

34. **Save version 2.** Version 1 is the plan's §4.8 shape. Version 2 adds boosted bests, the round-length setting, mute, extra stats and the first-time hint flags. Migrations run on load, and unknown or corrupt data falls back to defaults without crashing.

## Tooling

35. **Phaser 3.90** (latest Phaser 3) as the plan specifies, not Phaser 4. Built with Vite 7 and tested with Vitest 3.
