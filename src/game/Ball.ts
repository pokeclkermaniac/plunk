import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { DEPTH, M, type Body } from './Matter';
import { newPieceId, type FreePiece } from './Piece';
import { pieceKey, texScale } from './Textures';
import type { Piece } from './types';

/** Round, bouncy ball for Basketball. Tracks rim/backboard contact for swish & bank detection. */
export class Ball implements FreePiece {
  id = newPieceId();
  type = 'ball' as const;
  piece: Piece;
  body: Body;
  radius = TUNING.BALL_RADIUS;
  alive = true;
  lastJetHit = -1e9;
  image: Phaser.GameObjects.Image;
  /** Contact since the last jet impulse. */
  touchedRim = false;
  touchedBoard = false;
  rimHits: number[] = [];
  /** hoop index → time the ball crossed the rim line going down. */
  enteredTop = new Map<number, number>();
  /** hoops this ball came up through from below (can't score until it leaves the column). */
  invalid = new Set<number>();
  prevY: number;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number, piece: Piece) {
    this.scene = scene;
    this.piece = piece;
    const heavy = piece.kind === 'heavy';
    this.body = M.Bodies.circle(x, y, TUNING.BALL_RADIUS, {
      density: TUNING.BALL_DENSITY * (heavy ? 1.6 : 1),
      restitution: TUNING.BALL_RESTITUTION * (heavy ? 0.6 : 1),
      friction: TUNING.BALL_FRICTION,
      frictionAir: TUNING.BALL_FRICTION_AIR,
      label: 'ball',
    });
    (this.body as any).plunk = this;
    (scene as any).matter.world.add(this.body);
    this.prevY = y;
    this.image = scene.add.image(x, y, `ball_${pieceKey(piece)}`).setScale(texScale()).setDepth(DEPTH.free);
  }

  get heavy(): boolean {
    return this.piece.kind === 'heavy';
  }

  sync(): void {
    if (!this.alive) return;
    this.image.setPosition(this.body.position.x, this.body.position.y).setRotation(this.body.angle);
  }

  setPiece(p: Piece): void {
    this.piece = p;
    this.image.setTexture(`ball_${pieceKey(p)}`);
  }

  detach(): void {
    if (!this.alive) return;
    this.alive = false;
    (this.scene as any).matter.world.remove(this.body);
  }

  destroy(): void {
    this.detach();
    this.image.destroy();
  }

  sprites() {
    return [this.image];
  }
}
