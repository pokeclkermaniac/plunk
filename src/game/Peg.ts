import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { DEPTH, M, type Body } from './Matter';
import { Target } from './Target';
import type { Ring } from './Ring';
import type { TargetDef } from '../modes/RoundConfig';
import type { Theme } from '../systems/ThemeManager';
import { hex } from '../systems/ThemeManager';
import { isFull } from './Scoring';
import { pieceKey, texScale } from './Textures';

interface StackVisual {
  back: Phaser.GameObjects.Image;
  front: Phaser.GameObjects.Image;
}

/** A peg: a static post with a capture zone at its tip and a stack of landed rings. */
export class Peg extends Target {
  x: number;
  baseY: number;
  height: number;
  body: Body;
  stackBody: Body | null = null;
  gfx: Phaser.GameObjects.Graphics;
  stackVisuals: StackVisual[] = [];
  glow: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, def: TargetDef, index: number, theme: Theme) {
    const cap = def.capacity ?? TUNING.PEG_CAPACITY;
    super(scene, def, index, cap, false, theme);
    this.x = def.x;
    this.baseY = def.y;
    this.height = Math.max(def.height ?? TUNING.PEG_HEIGHT, cap * TUNING.RING_STACK_SPACING + 46);
    const h = this.height;
    this.body = (scene as any).matter.add.rectangle(this.x, this.baseY - h / 2, TUNING.PEG_WIDTH, h, {
      isStatic: true,
      label: 'peg',
      chamfer: { radius: [6, 6, 0, 0] },
      friction: 0.02,
    });
    this.glow = scene.add.graphics().setDepth(DEPTH.ringBack - 0.5);
    this.gfx = scene.add.graphics().setDepth(DEPTH.peg);
    this.draw();
    this.makeMultBadge(this.x, this.baseY - 14);
  }

  get tipY(): number {
    return this.baseY - this.height;
  }

  get stackTopY(): number {
    return this.baseY - this.state.stack.length * TUNING.RING_STACK_SPACING;
  }

  slotY(i: number): number {
    return this.baseY - TUNING.RING_STACK_SPACING * (i + 0.5) - 3;
  }

  anchor() {
    return { x: this.x, y: this.tipY - 8 };
  }

  private draw(): void {
    const g = this.gfx;
    const w = TUNING.PEG_WIDTH;
    const h = this.height;
    const x = this.x - w / 2;
    const y = this.tipY;
    const col = hex(this.theme.peg.color);
    const sh = hex(this.theme.peg.shade);
    g.clear();
    // base plate
    g.fillStyle(sh, 1).fillRoundedRect(this.x - 26, this.baseY - 8, 52, 10, 4);
    g.fillStyle(col, 1).fillRoundedRect(this.x - 24, this.baseY - 10, 48, 8, 4);
    // post
    g.fillStyle(sh, 1).fillRoundedRect(x, y, w, h, { tl: 7, tr: 7, bl: 0, br: 0 });
    g.fillStyle(col, 1).fillRoundedRect(x, y, w * 0.7, h, { tl: 7, tr: 3, bl: 0, br: 0 });
    g.fillStyle(0xffffff, 0.45).fillRect(x + 2, y + 6, 2.5, h - 10);
  }

  /** Lenient capture test for a falling ring (GDD §2.4 / plan §4.3). */
  canCapture(ring: Ring): boolean {
    if (isFull(this.state) && ring.piece.kind !== 'bomb') return false;
    const b = ring.body;
    const ang = Math.abs(Phaser.Math.Angle.Wrap(b.angle));
    const tilt = Math.min(ang, Math.PI - ang);
    const dx = this.x - b.position.x;
    const dy = this.tipY - b.position.y;
    // tip position in the ring's own frame
    const c = Math.cos(-b.angle);
    const s = Math.sin(-b.angle);
    const lx = dx * c - dy * s;
    const halfGap = TUNING.RING_WIDTH / 2 - TUNING.RING_RIM_RADIUS * 2;
    const inGap = Math.abs(lx) < halfGap + TUNING.CAPTURE_LENIENCY_PX;
    if (!inGap) return false;
    const rel = b.position.y - this.tipY; // + = ring centre below the tip
    const maxTilt = (TUNING.CAPTURE_MAX_ANGLE_DEG * Math.PI) / 180;
    // Normal capture: centre crossing the tip while moving down.
    if (rel > -TUNING.CAPTURE_BAND_ABOVE && rel < TUNING.CAPTURE_BAND_BELOW && b.velocity.y > -0.2 && tilt < maxTilt)
      return true;
    // Fallback: the ring is already threaded on the peg (below the tip, above the stack).
    if (rel >= TUNING.CAPTURE_BAND_BELOW && b.position.y < this.stackTopY - 4 && Math.abs(lx) < halfGap && tilt < 1.4)
      return true;
    return false;
  }

  /** Adds a stacked ring visual at slot i (used after a capture tween). */
  addStackVisual(i: number, ring: Ring): void {
    ring.back.setDepth(DEPTH.ringBack).setPosition(this.x, this.slotY(i)).setRotation(0);
    ring.front.setDepth(DEPTH.ringFront).setPosition(this.x, this.slotY(i)).setRotation(0);
    this.stackVisuals[i] = { back: ring.back, front: ring.front };
  }

  /** Rebuild visuals from state (after bombs, tank clears, theme changes). */
  refreshStack(): void {
    for (const v of this.stackVisuals) {
      v?.back.destroy();
      v?.front.destroy();
    }
    this.stackVisuals = [];
    const s = texScale();
    this.state.stack.forEach((p, i) => {
      const k = pieceKey(p);
      const y = this.slotY(i);
      this.stackVisuals[i] = {
        back: this.scene.add.image(this.x, y, `ring_back_${k}`).setScale(s).setDepth(DEPTH.ringBack),
        front: this.scene.add.image(this.x, y, `ring_front_${k}`).setScale(s).setDepth(DEPTH.ringFront),
      };
    });
    this.rebuildStackBody();
  }

  /** A solid block where the stacked rings are, so loose rings land on top instead of passing through. */
  rebuildStackBody(): void {
    const world = (this.scene as any).matter.world;
    if (this.stackBody) world.remove(this.stackBody);
    this.stackBody = null;
    const n = this.state.stack.length;
    if (n === 0) return;
    const h = n * TUNING.RING_STACK_SPACING;
    this.stackBody = M.Bodies.rectangle(this.x, this.baseY - h / 2, TUNING.RING_WIDTH * 0.86, h, {
      isStatic: true,
      label: 'stack',
      chamfer: { radius: 6 },
    });
    world.add(this.stackBody);
  }

  /** Pop every stacked ring (bomb / tank clear) and return their world positions. */
  popStack(): { x: number; y: number }[] {
    const pts = this.stackVisuals.filter(Boolean).map((v) => ({ x: v.back.x, y: v.back.y }));
    for (const v of this.stackVisuals) {
      if (!v) continue;
      this.scene.tweens.add({
        targets: [v.back, v.front],
        scale: texScale() * 1.4,
        alpha: 0,
        duration: 220,
        onComplete: () => {
          v.back.destroy();
          v.front.destroy();
        },
      });
    }
    this.stackVisuals = [];
    return pts;
  }

  setGlow(level: number, color: number): void {
    this.glow.clear();
    if (level <= 0) return;
    const a = Math.min(0.5, 0.12 + level * 0.08);
    this.glow.fillStyle(color, a).fillEllipse(this.x, this.baseY - this.height / 2, 46 + level * 6, this.height + 30);
  }

  destroy(): void {
    const world = (this.scene as any).matter.world;
    world.remove(this.body);
    if (this.stackBody) world.remove(this.stackBody);
    this.gfx.destroy();
    this.glow.destroy();
    this.badge.destroy();
    this.multBadge?.destroy();
    for (const v of this.stackVisuals) {
      v?.back.destroy();
      v?.front.destroy();
    }
  }
}
