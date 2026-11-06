import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { DEPTH, M, type Body } from './Matter';
import { newPieceId, type FreePiece } from './Piece';
import { pieceKey, texScale } from './Textures';
import type { Piece } from './types';

/**
 * A ring is a compound body: two small rim circles joined rigidly with an open gap a peg
 * can pass through. Drawn as two half-ellipse sprites (back/front) so it can wrap a peg.
 */
export class Ring implements FreePiece {
  id = newPieceId();
  type = 'ring' as const;
  piece: Piece;
  body: Body;
  radius = TUNING.RING_WIDTH / 2;
  alive = true;
  lastJetHit = -1e9;
  back: Phaser.GameObjects.Image;
  front: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number, piece: Piece, angle = 0) {
    this.scene = scene;
    this.piece = piece;
    const half = TUNING.RING_WIDTH / 2 - TUNING.RING_RIM_RADIUS;
    const heavy = piece.kind === 'heavy';
    const opts = {
      density: TUNING.RING_DENSITY * (heavy ? 1.6 : 1),
      friction: TUNING.RING_FRICTION,
      restitution: TUNING.RING_RESTITUTION,
      label: 'ringRim',
    };
    const l = M.Bodies.circle(x - half, y, TUNING.RING_RIM_RADIUS, opts);
    const r = M.Bodies.circle(x + half, y, TUNING.RING_RIM_RADIUS, opts);
    this.body = M.Body.create({
      parts: [l, r],
      label: 'ring',
      frictionAir: TUNING.WATER_FRICTION_AIR,
    }) as Body;
    (this.body as any).plunk = this;
    l.friction = r.friction = TUNING.RING_FRICTION;
    if (angle) M.Body.setAngle(this.body, angle);
    (scene as any).matter.world.add(this.body);
    const k = pieceKey(piece);
    const s = texScale();
    this.back = scene.add.image(x, y, `ring_back_${k}`).setScale(s).setDepth(DEPTH.free);
    this.front = scene.add.image(x, y, `ring_front_${k}`).setScale(s).setDepth(DEPTH.freeFront);
    this.sync();
  }

  sync(): void {
    if (!this.alive) return;
    const { x, y } = this.body.position;
    this.back.setPosition(x, y).setRotation(this.body.angle);
    this.front.setPosition(x, y).setRotation(this.body.angle);
  }

  setPiece(p: Piece): void {
    this.piece = p;
    const k = pieceKey(p);
    this.back.setTexture(`ring_back_${k}`);
    this.front.setTexture(`ring_front_${k}`);
  }

  get heavy(): boolean {
    return this.piece.kind === 'heavy';
  }

  detach(): void {
    if (!this.alive) return;
    this.alive = false;
    (this.scene as any).matter.world.remove(this.body);
  }

  destroy(): void {
    this.detach();
    this.back.destroy();
    this.front.destroy();
  }

  sprites() {
    return [this.back, this.front];
  }
}
