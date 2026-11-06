import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { pieceKey, texScale } from '../game/Textures';
import type { GameType } from '../game/types';
import { endlessConfig } from '../modes/EndlessMode';
import { timedConfig } from '../modes/TimedMode';
import { versusConfig } from '../modes/VersusMode';
import type { RoundConfig } from '../modes/RoundConfig';
import { AudioManager } from '../systems/AudioManager';
import { Pwa } from '../systems/Pwa';
import { xpToNext } from '../systems/Progression';
import { Save } from '../systems/SaveSystem';
import { ThemeManager } from '../systems/ThemeManager';
import { backdrop, button, heading, restartOnResize, text } from '../ui/ui';

type Screen = 'main' | 'type' | 'modes';

export class MenuScene extends Phaser.Scene {
  private screen: Screen = 'main';
  private gameType: GameType = 'ringToss';

  constructor() {
    super('Menu');
  }

  init(data: { screen?: Screen; gameType?: GameType }): void {
    this.screen = data.screen ?? 'main';
    this.gameType = data.gameType ?? 'ringToss';
  }

  create(): void {
    backdrop(this);
    restartOnResize(this, { screen: this.screen, gameType: this.gameType });
    AudioManager.startMusic();
    const W = this.scale.width;
    const H = this.scale.height;
    const land = W > H;
    const cx = W / 2;
    this.decor(W, H);

    if (this.screen === 'main') {
      const logoY = land ? 120 : 250;
      const logo = heading(this, cx, logoY, 'PLUNK!', land ? 110 : 132);
      this.tweens.add({ targets: logo, angle: { from: -2, to: 2 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      text(this, cx, logoY + (land ? 72 : 92), 'Water Toy Games', land ? 28 : 34).setAlpha(0.9);
      const bw = land ? 380 : 460;
      const bh = land ? 74 : 96;
      const gap = land ? 88 : 120;
      let y = land ? 300 : 520;
      button(this, cx, y, bw, bh, 'PLAY', () => this.go('type'), { size: land ? 38 : 46 });
      y += gap;
      button(this, cx, y, bw, bh, 'Collection', () => this.scene.start('Collection'), { color: ThemeManager.current.buttons.right });
      y += gap;
      button(this, cx, y, bw, bh, 'Profile', () => this.scene.start('Profile'), { color: ThemeManager.current.buttons.left });
      y += gap;
      button(this, cx, y, bw, bh, 'Settings', () => this.scene.start('Settings'), { color: '#9aa7b4' });
      y += gap * 0.85;
      const s = Save.data;
      text(this, cx, Math.min(H - 70, y + 10), `Player level ${s.level}  ·  ${s.xp}/${xpToNext(s.level)} XP`, 24).setAlpha(0.85);
      this.installHint(cx, H - 30);
    } else if (this.screen === 'type') {
      heading(this, cx, land ? 90 : 200, 'Choose a game', land ? 52 : 60);
      const bw = land ? 420 : 500;
      const bh = land ? 150 : 190;
      const y0 = land ? 290 : 520;
      const off = land ? 0 : 240;
      const xl = land ? cx - 230 : cx;
      const xr = land ? cx + 230 : cx;
      button(this, xl, y0, bw, bh, 'Ring Toss', () => this.go('modes', 'ringToss'), {
        sub: 'Float rings onto pegs',
        size: 44,
        color: ThemeManager.current.buttons.left,
      });
      button(this, xr, y0 + off, bw, bh, 'Basketball', () => this.go('modes', 'basketball'), {
        sub: 'Blast balls through hoops',
        size: 44,
        color: ThemeManager.current.buttons.right,
      });
      this.pieceIcons(xl, y0 - bh / 2 - 10, 'ring');
      this.pieceIcons(xr, y0 + off - bh / 2 - 10, 'ball');
      button(this, cx, H - (land ? 70 : 120), 260, 76, '‹ Back', () => this.go('main'), { color: '#9aa7b4' });
    } else {
      const ring = this.gameType === 'ringToss';
      heading(this, cx, land ? 80 : 180, ring ? 'Ring Toss' : 'Basketball', land ? 54 : 64);
      const bw = land ? 520 : 540;
      const bh = land ? 86 : 118;
      const gap = land ? 100 : 145;
      let y = land ? 190 : 380;
      const s = Save.data;
      const secs = s.settings.roundSeconds || TUNING.TIMED_ROUND_SECONDS;
      const best = ring ? s.bests.ringTimed : s.bests.basketballTimed;
      button(this, cx, y, bw, bh, ring ? 'Timed' : 'Shootout', () => this.play(timedConfig(this.gameType, secs)), {
        sub: `${secs} seconds${best ? ` · best ${best}` : ''}${ring ? '' : ' · Hot Hands finale'}`,
      });
      y += gap;
      button(this, cx, y, bw, bh, 'Levels', () => this.scene.start('LevelSelect', { gameType: this.gameType }), {
        sub: ring ? '12 hand-made challenges' : '6 hand-made challenges',
        color: ThemeManager.current.buttons.left,
      });
      y += gap;
      if (ring)
        button(this, cx, y, bw, bh, 'Endless', () => this.play(endlessConfig()), {
          sub: `Limited rings, full pegs refill${s.bests.endless ? ` · best ${s.bests.endless}` : ''}`,
          color: ThemeManager.current.buttons.right,
        });
      else button(this, cx, y, bw, bh, 'Endless', () => {}, { sub: 'Coming in a later update', disabled: true });
      y += gap;
      button(this, cx, y, bw, bh, ring ? 'Versus (2P)' : '1-on-1 (2P)', () => this.play(versusConfig(this.gameType)), {
        sub: land ? 'P1 = left button · P2 = right button' : 'Best in landscape · one button each',
        color: '#ff8a65',
      });
      button(this, cx, H - (land ? 55 : 110), 260, land ? 66 : 76, '‹ Back', () => this.go('type'), { color: '#9aa7b4' });
    }
  }

  private go(screen: Screen, gameType: GameType = this.gameType): void {
    this.scene.restart({ screen, gameType });
  }

  private play(config: RoundConfig): void {
    this.scene.start('Game', { config });
  }

  private pieceIcons(x: number, y: number, kind: 'ring' | 'ball'): void {
    for (let i = 0; i < 3; i++) {
      const k = pieceKey({ color: i, kind: 'normal' });
      const px = x - 70 + i * 70;
      if (kind === 'ring') {
        this.add.image(px, y, `ring_back_${k}`).setScale(texScale() * 0.8);
        this.add.image(px, y, `ring_front_${k}`).setScale(texScale() * 0.8);
      } else this.add.image(px, y, `ball_${k}`).setScale(texScale() * 0.9);
    }
  }

  private decor(W: number, H: number): void {
    // a few floating pieces drifting around the edges
    for (let i = 0; i < 6; i++) {
      const k = pieceKey({ color: i % 6, kind: 'normal' });
      const x = i % 2 === 0 ? 50 + Math.random() * 60 : W - 50 - Math.random() * 60;
      const y = 100 + (i / 6) * (H - 200);
      const objs =
        i % 3 === 0
          ? [this.add.image(x, y, `ball_${k}`).setScale(texScale() * 0.9)]
          : [this.add.image(x, y, `ring_back_${k}`).setScale(texScale()), this.add.image(x, y, `ring_front_${k}`).setScale(texScale())];
      for (const o of objs) o.setAlpha(0.55);
      this.tweens.add({
        targets: objs,
        y: y - 30 - Math.random() * 30,
        angle: (Math.random() - 0.5) * 30,
        duration: 2200 + Math.random() * 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private installHint(x: number, y: number): void {
    if (Pwa.isStandalone()) return;
    if (Pwa.canPrompt()) {
      button(this, x, y - 30, 330, 60, '⬇ Install Plunk!', () => void Pwa.prompt().then(() => this.scene.restart()), {
        color: '#4caf50',
        size: 24,
      });
    } else if (Pwa.isIOS()) {
      text(this, x, y, 'Tip: Share → "Add to Home Screen" to install & play offline', 20).setAlpha(0.75);
    }
    const off = Pwa.onChange(() => this.scene.isActive() && this.scene.restart());
    this.events.once('shutdown', off);
  }
}
