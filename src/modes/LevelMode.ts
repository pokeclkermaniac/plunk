import { TUNING } from '../config/tuning';
import { basketballRules } from '../gametypes/Basketball';
import { ringTossRules } from '../gametypes/RingToss';
import type { GameType } from '../game/types';
import type { GoalDef, ObstacleDef, RoundConfig, SpecialKind, TargetDef } from './RoundConfig';

/** Shape of a level JSON file in src/data/levels. */
export interface LevelData {
  id: string;
  name: string;
  hint?: string;
  gameType: GameType;
  time: number | null;
  colors: number;
  startPieces: number;
  supply: number | null;
  specialChance: number;
  specialWeights: Partial<Record<SpecialKind, number>>;
  targets: TargetDef[];
  obstacles: ObstacleDef[];
  goal: GoalDef;
  stars: [number, number, number];
  jets?: [number, number];
}

const modules = import.meta.glob('../data/levels/*.json', { eager: true }) as Record<string, { default: LevelData }>;

function sortById(a: LevelData, b: LevelData) {
  return a.id.localeCompare(b.id);
}

const all = Object.values(modules).map((m) => m.default);
export const LEVELS: Record<GameType, LevelData[]> = {
  ringToss: all.filter((l) => l.gameType === 'ringToss').sort(sortById),
  basketball: all.filter((l) => l.gameType === 'basketball').sort(sortById),
};

export function levelConfig(level: LevelData, index: number): RoundConfig {
  const ring = level.gameType === 'ringToss';
  const finite = level.supply !== null;
  return {
    gameType: level.gameType,
    mode: 'levels',
    title: `${index + 1}. ${level.name}`,
    timeSeconds: level.time,
    colors: level.colors,
    startPieces: level.startPieces,
    supply: level.supply,
    replaceOnLand: ring || finite,
    specialChance: level.specialChance,
    specialWeights: level.specialWeights,
    targets: level.targets,
    obstacles: level.obstacles ?? [],
    rules: ring ? ringTossRules() : basketballRules(),
    goal: level.goal,
    stars: level.stars,
    levelId: level.id,
    levelIndex: index,
    hotHands: false,
    versus: false,
    tankClear: ring,
    endless: false,
    boostersAllowed: true,
    jets: level.jets,
  };
}

/** Bonus points paid on completing a level early / with pieces to spare. */
export function completionBonus(timeLeftSec: number | null, piecesLeft: number): number {
  return (
    Math.floor(Math.max(0, timeLeftSec ?? 0)) * TUNING.LEVEL_TIME_BONUS_PER_SECOND +
    Math.max(0, piecesLeft) * TUNING.LEVEL_PIECE_BONUS
  );
}
