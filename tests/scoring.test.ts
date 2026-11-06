import { describe, expect, it } from 'vitest';
import { applyDelta, createTarget, onPieceLanded, type TargetState } from '../src/game/Scoring';
import { ringTossRules } from '../src/gametypes/RingToss';
import type { Piece } from '../src/game/types';

const rules = ringTossRules({
  basePoints: 10,
  wrongColorPenalty: 15,
  fullBonus: 250,
  goldenBonus: 100,
  heavyMult: 3,
});
const red: Piece = { color: 0, kind: 'normal' };
const blue: Piece = { color: 1, kind: 'normal' };

function landAll(t: TargetState, pieces: Piece[]) {
  const pts: number[] = [];
  let all: string[] = [];
  for (const p of pieces) {
    const r = onPieceLanded(t, p, rules);
    t = r.target;
    pts.push(r.points);
    all = all.concat(r.events.map((e) => e.type));
  }
  return { t, pts, events: all };
}

describe('Ring Toss scoring', () => {
  it('builds a streak x1→x4 on a 4-capacity peg and pays the full-peg bonus', () => {
    const { pts, events, t } = landAll(createTarget(4), [red, red, red, red]);
    expect(pts).toEqual([10, 20, 30, 40 + 250]);
    expect(events).toContain('fullBonus');
    expect(t.stack).toHaveLength(4);
    expect(t.streak).toBe(4);
  });

  it('wrong colour costs 15 and resets the streak to x1 with the new colour', () => {
    const { pts, t } = landAll(createTarget(4), [red, red, blue]);
    expect(pts).toEqual([10, 20, -15]);
    expect(t.streak).toBe(1);
    expect(t.streakColor).toBe(1);
    // Next blue continues the *new* streak.
    const r = onPieceLanded(t, blue, rules);
    expect(r.points).toBe(20);
  });

  it('an empty peg takes the colour of the first ring', () => {
    const r = onPieceLanded(createTarget(4), blue, rules);
    expect(r.target.streakColor).toBe(1);
    expect(r.points).toBe(10);
  });

  it('rainbow extends the streak', () => {
    const { pts, t } = landAll(createTarget(4), [red, { color: 3, kind: 'rainbow' }, red]);
    expect(pts).toEqual([10, 20, 30]);
    expect(t.streak).toBe(3);
  });

  it('rainbow on an empty peg starts a wild streak that the next colour adopts', () => {
    const { pts, t } = landAll(createTarget(4), [{ color: 2, kind: 'rainbow' }, blue, blue]);
    expect(pts).toEqual([10, 20, 30]);
    expect(t.streakColor).toBe(1);
  });

  it('golden: +100, breaks the streak, no penalty', () => {
    const { pts, t } = landAll(createTarget(4), [red, red, { color: 0, kind: 'golden' }]);
    expect(pts).toEqual([10, 20, 100]);
    expect(t.streak).toBe(0);
    expect(t.streakColor).toBeNull();
    // Any colour after a golden is a fresh start (no penalty).
    const r = onPieceLanded(t, blue, rules);
    expect(r.points).toBe(10);
  });

  it('heavy: 3× base points (and still streaks)', () => {
    const { pts } = landAll(createTarget(4), [red, { color: 0, kind: 'heavy' }]);
    expect(pts).toEqual([10, 10 * 2 * 3]);
  });

  it('heavy wrong colour is still just the penalty', () => {
    const { pts } = landAll(createTarget(4), [red, { color: 1, kind: 'heavy' }]);
    expect(pts).toEqual([10, -15]);
  });

  it('bomb: clears the stack, frees the peg, no points', () => {
    const before = landAll(createTarget(4), [red, blue, red, blue]).t;
    const r = onPieceLanded(before, { color: 0, kind: 'bomb' }, rules);
    expect(r.points).toBe(0);
    expect(r.target.stack).toHaveLength(0);
    expect(r.target.streak).toBe(0);
    expect(r.full).toBe(false);
    expect(r.events.map((e) => e.type)).toEqual(['bombClear']);
    expect(r.removed).toHaveLength(5);
  });

  it('multiplier peg applies to every component', () => {
    const x2 = createTarget(4, 2);
    const { pts, events } = landAll(x2, [red, red, blue, { color: 0, kind: 'golden' }]);
    // 10*1*2, 10*2*2, -15*2, then golden 100*2 (fills peg; mixed → no bonus, peg dead)
    expect(pts).toEqual([20, 40, -30, 200]);
    expect(events).toContain('targetDead');
    const full = landAll(createTarget(4, 3), [red, red, red, red]);
    expect(full.pts).toEqual([30, 60, 90, 120 + 750]);
    const g = onPieceLanded(createTarget(4, 3), { color: 0, kind: 'golden' }, rules);
    expect(g.points).toBe(300);
  });

  it('score total never goes negative', () => {
    expect(applyDelta(0, -15)).toBe(0);
    expect(applyDelta(10, -15)).toBe(0);
    expect(applyDelta(20, -15)).toBe(5);
    expect(applyDelta(20, 30)).toBe(50);
  });

  it('never mutates the input target', () => {
    const t = createTarget(4);
    onPieceLanded(t, red, rules);
    expect(t.stack).toHaveLength(0);
    expect(t.streak).toBe(0);
  });
});
