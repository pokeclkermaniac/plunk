# Changelog

Plain-words notes on what's in each version.

## 1.0.0 — 2026-11-06 — first complete build

All milestones in the development plan are in this build. It's ready for your playtesting and tuning.

**The toy**
- A water tank with floaty buoyancy and drag, two plunger buttons, and bursts of wobbling bubbles that pop at the surface.
- Tap the on-screen plungers, or use `A`/`L` or the arrow keys. Multi-touch works, so both jets (or both players) can fire at once.
- The floor slopes toward the jets, so missed pieces come back around.
- Works in portrait (buttons at the bottom) and landscape (buttons on the sides), and switches automatically when you rotate.

**Ring Toss**
- Rings float, tumble, and land on pegs with a clack and a bounce.
- Color streaks (x2, x3, x4…), a −15 wrong-color penalty, the full-peg bonus, and clogged "dead" pegs.
- "Tank clear" when every peg is full.
- Special rings: Rainbow (wild), Golden (+100), Heavy (3× points, hard to lift) and Bomb (clears a peg).
- Multiplier pegs (x2/x3), ledges, peg guards and rotating paddles.

**Basketball**
- Bouncy balls, wall-mounted hoops with backboards and swaying nets, and ball tubes that fill up and drain.
- Swish (+10) and bank (+5) bonuses, rim rattles, and Hot Hands double points in the last 15 seconds.
- Special balls, multiplier hoops and moving hoops.

**Modes**
- Ring Toss Timed and Basketball Shootout (60/90/120-second rounds; set the length in Settings).
- Levels: 12 Ring Toss and 6 Basketball, each with a goal and 1–3 stars, unlocking in order.
- Endless Ring Toss: a limited ring supply that full pegs refill, with difficulty that ramps up as you score.
- Versus (Ring Toss) and 1-on-1 (Basketball) for two players on one device, with sudden death on a tie.

**Juice**
- Camera shake and zoom on big moments, score popups, sparkles, peg glow while a streak builds, and full-peg fanfares.
- Synthesized toy sound effects plus a lo-fi music loop. Pixel and Neon themes use chiptune-flavored sounds.
- Vibration on Android (iPhone browsers don't allow it).
- Optional tilt control. The Reduce motion setting turns off shake and zoom.

**Progression and looks**
- XP, player levels and an unlock table.
- 8 themes: Retro Plastic, Modern Clean, Cartoony, Pixel Art, Aquarium, Neon Arcade, Pool Party, Claymation.
- Mix-and-match tank, water, rings, balls and background in Collection.
- Earned-only boosters: Slow-mo, Magnet, Color swap, Extra time. Bests from rounds that used a booster are kept separately.
- Profile screen with your bests and lifetime stats.

**Ship it**
- Installable as an app (PWA) and works offline once loaded. Icons included.
- A first-time hint overlay ("Tap the buttons to blast bubbles!").
- Auto-deploy to GitHub Pages on every push to `main`.
- Unit tests for scoring, stacking, basketball, saves and progression, plus a browser script that checks the real mechanics.
