# Credits

**Plunk!** is an original game. Its name, logo, toy frame design and all artwork are original. It isn't affiliated with, and doesn't copy, any commercial water-toy product or brand.

## Art
All visuals are **generated procedurally in code** (`src/game/Textures.ts`) from the color values in `src/data/themes/*.json`. No image files from outside sources are used.

App icons (`public/icons/`) are an original SVG (`icon.svg`), rendered to PNG by `scripts/make-icons.mjs`.

## Sound and music
All sound effects and the lo-fi music loop are **synthesized at runtime** with the Web Audio API (`src/systems/AudioManager.ts`). No audio files from outside sources are used.

## Fonts
The game uses each device's built-in system fonts (for example Trebuchet MS, Helvetica or Courier). No font files are bundled.

## Software (open-source libraries)
| Library | License |
|---|---|
| [Phaser 3](https://phaser.io) (includes [Matter.js](https://brm.io/matter-js/)) | MIT |
| [Vite](https://vitejs.dev) | MIT |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app) / Workbox | MIT |
| [Vitest](https://vitest.dev) | MIT |
| [TypeScript](https://www.typescriptlang.org) | Apache-2.0 |
| [ESLint](https://eslint.org), [Prettier](https://prettier.io) | MIT |

If you add hand-made or AI-generated art or sounds later, list each source and its license here.
