import Phaser from 'phaser';
import type { GameType } from '../game/types';
import { goalText } from '../modes/Goals';
import { levelConfig, LEVELS } from '../modes/LevelMode';
import { Save } from '../systems/SaveSystem';
import { ThemeManager } from '../systems/ThemeManager';
import { backdrop, button, heading, restartOnResize, text } from '../ui/ui';

/** Two tracks (Ring Toss / Basketball). Levels unlock in sequence. */
export class LevelSelectScene extends Phaser.Scene {
  private gameType: GameType = 'ringToss';
  private selected = -1;

  constructor() {
    super('LevelSelect');
  }

  init(data: { gameType?: GameType; selected?: number }): void {
    this.gameType = data.gameType ?? 'ringToss';
    this.selected = data.selected ?? -1;
  }

  create(): void {
    backdrop(this);
    restartOnResize(this, { gameType: this.gameType, selected: this.selected });
    const W = this.scale.width;
    const H = this.scale.height;
    const land = W > H;
    const cx = W / 2;
    const t = ThemeManager.current;
    heading(this, cx, land ? 50 : 110, 'Levels', land ? 48 : 60);
    const tabY = land ? 115 : 210;
    const ring = this.gameType === 'ringToss';
    button(this, cx - 150, tabY, 280, 64, 'Ring Toss', () => this.scene.restart({ gameType: 'ringToss' }), {
      color: ring ? t.buttons.left : '#7d8590',
      size: 26,
    });
    button(
      this,
      cx + 150,
      tabY,
      280,
      64,
      'Basketball',
      () => this.scene.restart({ gameType: 'basketball' }),
      {
        color: !ring ? t.buttons.right : '#7d8590',
        size: 26,
      },
    );

    const list = LEVELS[this.gameType];
    const cols = land ? 6 : 4;
    const size = land ? 150 : 150;
    const gap = land ? 18 : 24;
    const gridW = cols * size + (cols - 1) * gap;
    const y0 = land ? 200 : 330;
    list.forEach((lv, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cx - gridW / 2 + size / 2 + col * (size + gap);
      const y = y0 + size / 2 + row * (size * 0.82 + gap);
      const rec = Save.data.bests.levels[lv.id];
      const prevDone = i === 0 || (Save.data.bests.levels[list[i - 1].id]?.stars ?? 0) > 0;
      const stars = rec?.stars ?? 0;
      const label = prevDone ? `${i + 1}` : '🔒';
      const sub = prevDone ? [0, 1, 2].map((k) => (k < stars ? '★' : '☆')).join('') : '';
      button(
        this,
        x,
        y,
        size,
        size * 0.78,
        label,
        () => this.scene.restart({ gameType: this.gameType, selected: i }),
        {
          disabled: !prevDone,
          sub,
          size: 40,
          color: this.selected === i ? '#ffffff' : ring ? t.buttons.left : t.buttons.right,
        },
      );
    });

    // details of the selected level
    const rows = Math.ceil(list.length / cols);
    const infoY = Math.min(H - (land ? 150 : 330), y0 + rows * (size * 0.82 + gap) + (land ? 40 : 70));
    if (this.selected >= 0 && list[this.selected]) {
      const lv = list[this.selected];
      const rec = Save.data.bests.levels[lv.id];
      text(this, cx, infoY, `${this.selected + 1}. ${lv.name}`, land ? 30 : 36, t.frame.trim, {
        fontStyle: 'bold',
      });
      const extra = [
        `🎯 ${goalText(lv.goal)}`,
        lv.time ? `⏱ ${lv.time}s` : lv.supply !== null ? `${lv.startPieces + (lv.supply ?? 0)} rings` : '',
        rec?.best ? `Best ${rec.best}` : '',
      ]
        .filter(Boolean)
        .join('   ·   ');
      text(this, cx, infoY + (land ? 38 : 48), extra, land ? 20 : 24, '#ffffff', {
        wordWrap: { width: W - 60 },
      });
      button(this, cx, infoY + (land ? 95 : 130), 320, land ? 66 : 86, '▶ Play', () =>
        this.scene.start('Game', { config: levelConfig(lv, this.selected) }),
      );
    } else {
      text(this, cx, infoY + 20, 'Pick a level', 28).setAlpha(0.8);
    }
    button(
      this,
      land ? 110 : cx,
      land ? H - 50 : H - 80,
      220,
      66,
      '‹ Back',
      () => this.scene.start('Menu', { screen: 'modes', gameType: this.gameType }),
      {
        color: '#9aa7b4',
        size: 26,
      },
    );
  }
}
