import type { ScoringRules } from '../game/Scoring';
import type { GameType, PieceKind } from '../game/types';

export type SpecialKind = Exclude<PieceKind, 'normal'>;

export interface TargetDef {
  kind: 'peg' | 'hoop';
  /** Peg: x of the peg. Hoop: x of the backboard (0 / TANK_W for wall hoops). */
  x: number;
  /** Peg: y of the peg's base. Hoop: y of the rim. */
  y: number;
  /** Peg height above its base. */
  height?: number;
  capacity?: number;
  multiplier?: number;
  /** Hoop: which way the rim sticks out from the backboard. */
  facing?: 'left' | 'right';
  /** Moving target: slides ±dx around its x, one full cycle per periodSec. */
  move?: { dx: number; periodSec: number };
  /** Versus: which player scores on this target (0 = P1/left, 1 = P2/right). */
  owner?: 0 | 1;
}

export interface ObstacleDef {
  type: 'ledge' | 'wall' | 'guard' | 'paddle';
  /** Centre of the obstacle. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees. */
  angle?: number;
  /** Paddles: rotation speed in degrees per second. */
  speed?: number;
}

export type GoalType =
  'score' | 'fullPegs' | 'fullPegColor' | 'noWrong' | 'baskets' | 'swishes' | 'fullTube' | 'everyHoop';

export interface GoalDef {
  type: GoalType;
  /** Target count / score. */
  value: number;
  /** For colour-specific goals. */
  color?: number;
}

export type ModeId = 'timed' | 'levels' | 'endless' | 'versus';

export interface RoundConfig {
  gameType: GameType;
  mode: ModeId;
  title: string;
  /** null = no timer. */
  timeSeconds: number | null;
  /** Colours in play (indices 0..colors-1). */
  colors: number;
  startPieces: number;
  /** Pieces left to drop in after the start pieces. null = unlimited. */
  supply: number | null;
  /** Drop a new piece in after each landing (while supply lasts). */
  replaceOnLand: boolean;
  specialChance: number;
  specialWeights: Partial<Record<SpecialKind, number>>;
  /** Pieces placed in the tank at the start in addition to random ones (levels). */
  startSpecials?: SpecialKind[];
  targets: TargetDef[];
  obstacles: ObstacleDef[];
  rules: ScoringRules;
  goal?: GoalDef;
  /** Score needed for 1, 2, 3 stars (1 star also requires the goal). */
  stars?: [number, number, number];
  levelId?: string;
  levelIndex?: number;
  hotHands: boolean;
  versus: boolean;
  /** Ring Toss: clear all pegs when every peg is full. */
  tankClear: boolean;
  endless: boolean;
  boostersAllowed: boolean;
  /** x positions of the left and right jet nozzles (defaults per game type). */
  jets?: [number, number];
  /** Tank-local sudden death round (versus). */
  suddenDeath?: boolean;
}
