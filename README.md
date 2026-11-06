# Plunk! — Water Toy Games

The water toy you remember, in **Ring Toss** and **Basketball** versions, with a color-matching score twist, in 90-second rounds.

- Two plunger buttons blast bubbles; float rings onto pegs or drop balls through hoops.
- **Color streaks:** the same color in a row on a peg (or through a hoop) multiplies points: x2, x3, x4…
- A peg or tube filled with one color pays a big **full bonus**. Wrong colors cost points.
- Modes: **Timed / Shootout**, **Levels** (12 Ring Toss + 6 Basketball), **Endless** (Ring Toss) and **2-player Versus / 1-on-1**.
- 8 themes (Retro Plastic, Modern Clean, Cartoony, Pixel Art, Aquarium, Neon Arcade, Pool Party, Claymation). You can also mix and match tank, water, rings, balls and background.
- XP, player levels, unlocks and earned-only boosters (Slow-mo, Magnet, Color swap, Extra time).
- Works offline and can be installed to a phone's home screen (PWA). No ads, no accounts, no tracking, no network calls.

All art is drawn in code and all sound is synthesized in code, so there are no image or audio files to license.

---

## Play it on your computer

You need **Node.js 20 or newer** (download the "LTS" version from nodejs.org). Then, in this folder:

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (usually http://localhost:5173).

**Controls:** `A` or `←` fires the left jet, `L` or `→` fires the right jet, and `Esc` pauses. You can also click the plunger buttons.

## Play it on your phone (same Wi‑Fi)

1. Run `npm run dev` on your computer.
2. Look for the line that says **Network:** (for example `http://192.168.1.23:5173/`).
3. Type that address into your phone's browser. The phone must be on the same Wi‑Fi as the computer.
4. Turn your phone sideways for the landscape layout, which is the best one for 2-player.

If the phone can't connect, your computer's firewall may be blocking port 5173. Allow Node.js through the firewall when asked.

> Offline mode and "Add to Home Screen" only work on the published build (below) or over `https`. The Wi‑Fi dev server is for quick playtesting.

## Publish it (get a link you can share)

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`). On every push to `main`, it runs the tests, builds the game and publishes it to **GitHub Pages**:

1. On GitHub, open the repo's **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main`. After a minute or two, the game is live at `https://<owner>.github.io/plunk/`.

GitHub Pages is free for public repositories. Private repositories need a paid GitHub plan for Pages. Netlify or Cloudflare Pages also work: use build command `npm run build` and output folder `dist`.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the game with live reload (also reachable from your phone) |
| `npm test` | Run the unit tests for scoring, stacking, basketball, saves and progression |
| `npm run build` | Make the production build in `dist/` |
| `npm run preview` | Serve the production build locally (offline/PWA works here) |
| `npm run lint` | Check code style |
| `node scripts/verify.mjs` | With `npm run dev` running: plays the real game in a headless browser and checks landings, bombs, swishes, tube drains, level completion, boosters, Endless refills and Versus scoring |

## Changing how it feels

Every number that affects feel lives in **`src/config/tuning.ts`**: float, drag, jet strength, capture leniency, scoring, timers, spawn rates and more. See **[docs/PLAYTESTING.md](docs/PLAYTESTING.md)** for the playtest questions and which knob answers which complaint. To ask for a change, just describe it ("rings sink too fast", "baskets are too hard").

- Levels: `src/data/levels/*.json`
- Themes: `src/data/themes/*.json`

## Project docs

- [GDD.md](GDD.md): game design (source of truth)
- [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md): build plan and milestones
- [DECISIONS.md](DECISIONS.md): judgment calls made where the design was open
- [CHANGELOG.md](CHANGELOG.md): what's in each version, in plain words
- [CREDITS.md](CREDITS.md): sources for art and sound
- [docs/PLAYTESTING.md](docs/PLAYTESTING.md): how to test and the tuning knobs
- [docs/ASSETS.md](docs/ASSETS.md): asset list and an AI-image prompt sheet, if you want hand-made art later

## Tech

TypeScript · Phaser 3 (Matter.js physics) · Vite · vite-plugin-pwa · Vitest. Saves go to the browser's `localStorage` as a versioned JSON blob with migrations.
