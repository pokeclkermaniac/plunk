import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { Ball } from '../game/Ball';
import { floorProfile, floorYAt } from '../game/Floor';
import { Hoop } from '../game/Hoop';
import { Jet } from '../game/Jet';
import { DEPTH, M, type Body } from '../game/Matter';
import { Obstacle } from '../game/Obstacles';
import { Peg } from '../game/Peg';
import type { FreePiece } from '../game/Piece';
import { Ring } from '../game/Ring';
import {
  applyDelta,
  clearTarget,
  isFull,
  onPieceLanded,
  type LandContext,
  type LandResult,
} from '../game/Scoring';
import { pickPiece, seededRng, type Rng } from '../game/Spawner';
import type { Target } from '../game/Target';
import { frameBounds, texScale } from '../game/Textures';
import type { Piece } from '../game/types';
import { ENDLESS_RAMP } from '../modes/EndlessMode';
import { emptyStats, evaluateGoal, type RoundStats } from '../modes/Goals';
import { completionBonus } from '../modes/LevelMode';
import type { RoundConfig } from '../modes/RoundConfig';
import { AudioManager } from '../systems/AudioManager';
import { Haptics } from '../systems/Haptics';
import type { BoosterId } from '../systems/Progression';
import { Save } from '../systems/SaveSystem';
import { hex, ThemeManager, type Theme } from '../systems/ThemeManager';
import { Tilt } from '../systems/Tilt';
import { applyWater } from '../game/Water';

export type EndReason = 'time' | 'outOfPieces' | 'goal' | 'failed' | 'quit';

export interface RoundSummary {
  cfg: RoundConfig;
  score: number;
  scores: [number, number];
  winner: -1 | 0 | 1;
  stats: RoundStats;
  reason: EndReason;
  goalMet: boolean;
  bonus: number;
  boostersUsed: boolean;
  fullBonuses: number;
}

const DEBUG = typeof location !== 'undefined' && /[?&]debug/.test(location.search);

export class GameScene extends Phaser.Scene {
  cfg!: RoundConfig;
  /** The config exactly as passed in (cfg may be tweaked during the round). */
  originalCfg!: RoundConfig;
  theme!: Theme;
  pieces: FreePiece[] = [];
  pegs: Peg[] = [];
  hoops: Hoop[] = [];
  targets: Target[] = [];
  obstacles: Obstacle[] = [];
  jets: Jet[] = [];
  score = 0;
  scores: [number, number] = [0, 0];
  timeLeftMs: number | null = null;
  supply: number | null = null;
  stats: RoundStats = emptyStats();
  paused = false;
  ended = false;
  colors = 3;
  specialChance = 0;
  hotHands = false;
  suddenDeath = false;
  boostersUsed = false;
  fullBonuses = 0;
  selectMode: 'magnet' | 'colorswap' | null = null;
  magnet: { target: Target; until: number } | null = null;
  slowmoUntil = 0;
  message: { text: string; until: number } | null = null;
  /** Physics clock (ms of simulated time, slows during slow-mo). */
  simTime = 0;

  private acc = 0;
  private lastReal = 0;
  private rng: Rng = Math.random;
  private rampIndex = 0;
  private floor: [number, number][] = [];
  private buttons: Phaser.GameObjects.Image[] = [];
  private frame!: Phaser.GameObjects.Image;
  private bubbles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private waterFront!: Phaser.GameObjects.Rectangle;
  private surface!: Phaser.GameObjects.Graphics;
  private baseZoom = 1;
  private lastWarnSec = -1;
  private keyHandlers: (() => void)[] = [];
  private landscape = false;
  private pendingTankClear = new Set<number>();

  constructor() {
    super('Game');
  }

  init(data: { config: RoundConfig; seed?: number }): void {
    this.cfg = data.config;
    this.originalCfg = data.config;
    this.rng = data.seed !== undefined ? seededRng(data.seed) : Math.random;
    this.pieces = [];
    this.pegs = [];
    this.hoops = [];
    this.targets = [];
    this.obstacles = [];
    this.jets = [];
    this.score = 0;
    this.scores = [0, 0];
    this.timeLeftMs = this.cfg.timeSeconds !== null ? this.cfg.timeSeconds * 1000 : null;
    this.supply = this.cfg.supply;
    this.paused = false;
    this.ended = false;
    this.colors = this.cfg.colors;
    this.specialChance = this.cfg.specialChance;
    this.hotHands = false;
    this.suddenDeath = false;
    this.boostersUsed = false;
    this.fullBonuses = 0;
    this.selectMode = null;
    this.magnet = null;
    this.slowmoUntil = 0;
    this.message = null;
    this.simTime = 0;
    this.acc = 0;
    this.lastReal = 0;
    this.rampIndex = 0;
    this.lastWarnSec = -1;
    this.buttons = [];
    this.pendingTankClear = new Set();
  }

  create(): void {
    // Our event emitter outlives restarts: drop listeners left by a previous HUD.
    this.events.off('layout');
    this.events.off('requestPause');
    this.events.off('scored');
    this.theme = ThemeManager.current;
    AudioManager.pack = this.theme.sound;
    AudioManager.intensity = 0;
    const world = this.matter.world;
    world.setGravity(0, TUNING.GRAVITY_Y);
    world.autoUpdate = false;
    this.input.addPointer(3);

    const ring = this.cfg.gameType === 'ringToss';
    const jx = this.cfg.jets ?? (ring ? [190, 410] : [170, 430]);
    this.floor = floorProfile(jx as [number, number]);
    const tilt = ring ? TUNING.JET_TILT_DEG_RINGS : TUNING.JET_TILT_DEG_BASKETBALL;
    this.jets = [new Jet('left', jx[0], TUNING.TANK_H, tilt), new Jet('right', jx[1], TUNING.TANK_H, tilt)];

    // tank visuals
    this.add.image(0, 0, 'tank_bg').setOrigin(0).setScale(texScale()).setDepth(DEPTH.bg);
    this.add.image(0, 0, 'tank_water').setOrigin(0).setScale(texScale()).setDepth(DEPTH.water);
    this.waterFront = this.add
      .rectangle(
        0,
        TUNING.WATER_SURFACE_Y,
        TUNING.TANK_W,
        TUNING.TANK_H - TUNING.WATER_SURFACE_Y,
        hex(this.theme.water.top),
        this.theme.water.front,
      )
      .setOrigin(0)
      .setDepth(DEPTH.waterFront);
    this.surface = this.add.graphics().setDepth(DEPTH.waterFront);
    this.buildWalls();
    this.drawFloor();

    // targets
    this.cfg.targets.forEach((def, i) => {
      if (def.kind === 'peg') {
        const onFloor = def.y >= TUNING.TANK_H - 1;
        const d = onFloor ? { ...def, y: floorYAt(this.floor, def.x) + 4 } : def;
        const p = new Peg(this, d, i, this.theme);
        this.pegs.push(p);
        this.targets.push(p);
      } else {
        const h = new Hoop(this, def, i, this.theme);
        this.hoops.push(h);
        this.targets.push(h);
      }
    });
    this.stats = emptyStats(this.hoops.length);
    for (const o of this.cfg.obstacles) this.obstacles.push(new Obstacle(this, o, this.theme));

    // particles
    this.bubbles = this.add.particles(0, 0, 'bubble', {
      emitting: false,
      speedY: { min: -320, max: -140 },
      speedX: { min: -40, max: 40 },
      scale: { min: 0.35 * texScale(), max: 1.15 * texScale() },
      alpha: { start: 0.95, end: 0.6 },
      lifespan: 6000,
      maxParticles: TUNING.MAX_BUBBLES,
      accelerationY: -60,
      deathZone: {
        type: 'onLeave',
        source: new Phaser.Geom.Rectangle(
          -10,
          TUNING.WATER_SURFACE_Y + 4,
          TUNING.TANK_W + 20,
          TUNING.TANK_H + 40,
        ),
      } as any,
      emitCallback: (p: any) => {
        p.wob = Math.random() * Math.PI * 2;
      },
      accelerationX: {
        onEmit: () => 0,
        onUpdate: (p: any, _k: string, t: number) => Math.sin(t * 40 + (p.wob ?? 0)) * 160,
      } as any,
    } as any);
    this.bubbles.setDepth(DEPTH.bubbles);
    this.sparkles = this.add.particles(0, 0, 'sparkle', {
      emitting: false,
      speed: { min: 80, max: 340 },
      scale: { start: 1.1 * texScale(), end: 0 },
      lifespan: { min: 400, max: 900 },
      gravityY: 200,
      blendMode: 'ADD',
      maxParticles: 160,
    });
    this.sparkles.setDepth(DEPTH.popup);

    // buttons + frame
    this.frame = this.add.image(0, 0, 'frame_port').setOrigin(0).setDepth(DEPTH.frame);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 'left' : 'right';
      const b = this.add
        .image(0, 0, `btn_${side}_up`)
        .setScale(texScale() * 0.92)
        .setDepth(DEPTH.buttons);
      const fw = b.width; // texture-space size (BUTTON_TEX × texture resolution)
      b.setInteractive(new Phaser.Geom.Circle(fw / 2, fw / 2, (fw / 2) * 1.08), Phaser.Geom.Circle.Contains);
      b.on('pointerdown', () => this.pressJet(i));
      this.buttons.push(b);
    }
    this.layout();
    this.scale.on('resize', this.layout, this);

    // keyboard
    const kb = this.input.keyboard;
    if (kb) {
      const bind = (key: string, fn: () => void) => {
        kb.on(`keydown-${key}`, fn);
        this.keyHandlers.push(() => kb.off(`keydown-${key}`, fn));
      };
      bind('A', () => this.pressJet(0));
      bind('LEFT', () => this.pressJet(0));
      bind('L', () => this.pressJet(1));
      bind('RIGHT', () => this.pressJet(1));
      bind('ESC', () => this.events.emit('requestPause'));
      bind('P', () => this.events.emit('requestPause'));
    }

    // world taps (booster targeting)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onWorldTap(p));

    // collisions → sounds, rim/board tracking
    world.on('collisionstart', (ev: any) => this.onCollisions(ev.pairs));

    this.spawnStartPieces();
    if (Save.data.settings.tilt) Tilt.resume();

    this.scene.launch('Hud', { game: this });
    this.scene.bringToTop('Hud');
    AudioManager.startMusic();

    this.events.once('shutdown', () => this.cleanup());
    if (DEBUG) (window as any).__plunk = this;
  }

  // ── layout ─────────────────────────────────────────────────────
  layout(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.landscape = W > H;
    const b = frameBounds(this.landscape);
    this.frame.setTexture(this.landscape ? 'frame_land' : 'frame_port').setScale(texScale());
    this.frame.setPosition(b.x, b.y);
    const zoom = Math.min(W / b.w, H / b.h);
    this.baseZoom = zoom;
    const cam = this.cameras.main;
    cam.setZoom(zoom);
    cam.centerOn(b.x + b.w / 2, b.y + b.h / 2);
    cam.setBackgroundColor(this.theme.ui.panel);
    const pos = this.buttonPositions();
    this.buttons.forEach((btn, i) => btn.setPosition(pos[i].x, pos[i].y));
    this.events.emit('layout');
  }

  buttonPositions(): { x: number; y: number }[] {
    if (this.landscape)
      return [
        { x: -170, y: 660 },
        { x: TUNING.TANK_W + 170, y: 660 },
      ];
    return [
      { x: 125, y: TUNING.TANK_H + 170 },
      { x: TUNING.TANK_W - 125, y: TUNING.TANK_H + 170 },
    ];
  }

  zoomLevel(): number {
    return this.baseZoom;
  }

  isLandscape(): boolean {
    return this.landscape;
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    // Computed from the layout itself (the camera's worldView only updates on the next render).
    const b = frameBounds(this.landscape);
    const z = this.baseZoom;
    return {
      x: (x - (b.x + b.w / 2)) * z + this.scale.width / 2,
      y: (y - (b.y + b.h / 2)) * z + this.scale.height / 2,
    };
  }

  // ── world construction ─────────────────────────────────────────
  private buildWalls(): void {
    const W = TUNING.TANK_W;
    const H = TUNING.TANK_H;
    const t = 80;
    const add = (x: number, y: number, w: number, h: number, angle = 0, label = 'wall') => {
      const b: Body = this.matter.add.rectangle(x, y, w, h, { isStatic: true, label, friction: 0.02 });
      if (angle) M.Body.setAngle(b, angle);
    };
    add(-t / 2, H / 2, t, H * 2);
    add(W + t / 2, H / 2, t, H * 2);
    add(W / 2, -t / 2, W + 2 * t, t);
    add(W / 2, H + t / 2, W + 2 * t, t, 0, 'floor');
    // sloped floor segments
    for (let i = 0; i < this.floor.length - 1; i++) {
      const [x0, y0] = this.floor[i];
      const [x1, y1] = this.floor[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const th = 40;
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      add((x0 + x1) / 2 + (nx * th) / 2, (y0 + y1) / 2 + (ny * th) / 2, len + 6, th, ang, 'floor');
    }
  }

  private drawFloor(): void {
    const g = this.add.graphics().setDepth(DEPTH.obstacle);
    const col = hex(this.theme.obstacle.shade);
    const top = hex(this.theme.obstacle.color);
    g.fillStyle(col, 1);
    g.beginPath();
    g.moveTo(0, TUNING.TANK_H + 4);
    for (const [x, y] of this.floor) g.lineTo(x, y);
    g.lineTo(TUNING.TANK_W, TUNING.TANK_H + 4);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, top, 1);
    g.beginPath();
    this.floor.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.strokePath();
    // nozzles
    for (const j of this.jets) {
      g.fillStyle(0x222222, 0.85).fillRoundedRect(j.x - 26, TUNING.TANK_H - 7, 52, 10, 4);
      g.fillStyle(0x000000, 0.6);
      for (let k = -18; k <= 18; k += 9) g.fillCircle(j.x + k, TUNING.TANK_H - 2, 2.5);
    }
  }

  // ── spawning ───────────────────────────────────────────────────
  private nextPiece(): Piece {
    return pickPiece(
      { colors: this.colors, specialChance: this.specialChance, specialWeights: this.cfg.specialWeights },
      this.rng,
    );
  }

  private addPiece(piece: Piece, x: number, y: number): FreePiece {
    const p: FreePiece =
      this.cfg.gameType === 'ringToss'
        ? new Ring(this, x, y, piece, (this.rng() - 0.5) * 0.6)
        : new Ball(this, x, y, piece);
    this.pieces.push(p);
    return p;
  }

  private spawnStartPieces(): void {
    const n = this.cfg.startPieces;
    const specials = this.cfg.startSpecials ?? [];
    const avoid = this.pegs.map((p) => p.x);
    for (let i = 0; i < n; i++) {
      // Start pieces rest low, around the jets, never straight above a peg.
      const j = this.jets[i % 2];
      let x = j.x;
      for (let tries = 0; tries < 10; tries++) {
        x = j.x + (this.rng() - 0.5) * 150;
        if (avoid.every((a) => Math.abs(a - x) > 55)) break;
      }
      const y = floorYAt(this.floor, x) - 40 - Math.floor(i / 2) * 55;
      const piece: Piece =
        i < specials.length ? { color: i % this.colors, kind: specials[i] } : this.nextPiece();
      // Guarantee every colour appears at the start.
      if (i < this.colors && piece.kind === 'normal') piece.color = i;
      this.addPiece(piece, x, y);
    }
  }

  /** Drop a new piece in from the top, away from the targets so it isn't a free score. */
  private dropPiece(piece: Piece = this.nextPiece()): void {
    const avoid =
      this.cfg.gameType === 'ringToss' ? this.pegs.map((p) => p.x) : this.hoops.map((h) => h.rimCenterX);
    let x = 300;
    for (let tries = 0; tries < 12; tries++) {
      x = 70 + this.rng() * (TUNING.TANK_W - 140);
      if (avoid.every((a) => Math.abs(a - x) > 70)) break;
    }
    const p = this.addPiece(piece, x, TUNING.WATER_SURFACE_Y + 40);
    M.Body.setVelocity(p.body, { x: 0, y: 1.5 });
  }

  private freeCount(): number {
    return this.pieces.filter((p) => p.alive).length;
  }

  /** After a landing: drop a replacement if the mode wants one and supply allows. */
  private replenish(): void {
    if (this.cfg.gameType === 'basketball') {
      let free = this.freeCount();
      while (free < TUNING.BALLS_MIN_FREE) {
        this.dropPiece();
        free++;
      }
      return;
    }
    if (!this.cfg.replaceOnLand) return;
    if (this.supply === null) this.dropPiece();
    else if (this.supply > 0) {
      this.supply--;
      this.dropPiece();
    }
  }

  // ── input ──────────────────────────────────────────────────────
  pressJet(i: number): void {
    AudioManager.unlock();
    if (this.paused || this.ended) return;
    const jet = this.jets[i];
    const btn = this.buttons[i];
    const side = i === 0 ? 'left' : 'right';
    btn.setTexture(`btn_${side}_down`);
    this.time.delayedCall(110, () => btn.active && btn.setTexture(`btn_${side}_up`));
    if (!jet.fire(this.simTime)) return;
    AudioManager.play('click');
    AudioManager.play('bubble');
    Haptics.tap();
    const n = Phaser.Math.Between(TUNING.BUBBLES_PER_TAP_MIN, TUNING.BUBBLES_PER_TAP_MAX);
    for (let k = 0; k < n; k++) {
      const off = (Math.random() - 0.5) * TUNING.JET_NOZZLE_WIDTH * 0.8;
      this.bubbles.emitParticleAt(jet.x + off, TUNING.TANK_H - 6 - Math.random() * 30, 1);
    }
  }

  private onWorldTap(p: Pointer): void {
    if (!this.selectMode || this.paused || this.ended) return;
    const wx = p.worldX;
    const wy = p.worldY;
    if (this.selectMode === 'magnet') {
      let best: Target | null = null;
      let bd = 170;
      for (const t of this.targets) {
        const a = t.anchor();
        const d = Math.hypot(a.x - wx, a.y + 40 - wy);
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
      if (!best) return;
      this.consumeBooster('magnet');
      this.magnet = { target: best, until: this.simTime + TUNING.MAGNET_SECONDS * 1000 };
      this.flash('Magnet on!');
      AudioManager.play('golden');
    } else {
      let best: FreePiece | null = null;
      let bd = 80;
      for (const fp of this.pieces) {
        if (!fp.alive) continue;
        const d = Math.hypot(fp.body.position.x - wx, fp.body.position.y - wy);
        if (d < bd) {
          bd = d;
          best = fp;
        }
      }
      if (!best) return;
      this.consumeBooster('colorswap');
      // Recolour to match the nearest target that has a streak going.
      let color = (best.piece.color + 1) % this.colors;
      let near = Infinity;
      for (const t of this.targets) {
        if (t.state.streakColor === null || isFull(t.state)) continue;
        const a = t.anchor();
        const d = Math.hypot(a.x - best.body.position.x, a.y - best.body.position.y);
        if (d < near) {
          near = d;
          color = t.state.streakColor;
        }
      }
      best.setPiece({ color, kind: best.piece.kind === 'heavy' ? 'heavy' : 'normal' });
      this.sparkles.explode(10, best.body.position.x, best.body.position.y);
      AudioManager.play('golden');
    }
    this.selectMode = null;
  }

  // ── boosters ───────────────────────────────────────────────────
  boosterAvailable(id: BoosterId): boolean {
    if (!this.cfg.boostersAllowed || this.ended) return false;
    if ((Save.data.boosters[id] ?? 0) <= 0) return false;
    if (id === 'extratime') return this.timeLeftMs !== null;
    return true;
  }

  useBooster(id: BoosterId): void {
    if (!this.boosterAvailable(id) || this.paused) return;
    AudioManager.unlock();
    if (id === 'magnet' || id === 'colorswap') {
      this.selectMode = this.selectMode === id ? null : id;
      if (this.selectMode) this.flash(id === 'magnet' ? 'Tap a peg or hoop' : 'Tap a piece to recolor', 2500);
      return;
    }
    this.consumeBooster(id);
    if (id === 'slowmo') {
      this.slowmoUntil = this.time.now + TUNING.SLOWMO_SECONDS * 1000;
      this.flash('Slow-mo!');
    } else if (id === 'extratime' && this.timeLeftMs !== null) {
      this.timeLeftMs += TUNING.EXTRA_TIME_SECONDS * 1000;
      this.flash(`+${TUNING.EXTRA_TIME_SECONDS} seconds!`);
    }
    AudioManager.play('golden');
  }

  private consumeBooster(id: BoosterId): void {
    Save.data.boosters[id] = Math.max(0, (Save.data.boosters[id] ?? 0) - 1);
    Save.save();
    this.boostersUsed = true;
  }

  flash(text: string, ms = 1600): void {
    this.message = { text, until: this.time.now + ms };
  }

  // ── main loop ──────────────────────────────────────────────────
  update(): void {
    // Use real elapsed time: Phaser's smoothed delta under-reports on slow frames,
    // which would make the whole toy run in slow motion on weaker phones.
    const nowReal = performance.now();
    const dt = Math.min(nowReal - (this.lastReal || nowReal), 100);
    this.lastReal = nowReal;
    if (this.paused || this.ended) return;
    const slow = this.time.now < this.slowmoUntil;
    const timeScale = slow ? TUNING.SLOWMO_TIMESCALE : 1;
    this.matter.world.engine.timing.timeScale = timeScale;

    this.acc += dt;
    let steps = 0;
    const stepMs = TUNING.PHYSICS_STEP_MS;
    while (this.acc >= stepMs && steps < TUNING.MAX_STEPS_PER_FRAME) {
      this.step(stepMs, timeScale);
      this.acc -= stepMs;
      steps++;
    }
    if (steps === TUNING.MAX_STEPS_PER_FRAME) this.acc = 0;

    for (const p of this.pieces) p.sync();
    for (const t of this.targets)
      t.updateBadge(t instanceof Hoop ? this.theme.balls.colors : this.theme.rings.colors);
    this.drawSurface();

    // timer (real time; slow-mo doesn't slow the clock)
    if (this.timeLeftMs !== null) {
      this.timeLeftMs -= dt;
      const sec = Math.ceil(this.timeLeftMs / 1000);
      if (sec <= TUNING.TIMER_WARNING_SECONDS && sec > 0 && sec !== this.lastWarnSec) {
        this.lastWarnSec = sec;
        AudioManager.play('warning');
      }
      if (this.cfg.hotHands && !this.hotHands && this.timeLeftMs <= TUNING.HOT_HANDS_SECONDS * 1000) {
        this.hotHands = true;
        AudioManager.intensity = 1;
        AudioManager.play('hothands');
        this.flash('🔥 HOT HANDS! Double points! 🔥', 2200);
        this.shake(TUNING.SHAKE_SMALL, 200);
        this.tweens.add({
          targets: this.waterFront,
          alpha: { from: 0.25, to: this.theme.water.front },
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
        this.waterFront.setFillStyle(0xff7a1a, 0.18);
      }
      if (this.timeLeftMs <= 0) {
        this.timeLeftMs = 0;
        this.onTimeUp();
      }
    }
    if (this.message && this.time.now > this.message.until) this.message = null;
    this.checkSupplyEnd();
  }

  private step(dtMs: number, timeScale: number): void {
    this.simTime += dtMs * timeScale;
    const now = this.simTime;
    const g = (this.matter.world.engine as any).gravity as { y: number; scale: number };
    const tilt = Save.data.settings.tilt ? Tilt.factor() : 0;
    applyWater(this.pieces, g.y, g.scale, tilt);
    for (const j of this.jets) j.apply(this.pieces, now, timeScale, this.rng);
    for (const p of this.pieces) {
      if (isBall(p) && p.lastJetHit === now) {
        p.touchedRim = false;
        p.touchedBoard = false;
      }
    }
    if (this.magnet) {
      if (now > this.magnet.until) this.magnet = null;
      else this.applyMagnet(this.magnet.target, timeScale);
    }
    for (const o of this.obstacles) o.update(dtMs * timeScale);
    for (const t of this.targets) t.update(now, dtMs * timeScale);

    for (const p of this.pieces) if (isBall(p)) p.prevY = p.body.position.y;
    this.matter.world.step(dtMs);

    // captures & baskets
    for (const p of [...this.pieces]) {
      if (!p.alive) continue;
      if (isRing(p)) {
        for (const peg of this.pegs) {
          if (peg.canCapture(p)) {
            this.captureRing(p, peg);
            break;
          }
        }
      } else if (isBall(p)) {
        for (const h of this.hoops) {
          if (h.checkBasket(p, now)) {
            this.scoreBasket(p, h);
            break;
          }
        }
      }
      if (p.alive) this.rescue(p);
    }
    this.pieces = this.pieces.filter((p) => p.alive);
  }

  private applyMagnet(t: Target, timeScale: number): void {
    const a = t.anchor();
    const goal = { x: a.x, y: a.y - 70 };
    const want = t instanceof Peg ? 'ring' : 'ball';
    for (const p of this.pieces) {
      if (!p.alive || p.type !== want) continue;
      const dx = goal.x - p.body.position.x;
      const dy = goal.y - p.body.position.y;
      const d = Math.hypot(dx, dy);
      if (d > TUNING.MAGNET_RADIUS * 1.6 || d < 4) continue;
      const k = TUNING.MAGNET_PULL * timeScale * Math.min(1, 40 / d + 0.3);
      M.Body.setVelocity(p.body, {
        x: p.body.velocity.x * 0.92 + (dx / d) * k,
        y: p.body.velocity.y * 0.92 + (dy / d) * k * 0.6,
      });
      if (isRing(p)) M.Body.setAngle(p.body, p.body.angle * 0.9);
    }
  }

  /** Pieces that tunnel out of the tank are put back on the floor. */
  private rescue(p: FreePiece): void {
    const { x, y } = p.body.position;
    if (
      x < -20 ||
      x > TUNING.TANK_W + 20 ||
      y < -40 ||
      y > TUNING.TANK_H + 30 ||
      !isFinite(x) ||
      !isFinite(y)
    ) {
      M.Body.setPosition(p.body, { x: this.jets[Math.floor(this.rng() * 2)].x, y: TUNING.TANK_H - 80 });
      M.Body.setVelocity(p.body, { x: 0, y: 0 });
    }
  }

  private drawSurface(): void {
    const g = this.surface;
    g.clear();
    const y0 = TUNING.WATER_SURFACE_Y;
    const t = this.time.now / 600;
    g.fillStyle(0xffffff, 0.12).fillRect(0, 0, TUNING.TANK_W, y0);
    g.lineStyle(3, hex(this.theme.water.surface), 0.85);
    g.beginPath();
    for (let x = 0; x <= TUNING.TANK_W; x += 20) {
      const y = y0 + Math.sin(x / 45 + t) * 2.2 + Math.sin(x / 17 - t * 1.7) * 1;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
  }

  // ── collisions ─────────────────────────────────────────────────
  private onCollisions(pairs: any[]): void {
    for (const pair of pairs) {
      const a = pair.bodyA as Body;
      const b = pair.bodyB as Body;
      const pa = ((a.parent as any)?.plunk ?? (a as any).plunk) as FreePiece | undefined;
      const pb = ((b.parent as any)?.plunk ?? (b as any).plunk) as FreePiece | undefined;
      const handle = (piece: FreePiece | undefined, other: Body, otherPiece: FreePiece | undefined) => {
        if (!piece) return;
        const v = piece.body.velocity;
        const speed = Math.hypot(v.x, v.y);
        if (isBall(piece)) {
          if (other.label === 'rim') {
            piece.touchedRim = true;
            AudioManager.play('clang');
            const now = this.simTime;
            piece.rimHits = piece.rimHits.filter((t) => now - t < TUNING.RIM_RATTLE_WINDOW_MS);
            piece.rimHits.push(now);
            if (piece.rimHits.length === 2) {
              AudioManager.play('clang');
              this.shake(TUNING.RATTLE_NUDGE, 120);
            }
          } else if (other.label === 'board') {
            piece.touchedBoard = true;
            AudioManager.play('thunk');
          } else if (speed > 1.2) AudioManager.play('bounce', speed / 6);
        } else if (speed > 0.8 && (otherPiece || other.label === 'peg' || other.label === 'stack')) {
          AudioManager.play('tick', speed / 5);
        }
      };
      handle(pa, b, pb);
      if (!pa || !pb) handle(pb, a, pa);
    }
  }

  // ── landings ───────────────────────────────────────────────────
  private captureRing(ring: Ring, peg: Peg): void {
    ring.detach();
    const slot = peg.state.stack.length;
    const result = onPieceLanded(peg.state, ring.piece, this.cfg.rules);
    peg.state = result.target;
    const tx = peg.x;
    if (ring.piece.kind === 'bomb') {
      this.tweens.add({
        targets: [ring.back, ring.front],
        x: tx,
        y: peg.slotY(Math.min(slot, peg.state.capacity - 1)),
        rotation: 0,
        duration: 160,
        onComplete: () => {
          const pts = peg.popStack();
          ring.destroy();
          peg.rebuildStackBody();
          for (const pt of pts) this.sparkles.explode(6, pt.x, pt.y);
          this.sparkles.explode(16, tx, peg.baseY - 30);
          AudioManager.play('bomb');
          this.shake(TUNING.SHAKE_BIG, 260);
          Haptics.big();
        },
      });
    } else {
      ring.back.setDepth(DEPTH.ringBack);
      ring.front.setDepth(DEPTH.ringFront);
      const ty = peg.slotY(slot);
      this.tweens.add({
        targets: [ring.back, ring.front],
        x: tx,
        rotation: 0,
        duration: TUNING.RING_SLIDE_MS * 0.6,
        ease: 'Quad.easeOut',
      });
      this.tweens.add({
        targets: [ring.back, ring.front],
        y: ty,
        duration: TUNING.RING_SLIDE_MS,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          peg.addStackVisual(slot, ring);
          if (this.theme.squash)
            this.tweens.add({
              targets: [ring.back, ring.front],
              scaleY: texScale() * 0.75,
              duration: 70,
              yoyo: true,
            });
        },
      });
      peg.rebuildStackBody();
      AudioManager.play('clack');
    }
    this.applyResult(result, peg, ring.piece, {});
    this.replenish();
  }

  private scoreBasket(ball: Ball, hoop: Hoop): void {
    const ctx: LandContext = {
      swish: !ball.touchedRim && !ball.touchedBoard,
      bank: ball.touchedBoard,
      globalMult: this.hotHands ? TUNING.HOT_HANDS_MULT : 1,
    };
    ball.detach();
    const slot = hoop.state.stack.length;
    const result = onPieceLanded(hoop.state, ball.piece, this.cfg.rules, ctx);
    hoop.state = result.target;
    hoop.swish();
    if (ctx.swish) AudioManager.play('swish');
    else AudioManager.play('clack');
    this.stats.baskets++;
    if (ctx.swish) this.stats.swishes++;
    if (ctx.bank) this.stats.banks++;
    if (!this.stats.hoopsScored.includes(hoop.index)) this.stats.hoopsScored.push(hoop.index);

    if (ball.piece.kind === 'bomb') {
      const pts = hoop.drainTube();
      this.tweens.add({
        targets: ball.image,
        scale: texScale() * 1.6,
        alpha: 0,
        duration: 200,
        onComplete: () => ball.destroy(),
      });
      AudioManager.play('bomb');
      this.shake(TUNING.SHAKE_BIG, 240);
      this.sparkles.explode(18, hoop.rimCenterX, hoop.rimY + 40);
      const back = result.removed.filter((p) => p.kind !== 'bomb');
      this.time.delayedCall(450, () => this.returnBalls(back, pts));
    } else {
      this.tweens.add({
        targets: ball.image,
        x: hoop.rimCenterX,
        y: hoop.tubeSlotY(Math.min(slot, hoop.state.capacity - 1)),
        scale: texScale() * 0.62,
        duration: 260,
        ease: 'Quad.easeIn',
        onComplete: () => {
          hoop.addTubeBall(slot, ball);
          if (result.removed.length > 0) {
            this.time.delayedCall(260, () => {
              const pts = hoop.drainTube();
              AudioManager.play('whoosh');
              this.time.delayedCall(420, () => this.returnBalls(result.removed, pts));
            });
          }
        },
      });
    }
    this.applyResult(result, hoop, ball.piece, ctx);
    this.replenish();
  }

  /** Drained balls come back into the tank from the bottom (up to the cap). */
  private returnBalls(pieces: Piece[], _from: { x: number; y: number }[]): void {
    if (this.ended) return;
    for (const p of pieces) {
      if (this.freeCount() >= TUNING.MAX_FREE_BALLS) break;
      const j = this.jets[Math.floor(this.rng() * 2)];
      const b = this.addPiece(p, j.x + (this.rng() - 0.5) * 60, TUNING.TANK_H - 60);
      M.Body.setVelocity(b.body, { x: (this.rng() - 0.5) * 2, y: -2 });
    }
  }

  private colorOf(stack: Piece[]): number {
    const p = stack.find((s) => s.kind !== 'rainbow');
    return p ? p.color : -1;
  }

  private applyResult(result: LandResult, target: Target, piece: Piece, ctx: LandContext): void {
    const owner = target.owner ?? 0;
    if (this.cfg.versus) this.scores[owner] = applyDelta(this.scores[owner], result.points);
    this.score = applyDelta(this.score, this.cfg.versus ? 0 : result.points);
    if (this.cfg.versus) this.score = Math.max(this.scores[0], this.scores[1]);
    this.stats.score = this.score;
    this.stats.landed++;
    this.stats.bestStreak = Math.max(this.stats.bestStreak, result.streak);
    const a = target.anchor();
    const colors = target instanceof Hoop ? this.theme.balls.colors : this.theme.rings.colors;
    const types = result.events.map((e) => e.type);

    // popup text
    if (piece.kind !== 'bomb') {
      let label: string;
      if (types.includes('wrongColor')) label = `${result.points}`;
      else label = `+${result.points}`;
      if (result.streak >= 2 && !types.includes('wrongColor')) label += ` x${result.streak}!`;
      if (types.includes('golden')) label = `+${result.points} GOLD!`;
      const col = types.includes('wrongColor') ? '#ff5252' : types.includes('golden') ? '#ffd54f' : '#ffffff';
      this.popup(a.x, a.y - 20, label, col, result.streak >= 4 ? 40 : 32);
      if (ctx.swish) this.popup(a.x, a.y - 60, 'SWISH!', '#7ff3ff', 30);
      else if (ctx.bank) this.popup(a.x, a.y - 60, 'BANK!', '#ffffff', 26);
      if (ctx.globalMult && ctx.globalMult > 1 && result.points > 0)
        this.popup(a.x, a.y - 95, '🔥x2', '#ffb74d', 24);
    } else {
      this.popup(a.x, a.y - 20, 'BOOM!', '#ffcc33', 38);
    }

    if (types.includes('wrongColor')) {
      this.stats.wrong++;
      AudioManager.play('bonk');
      Haptics.bad();
    } else if (types.includes('golden')) {
      AudioManager.play('golden');
      Haptics.land();
      this.sparkles.explode(14, a.x, a.y);
    } else if (piece.kind !== 'bomb') {
      if (result.streak >= 2) AudioManager.play('chime', result.streak);
      Haptics.land();
    }
    if (result.streak >= 4 && !types.includes('fullBonus')) {
      this.shake(TUNING.SHAKE_SMALL, 160);
      this.zoomPunch();
    }

    // glow while a streak builds
    if (target instanceof Peg) {
      const sc = target.state.streakColor;
      target.setGlow(
        isFull(target.state) ? 0 : target.state.streak - 1,
        sc === null ? 0xffffff : hex(colors[sc]),
      );
    }

    if (types.includes('fullBonus')) {
      this.fullBonuses++;
      const stack = target instanceof Hoop ? result.removed : target.state.stack;
      const c = this.colorOf(stack);
      if (target instanceof Hoop) {
        this.stats.fullTubes++;
        this.stats.fullTubeColors.push(c);
      } else {
        this.stats.fullPegs++;
        this.stats.fullPegColors.push(c);
      }
      const bonus = result.events.find((e) => e.type === 'fullBonus')?.points ?? 0;
      this.time.delayedCall(250, () => {
        this.popup(a.x, a.y - 70, `FULL! +${bonus}`, '#ffe066', 44);
        this.sparkles.explode(40, a.x, a.y + 40);
        AudioManager.play('fanfare');
        Haptics.big();
        this.shake(TUNING.SHAKE_BIG, 350);
        this.zoomPunch(TUNING.ZOOM_BIG + 0.03);
      });
      if (this.cfg.endless && this.supply !== null) {
        this.supply += TUNING.ENDLESS_REFILL_ON_FULL_PEG;
        this.time.delayedCall(700, () =>
          this.popup(a.x, a.y - 110, `+${TUNING.ENDLESS_REFILL_ON_FULL_PEG} rings`, '#a5ff8a', 28),
        );
      }
    } else if (types.includes('targetDead')) {
      this.time.delayedCall(250, () => this.popup(a.x, a.y - 60, 'clogged…', '#cfd8dc', 24));
    }

    if (target instanceof Peg) this.checkTankClear(owner);
    this.checkEndlessRamp();
    this.checkGoal();
    this.events.emit('scored');
  }

  private checkTankClear(owner: number): void {
    if (!this.cfg.tankClear) return;
    const group = this.pegs.filter((p) => !this.cfg.versus || (p.owner ?? 0) === owner);
    if (!group.every((p) => isFull(p.state)) || this.pendingTankClear.has(owner)) return;
    this.pendingTankClear.add(owner);
    this.time.delayedCall(900, () => {
      this.pendingTankClear.delete(owner);
      if (this.ended) return;
      for (const p of group) {
        const pts = p.popStack();
        p.state = clearTarget(p.state);
        p.rebuildStackBody();
        p.setGlow(0, 0);
        for (const pt of pts) this.sparkles.explode(4, pt.x, pt.y);
      }
      const bonus = TUNING.TANK_CLEAR_BONUS;
      if (this.cfg.versus) {
        this.scores[owner] += bonus;
        this.score = Math.max(...this.scores);
      } else this.score += bonus;
      this.stats.score = this.score;
      this.flash(`TANK CLEAR! +${bonus}`, 2000);
      AudioManager.play('fanfare');
      this.shake(TUNING.SHAKE_BIG, 300);
      this.zoomPunch(TUNING.ZOOM_BIG);
      Haptics.big();
      this.checkGoal();
    });
  }

  private checkEndlessRamp(): void {
    if (!this.cfg.endless) return;
    while (this.rampIndex < ENDLESS_RAMP.length && this.score >= ENDLESS_RAMP[this.rampIndex].score) {
      const s = ENDLESS_RAMP[this.rampIndex++];
      if (s.colors) this.colors = s.colors;
      if (s.specialChance) this.specialChance = s.specialChance;
      if (s.obstacle) {
        const o = new Obstacle(this, s.obstacle, this.theme);
        o.gfx.setAlpha(0);
        this.tweens.add({ targets: o.gfx, alpha: 1, duration: 600 });
        this.obstacles.push(o);
      }
      this.flash(s.label, 2200);
    }
  }

  private checkGoal(): void {
    if (!this.cfg.goal || this.ended) return;
    const st = evaluateGoal(this.cfg.goal, this.stats);
    if (st.failed) this.endRound('failed');
    else if (st.met) this.endRound('goal');
  }

  private checkSupplyEnd(): void {
    if (this.supply === null || this.ended || !this.cfg.replaceOnLand) return;
    if (this.supply <= 0 && this.freeCount() === 0) {
      // let the last capture tween finish
      this.time.delayedCall(700, () => {
        if (!this.ended && this.freeCount() === 0) this.endRound('outOfPieces');
      });
      this.supply = 0;
      this.cfg = { ...this.cfg, replaceOnLand: false };
    }
  }

  piecesLeft(): number {
    return (this.supply ?? 0) + this.freeCount();
  }

  private onTimeUp(): void {
    if (this.ended) return;
    if (this.cfg.versus && this.scores[0] === this.scores[1] && !this.suddenDeath) {
      this.suddenDeath = true;
      this.timeLeftMs = TUNING.SUDDEN_DEATH_SECONDS * 1000;
      this.lastWarnSec = -1;
      this.flash("It's a tie! SUDDEN DEATH!", 2500);
      AudioManager.play('hothands');
      return;
    }
    this.endRound('time');
  }

  // ── juice ──────────────────────────────────────────────────────
  popup(x: number, y: number, text: string, color = '#ffffff', size = 32): void {
    const t = this.add
      .text(x, y, text, {
        fontFamily: this.theme.ui.font,
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        stroke: '#1a1a2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.popup);
    const cx = Phaser.Math.Clamp(x, t.width / 2 + 4, TUNING.TANK_W - t.width / 2 - 4);
    t.setX(cx);
    t.setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t,
      y: y - 70,
      alpha: 0,
      delay: 500,
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  shake(intensity: number, ms: number): void {
    if (Save.data.settings.reduceMotion) return;
    this.cameras.main.shake(ms, intensity);
  }

  zoomPunch(amount: number = TUNING.ZOOM_BIG): void {
    if (Save.data.settings.reduceMotion) return;
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      zoom: this.baseZoom * amount,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => cam.setZoom(this.baseZoom),
    });
  }

  // ── pause / end ────────────────────────────────────────────────
  setPaused(v: boolean): void {
    this.paused = v;
    if (v) this.tweens.pauseAll();
    else this.tweens.resumeAll();
  }

  endRound(reason: EndReason): void {
    if (this.ended) return;
    this.ended = true;
    this.selectMode = null;
    let bonus = 0;
    let goalMet = false;
    if (this.cfg.goal) {
      goalMet = reason === 'goal';
      if (goalMet) {
        bonus = completionBonus(this.timeLeftMs !== null ? this.timeLeftMs / 1000 : null, this.piecesLeft());
        this.score += bonus;
        this.stats.score = this.score;
      }
    }
    const winner: -1 | 0 | 1 =
      this.scores[0] === this.scores[1] ? -1 : this.scores[0] > this.scores[1] ? 0 : 1;
    const summary: RoundSummary = {
      cfg: this.originalCfg,
      score: this.score,
      scores: [...this.scores] as [number, number],
      winner,
      stats: { ...this.stats },
      reason,
      goalMet,
      bonus,
      boostersUsed: this.boostersUsed,
      fullBonuses: this.fullBonuses,
    };
    const msg =
      reason === 'goal'
        ? 'GOAL COMPLETE!'
        : reason === 'failed'
          ? 'Oops! Wrong color.'
          : reason === 'outOfPieces'
            ? 'Out of rings!'
            : reason === 'quit'
              ? ''
              : "TIME'S UP!";
    if (msg) this.flash(msg, 3000);
    AudioManager.intensity = 0;
    if (reason !== 'quit') AudioManager.play(reason === 'failed' ? 'bonk' : 'jingle');
    this.time.delayedCall(reason === 'quit' ? 0 : 1500, () => {
      this.scene.stop('Hud');
      if (reason === 'quit') this.scene.start('Menu');
      else this.scene.start('Results', summary);
    });
  }

  private cleanup(): void {
    this.scale.off('resize', this.layout, this);
    this.keyHandlers.forEach((f) => f());
    this.keyHandlers = [];
    this.input.off('pointerdown');
    this.matter?.world?.off('collisionstart');
    if ((window as any).__plunk === this) (window as any).__plunk = undefined;
  }
}

type Pointer = Phaser.Input.Pointer;

function isRing(p: FreePiece): p is Ring {
  return p.type === 'ring';
}
function isBall(p: FreePiece): p is Ball {
  return p.type === 'ball';
}
