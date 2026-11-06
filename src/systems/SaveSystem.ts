/**
 * Versioned local save. No accounts, no network: everything lives in localStorage.
 * Bump SAVE_VERSION and add a migration step whenever the shape changes.
 */

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'plunk.save';

export interface LevelBest {
  stars: number;
  best: number;
}

export interface SaveData {
  version: number;
  xp: number;
  level: number;
  bests: {
    ringTimed: number;
    basketballTimed: number;
    endless: number;
    /** Separate "boosted" bests for rounds where a booster was used. */
    ringTimedBoosted: number;
    basketballTimedBoosted: number;
    endlessBoosted: number;
    levels: Record<string, LevelBest>;
  };
  stats: {
    rings: number;
    baskets: number;
    swishes: number;
    fullPegs: number;
    fullTubes: number;
    rounds: number;
    bestStreak: number;
  };
  unlocked: {
    themes: string[];
    tanks: string[];
    water: string[];
    rings: string[];
    balls: string[];
    backgrounds: string[];
  };
  equipped: { theme: string; tank: string; water: string; rings: string; balls: string; background: string };
  boosters: Record<string, number>;
  settings: {
    master: number;
    music: number;
    sfx: number;
    mute: boolean;
    haptics: boolean;
    tilt: boolean;
    reduceMotion: boolean;
    roundSeconds: number;
  };
  flags: { seenHint: boolean; seenBasketballHint: boolean };
}

export const DEFAULT_THEME = 'retro-plastic';

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    xp: 0,
    level: 1,
    bests: {
      ringTimed: 0,
      basketballTimed: 0,
      endless: 0,
      ringTimedBoosted: 0,
      basketballTimedBoosted: 0,
      endlessBoosted: 0,
      levels: {},
    },
    stats: { rings: 0, baskets: 0, swishes: 0, fullPegs: 0, fullTubes: 0, rounds: 0, bestStreak: 0 },
    unlocked: {
      themes: [DEFAULT_THEME],
      tanks: [DEFAULT_THEME],
      water: [DEFAULT_THEME],
      rings: [DEFAULT_THEME],
      balls: [DEFAULT_THEME],
      backgrounds: [DEFAULT_THEME],
    },
    equipped: {
      theme: DEFAULT_THEME,
      tank: DEFAULT_THEME,
      water: DEFAULT_THEME,
      rings: DEFAULT_THEME,
      balls: DEFAULT_THEME,
      background: DEFAULT_THEME,
    },
    boosters: { slowmo: 1, magnet: 1, colorswap: 1, extratime: 1 },
    settings: {
      master: 0.8,
      music: 0.5,
      sfx: 0.9,
      mute: false,
      haptics: true,
      tilt: false,
      reduceMotion: false,
      roundSeconds: 90,
    },
    flags: { seenHint: false, seenBasketballHint: false },
  };
}

type Migration = (old: any) => any;

/** migrations[n] upgrades a version-n save to version n+1. */
const migrations: Record<number, Migration> = {
  // v1 → v2: added boosted bests, round length setting, mute, extra stats and hint flags.
  1: (s) => ({
    ...s,
    version: 2,
    bests: { ringTimedBoosted: 0, basketballTimedBoosted: 0, endlessBoosted: 0, ...s.bests },
    stats: { rounds: 0, bestStreak: 0, ...s.stats },
    settings: { mute: false, roundSeconds: 90, ...s.settings },
    flags: { seenHint: false, seenBasketballHint: false, ...(s.flags ?? {}) },
  }),
};

function isObj(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Fill any missing fields from defaults (defensive against hand-edited or partial saves). */
function fillDefaults<T>(value: any, def: T): T {
  if (!isObj(def)) return (value === undefined || typeof value !== typeof def ? def : value) as T;
  const out: any = Array.isArray(def) ? [] : {};
  const src = isObj(value) ? value : {};
  for (const key of Object.keys(def as any)) {
    const d = (def as any)[key];
    const v = src[key];
    if (Array.isArray(d)) out[key] = Array.isArray(v) ? v : d;
    else if (isObj(d)) {
      // Records with dynamic keys (levels, boosters): keep stored keys too.
      out[key] = Object.keys(d).length === 0 || key === 'boosters' ? { ...d, ...(isObj(v) ? v : {}) } : fillDefaults(v, d);
    } else out[key] = v === undefined || typeof v !== typeof d ? d : v;
  }
  return out as T;
}

export function migrate(raw: unknown): SaveData {
  if (!isObj(raw) || typeof raw.version !== 'number') return defaultSave();
  let s: any = raw;
  if (s.version > SAVE_VERSION) {
    // A save from a newer build: keep what we understand.
    return fillDefaults({ ...s, version: SAVE_VERSION }, defaultSave());
  }
  while (s.version < SAVE_VERSION) {
    const step = migrations[s.version];
    if (!step) return defaultSave();
    s = step(s);
  }
  return fillDefaults(s, defaultSave());
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function safeStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export class SaveSystem {
  data: SaveData;
  private storage: StorageLike | null;

  constructor(storage: StorageLike | null = safeStorage()) {
    this.storage = storage;
    this.data = this.load();
  }

  load(): SaveData {
    try {
      const txt = this.storage?.getItem(SAVE_KEY);
      if (!txt) return defaultSave();
      return migrate(JSON.parse(txt));
    } catch {
      return defaultSave();
    }
  }

  save(): void {
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage full or blocked (private mode): the game keeps working without saving.
    }
  }

  reset(): void {
    this.data = defaultSave();
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    this.save();
  }
}

/** Shared instance used by scenes. Tests construct their own with a fake storage. */
export const Save = new SaveSystem();
