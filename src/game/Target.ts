import Phaser from 'phaser';
import { createTarget, type TargetState } from './Scoring';
import type { TargetDef } from '../modes/RoundConfig';
import { DEPTH } from './Matter';
import type { Theme } from '../systems/ThemeManager';

/**
 * Shared "stack target" base for pegs and hoops: holds the pure TargetState that Scoring.ts
 * operates on, plus the per-target streak badge and multiplier badge.
 */
export abstract class Target {
  state: TargetState;
  owner: 0 | 1 | undefined;
  badge: Phaser.GameObjects.Text;
  multBadge?: Phaser.GameObjects.Container;
  protected scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    public def: TargetDef,
    public index: number,
    capacity: number,
    emptyWhenFull: boolean,
    protected theme: Theme,
  ) {
    this.scene = scene;
    this.owner = def.owner;
    this.state = createTarget(capacity, def.multiplier ?? 1, emptyWhenFull);
    this.badge = scene.add
      .text(0, 0, '', {
        fontFamily: theme.ui.font,
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.badge)
      .setVisible(false);
  }

  /** World point where popups and the streak badge appear. */
  abstract anchor(): { x: number; y: number };
  abstract refreshStack(): void;
  abstract destroy(): void;

  protected makeMultBadge(x: number, y: number): void {
    const m = this.state.multiplier;
    if (m <= 1) return;
    const g = this.scene.add.graphics();
    g.fillStyle(0xffd23d, 0.25).fillCircle(0, 0, 30);
    g.fillStyle(0xffb300, 1).fillCircle(0, 0, 20);
    g.lineStyle(3, 0xffffff, 1).strokeCircle(0, 0, 20);
    const t = this.scene.add
      .text(0, 0, `x${m}`, {
        fontFamily: this.theme.ui.font,
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#4a2a00',
      })
      .setOrigin(0.5);
    this.multBadge = this.scene.add.container(x, y, [g, t]).setDepth(DEPTH.badge);
    this.scene.tweens.add({ targets: g, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
  }

  /** Updates the "x3" streak badge. */
  updateBadge(colors: string[]): void {
    const s = this.state.streak;
    const a = this.anchor();
    this.badge.setPosition(a.x, a.y - 28);
    if (s >= 2) {
      const c = this.state.streakColor;
      this.badge.setText(`x${s}`);
      this.badge.setColor(c === null ? '#ffffff' : colors[c]);
      this.badge.setVisible(true);
    } else this.badge.setVisible(false);
  }

  /** Called every frame (moving targets). */
  update(_now: number, _dtMs: number): void {}
}
