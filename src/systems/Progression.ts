/** XP, player levels, unlocks and earned boosters. Pure functions over SaveData. */
import { TUNING } from '../config/tuning';
import type { SaveData } from './SaveSystem';

export type BoosterId = 'slowmo' | 'magnet' | 'colorswap' | 'extratime';
export const BOOSTERS: { id: BoosterId; name: string; desc: string }[] = [
  { id: 'slowmo', name: 'Slow-mo', desc: `${TUNING.SLOWMO_SECONDS}s of slow motion` },
  { id: 'magnet', name: 'Magnet', desc: 'Tap a peg or hoop: nearby pieces get pulled in' },
  { id: 'colorswap', name: 'Color swap', desc: 'Tap a piece to recolor it to match' },
  { id: 'extratime', name: 'Extra time', desc: `+${TUNING.EXTRA_TIME_SECONDS} seconds (timed rounds)` },
];

export type PartSlot = 'tanks' | 'water' | 'rings' | 'balls' | 'backgrounds';
export const PART_SLOTS: PartSlot[] = ['tanks', 'water', 'rings', 'balls', 'backgrounds'];

export type Reward =
  | { type: 'theme'; id: string }
  | { type: 'part'; slot: PartSlot; id: string }
  | { type: 'booster'; id: BoosterId; count: number };

/** What each player level unlocks. Levels past the table grant a rotating booster. */
export const UNLOCK_TABLE: Record<number, Reward[]> = {
  2: [
    { type: 'booster', id: 'slowmo', count: 2 },
    { type: 'part', slot: 'water', id: 'aquarium' },
  ],
  3: [{ type: 'theme', id: 'modern-clean' }],
  4: [
    { type: 'part', slot: 'rings', id: 'neon-arcade' },
    { type: 'booster', id: 'magnet', count: 2 },
  ],
  5: [{ type: 'theme', id: 'cartoony' }],
  6: [
    { type: 'part', slot: 'backgrounds', id: 'pool-party' },
    { type: 'booster', id: 'colorswap', count: 2 },
  ],
  7: [{ type: 'theme', id: 'pixel-art' }],
  8: [
    { type: 'part', slot: 'balls', id: 'neon-arcade' },
    { type: 'booster', id: 'extratime', count: 2 },
  ],
  9: [{ type: 'theme', id: 'aquarium' }],
  10: [
    { type: 'part', slot: 'tanks', id: 'claymation' },
    { type: 'booster', id: 'slowmo', count: 2 },
  ],
  11: [{ type: 'theme', id: 'neon-arcade' }],
  12: [{ type: 'booster', id: 'magnet', count: 3 }],
  13: [{ type: 'theme', id: 'pool-party' }],
  14: [{ type: 'booster', id: 'colorswap', count: 3 }],
  15: [{ type: 'theme', id: 'claymation' }],
};

const ROTATION: BoosterId[] = ['slowmo', 'magnet', 'colorswap', 'extratime'];

export function rewardsForLevel(level: number): Reward[] {
  if (UNLOCK_TABLE[level]) return UNLOCK_TABLE[level];
  if (level > 15) return [{ type: 'booster', id: ROTATION[level % ROTATION.length], count: 1 }];
  return [];
}

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return TUNING.XP_LEVEL_BASE + (level - 1) * TUNING.XP_LEVEL_GROWTH;
}

export interface RoundXpInput {
  score: number;
  fullBonuses: number;
  newBest: boolean;
  stars?: number;
}

export function xpForRound(r: RoundXpInput): number {
  return (
    Math.floor(Math.max(0, r.score) / TUNING.XP_PER_POINTS) +
    r.fullBonuses * TUNING.XP_FULL_BONUS +
    (r.newBest ? TUNING.XP_NEW_BEST : 0) +
    (r.stars ?? 0) * TUNING.XP_LEVEL_STAR
  );
}

function addUnique(list: string[], id: string): boolean {
  if (list.includes(id)) return false;
  list.push(id);
  return true;
}

export function applyReward(save: SaveData, r: Reward): void {
  if (r.type === 'theme') {
    addUnique(save.unlocked.themes, r.id);
    for (const slot of PART_SLOTS) addUnique(save.unlocked[slot], r.id);
  } else if (r.type === 'part') {
    addUnique(save.unlocked[r.slot], r.id);
  } else {
    save.boosters[r.id] = (save.boosters[r.id] ?? 0) + r.count;
  }
}

export interface XpResult {
  gained: number;
  levelsGained: number;
  rewards: Reward[];
}

/** Adds XP (mutating the save) and applies level-up rewards. */
export function addXp(save: SaveData, amount: number): XpResult {
  const rewards: Reward[] = [];
  let levelsGained = 0;
  save.xp += Math.max(0, Math.floor(amount));
  while (save.xp >= xpToNext(save.level)) {
    save.xp -= xpToNext(save.level);
    save.level += 1;
    levelsGained += 1;
    for (const r of rewardsForLevel(save.level)) {
      applyReward(save, r);
      rewards.push(r);
    }
  }
  return { gained: Math.floor(amount), levelsGained, rewards };
}

/** Stars for a level: 0 if the goal failed, else 1..3 by score thresholds. */
export function starsFor(goalMet: boolean, score: number, thresholds: [number, number, number]): number {
  if (!goalMet) return 0;
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  return 1;
}

/** Booster rewards for earning stars on a level for the first time. */
export function starRewards(oldStars: number, newStars: number): Reward[] {
  const out: Reward[] = [];
  if (oldStars < 3 && newStars >= 3) {
    out.push({ type: 'booster', id: ROTATION[Math.floor(Math.random() * ROTATION.length)], count: 1 });
  }
  return out;
}

export function rewardLabel(r: Reward): string {
  if (r.type === 'theme') return `Theme: ${prettyId(r.id)}`;
  if (r.type === 'part') return `${slotLabel(r.slot)}: ${prettyId(r.id)}`;
  const b = BOOSTERS.find((x) => x.id === r.id);
  return `${r.count}× ${b?.name ?? r.id} booster`;
}

export function slotLabel(slot: PartSlot): string {
  return { tanks: 'Tank', water: 'Water', rings: 'Rings', balls: 'Balls', backgrounds: 'Background' }[slot];
}

export function prettyId(id: string): string {
  return id
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}
