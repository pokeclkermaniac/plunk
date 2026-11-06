import { describe, expect, it } from 'vitest';
import { createTarget, onPieceLanded, type TargetState } from '../src/game/Scoring';
import { basketballRules } from '../src/gametypes/Basketball';
import type { Piece } from '../src/game/types';

const rules = basketballRules({
  basePoints: 20,
  wrongColorPenalty: 15,
  fullBonus: 250,
  goldenBonus: 100,
  heavyMult: 3,
  swishBonus: 10,
  bankBonus: 5,
});
const tube = (mult = 1) => createTarget(4, mult, true);
const red: Piece = { color: 0, kind: 'normal' };
const blue: Piece = { color: 1, kind: 'normal' };

describe('Basketball scoring', () => {
  it('baskets streak per hoop: 20, 40, 60, 80 + full tube bonus, then the tube empties', () => {
    let t: TargetState = tube();
    const pts: number[] = [];
    let last;
    for (let i = 0; i < 4; i++) {
      last = onPieceLanded(t, red, rules);
      t = last.target;
      pts.push(last.points);
    }
    expect(pts).toEqual([20, 40, 60, 80 + 250]);
    const types = last!.events.map((e) => e.type);
    expect(types).toContain('fullBonus');
    expect(types).toContain('targetEmptied');
    expect(t.stack).toHaveLength(0);
    expect(t.streak).toBe(0);
    expect(last!.removed).toHaveLength(4);
    expect(last!.full).toBe(false);
  });

  it('a full mixed tube pays no bonus but still empties', () => {
    let t = tube();
    let last;
    for (const b of [red, blue, red, blue]) {
      last = onPieceLanded(t, b, rules);
      t = last.target;
    }
    const types = last!.events.map((e) => e.type);
    expect(types).not.toContain('fullBonus');
    expect(types).not.toContain('targetDead');
    expect(types).toContain('targetEmptied');
    expect(t.stack).toHaveLength(0);
  });

  it('swish adds +10 and bank adds +5', () => {
    expect(onPieceLanded(tube(), red, rules, { swish: true }).points).toBe(30);
    expect(onPieceLanded(tube(), red, rules, { bank: true }).points).toBe(25);
  });

  it('wrong colour: −15, streak resets; a swish bonus is still paid', () => {
    const t = onPieceLanded(tube(), red, rules).target;
    const r = onPieceLanded(t, blue, rules);
    expect(r.points).toBe(-15);
    expect(r.target.streak).toBe(1);
    expect(onPieceLanded(t, blue, rules, { swish: true }).points).toBe(-5);
  });

  it('Hot Hands doubles positive points but never doubles penalties', () => {
    expect(onPieceLanded(tube(), red, rules, { globalMult: 2, swish: true }).points).toBe(60);
    const t = onPieceLanded(tube(), red, rules).target;
    expect(onPieceLanded(t, blue, rules, { globalMult: 2 }).points).toBe(-15);
  });

  it('multiplier hoop multiplies base, bonuses and penalties', () => {
    expect(onPieceLanded(tube(3), red, rules, { swish: true }).points).toBe((20 + 10) * 3);
    const t = onPieceLanded(tube(2), red, rules).target;
    expect(onPieceLanded(t, blue, rules).points).toBe(-30);
  });

  it('special balls: rainbow, golden, heavy, bomb', () => {
    let t = onPieceLanded(tube(), red, rules).target;
    expect(onPieceLanded(t, { color: 4, kind: 'rainbow' }, rules).points).toBe(40);
    const g = onPieceLanded(t, { color: 4, kind: 'golden' }, rules);
    expect(g.points).toBe(100);
    expect(g.target.streak).toBe(0);
    expect(onPieceLanded(t, { color: 0, kind: 'heavy' }, rules).points).toBe(20 * 2 * 3);
    t = onPieceLanded(t, blue, rules).target;
    const b = onPieceLanded(t, { color: 0, kind: 'bomb' }, rules, { swish: true });
    expect(b.points).toBe(0);
    expect(b.target.stack).toHaveLength(0);
  });

  it('versus 1-on-1: any colour scores base and same-colour streaks still multiply', () => {
    const vs = basketballRules({ wrongColorScoresBase: true, basePoints: 20 });
    let t = onPieceLanded(tube(), red, vs).target;
    const wrong = onPieceLanded(t, blue, vs);
    expect(wrong.points).toBe(20);
    t = wrong.target;
    expect(onPieceLanded(t, blue, vs).points).toBe(40);
  });
});
