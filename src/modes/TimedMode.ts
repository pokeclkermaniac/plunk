import { TUNING } from '../config/tuning';
import { basketballRules, defaultHoops } from '../gametypes/Basketball';
import { defaultPegs, ringTossRules } from '../gametypes/RingToss';
import type { GameType } from '../game/types';
import type { RoundConfig } from './RoundConfig';

/** Timed mode for both game types (Basketball's is "Shootout"). */
export function timedConfig(gameType: GameType, seconds: number = TUNING.TIMED_ROUND_SECONDS): RoundConfig {
  const ring = gameType === 'ringToss';
  return {
    gameType,
    mode: 'timed',
    title: ring ? 'Ring Toss · Timed' : 'Basketball · Shootout',
    timeSeconds: seconds,
    colors: TUNING.TIMED_COLORS,
    startPieces: ring ? TUNING.TIMED_START_RINGS : TUNING.SHOOTOUT_START_BALLS,
    supply: null,
    replaceOnLand: ring,
    specialChance: TUNING.SPECIAL_RING_CHANCE,
    specialWeights: { ...TUNING.SPECIAL_WEIGHTS },
    targets: ring ? defaultPegs() : defaultHoops(),
    obstacles: [],
    rules: ring ? ringTossRules() : basketballRules(),
    hotHands: !ring,
    versus: false,
    tankClear: ring,
    endless: false,
    boostersAllowed: true,
  };
}
