import { describe, expect, it } from 'vitest';
import { addXp, starsFor, xpForRound, xpToNext } from '../src/systems/Progression';
import { defaultSave } from '../src/systems/SaveSystem';
import { evaluateGoal, emptyStats } from '../src/modes/Goals';
import { pickPiece, pickWeighted, seededRng } from '../src/game/Spawner';

describe('Progression', () => {
  it('levels up and applies unlocks', () => {
    const s = defaultSave();
    const res = addXp(s, xpToNext(1) + xpToNext(2));
    expect(s.level).toBe(3);
    expect(res.levelsGained).toBe(2);
    expect(s.unlocked.themes).toContain('modern-clean');
    expect(s.unlocked.tanks).toContain('modern-clean');
    expect(s.unlocked.water).toContain('aquarium');
    expect(s.boosters.slowmo).toBe(1 + 2);
  });

  it('computes round XP', () => {
    expect(xpForRound({ score: 1000, fullBonuses: 2, newBest: true })).toBe(100 + 30 + 50);
    expect(xpForRound({ score: -5, fullBonuses: 0, newBest: false })).toBe(0);
  });

  it('awards stars only when the goal is met', () => {
    expect(starsFor(false, 9999, [1, 2, 3])).toBe(0);
    expect(starsFor(true, 100, [100, 200, 300])).toBe(1);
    expect(starsFor(true, 250, [100, 200, 300])).toBe(2);
    expect(starsFor(true, 300, [100, 200, 300])).toBe(3);
  });
});

describe('Goals', () => {
  it('evaluates goal types', () => {
    const s = { ...emptyStats(2), score: 500, fullPegs: 1, fullPegColors: [2], baskets: 3, hoopsScored: [0] };
    expect(evaluateGoal({ type: 'score', value: 400 }, s).met).toBe(true);
    expect(evaluateGoal({ type: 'fullPegColor', value: 1, color: 2 }, s).met).toBe(true);
    expect(evaluateGoal({ type: 'fullPegColor', value: 1, color: 1 }, s).met).toBe(false);
    expect(evaluateGoal({ type: 'everyHoop', value: 0 }, s).met).toBe(false);
    expect(evaluateGoal({ type: 'everyHoop', value: 0 }, { ...s, hoopsScored: [0, 1, 1] }).met).toBe(true);
    const nw = evaluateGoal({ type: 'noWrong', value: 100 }, { ...s, wrong: 1 });
    expect(nw.failed).toBe(true);
    expect(nw.met).toBe(false);
  });
});

describe('Spawner', () => {
  it('respects colour count and special chance', () => {
    const rng = seededRng(7);
    let specials = 0;
    for (let i = 0; i < 2000; i++) {
      const p = pickPiece({ colors: 3, specialChance: 0.1, specialWeights: { golden: 1, bomb: 1 } }, rng);
      expect(p.color).toBeGreaterThanOrEqual(0);
      expect(p.color).toBeLessThan(3);
      if (p.kind !== 'normal') {
        specials++;
        expect(['golden', 'bomb']).toContain(p.kind);
      }
    }
    expect(specials).toBeGreaterThan(120);
    expect(specials).toBeLessThan(280);
  });

  it('pickWeighted ignores zero weights', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 100; i++) expect(pickWeighted({ a: 0, b: 1 }, rng)).toBe('b');
    expect(pickWeighted({}, rng)).toBeNull();
  });
});
