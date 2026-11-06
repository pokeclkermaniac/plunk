/** Mode- and game-type-dependent piece choice. Pure (rng injected) so it can be tested. */
import type { Piece } from './types';
import type { SpecialKind } from '../modes/RoundConfig';

export type Rng = () => number;

export interface SpawnSettings {
  colors: number;
  specialChance: number;
  specialWeights: Partial<Record<SpecialKind, number>>;
}

export function pickWeighted<T extends string>(weights: Partial<Record<T, number>>, rng: Rng): T | null {
  const entries = Object.entries(weights).filter(([, w]) => (w as number) > 0) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r < 0) return k;
  }
  return entries[entries.length - 1][0];
}

export function pickPiece(s: SpawnSettings, rng: Rng = Math.random): Piece {
  const color = Math.floor(rng() * Math.max(1, s.colors));
  if (rng() < s.specialChance) {
    const kind = pickWeighted(s.specialWeights, rng);
    if (kind) return { color, kind };
  }
  return { color, kind: 'normal' };
}

/** Seeded RNG (mulberry32) for tests and debug runs. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
