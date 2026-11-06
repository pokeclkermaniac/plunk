import Phaser from 'phaser';
import { DEPTH, M, type Body } from './Matter';
import type { ObstacleDef } from '../modes/RoundConfig';
import type { Theme } from '../systems/ThemeManager';
import { hex } from '../systems/ThemeManager';

/** Static ledges / walls / peg guards and slowly rotating paddles. */
export class Obstacle {
  body: Body;
  gfx: Phaser.GameObjects.Graphics;
  angle: number;
  private speed: number;

  constructor(
    private scene: Phaser.Scene,
    public def: ObstacleDef,
    theme: Theme,
  ) {
    this.angle = ((def.angle ?? 0) * Math.PI) / 180;
    this.speed = ((def.speed ?? (def.type === 'paddle' ? 30 : 0)) * Math.PI) / 180;
    this.body = (scene as any).matter.add.rectangle(def.x, def.y, def.w, def.h, {
      isStatic: true,
      label: def.type,
      chamfer: { radius: Math.min(def.h, def.w) / 2 - 0.5 },
      friction: 0.05,
      restitution: 0.3,
    });
    M.Body.setAngle(this.body, this.angle);
    this.gfx = scene.add.graphics().setDepth(DEPTH.obstacle);
    const col = hex(theme.obstacle.color);
    const sh = hex(theme.obstacle.shade);
    const { w, h } = def;
    const r = Math.min(h, w) / 2 - 0.5;
    this.gfx.fillStyle(sh, 1).fillRoundedRect(-w / 2, -h / 2 + 2, w, h, r);
    this.gfx.fillStyle(col, 1).fillRoundedRect(-w / 2, -h / 2, w, h - 3, r);
    this.gfx.fillStyle(0xffffff, 0.35).fillRect(-w / 2 + r, -h / 2 + 2, Math.max(0, w - 2 * r), 2);
    if (def.type === 'paddle') {
      this.gfx.fillStyle(sh, 1).fillCircle(0, 0, Math.min(10, h));
      this.gfx.fillStyle(0xffffff, 0.6).fillCircle(0, 0, 4);
    }
    if (def.type === 'guard') {
      this.gfx.lineStyle(2, sh, 1);
      for (let x = -w / 2 + 10; x < w / 2 - 6; x += 12) this.gfx.lineBetween(x, -h / 2 + 3, x + 6, h / 2 - 3);
    }
    this.gfx.setPosition(def.x, def.y).setRotation(this.angle);
  }

  update(dtMs: number): void {
    if (this.def.type !== 'paddle' || !this.speed) return;
    const da = (this.speed * dtMs) / 1000;
    this.angle += da;
    M.Body.setAngle(this.body, this.angle);
    this.gfx.setRotation(this.angle);
  }

  destroy(): void {
    (this.scene as any).matter.world.remove(this.body);
    this.gfx.destroy();
  }
}
