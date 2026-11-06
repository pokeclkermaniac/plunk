# Asset list and prompt sheet

Plunk! currently ships with **procedural art**: every sprite below is drawn in code from the theme JSON, so nothing is missing. This sheet is here in case you want to replace some or all of it with hand-made or AI-generated images later.

## How a hand-made asset would plug in

Themes live in `src/data/themes/<id>.json`. To use image files instead of procedural drawing, an asset would go in `public/assets/themes/<theme-id>/`, and `generateTextures()` in `src/game/Textures.ts` would load that file instead of drawing the texture. Texture keys are listed below. Ask the agent to "use my images for theme X" and point it at the folder.

Keep every image **transparent PNG**, **front-on orthographic view**, **no text, no logos**.

## Per theme

| Texture key | Size (px, ×2 for crispness) | Notes |
|---|---|---|
| `frame_port` | 700 × 1350 | Portrait toy shell. Transparent window at (50,150) sized 600 × 900; space for 2 plungers at the bottom |
| `frame_land` | 1280 × 1020 | Landscape shell. Window at (340,60) sized 600 × 900; plungers on the side wings |
| `tank_bg` | 600 × 900 | Back wall of the tank (behind the water) |
| `tank_water` | 600 × 900 | Water tint; transparent above y = 26 |
| `btn_left_up` / `btn_left_down` | 220 × 220 | Left plunger, up and pressed |
| `btn_right_up` / `btn_right_down` | 220 × 220 | Right plunger |
| `ring_back_<k>` / `ring_front_<k>` | 96 × 34 | Ring seen nearly edge-on, split into back (top) half and front (bottom) half so it can wrap a peg. `<k>` = `0`–`5` (colors), `h0`–`h5` (heavy), `rainbow`, `golden`, `bomb` |
| `ball_<k>` | 56 × 56 | Same keys as rings |
| `bubble` | 18 × 18 | Bubble particle |
| `sparkle` | 32 × 32 | Sparkle particle |

Pegs, hoops (rim, backboard, net, tube), obstacles, multiplier badges and the floor are drawn as vector shapes using the theme colors.

**Colors and symbols** (used for both rings and balls): 0 Red ● · 1 Blue ▲ · 2 Yellow ■ · 3 Green ◆ · 4 Purple ★ · 5 Orange ♥. The symbol is embossed on every piece so a colorblind mode can be added later.

**Specials:** Rainbow (wild), Golden (star emboss), Heavy (dark metal bands), Bomb (black with a red dashed stripe and a fuse).

## Global UI
- Logo / wordmark "PLUNK!" (currently drawn as text on the shell)
- Menu buttons (currently vector shapes)
- Star icons, booster icons (currently emoji: 🐢 🧲 🎨 ⏱)
- PWA icons: `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` (made from `icon.svg` by `node scripts/make-icons.mjs`)

## Audio list (all currently synthesized)
4–6 bubble bursts (randomized) · plunger click · ring clack on peg · ring tick on ring · wrong-color bonk · streak rising tones · full-peg chime and fanfare · ball bounce · rim clang · backboard thunk · net swish · tube drain whoosh · Hot Hands sting · bomb pop · timer warning · results jingle · lo-fi music loop. If you replace any of these, use original or CC0 sounds and log the source in `CREDITS.md`.

## Prompt sheet (for an AI image tool)

**Seed (Retro Plastic):**
> Original 1980s-style handheld water toy, translucent cyan water in a chunky glossy plastic shell, primary-color plastic rings and balls with embossed symbols, a small orange plastic basketball hoop with a white backboard, slight scuffs and highlights, soft studio lighting, front-on orthographic view, clean edges, transparent background, no text, no logos.

**Individual sprites** (add the seed's style words to each):
- *Ring:* "a single glossy red plastic ring seen almost edge-on (thin ellipse), small embossed circle symbol on the front, isolated, transparent background"
- *Ball:* "a single small glossy blue plastic ball with a raised triangle symbol, toy basketball seams, isolated, transparent background"
- *Plunger:* "a chunky round yellow plastic push-button plunger set in a dark red plastic housing, top-down front view, isolated"
- *Shell:* "a tall red glossy plastic handheld toy body with a large empty rectangular window cut out (fully transparent window), two round button sockets at the bottom, screws in the corners, no text"
- *Theme variants:* swap the material words, e.g. "minimal white glossy plastic, soft shadows" (Modern Clean), "thick black outlines, saturated cartoon colors" (Cartoony), "16-bit pixel art, limited palette" (Pixel Art), "hand-made plasticine clay, fingerprints" (Claymation), "dark tank, glowing neon tubes" (Neon Arcade).

Never prompt "in the style of" a real brand or product.
