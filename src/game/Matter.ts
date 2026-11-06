import Phaser from 'phaser';

/** The Matter.js library bundled inside Phaser. */
export const M = (Phaser.Physics.Matter as any).Matter as typeof MatterJS;
export type Body = MatterJS.BodyType;

export const DEPTH = {
  bg: 0,
  water: 1,
  obstacle: 2,
  tube: 3,
  tubePiece: 3.5,
  ringBack: 4,
  peg: 5,
  ringFront: 6,
  hoopBack: 6.5,
  free: 7,
  freeFront: 7.5,
  hoopFront: 8,
  bubbles: 9,
  waterFront: 10,
  frame: 11,
  buttons: 12,
  badge: 13,
  popup: 14,
};
