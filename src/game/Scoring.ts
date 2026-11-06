/**
 * PURE scoring logic shared by Ring Toss (pegs) and Basketball (hoop tubes).
 * No Phaser imports. Fully unit-tested in tests/*.test.ts.
 *
 * Both pegs and hoop tubes are "stack targets": a list of landed pieces,
 * a capacity, a multiplier and an emptyWhenFull flag.
 */
import type { Piece } from './types';

export interface TargetState {
  stack: Piece[];
  capacity: number;
  multiplier: number;
  /** false for pegs (full pegs stay full), true for hoop tubes (full tubes drain). */
  emptyWhenFull: boolean;
  /** Colour of the current streak, or null when the next coloured piece starts a new one. */
  streakColor: number | null;
  /** Number of consecutive matching pieces (rainbows count). */
  streak: number;
}

export interface ScoringRules {
  basePoints: number;
  wrongColorPenalty: number;
  fullBonus: number;
  goldenBonus: number;
  heavyMult: number;
  swishBonus: number;
  bankBonus: number;
  /** Versus 1-on-1: wrong colours score base points (x1) instead of a penalty. */
  wrongColorScoresBase: boolean;
}

export interface LandContext {
  swish?: boolean;
  bank?: boolean;
  /** Global multiplier applied to positive points only (e.g. Hot Hands x2). Penalties are never doubled. */
  globalMult?: number;
}

export type ScoreEventType =
  | 'land'
  | 'streak'
  | 'wrongColor'
  | 'golden'
  | 'heavy'
  | 'swish'
  | 'bank'
  | 'fullBonus'
  | 'targetDead'
  | 'targetEmptied'
  | 'bombClear';

export interface ScoreEvent {
  type: ScoreEventType;
  points?: number;
}

export interface LandResult {
  /** Points delta to add to the running score (may be negative). */
  points: number;
  events: ScoreEvent[];
  /** New target state (the input is never mutated). */
  target: TargetState;
  /** Streak count after this landing (0 after golden/bomb). */
  streak: number;
  /** True if the target is now full and won't accept more (pegs only). */
  full: boolean;
  /** Pieces removed from the target by this landing (bomb clear or tube drain). */
  removed: Piece[];
}

export function createTarget(capacity: number, multiplier = 1, emptyWhenFull = false): TargetState {
  return { stack: [], capacity, multiplier, emptyWhenFull, streakColor: null, streak: 0 };
}

export function isFull(t: TargetState): boolean {
  return t.stack.length >= t.capacity;
}

export function canAccept(t: TargetState): boolean {
  return !isFull(t);
}

/** True when the stack is entirely one colour (rainbows count as wild; goldens break it). */
export function isSingleColor(stack: Piece[]): boolean {
  let color: number | null = null;
  for (const p of stack) {
    if (p.kind === 'golden' || p.kind === 'bomb') return false;
    if (p.kind === 'rainbow') continue;
    if (color === null) color = p.color;
    else if (p.color !== color) return false;
  }
  return true;
}

/** True when the target is full with mixed colours — a "dead" peg. */
export function isDead(t: TargetState): boolean {
  return isFull(t) && !t.emptyWhenFull && !isSingleColor(t.stack);
}

function emptied(t: TargetState): TargetState {
  return { ...t, stack: [], streakColor: null, streak: 0 };
}

/**
 * A piece lands on a target (ring on peg, or ball through hoop into its tube).
 * Implements GDD §2.5–2.7 and §2.10 exactly.
 */
export function onPieceLanded(
  target: TargetState,
  piece: Piece,
  rules: ScoringRules,
  ctx: LandContext = {},
): LandResult {
  const mult = target.multiplier;
  const globalMult = ctx.globalMult ?? 1;
  const events: ScoreEvent[] = [];
  let positive = 0; // points that can be boosted by globalMult
  let negative = 0;

  // Bomb: pops the whole stack including itself. No points at all.
  if (piece.kind === 'bomb') {
    const removed = [...target.stack, piece];
    events.push({ type: 'bombClear' });
    return { points: 0, events, target: emptied(target), streak: 0, full: false, removed };
  }

  let next: TargetState = { ...target, stack: [...target.stack, piece] };

  // Shot bonuses (basketball). They are paid even on wrong colours.
  let bonus = 0;
  if (ctx.swish) {
    bonus += rules.swishBonus;
    events.push({ type: 'swish', points: rules.swishBonus * mult });
  }
  if (ctx.bank) {
    bonus += rules.bankBonus;
    events.push({ type: 'bank', points: rules.bankBonus * mult });
  }
  positive += bonus * mult;

  if (piece.kind === 'golden') {
    positive += rules.goldenBonus * mult;
    events.push({ type: 'golden', points: rules.goldenBonus * mult });
    next = { ...next, streakColor: null, streak: 0 };
  } else if (piece.kind === 'rainbow') {
    // Wild: always extends the current streak (or starts one if there is none).
    const streak = target.streak + 1;
    const pts = rules.basePoints * streak * mult;
    positive += pts;
    next = { ...next, streak };
    events.push({ type: streak > 1 ? 'streak' : 'land', points: pts });
  } else {
    // normal or heavy
    const heavy = piece.kind === 'heavy' ? rules.heavyMult : 1;
    if (target.streakColor === null || target.streakColor === piece.color) {
      const streak = target.streak + 1;
      const pts = rules.basePoints * streak * mult * heavy;
      positive += pts;
      next = { ...next, streakColor: piece.color, streak };
      events.push({ type: streak > 1 ? 'streak' : 'land', points: pts });
    } else if (rules.wrongColorScoresBase) {
      const pts = rules.basePoints * mult * heavy;
      positive += pts;
      next = { ...next, streakColor: piece.color, streak: 1 };
      events.push({ type: 'land', points: pts });
    } else {
      negative -= rules.wrongColorPenalty * mult;
      next = { ...next, streakColor: piece.color, streak: 1 };
      events.push({ type: 'wrongColor', points: -rules.wrongColorPenalty * mult });
    }
    if (heavy > 1) events.push({ type: 'heavy' });
  }

  let removed: Piece[] = [];
  let full = false;
  if (isFull(next)) {
    if (isSingleColor(next.stack)) {
      positive += rules.fullBonus * mult;
      events.push({ type: 'fullBonus', points: rules.fullBonus * mult });
    } else if (!next.emptyWhenFull) {
      events.push({ type: 'targetDead' });
    }
    if (next.emptyWhenFull) {
      removed = next.stack;
      next = emptied(next);
      events.push({ type: 'targetEmptied' });
    } else {
      full = true;
    }
  }

  const points = Math.round(positive * globalMult) + negative;
  return { points, events, target: next, streak: next.streak, full, removed };
}

/** Clears a target (tank clear). */
export function clearTarget(t: TargetState): TargetState {
  return emptied(t);
}

/** The running score is never shown negative: clamp at 0 (see DECISIONS.md). */
export function applyDelta(total: number, delta: number): number {
  return Math.max(0, total + delta);
}
