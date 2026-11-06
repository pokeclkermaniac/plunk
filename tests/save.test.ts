import { describe, expect, it } from 'vitest';
import {
  defaultSave,
  migrate,
  SAVE_KEY,
  SAVE_VERSION,
  SaveSystem,
  type StorageLike,
} from '../src/systems/SaveSystem';

class MemStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe('SaveSystem', () => {
  it('starts with defaults when storage is empty', () => {
    const s = new SaveSystem(new MemStorage());
    expect(s.data).toEqual(defaultSave());
  });

  it('round-trips through storage', () => {
    const mem = new MemStorage();
    const s = new SaveSystem(mem);
    s.data.xp = 42;
    s.data.bests.levels['ringtoss-01'] = { stars: 2, best: 300 };
    s.save();
    const again = new SaveSystem(mem);
    expect(again.data.xp).toBe(42);
    expect(again.data.bests.levels['ringtoss-01']).toEqual({ stars: 2, best: 300 });
  });

  it('migrates a v1 save to the current version, keeping progress', () => {
    const v1 = {
      version: 1,
      xp: 10,
      level: 3,
      bests: {
        ringTimed: 900,
        basketballTimed: 500,
        endless: 0,
        levels: { 'ringtoss-01': { stars: 3, best: 1000 } },
      },
      stats: { rings: 5, baskets: 1, swishes: 0, fullPegs: 1, fullTubes: 0 },
      unlocked: {
        themes: ['retro-plastic', 'modern-clean'],
        tanks: [],
        water: [],
        rings: [],
        balls: [],
        backgrounds: [],
      },
      equipped: {
        theme: 'modern-clean',
        tank: 'modern-clean',
        water: 'retro-plastic',
        rings: 'retro-plastic',
        balls: 'retro-plastic',
        background: 'retro-plastic',
      },
      boosters: { slowmo: 3 },
      settings: { master: 0.5, music: 0.2, sfx: 1, haptics: false, tilt: false, reduceMotion: true },
    };
    const m = migrate(v1);
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.level).toBe(3);
    expect(m.bests.ringTimed).toBe(900);
    expect(m.bests.ringTimedBoosted).toBe(0);
    expect(m.bests.levels['ringtoss-01'].stars).toBe(3);
    expect(m.settings.reduceMotion).toBe(true);
    expect(m.settings.roundSeconds).toBe(90);
    expect(m.stats.rounds).toBe(0);
    expect(m.boosters.slowmo).toBe(3);
    expect(m.equipped.theme).toBe('modern-clean');
    expect(m.flags.seenHint).toBe(false);
  });

  it('survives corrupt or foreign data', () => {
    const mem = new MemStorage();
    mem.setItem(SAVE_KEY, '{not json');
    expect(new SaveSystem(mem).data).toEqual(defaultSave());
    expect(migrate(null)).toEqual(defaultSave());
    expect(migrate({ hello: 'world' })).toEqual(defaultSave());
  });

  it('fills missing and wrongly typed fields from defaults', () => {
    const partial = { version: SAVE_VERSION, xp: 'lots', level: 4, settings: { music: 0.1 } };
    const m = migrate(partial);
    expect(m.xp).toBe(0);
    expect(m.level).toBe(4);
    expect(m.settings.music).toBe(0.1);
    expect(m.settings.sfx).toBe(defaultSave().settings.sfx);
    expect(m.unlocked.themes).toEqual(['retro-plastic']);
  });

  it('keeps working when storage throws', () => {
    const bad: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {},
    };
    const s = new SaveSystem(bad);
    expect(s.data.level).toBe(1);
    expect(() => s.save()).not.toThrow();
  });

  it('reset wipes progress', () => {
    const mem = new MemStorage();
    const s = new SaveSystem(mem);
    s.data.level = 9;
    s.save();
    s.reset();
    expect(new SaveSystem(mem).data.level).toBe(1);
  });
});
