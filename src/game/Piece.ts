import type Phaser from 'phaser';
import type { Piece } from './types';
import type { Body } from './Matter';

/** A loose ring or ball floating in the tank. */
export interface FreePiece {
  id: number;
  type: 'ring' | 'ball';
  piece: Piece;
  body: Body;
  /** Effective "radius" for jet hit tests. */
  radius: number;
  alive: boolean;
  /** Last time (scene ms) a jet pushed this piece. */
  lastJetHit: number;
  sync(): void;
  setPiece(p: Piece): void;
  /** Removes the physics body but keeps the sprites (for capture tweens). */
  detach(): void;
  destroy(): void;
  sprites(): Phaser.GameObjects.Image[];
}

let nextId = 1;
export function newPieceId(): number {
  return nextId++;
}
