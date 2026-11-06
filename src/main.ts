import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { ResultsScene } from './scenes/ResultsScene';
import { CollectionScene } from './scenes/CollectionScene';
import { SettingsScene } from './scenes/SettingsScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { ProfileScene } from './scenes/ProfileScene';
import { TUNING } from './config/tuning';
import { setupPwa } from './systems/Pwa';

/** Fixed logical resolution, letterboxed with FIT. Swaps between portrait and landscape. */
function logicalSize(): { width: number; height: number } {
  const landscape = window.innerWidth > window.innerHeight * 1.05;
  return landscape ? { width: 1280, height: 720 } : { width: 720, height: 1280 };
}

const size = logicalSize();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0e2a47',
  width: size.width,
  height: size.height,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 4 },
  render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
  fps: { target: 60 },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: TUNING.GRAVITY_Y },
      autoUpdate: false,
      positionIterations: 8,
      velocityIterations: 6,
      enableSleeping: false,
      debug: /[?&]physics/.test(location.search),
    },
  },
  scene: [
    BootScene,
    MenuScene,
    GameScene,
    HudScene,
    ResultsScene,
    CollectionScene,
    SettingsScene,
    LevelSelectScene,
    ProfileScene,
  ],
});

let current = `${size.width}x${size.height}`;
function onResize() {
  const s = logicalSize();
  const key = `${s.width}x${s.height}`;
  if (key !== current) {
    current = key;
    game.scale.setGameSize(s.width, s.height);
  }
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 200));

// Prevent long-press menus / double-tap zoom while mashing the plungers.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

setupPwa();

(window as any).__game = game;
