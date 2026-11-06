/**
 * Procedural art. Every texture is drawn with Canvas 2D from the current theme's colours,
 * so new themes need no image files. Pixel themes are drawn at low resolution and
 * scaled up with nearest-neighbour filtering.
 */
import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import type { Piece } from './types';
import type { Theme, PieceStyle } from '../systems/ThemeManager';
import { COLOR_SYMBOLS } from './types';

type Ctx = CanvasRenderingContext2D;

/** Texture resolution factor for the current theme (pixel themes draw small). */
export let TEX_RES = 1;

export function pieceKey(p: Piece): string {
  switch (p.kind) {
    case 'normal':
      return `${p.color}`;
    case 'heavy':
      return `h${p.color}`;
    default:
      return p.kind;
  }
}

function makeCanvas(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: Ctx) => void,
  pixel: boolean,
): void {
  const res = TEX_RES;
  const tm = scene.textures;
  if (tm.exists(key)) tm.remove(key);
  const cw = Math.max(1, Math.ceil(w * res));
  const ch = Math.max(1, Math.ceil(h * res));
  const tex = tm.createCanvas(key, cw, ch);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.save();
  ctx.scale(res, res);
  draw(ctx);
  ctx.restore();
  tex.refresh();
  tex.setFilter(pixel ? Phaser.Textures.FilterMode.NEAREST : Phaser.Textures.FilterMode.LINEAR);
}

// ── colour helpers ──────────────────────────────────────────────
function rgb(c: string): [number, number, number] {
  const n = parseInt(c.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function alphaOf(c: string): number {
  const s = c.replace('#', '');
  return s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;
}
export function css(c: string, a = 1): string {
  const [r, g, b] = rgb(c);
  return `rgba(${r},${g},${b},${a * alphaOf(c)})`;
}
export function shade(c: string, f: number): string {
  const [r, g, b] = rgb(c);
  const m = (v: number) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
  return (
    '#' + [m(r), m(g), m(b)].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
  );
}

// ── symbols (reserved for the colourblind mode; embossed on pieces) ──
export function drawSymbol(ctx: Ctx, sym: string, x: number, y: number, s: number): void {
  ctx.beginPath();
  switch (sym) {
    case 'circle':
      ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(x, y - s * 0.55);
      ctx.lineTo(x + s * 0.55, y + s * 0.45);
      ctx.lineTo(x - s * 0.55, y + s * 0.45);
      break;
    case 'square':
      ctx.rect(x - s * 0.42, y - s * 0.42, s * 0.84, s * 0.84);
      break;
    case 'diamond':
      ctx.moveTo(x, y - s * 0.6);
      ctx.lineTo(x + s * 0.5, y);
      ctx.lineTo(x, y + s * 0.6);
      ctx.lineTo(x - s * 0.5, y);
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s * 0.6 : s * 0.26;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      break;
    case 'heart':
      ctx.moveTo(x, y + s * 0.5);
      ctx.bezierCurveTo(x - s * 0.8, y - s * 0.05, x - s * 0.35, y - s * 0.7, x, y - s * 0.2);
      ctx.bezierCurveTo(x + s * 0.35, y - s * 0.7, x + s * 0.8, y - s * 0.05, x, y + s * 0.5);
      break;
  }
  ctx.closePath();
  ctx.fill();
}

function rainbowGradient(ctx: Ctx, x0: number, x1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  ['#ff3b3b', '#ff9a1f', '#ffe11f', '#3bd16f', '#2f8bff', '#a64dff'].forEach((c, i) =>
    g.addColorStop(i / 5, c),
  );
  return g;
}
function goldGradient(ctx: Ctx, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#fff6b0');
  g.addColorStop(0.45, '#f5c518');
  g.addColorStop(1, '#a8740a');
  return g;
}

interface PieceLook {
  fill: string | CanvasGradient;
  base: string;
  symbol: string | null;
  heavy: boolean;
  bomb: boolean;
  golden: boolean;
}

function lookFor(
  ctx: Ctx,
  p: Piece,
  colors: string[],
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): PieceLook {
  const base = colors[p.color % colors.length];
  if (p.kind === 'rainbow')
    return {
      fill: rainbowGradient(ctx, x0, x1),
      base: '#ffffff',
      symbol: null,
      heavy: false,
      bomb: false,
      golden: false,
    };
  if (p.kind === 'golden')
    return {
      fill: goldGradient(ctx, y0, y1),
      base: '#f5c518',
      symbol: 'star',
      heavy: false,
      bomb: false,
      golden: true,
    };
  if (p.kind === 'bomb')
    return { fill: '#26262b', base: '#26262b', symbol: null, heavy: false, bomb: true, golden: false };
  return {
    fill: base,
    base,
    symbol: COLOR_SYMBOLS[p.color % COLOR_SYMBOLS.length],
    heavy: p.kind === 'heavy',
    bomb: false,
    golden: false,
  };
}

// ── rings ───────────────────────────────────────────────────────
const RING_PAD = 6;
export const RING_TEX_W = TUNING.RING_WIDTH + RING_PAD * 2;
export const RING_TEX_H = TUNING.RING_VISUAL_HEIGHT + RING_PAD * 2;

function drawRingHalf(ctx: Ctx, p: Piece, theme: Theme, front: boolean): void {
  const W = RING_TEX_W;
  const H = RING_TEX_H;
  const cx = W / 2;
  const cy = H / 2;
  const thick = TUNING.RING_RIM_RADIUS * 1.25;
  const rx = TUNING.RING_WIDTH / 2 - thick / 2;
  const ry = TUNING.RING_VISUAL_HEIGHT / 2 - thick / 4;
  const style: PieceStyle = theme.rings.style;
  const look = lookFor(ctx, p, theme.rings.colors, cx - rx, cx + rx, cy - ry, cy + ry);
  const a0 = front ? 0 : Math.PI;
  const a1 = front ? Math.PI : Math.PI * 2;
  const arc = (w: number, color: string | CanvasGradient, dy = 0, rxd = 0) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy + dy, rx + rxd, ry, 0, a0 - 0.02, a1 + 0.02);
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  ctx.lineCap = 'round';
  if (style === 'neon') {
    ctx.shadowColor = typeof look.fill === 'string' ? look.fill : '#ffffff';
    ctx.shadowBlur = 8;
  }
  const ow = theme.rings.outlineWidth;
  if (ow > 0) arc(thick + ow * 2, theme.rings.outline);
  // body: darker underside then main colour
  if (typeof look.fill === 'string') arc(thick, shade(look.fill, -0.28), 1.5);
  arc(thick * (style === 'flat' ? 1 : 0.86), look.fill, style === 'flat' ? 0 : -0.5);
  ctx.shadowBlur = 0;
  if (look.heavy) {
    // metal bands mark heavy rings
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, a0, a1);
    ctx.strokeStyle = 'rgba(40,40,48,0.85)';
    ctx.lineWidth = thick * 0.38;
    ctx.setLineDash([5, 7]);
    ctx.stroke();
    ctx.restore();
  }
  if (look.bomb) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, a0, a1);
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();
  }
  // gloss highlight
  if (style !== 'flat') {
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy - thick * 0.22,
      rx,
      ry,
      0,
      front ? 0.35 : Math.PI + 0.25,
      front ? Math.PI - 0.35 : Math.PI * 2 - 0.25,
    );
    ctx.strokeStyle = style === 'clay' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(1.5, thick * 0.18);
    ctx.stroke();
  }
  if (front && look.symbol) {
    ctx.fillStyle = look.golden ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.8)';
    drawSymbol(ctx, look.symbol, cx, cy + ry - 0.5, 8.5);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    drawSymbol(ctx, look.symbol, cx + 0.6, cy + ry + 0.6, 8.5);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    drawSymbol(ctx, look.symbol, cx, cy + ry - 0.5, 8.5);
  }
  if (front && look.bomb) {
    ctx.fillStyle = '#ffcc33';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✸', cx, cy + ry);
  }
}

// ── balls ───────────────────────────────────────────────────────
export const BALL_TEX = TUNING.BALL_RADIUS * 2 + 8;

function drawBall(ctx: Ctx, p: Piece, theme: Theme): void {
  const S = BALL_TEX;
  const c = S / 2;
  const r = TUNING.BALL_RADIUS;
  const style = theme.balls.style;
  const look = lookFor(ctx, p, theme.balls.colors, c - r, c + r, c - r, c + r);
  if (style === 'neon') {
    ctx.shadowColor = look.base;
    ctx.shadowBlur = 10;
  }
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  if (typeof look.fill === 'string' && style !== 'flat' && style !== 'beach') {
    const g = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.15, c, c, r);
    g.addColorStop(0, shade(look.fill, 0.35));
    g.addColorStop(0.7, look.fill);
    g.addColorStop(1, shade(look.fill, -0.35));
    ctx.fillStyle = g;
  } else ctx.fillStyle = look.fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();
  if (style === 'beach' && !look.bomb && !look.golden) {
    // beach ball panels: colour + white
    for (let i = 0; i < 6; i += 2) {
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, r, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }
  } else if (!look.bomb) {
    // basketball-ish seams
    ctx.strokeStyle = look.golden ? 'rgba(120,80,0,0.4)' : 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(c - r, c);
    ctx.lineTo(c + r, c);
    ctx.moveTo(c, c - r);
    ctx.lineTo(c, c + r);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(c - r * 0.95, c, r * 0.55, r, 0, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(c + r * 0.95, c, r * 0.55, r, 0, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.stroke();
  }
  if (look.heavy) {
    ctx.fillStyle = 'rgba(40,40,48,0.8)';
    ctx.fillRect(c - r, c - r * 0.62, r * 2, r * 0.3);
    ctx.fillRect(c - r, c + r * 0.32, r * 2, r * 0.3);
  }
  ctx.restore();
  if (look.bomb) {
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(c - 3, c - r - 2, 6, 7);
    ctx.fillStyle = '#ffcc33';
    ctx.beginPath();
    ctx.arc(c + 2, c - r - 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, r * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (look.symbol) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    drawSymbol(ctx, look.symbol, c + 1, c + 1, 15);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    drawSymbol(ctx, look.symbol, c, c, 15);
  }
  // outline + gloss
  if (theme.balls.outlineWidth > 0) {
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.strokeStyle = theme.balls.outline;
    ctx.lineWidth = theme.balls.outlineWidth;
    ctx.stroke();
  }
  if (style !== 'flat') {
    ctx.beginPath();
    ctx.ellipse(c - r * 0.35, c - r * 0.45, r * 0.32, r * 0.18, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = style === 'clay' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)';
    ctx.fill();
  }
}

// ── particles ───────────────────────────────────────────────────
function drawBubble(ctx: Ctx, size: number): void {
  const c = size / 2;
  ctx.beginPath();
  ctx.arc(c, c, c - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c - c * 0.35, c - c * 0.35, c * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
}

function drawSparkle(ctx: Ctx, size: number): void {
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,220,0.8)');
  g.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(c, 0);
  ctx.quadraticCurveTo(c, c, size, c);
  ctx.quadraticCurveTo(c, c, c, size);
  ctx.quadraticCurveTo(c, c, 0, c);
  ctx.quadraticCurveTo(c, c, c, 0);
  ctx.fill();
}

// ── plunger buttons ─────────────────────────────────────────────
export const BUTTON_TEX = 220;

function drawPlunger(ctx: Ctx, color: string, theme: Theme, pressed: boolean): void {
  const S = BUTTON_TEX;
  const c = S / 2;
  // housing
  ctx.beginPath();
  ctx.arc(c, c + 6, c - 6, 0, Math.PI * 2);
  ctx.fillStyle = css(shade(theme.buttons.base, -0.3));
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c, c, c - 8, 0, Math.PI * 2);
  const hg = ctx.createRadialGradient(c, c - 20, 10, c, c, c - 8);
  hg.addColorStop(0, css(shade(theme.buttons.base, 0.25)));
  hg.addColorStop(1, css(theme.buttons.base));
  ctx.fillStyle = hg;
  ctx.fill();
  // well
  ctx.beginPath();
  ctx.arc(c, c, c - 26, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  // cap (the plunger itself)
  const lift = pressed ? 2 : -10;
  const cr = pressed ? c - 36 : c - 32;
  ctx.beginPath();
  ctx.arc(c, c + 8, cr, 0, Math.PI * 2);
  ctx.fillStyle = css(shade(color, -0.45));
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c, c + lift, cr, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(c - cr * 0.3, c + lift - cr * 0.4, cr * 0.1, c, c + lift, cr);
  g.addColorStop(0, css(shade(color, 0.45)));
  g.addColorStop(0.6, css(color));
  g.addColorStop(1, css(shade(color, -0.25)));
  ctx.fillStyle = theme.rings.style === 'flat' ? css(color) : g;
  ctx.fill();
  if (theme.frame.outlineWidth > 0) {
    ctx.strokeStyle = css(theme.frame.outline);
    ctx.lineWidth = theme.frame.outlineWidth;
    ctx.stroke();
  }
  // grip ridges
  ctx.strokeStyle = css(shade(color, -0.3), 0.6);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(c, c + lift, cr * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(c - cr * 0.3, c + lift - cr * 0.45, cr * 0.38, cr * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${pressed ? 0.25 : 0.5})`;
  ctx.fill();
}

// ── tank background ─────────────────────────────────────────────
function drawBackground(ctx: Ctx, theme: Theme, W: number, H: number): void {
  const bg = theme.background;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, css(bg.top));
  g.addColorStop(1, css(bg.bottom));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const acc = (a: number) => css(bg.accent, a);
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  switch (bg.style) {
    case 'bubbles':
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.arc(rnd() * W, rnd() * H, 3 + rnd() * 18, 0, Math.PI * 2);
        ctx.strokeStyle = acc(0.06 + rnd() * 0.06);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      break;
    case 'dots':
      for (let y = 20; y < H; y += 46)
        for (let x = ((y / 46) % 2) * 23 + 12; x < W; x += 46) {
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fillStyle = acc(0.12);
          ctx.fill();
        }
      break;
    case 'grid':
      ctx.strokeStyle = acc(0.12);
      ctx.lineWidth = 2;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      break;
    case 'clay':
      for (let i = 0; i < 70; i++) {
        ctx.beginPath();
        ctx.ellipse(rnd() * W, rnd() * H, 10 + rnd() * 30, 6 + rnd() * 16, rnd() * 3, 0, Math.PI * 2);
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
        ctx.fill();
      }
      break;
    case 'fish': {
      // sandy floor, weeds and little fish
      ctx.fillStyle = css(bg.accent, 0.9);
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H - 34 - Math.sin(x / 50) * 8);
      ctx.lineTo(W, H);
      ctx.fill();
      for (let i = 0; i < 7; i++) {
        const x = 30 + rnd() * (W - 60);
        ctx.strokeStyle = 'rgba(60,160,90,0.5)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x, H - 30);
        ctx.bezierCurveTo(x - 20, H - 120, x + 20, H - 180, x - 5, H - 220 - rnd() * 120);
        ctx.stroke();
      }
      for (let i = 0; i < 9; i++) {
        const x = rnd() * W;
        const y = 80 + rnd() * (H - 260);
        const s = 10 + rnd() * 10;
        const dir = rnd() > 0.5 ? 1 : -1;
        ctx.fillStyle = ['rgba(255,170,60,0.35)', 'rgba(255,255,255,0.22)', 'rgba(255,110,140,0.3)'][i % 3];
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * 0.55, 0, 0, Math.PI * 2);
        ctx.moveTo(x - dir * s * 0.8, y);
        ctx.lineTo(x - dir * s * 1.6, y - s * 0.5);
        ctx.lineTo(x - dir * s * 1.6, y + s * 0.5);
        ctx.fill();
      }
      break;
    }
    case 'stars':
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = acc(0.2 + rnd() * 0.5);
        ctx.fillRect(rnd() * W, rnd() * H, 2, 2);
      }
      ctx.strokeStyle = acc(0.18);
      ctx.lineWidth = 2;
      for (let y = H - 200; y < H; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      break;
    case 'tiles':
      ctx.strokeStyle = acc(0.35);
      ctx.lineWidth = 2;
      for (let x = 0; x <= W; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      // caustics
      for (let i = 0; i < 26; i++) {
        ctx.beginPath();
        ctx.ellipse(rnd() * W, rnd() * H, 30 + rnd() * 50, 10 + rnd() * 20, rnd() * 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      break;
    case 'plain':
    default:
      break;
  }
  // light rays from the top
  for (let i = 0; i < 4; i++) {
    const x = 60 + i * 150;
    const rg = ctx.createLinearGradient(0, 0, 0, H * 0.8);
    rg.addColorStop(0, 'rgba(255,255,255,0.08)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 60, 0);
    ctx.lineTo(x + 140, H * 0.8);
    ctx.lineTo(x + 40, H * 0.8);
    ctx.fill();
  }
}

function drawWater(ctx: Ctx, theme: Theme, W: number, H: number): void {
  const w = theme.water;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, css(w.top, w.alpha * 0.6));
  g.addColorStop(1, css(w.bottom, w.alpha));
  ctx.fillStyle = g;
  ctx.fillRect(0, TUNING.WATER_SURFACE_Y, W, H - TUNING.WATER_SURFACE_Y);
}

// ── toy frame ───────────────────────────────────────────────────
export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Draws the plastic toy shell with a transparent window over the tank.
 * `bounds` is in world coords; the tank is at (0,0)-(TANK_W,TANK_H).
 */
function drawFrame(ctx: Ctx, theme: Theme, bounds: FrameRect, landscape: boolean): void {
  const f = theme.frame;
  const ox = -bounds.x;
  const oy = -bounds.y;
  const W = bounds.w;
  const H = bounds.h;
  const TW = TUNING.TANK_W;
  const TH = TUNING.TANK_H;
  // drop shadow
  roundRect(ctx, 10, 14, W - 16, H - 16, f.radius);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  // shell body
  roundRect(ctx, 4, 2, W - 12, H - 14, f.radius);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, css(f.highlight));
  g.addColorStop(0.25, css(f.shell));
  g.addColorStop(1, css(f.shellDark));
  ctx.fillStyle = g;
  ctx.fill();
  if (f.outlineWidth > 0) {
    ctx.strokeStyle = css(f.outline);
    ctx.lineWidth = f.outlineWidth;
    ctx.stroke();
  }
  // gloss sweep
  ctx.save();
  roundRect(ctx, 4, 2, W - 12, H - 14, f.radius);
  ctx.clip();
  const gl = ctx.createLinearGradient(0, 0, W * 0.6, H * 0.4);
  gl.addColorStop(0, `rgba(255,255,255,${f.gloss})`);
  gl.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, W, H);
  // scuffs
  if (f.scuffs) {
    let s = 3;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rnd() * 30 - 15, y + rnd() * 8 - 4);
      ctx.stroke();
    }
  }
  if (f.lumpy) {
    let s = 11;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.ellipse(rnd() * W, rnd() * H, 8 + rnd() * 26, 5 + rnd() * 14, rnd() * 3, 0, Math.PI * 2);
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
      ctx.fill();
    }
  }
  ctx.restore();
  // trim stripe around the window
  const pad = 22;
  roundRect(ctx, ox - pad, oy - pad, TW + pad * 2, TH + pad * 2, 34);
  ctx.fillStyle = css(f.trim);
  ctx.fill();
  roundRect(ctx, ox - pad + 6, oy - pad + 6, TW + pad * 2 - 12, TH + pad * 2 - 12, 30);
  ctx.fillStyle = css(f.bezel);
  ctx.fill();
  // cut the window
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  roundRect(ctx, ox, oy, TW, TH, 22);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();
  // window glass glare (drawn on top, very faint)
  ctx.save();
  roundRect(ctx, ox, oy, TW, TH, 22);
  ctx.clip();
  const glare = ctx.createLinearGradient(ox, oy, ox + TW, oy + TH * 0.5);
  glare.addColorStop(0, 'rgba(255,255,255,0.14)');
  glare.addColorStop(0.3, 'rgba(255,255,255,0)');
  glare.addColorStop(0.55, 'rgba(255,255,255,0)');
  glare.addColorStop(0.6, 'rgba(255,255,255,0.07)');
  glare.addColorStop(0.7, 'rgba(255,255,255,0)');
  ctx.fillStyle = glare;
  ctx.fillRect(ox, oy, TW, TH);
  // inner shadow at the window edge
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 10;
  roundRect(ctx, ox - 3, oy - 3, TW + 6, TH + 6, 24);
  ctx.stroke();
  ctx.restore();
  // jet nozzles grilles under the window
  ctx.fillStyle = css(shade(f.bezel, -0.3));
  // screw heads
  const screws = landscape
    ? [
        [30, 30],
        [W - 40, 30],
        [30, H - 40],
        [W - 40, H - 40],
      ]
    : [
        [34, 34],
        [W - 44, 34],
        [34, H - 48],
        [W - 44, H - 48],
      ];
  for (const [x, y] of screws) {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = css(shade(f.shellDark, -0.2));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.stroke();
  }
  // embossed wordmark on the shell (original logo: "PLUNK!")
  ctx.save();
  ctx.font = `900 ${landscape ? 46 : 40}px ${theme.ui.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lx = landscape ? 150 : W / 2;
  const ly = landscape ? H / 2 - 210 : oy + TH + 48;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillText('PLUNK!', lx + 2, ly + 3);
  ctx.fillStyle = css(f.trim);
  ctx.fillText('PLUNK!', lx, ly);
  ctx.restore();
}

/** Toy frame bounds in world coords for each orientation. */
export function frameBounds(landscape: boolean): FrameRect {
  return landscape
    ? { x: -340, y: -60, w: TUNING.TANK_W + 680, h: TUNING.TANK_H + 120 }
    : { x: -50, y: -150, w: TUNING.TANK_W + 100, h: TUNING.TANK_H + 450 };
}

/** Generates every themed texture. Call on boot and after a theme change. */
export function generateTextures(scene: Phaser.Scene, theme: Theme): void {
  TEX_RES = theme.pixel ? 1 / 3 : 1;
  const px = theme.pixel;
  const kinds: Piece[] = [];
  for (let c = 0; c < 6; c++) kinds.push({ color: c, kind: 'normal' }, { color: c, kind: 'heavy' });
  kinds.push({ color: 0, kind: 'rainbow' }, { color: 0, kind: 'golden' }, { color: 0, kind: 'bomb' });
  for (const p of kinds) {
    const k = pieceKey(p);
    makeCanvas(
      scene,
      `ring_back_${k}`,
      RING_TEX_W,
      RING_TEX_H,
      (ctx) => drawRingHalf(ctx, p, theme, false),
      px,
    );
    makeCanvas(
      scene,
      `ring_front_${k}`,
      RING_TEX_W,
      RING_TEX_H,
      (ctx) => drawRingHalf(ctx, p, theme, true),
      px,
    );
    makeCanvas(scene, `ball_${k}`, BALL_TEX, BALL_TEX, (ctx) => drawBall(ctx, p, theme), px);
  }
  makeCanvas(scene, 'bubble', 18, 18, (ctx) => drawBubble(ctx, 18), px);
  makeCanvas(scene, 'sparkle', 32, 32, (ctx) => drawSparkle(ctx, 32), px);
  makeCanvas(
    scene,
    'btn_left_up',
    BUTTON_TEX,
    BUTTON_TEX,
    (ctx) => drawPlunger(ctx, theme.buttons.left, theme, false),
    px,
  );
  makeCanvas(
    scene,
    'btn_left_down',
    BUTTON_TEX,
    BUTTON_TEX,
    (ctx) => drawPlunger(ctx, theme.buttons.left, theme, true),
    px,
  );
  makeCanvas(
    scene,
    'btn_right_up',
    BUTTON_TEX,
    BUTTON_TEX,
    (ctx) => drawPlunger(ctx, theme.buttons.right, theme, false),
    px,
  );
  makeCanvas(
    scene,
    'btn_right_down',
    BUTTON_TEX,
    BUTTON_TEX,
    (ctx) => drawPlunger(ctx, theme.buttons.right, theme, true),
    px,
  );
  makeCanvas(
    scene,
    'tank_bg',
    TUNING.TANK_W,
    TUNING.TANK_H,
    (ctx) => drawBackground(ctx, theme, TUNING.TANK_W, TUNING.TANK_H),
    px,
  );
  makeCanvas(
    scene,
    'tank_water',
    TUNING.TANK_W,
    TUNING.TANK_H,
    (ctx) => drawWater(ctx, theme, TUNING.TANK_W, TUNING.TANK_H),
    px,
  );
  for (const land of [false, true]) {
    const b = frameBounds(land);
    makeCanvas(
      scene,
      land ? 'frame_land' : 'frame_port',
      b.w,
      b.h,
      (ctx) => drawFrame(ctx, theme, b, land),
      px,
    );
  }
}

/** Display scale to apply to images made from themed textures. */
export function texScale(): number {
  return 1 / TEX_RES;
}
