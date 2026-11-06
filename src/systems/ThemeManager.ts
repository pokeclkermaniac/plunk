/**
 * Themes are JSON files in src/data/themes. The effective theme is assembled from the
 * equipped parts (tank, water, rings, balls, background), each taken from a theme.
 * Missing slots fall back to Retro Plastic.
 */
import type { SaveData } from './SaveSystem';

export interface Theme {
  id: string;
  name: string;
  desc: string;
  frame: {
    shell: string;
    shellDark: string;
    highlight: string;
    trim: string;
    bezel: string;
    outline: string;
    outlineWidth: number;
    radius: number;
    scuffs: boolean;
    gloss: number;
    lumpy?: boolean;
  };
  buttons: { left: string; right: string; cap: string; base: string };
  water: { top: string; bottom: string; alpha: number; surface: string; front: number };
  rings: { colors: string[]; style: PieceStyle; outline: string; outlineWidth: number };
  balls: { colors: string[]; style: PieceStyle; outline: string; outlineWidth: number };
  peg: { color: string; shade: string };
  hoop: { rim: string; board: string; boardEdge: string; net: string; tube: string };
  obstacle: { color: string; shade: string };
  background: { style: BackgroundStyle; top: string; bottom: string; accent: string };
  ui: { text: string; panel: string; accent: string; font: string };
  pixel: boolean;
  sound: 'toy' | 'chip';
  squash?: boolean;
}

export type PieceStyle = 'glossy' | 'flat' | 'cartoon' | 'clay' | 'neon' | 'beach';
export type BackgroundStyle = 'plain' | 'bubbles' | 'dots' | 'grid' | 'clay' | 'fish' | 'stars' | 'tiles';

const modules = import.meta.glob('../data/themes/*.json', { eager: true }) as Record<
  string,
  { default: Theme }
>;

export const THEMES: Record<string, Theme> = {};
for (const m of Object.values(modules)) THEMES[m.default.id] = m.default;

export const THEME_ORDER = [
  'retro-plastic',
  'modern-clean',
  'cartoony',
  'pixel-art',
  'aquarium',
  'neon-arcade',
  'pool-party',
  'claymation',
].filter((id) => THEMES[id]);

const FALLBACK = 'retro-plastic';

function merge<T>(base: T, over: Partial<T> | undefined): T {
  if (!over) return base;
  const out: any = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = merge((base as any)[k] ?? {}, v as any);
    else if (v !== undefined) out[k] = v;
  }
  return out;
}

export function getTheme(id: string): Theme {
  return merge(THEMES[FALLBACK], THEMES[id]);
}

type Listener = (t: Theme) => void;

class ThemeManagerImpl {
  current: Theme = getTheme(FALLBACK);
  /** Bumped on every change so texture keys can be regenerated. */
  revision = 0;
  private listeners = new Set<Listener>();

  /** Builds the effective theme from the equipped parts. */
  fromSave(save: SaveData): Theme {
    const eq = save.equipped;
    const tank = getTheme(eq.tank || eq.theme);
    const t: Theme = {
      ...tank,
      water: getTheme(eq.water).water,
      rings: getTheme(eq.rings).rings,
      balls: getTheme(eq.balls).balls,
      background: getTheme(eq.background).background,
    };
    return t;
  }

  apply(save: SaveData): void {
    this.current = this.fromSave(save);
    this.revision++;
    for (const l of this.listeners) l(this.current);
  }

  onChange(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

export const ThemeManager = new ThemeManagerImpl();

export function hex(c: string): number {
  return parseInt(c.replace('#', '').slice(0, 6), 16);
}
