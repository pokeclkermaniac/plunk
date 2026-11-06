import { TUNING } from '../config/tuning';
import type { ScoringRules } from '../game/Scoring';
import type { TargetDef } from '../modes/RoundConfig';

/** Ring Toss rules config: pegs + rings. Full pegs stay full. */
export function ringTossRules(overrides: Partial<ScoringRules> = {}): ScoringRules {
  return {
    basePoints: TUNING.BASE_POINTS,
    wrongColorPenalty: TUNING.WRONG_COLOR_PENALTY,
    fullBonus: TUNING.FULL_PEG_BONUS,
    goldenBonus: TUNING.GOLDEN_BONUS,
    heavyMult: TUNING.HEAVY_MULT,
    swishBonus: 0,
    bankBonus: 0,
    wrongColorScoresBase: false,
    ...overrides,
  };
}

export const RING_TOSS = {
  id: 'ringToss' as const,
  name: 'Ring Toss',
  jetTiltDeg: TUNING.JET_TILT_DEG_RINGS,
  emptyWhenFull: false,
};

const FLOOR = TUNING.TANK_H;

/** The default 3-peg layout used by Timed mode. */
export function defaultPegs(): TargetDef[] {
  return [
    { kind: 'peg', x: 92, y: FLOOR, height: 150 },
    { kind: 'peg', x: 300, y: FLOOR, height: 220 },
    { kind: 'peg', x: 508, y: FLOOR, height: 150 },
  ];
}
