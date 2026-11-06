import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { DEPTH, M, type Body } from './Matter';
import { Target } from './Target';
import type { Ball } from './Ball';
import type { TargetDef } from '../modes/RoundConfig';
import type { Theme } from '../systems/ThemeManager';
import { hex } from '../systems/ThemeManager';
import { pieceKey, texScale } from './Textures';

/**
 * A hoop: backboard + two rim points (back and front) with an open gap for the ball,
 * a visual net, and a clear ball tube under it that shows made baskets.
 */
export class Hoop extends Target {
  /** Backboard x (moves for moving hoops). */
  bx: number;
  homeX: number;
  rimY: number;
  dir: 1 | -1;
  rimBack: Body;
  rimFront: Body;
  board: Body;
  backG: Phaser.GameObjects.Graphics;
  frontG: Phaser.GameObjects.Graphics;
  netG: Phaser.GameObjects.Graphics;
  tubeG: Phaser.GameObjects.Graphics;
  tubeBalls: Phaser.GameObjects.Image[] = [];
  netSway = 0;
  private t0 = 0;
  glowLevel = 0;

  constructor(scene: Phaser.Scene, def: TargetDef, index: number, theme: Theme) {
    super(scene, def, index, def.capacity ?? TUNING.TUBE_CAPACITY, true, theme);
    this.dir = def.facing === 'left' ? -1 : 1;
    this.bx = def.x;
    this.homeX = def.x;
    this.rimY = def.y;
    const R = TUNING.RIM_POINT_RADIUS;
    const add = (scene as any).matter.add;
    this.board = add.rectangle(0, 0, 12, TUNING.BACKBOARD_HEIGHT, {
      isStatic: true,
      label: 'board',
      restitution: TUNING.BACKBOARD_RESTITUTION,
      chamfer: { radius: 4 },
    });
    this.rimBack = add.circle(0, 0, R, { isStatic: true, label: 'rim', restitution: 0.5 });
    this.rimFront = add.circle(0, 0, R, { isStatic: true, label: 'rim', restitution: 0.5 });
    this.tubeG = scene.add.graphics().setDepth(DEPTH.tube);
    this.backG = scene.add.graphics().setDepth(DEPTH.hoopBack);
    this.netG = scene.add.graphics().setDepth(DEPTH.hoopFront);
    this.frontG = scene.add.graphics().setDepth(DEPTH.hoopFront);
    this.placeBodies(0);
    this.draw();
    this.makeMultBadge(this.rimCenterX, this.rimY - TUNING.BACKBOARD_HEIGHT + 40);
  }

  get backX(): number {
    return this.bx + this.dir * (6 + 6 + TUNING.RIM_POINT_RADIUS);
  }
  get frontX(): number {
    return this.backX + this.dir * TUNING.RIM_WIDTH;
  }
  get rimCenterX(): number {
    return (this.backX + this.frontX) / 2;
  }
  get colMin(): number {
    return Math.min(this.backX, this.frontX);
  }
  get colMax(): number {
    return Math.max(this.backX, this.frontX);
  }
  get tubeTop(): number {
    return this.rimY + 70;
  }
  tubeSlotY(i: number): number {
    return (
      this.tubeTop +
      8 +
      (this.state.capacity - 1 - i) * (TUNING.BALL_RADIUS * 2 * 0.62) +
      TUNING.BALL_RADIUS * 0.62
    );
  }

  anchor() {
    return { x: this.rimCenterX, y: this.rimY - 30 };
  }

  private placeBodies(vx: number): void {
    const bodies: [Body, number, number][] = [
      [this.board, this.bx + this.dir * 6, this.rimY - TUNING.BACKBOARD_HEIGHT / 2 + 26],
      [this.rimBack, this.backX, this.rimY],
      [this.rimFront, this.frontX, this.rimY],
    ];
    for (const [b, x, y] of bodies) {
      M.Body.setPosition(b, { x, y });
      M.Body.setVelocity(b, { x: vx, y: 0 });
    }
  }

  update(now: number, dtMs: number): void {
    if (this.def.move) {
      this.t0 += dtMs / 1000;
      const { dx, periodSec } = this.def.move;
      const nx = this.homeX + Math.sin((this.t0 / periodSec) * Math.PI * 2) * dx;
      const vx = nx - this.bx;
      this.bx = nx;
      this.placeBodies(vx);
      this.draw();
      this.multBadge?.setPosition(this.rimCenterX, this.rimY - TUNING.BACKBOARD_HEIGHT + 40);
      this.tubeBalls.forEach((im, i) => im.setPosition(this.rimCenterX, this.tubeSlotY(i)));
    }
    if (this.netSway !== 0) {
      this.netSway *= 0.9;
      if (Math.abs(this.netSway) < 0.05) this.netSway = 0;
      this.drawNet(now);
    }
  }

  private draw(): void {
    const t = this.theme.hoop;
    const R = TUNING.RIM_POINT_RADIUS;
    // tube
    const tg = this.tubeG;
    tg.clear();
    const tw = TUNING.BALL_RADIUS * 2 + 10;
    const th = this.state.capacity * TUNING.BALL_RADIUS * 2 * 0.62 + 20;
    tg.fillStyle(hex(t.tube), 0.16).fillRoundedRect(this.rimCenterX - tw / 2, this.tubeTop, tw, th, 10);
    tg.lineStyle(3, hex(t.tube), 0.55).strokeRoundedRect(this.rimCenterX - tw / 2, this.tubeTop, tw, th, 10);
    tg.fillStyle(0xffffff, 0.25).fillRect(this.rimCenterX - tw / 2 + 5, this.tubeTop + 6, 4, th - 12);
    // backboard + back half of rim
    const g = this.backG;
    g.clear();
    const bh = TUNING.BACKBOARD_HEIGHT;
    const bTop = this.rimY - bh + 26;
    const bxL = this.dir === 1 ? this.bx : this.bx - 12;
    g.fillStyle(hex(t.boardEdge), 1).fillRoundedRect(bxL, bTop, 12, bh, 4);
    g.fillStyle(hex(t.board), 1).fillRoundedRect(bxL + 2, bTop + 2, 8, bh - 4, 3);
    g.lineStyle(2, hex(t.rim), 1).strokeRect(bxL + 3, this.rimY - 46, 6, 34);
    // bracket
    g.fillStyle(hex(t.boardEdge), 1).fillRect(
      Math.min(this.bx, this.backX),
      this.rimY + 2,
      Math.abs(this.backX - this.bx),
      5,
    );
    g.lineStyle(5, hex(t.rim), 1);
    this.ellipseArc(g, Math.PI, Math.PI * 2);
    // front lip (drawn over balls passing through)
    const f = this.frontG;
    f.clear();
    f.lineStyle(6, hex(t.rim), 1);
    this.ellipseArc(f, 0, Math.PI);
    f.fillStyle(hex(t.rim), 1)
      .fillCircle(this.frontX, this.rimY, R + 1)
      .fillCircle(this.backX, this.rimY, R);
    f.lineStyle(1.5, 0xffffff, 0.45);
    this.ellipseArc(f, 0.4, Math.PI - 0.4, 6);
    this.drawNet(0);
  }

  /** Strokes part of the rim's flattened ellipse (angles in radians, 0 = right, PI/2 = front/bottom). */
  private ellipseArc(g: Phaser.GameObjects.Graphics, a0: number, a1: number, ry = 9): void {
    const rx = TUNING.RIM_WIDTH / 2;
    g.beginPath();
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const x = this.rimCenterX + Math.cos(a) * rx;
      const y = this.rimY + Math.sin(a) * ry;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
  }

  private drawNet(now: number): void {
    const n = this.netG;
    n.clear();
    const sway = this.netSway;
    const top = this.rimY + 3;
    const depth = 48;
    const w0 = TUNING.RIM_WIDTH;
    const w1 = TUNING.RIM_WIDTH * 0.6;
    const cx = this.rimCenterX;
    const cols = 6;
    n.lineStyle(2, hex(this.theme.hoop.net), 0.85);
    for (let i = 0; i <= cols; i++) {
      const fx = i / cols - 0.5;
      const xTop = cx + fx * w0;
      const xBot = cx + fx * w1 + Math.sin(now / 60 + i) * sway * 3 + sway * 4;
      n.beginPath();
      n.moveTo(xTop, top);
      n.lineTo(xBot, top + depth);
      n.strokePath();
    }
    for (let j = 1; j <= 3; j++) {
      const k = j / 3;
      const y = top + depth * k;
      const w = w0 + (w1 - w0) * k;
      n.beginPath();
      n.moveTo(cx - w / 2 + sway * 4 * k, y);
      n.lineTo(cx + w / 2 + sway * 4 * k, y);
      n.strokePath();
    }
  }

  /** Is x inside the rim opening? margin < 0 makes it stricter. */
  inColumn(x: number, margin = 0): boolean {
    return (
      x > this.colMin + TUNING.RIM_POINT_RADIUS - margin && x < this.colMax - TUNING.RIM_POINT_RADIUS + margin
    );
  }

  /**
   * Basket detection: the ball must cross the rim line going down inside the opening, then
   * cross the "bottom sensor" line within BASKET_WINDOW_MS. Balls pushed up through from
   * below are disqualified until they leave the hoop's column.
   */
  checkBasket(ball: Ball, now: number): boolean {
    const y = ball.body.position.y;
    const x = ball.body.position.x;
    const py = ball.prevY;
    const inCol = this.inColumn(x);
    const i = this.index;
    if (!this.inColumn(x, TUNING.BALL_RADIUS)) {
      ball.invalid.delete(i);
      ball.enteredTop.delete(i);
    }
    if (py >= this.rimY && y < this.rimY && inCol) {
      ball.invalid.add(i);
      ball.enteredTop.delete(i);
    }
    if (py < this.rimY && y >= this.rimY && ball.body.velocity.y > 0 && inCol && !ball.invalid.has(i)) {
      ball.enteredTop.set(i, now);
    }
    const t = ball.enteredTop.get(i);
    if (t !== undefined) {
      if (now - t > TUNING.BASKET_WINDOW_MS) ball.enteredTop.delete(i);
      else if (y >= this.rimY + TUNING.BASKET_DEPTH && this.inColumn(x, 6)) {
        ball.enteredTop.delete(i);
        return true;
      }
    }
    return false;
  }

  swish(): void {
    this.netSway = 3;
  }

  addTubeBall(i: number, ball: Ball): void {
    ball.image
      .setDepth(DEPTH.tubePiece)
      .setPosition(this.rimCenterX, this.tubeSlotY(i))
      .setScale(texScale() * 0.62);
    this.tubeBalls[i] = ball.image;
  }

  refreshStack(): void {
    for (const im of this.tubeBalls) im?.destroy();
    this.tubeBalls = [];
    this.state.stack.forEach((p, i) => {
      this.tubeBalls[i] = this.scene.add
        .image(this.rimCenterX, this.tubeSlotY(i), `ball_${pieceKey(p)}`)
        .setScale(texScale() * 0.62)
        .setDepth(DEPTH.tubePiece);
    });
  }

  /** Drain animation: balls whoosh down the tube. Returns their last positions. */
  drainTube(): { x: number; y: number }[] {
    const pts = this.tubeBalls.filter(Boolean).map((im) => ({ x: im.x, y: im.y }));
    for (const im of this.tubeBalls) {
      if (!im) continue;
      this.scene.tweens.add({
        targets: im,
        y: im.y + 120,
        alpha: 0,
        duration: 380,
        ease: 'Quad.easeIn',
        onComplete: () => im.destroy(),
      });
    }
    this.tubeBalls = [];
    return pts;
  }

  setGlow(level: number): void {
    if (level === this.glowLevel) return;
    this.glowLevel = level;
  }

  destroy(): void {
    const world = (this.scene as any).matter.world;
    world.remove(this.board);
    world.remove(this.rimBack);
    world.remove(this.rimFront);
    [this.backG, this.frontG, this.netG, this.tubeG, this.badge].forEach((o) => o.destroy());
    this.multBadge?.destroy();
    for (const im of this.tubeBalls) im?.destroy();
  }
}
