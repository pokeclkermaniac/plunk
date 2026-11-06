import { describe, expect, it } from 'vitest';
import {
  canAccept,
  clearTarget,
  createTarget,
  isDead,
  isFull,
  isSingleColor,
  onPieceLanded,
} from '../src/game/Scoring';
import { ringTossRules } from '../src/gametypes/RingToss';
import type { Piece } from '../src/game/types';

const rules = ringTossRules();
const p = (color: number, kind: Piece['kind'] = 'normal'): Piece => ({ color, kind });

describe('Peg stacking', () => {
  it('full pegs stay full and stop accepting rings', () => {
    let t = createTarget(4);
    for (const c of [0, 0, 0, 0]) t = onPieceLanded(t, p(c), rules).target;
    expect(isFull(t)).toBe(true);
    expect(canAccept(t)).toBe(false);
    expect(isDead(t)).toBe(false); // single colour: not dead, just full
  });

  it('a full peg with mixed colours is dead and pays nothing', () => {
    let t = createTarget(4);
    const events: string[] = [];
    let total = 0;
    for (const c of [0, 1, 0, 1]) {
      const r = onPieceLanded(t, p(c), rules);
      t = r.target;
      total += r.points;
      events.push(...r.events.map((e) => e.type));
    }
    expect(isDead(t)).toBe(true);
    expect(events).toContain('targetDead');
    expect(events).not.toContain('fullBonus');
    expect(total).toBe(10 - 15 - 15 - 15);
  });

  it('rainbows count toward a single-colour full peg', () => {
    expect(isSingleColor([p(2), p(0, 'rainbow'), p(2), p(5, 'rainbow')])).toBe(true);
    expect(isSingleColor([p(2), p(2, 'golden')])).toBe(false);
    let t = createTarget(4);
    let last;
    for (const piece of [p(2), p(0, 'rainbow'), p(2), p(5, 'rainbow')]) {
      last = onPieceLanded(t, piece, rules);
      t = last.target;
    }
    expect(last!.events.map((e) => e.type)).toContain('fullBonus');
  });

  it('a bomb rescues a dead peg', () => {
    let t = createTarget(3);
    for (const c of [0, 1, 2]) t = onPieceLanded(t, p(c), rules).target;
    expect(isDead(t)).toBe(true);
    // A full peg can't capture, but the game lets a bomb through as the only rescue.
    t = onPieceLanded(t, p(0, 'bomb'), rules).target;
    expect(t.stack).toHaveLength(0);
    expect(canAccept(t)).toBe(true);
  });

  it('capacity is configurable', () => {
    let t = createTarget(2);
    t = onPieceLanded(t, p(1), rules).target;
    const r = onPieceLanded(t, p(1), rules);
    expect(r.full).toBe(true);
    expect(r.points).toBe(20 + 250);
  });

  it('tank clear empties a peg', () => {
    let t = createTarget(4);
    for (const c of [0, 0, 0, 0]) t = onPieceLanded(t, p(c), rules).target;
    t = clearTarget(t);
    expect(t.stack).toHaveLength(0);
    expect(t.streak).toBe(0);
  });
});
