/** Shared, Phaser-free types used by game logic and tests. */

export type PieceKind = 'normal' | 'rainbow' | 'golden' | 'heavy' | 'bomb';

/** A ring or a ball, as far as scoring is concerned. `color` is an index 0..5. */
export interface Piece {
  color: number;
  kind: PieceKind;
}

export type GameType = 'ringToss' | 'basketball';

export const COLOR_NAMES = ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'] as const;
/** Symbols reserved per colour for a future colourblind mode (● ▲ ■ ◆ ★ ♥). */
export const COLOR_SYMBOLS = ['circle', 'triangle', 'square', 'diamond', 'star', 'heart'] as const;
export const MAX_COLORS = 6;
