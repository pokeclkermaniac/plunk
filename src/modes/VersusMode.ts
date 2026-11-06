import { TUNING } from '../config/tuning';
import { basketballRules } from '../gametypes/Basketball';
import { ringTossRules } from '../gametypes/RingToss';
import type { GameType } from '../game/types';
import type { RoundConfig } from './RoundConfig';

/**
 * Local 2-player. P1 = left jet, P2 = right jet.
 * Ring Toss Versus: shared water, two pegs per player on their own side.
 * Basketball 1-on-1: one hoop per player on their side, shared balls, any colour scores.
 */
export function versusConfig(gameType: GameType): RoundConfig {
  const ring = gameType === 'ringToss';
  const F = TUNING.TANK_H;
  return {
    gameType,
    mode: 'versus',
    title: ring ? 'Ring Toss · Versus' : 'Basketball · 1-on-1',
    timeSeconds: TUNING.VERSUS_ROUND_SECONDS,
    colors: 3,
    startPieces: ring ? 10 : 6,
    supply: null,
    replaceOnLand: ring,
    specialChance: TUNING.SPECIAL_RING_CHANCE,
    specialWeights: { ...TUNING.SPECIAL_WEIGHTS },
    targets: ring
      ? [
          { kind: 'peg', x: 62, y: F, height: 150, owner: 0 },
          { kind: 'peg', x: 250, y: F, height: 230, owner: 0 },
          { kind: 'peg', x: 350, y: F, height: 230, owner: 1 },
          { kind: 'peg', x: 538, y: F, height: 150, owner: 1 },
        ]
      : [
          { kind: 'hoop', x: 0, y: 300, facing: 'right', owner: 0 },
          { kind: 'hoop', x: TUNING.TANK_W, y: 300, facing: 'left', owner: 1 },
        ],
    jets: ring ? [156, 444] : undefined,
    obstacles: [],
    rules: ring ? ringTossRules() : basketballRules({ wrongColorScoresBase: true }),
    hotHands: false,
    versus: true,
    tankClear: ring,
    endless: false,
    boostersAllowed: false,
  };
}
