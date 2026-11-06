import { TUNING } from '../config/tuning';
import type { ScoringRules } from '../game/Scoring';
import type { TargetDef } from '../modes/RoundConfig';

/** Basketball rules config: hoops + balls. Full tubes empty after scoring. */
export function basketballRules(overrides: Partial<ScoringRules> = {}): ScoringRules {
  return {
    basePoints: TUNING.BASKET_POINTS,
    wrongColorPenalty: TUNING.WRONG_COLOR_PENALTY,
    fullBonus: TUNING.FULL_TUBE_BONUS,
    goldenBonus: TUNING.GOLDEN_BONUS,
    heavyMult: TUNING.HEAVY_MULT,
    swishBonus: TUNING.SWISH_BONUS,
    bankBonus: TUNING.BANK_BONUS,
    wrongColorScoresBase: false,
    ...overrides,
  };
}

export const BASKETBALL = {
  id: 'basketball' as const,
  name: 'Basketball',
  jetTiltDeg: TUNING.JET_TILT_DEG_BASKETBALL,
  emptyWhenFull: true,
};

/** Two wall-mounted hoops, left and right, used by Shootout. */
export function defaultHoops(): TargetDef[] {
  return [
    { kind: 'hoop', x: 0, y: 300, facing: 'right' },
    { kind: 'hoop', x: TUNING.TANK_W, y: 300, facing: 'left' },
  ];
}
