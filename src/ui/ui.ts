/** Small UI kit: chunky plastic buttons, sliders, toggles and a menu backdrop. */
import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { hex, ThemeManager } from '../systems/ThemeManager';
import { shade } from '../game/Textures';

export function ui() {
  return ThemeManager.current.ui;
}

export function font(): string {
  return ThemeManager.current.ui.font;
}

export interface ButtonOpts {
  color?: string;
  textColor?: string;
  size?: number;
  disabled?: boolean;
  sub?: string;
  icon?: string;
}

export type Button = Phaser.GameObjects.Container & { setLabel?: (s: string) => void };

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: ButtonOpts = {},
): Button {
  const t = ThemeManager.current;
  const color = opts.color ?? t.frame.trim;
  const dis = !!opts.disabled;
  const g = scene.add.graphics();
  const r = Math.min(h / 2, 22);
  const draw = (pressed: boolean) => {
    g.clear();
    const c = dis ? '#8a8f98' : color;
    g.fillStyle(0x000000, 0.28).fillRoundedRect(-w / 2 + 2, -h / 2 + 7, w, h, r);
    g.fillStyle(hex(shade(c, -0.35)), 1).fillRoundedRect(-w / 2, -h / 2 + (pressed ? 2 : 5), w, h, r);
    g.fillStyle(hex(c), 1).fillRoundedRect(-w / 2, -h / 2 + (pressed ? 2 : 0), w, h - 4, r);
    g.fillStyle(0xffffff, pressed ? 0.12 : 0.28).fillRoundedRect(
      -w / 2 + 8,
      -h / 2 + (pressed ? 6 : 4),
      w - 16,
      h * 0.32,
      r * 0.6,
    );
    if (t.frame.outlineWidth > 0) {
      g.lineStyle(Math.min(4, t.frame.outlineWidth), hex(t.frame.outline), 1);
      g.strokeRoundedRect(-w / 2, -h / 2 + (pressed ? 2 : 0), w, h - 4, r);
    }
  };
  draw(false);
  const size = opts.size ?? Math.min(34, Math.round(h * 0.42));
  const textColor = opts.textColor ?? (isLight(color) ? '#2a1a10' : '#ffffff');
  const txt = scene.add
    .text(0, opts.sub ? -size * 0.35 : -2, (opts.icon ? opts.icon + '  ' : '') + label, {
      fontFamily: font(),
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color: dis ? '#d0d3d8' : textColor,
    })
    .setOrigin(0.5);
  const parts: Phaser.GameObjects.GameObject[] = [g, txt];
  if (opts.sub) {
    parts.push(
      scene.add
        .text(0, size * 0.55, opts.sub, {
          fontFamily: font(),
          fontSize: `${Math.round(size * 0.52)}px`,
          color: dis ? '#d0d3d8' : textColor,
        })
        .setOrigin(0.5)
        .setAlpha(0.85),
    );
  }
  const c = scene.add.container(x, y, parts) as Button;
  c.setSize(w, h);
  c.setLabel = (s: string) => txt.setText(s);
  if (!dis) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      draw(true);
      txt.y += 2;
    });
    const release = () => {
      draw(false);
      txt.y = opts.sub ? -size * 0.35 : -2;
    };
    c.on('pointerout', release);
    c.on('pointerup', () => {
      release();
      AudioManager.unlock();
      AudioManager.play('ui');
      onClick();
    });
  }
  return c;
}

function isLight(c: string): boolean {
  const n = hex(c);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 28,
  color?: string,
  style: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, s, {
      fontFamily: font(),
      fontSize: `${size}px`,
      color: color ?? ui().text,
      align: 'center',
      ...style,
    })
    .setOrigin(0.5);
}

export function heading(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 54,
): Phaser.GameObjects.Text {
  const t = ThemeManager.current;
  return text(scene, x, y, s, size, t.frame.trim, {
    fontStyle: 'bold',
    stroke: '#00000066',
    strokeThickness: 8,
  });
}

/** Gradient backdrop with drifting bubbles, used by every menu screen. */
export function backdrop(scene: Phaser.Scene): void {
  const t = ThemeManager.current;
  const W = scene.scale.width;
  const H = scene.scale.height;
  scene.cameras.main.setBackgroundColor(t.frame.shellDark);
  const g = scene.add.graphics();
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(hex(t.frame.shell)),
      Phaser.Display.Color.ValueToColor(hex(t.frame.shellDark)),
      steps,
      i,
    );
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1).fillRect(
      0,
      (H / steps) * i,
      W,
      H / steps + 1,
    );
  }
  g.fillStyle(0xffffff, 0.06);
  for (let i = 0; i < 9; i++) g.fillCircle((W / 8) * i, H * 0.12 + (i % 2) * 40, 60 + (i % 3) * 30);
  if (scene.textures.exists('bubble')) {
    const em = scene.add.particles(0, 0, 'bubble', {
      x: { min: 0, max: W },
      y: H + 20,
      speedY: { min: -120, max: -50 },
      speedX: { min: -15, max: 15 },
      scale: { min: 0.5, max: 1.6 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 9000,
      frequency: 260,
      maxParticles: 50,
    });
    em.setDepth(0);
  }
}

export function slider(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  value: number,
  onChange: (v: number) => void,
): Phaser.GameObjects.Container {
  const t = ThemeManager.current;
  const track = scene.add.graphics();
  const knob = scene.add.graphics();
  const draw = (v: number) => {
    track.clear();
    track.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2, -7, w, 14, 7);
    track.fillStyle(hex(t.frame.trim), 1).fillRoundedRect(-w / 2, -7, Math.max(14, w * v), 14, 7);
    knob.clear();
    knob.fillStyle(0x000000, 0.3).fillCircle(-w / 2 + w * v, 3, 20);
    knob.fillStyle(0xffffff, 1).fillCircle(-w / 2 + w * v, 0, 19);
    knob.fillStyle(hex(t.frame.trim), 1).fillCircle(-w / 2 + w * v, 0, 9);
  };
  draw(value);
  const c = scene.add.container(x, y, [track, knob]);
  c.setSize(w + 40, 54);
  c.setInteractive({ draggable: false, useHandCursor: true });
  let dragging = false;
  const set = (p: Phaser.Input.Pointer) => {
    const local = p.x - (c.x - w / 2);
    const v = Phaser.Math.Clamp(local / w, 0, 1);
    draw(v);
    onChange(v);
  };
  c.on('pointerdown', (p: Phaser.Input.Pointer) => {
    dragging = true;
    set(p);
  });
  scene.input.on('pointermove', (p: Phaser.Input.Pointer) => dragging && p.isDown && set(p));
  scene.input.on('pointerup', () => (dragging = false));
  return c;
}

export function toggle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: boolean,
  onChange: (v: boolean) => Promise<boolean> | boolean | void,
): Phaser.GameObjects.Container {
  const t = ThemeManager.current;
  const g = scene.add.graphics();
  let v = value;
  const draw = () => {
    g.clear();
    g.fillStyle(v ? hex(t.frame.trim) : 0x555a66, 1).fillRoundedRect(-38, -20, 76, 40, 20);
    g.fillStyle(0xffffff, 1).fillCircle(v ? 18 : -18, 0, 15);
  };
  draw();
  const c = scene.add.container(x, y, [g]);
  c.setSize(90, 50);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerup', async () => {
    AudioManager.unlock();
    AudioManager.play('ui');
    const want = !v;
    const res = await onChange(want);
    v = res === false ? false : want;
    draw();
  });
  return c;
}

/** Restart the scene when the orientation changes so layouts recompute. */
export function restartOnResize(scene: Phaser.Scene, data?: object): void {
  const handler = () => scene.scene.restart(data);
  scene.scale.on('resize', handler);
  scene.events.once('shutdown', () => scene.scale.off('resize', handler));
}

/** A rounded translucent panel. */
export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.35,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, alpha).fillRoundedRect(x - w / 2, y - h / 2, w, h, 24);
  g.lineStyle(2, 0xffffff, 0.12).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 24);
  return g;
}
