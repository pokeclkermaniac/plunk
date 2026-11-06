import { TUNING } from '../config/tuning';
import { defaultPegs, ringTossRules } from '../gametypes/RingToss';
import type { ObstacleDef, RoundConfig } from './RoundConfig';

/** Endless (Ring Toss): limited supply, full-peg bonuses refill it, slow difficulty ramp. */
export function endlessConfig(): RoundConfig {
  return {
    gameType: 'ringToss',
    mode: 'endless',
    title: 'Ring Toss · Endless',
    timeSeconds: null,
    colors: 3,
    startPieces: TUNING.ENDLESS_TANK_RINGS,
    supply: TUNING.ENDLESS_START_SUPPLY - TUNING.ENDLESS_TANK_RINGS,
    replaceOnLand: true,
    specialChance: TUNING.SPECIAL_RING_CHANCE,
    specialWeights: { ...TUNING.SPECIAL_WEIGHTS },
    targets: defaultPegs(),
    obstacles: [],
    rules: ringTossRules(),
    hotHands: false,
    versus: false,
    tankClear: true,
    endless: true,
    boostersAllowed: true,
  };
}

/** Difficulty steps, unlocked as the score rises. */
export interface EndlessStep {
  score: number;
  colors?: number;
  specialChance?: number;
  obstacle?: ObstacleDef;
  label: string;
}

export const ENDLESS_RAMP: EndlessStep[] = [
  { score: 600, colors: 4, label: 'A 4th color appears!' },
  { score: 1400, obstacle: { type: 'ledge', x: 196, y: 470, w: 120, h: 16, angle: -12 }, label: 'A ledge drops in!' },
  { score: 2400, colors: 5, specialChance: 0.1, label: 'A 5th color appears!' },
  { score: 3600, obstacle: { type: 'paddle', x: 300, y: 430, w: 150, h: 14, speed: 25 }, label: 'A paddle starts turning!' },
  { score: 5000, colors: 6, specialChance: 0.12, label: 'All 6 colors!' },
  { score: 7000, obstacle: { type: 'ledge', x: 404, y: 560, w: 120, h: 16, angle: 12 }, label: 'Another ledge!' },
];
