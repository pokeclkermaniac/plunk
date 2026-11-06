import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { evaluateGoal, goalText } from '../modes/Goals';
import { LEVELS } from '../modes/LevelMode';
import { AudioManager } from '../systems/AudioManager';
import { BOOSTERS, type BoosterId } from '../systems/Progression';
import { Save } from '../systems/SaveSystem';
import { hex, ThemeManager } from '../systems/ThemeManager';
import { button, font, panel, text } from '../ui/ui';
import type { GameScene } from './GameScene';

const BOOSTER_ICONS: Record<BoosterId, string> = {
  slowmo: '🐢',
  magnet: '🧲',
  colorswap: '🎨',
  extratime: '⏱',
};

/** Overlaid UI: score, timer / pieces left, goal, boosters, pause menu, banners and hints. */
export class HudScene extends Phaser.Scene {
  private gs!: GameScene;
  private scoreText!: Phaser.GameObjects.Text;
  private scoreLabel!: Phaser.GameObjects.Text;
  private p2Text?: Phaser.GameObjects.Text;
  private p2Label?: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerLabel!: Phaser.GameObjects.Text;
  private goalText?: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Container;
  private boosterBtns: {
    id: BoosterId;
    c: Phaser.GameObjects.Container;
    count: Phaser.GameObjects.Text;
    bg: Phaser.GameObjects.Graphics;
  }[] = [];
  private pauseLayer?: Phaser.GameObjects.Container;
  private hint?: Phaser.GameObjects.Container;
  private lastScore = 0;
  private hot?: Phaser.GameObjects.Text;
  private textColor = '#ffffff';

  constructor() {
    super('Hud');
  }

  init(data: { game: GameScene }): void {
    this.gs = data.game;
    this.boosterBtns = [];
    this.pauseLayer = undefined;
    this.hint = undefined;
    this.lastScore = 0;
    this.hot = undefined;
    this.boosterSig = '';
  }

  create(): void {
    const t = ThemeManager.current;
    const darkText = hex(t.ui.text) < 0x808080;
    const big = {
      fontFamily: font(),
      fontSize: '50px',
      fontStyle: 'bold',
      color: t.ui.text,
      stroke: darkText ? '#ffffffcc' : '#00000088',
      strokeThickness: 6,
    };
    this.textColor = t.ui.text;
    const small = { fontFamily: font(), fontSize: '20px', fontStyle: 'bold', color: t.frame.trim };
    const versus = this.gs.cfg.versus;
    this.scoreLabel = this.add.text(0, 0, versus ? 'P1' : 'SCORE', small).setOrigin(0.5);
    this.scoreText = this.add.text(0, 0, '0', big).setOrigin(0.5);
    if (versus) {
      this.p2Label = this.add.text(0, 0, 'P2', small).setOrigin(0.5);
      this.p2Text = this.add.text(0, 0, '0', big).setOrigin(0.5);
    }
    this.timerLabel = this.add.text(0, 0, '', small).setOrigin(0.5);
    this.timerText = this.add.text(0, 0, '', big).setOrigin(0.5);
    if (this.gs.cfg.goal) {
      this.goalText = this.add
        .text(0, 0, '', {
          fontFamily: font(),
          fontSize: '22px',
          color: '#ffffff',
          stroke: '#00000099',
          strokeThickness: 4,
          align: 'center',
        })
        .setOrigin(0.5);
    }
    this.banner = this.add
      .text(0, 0, '', {
        fontFamily: font(),
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1a1a2e',
        strokeThickness: 8,
        align: 'center',
        wordWrap: { width: 600 },
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.pauseBtn = button(this, 0, 0, 72, 64, 'II', () => this.togglePause(), {
      color: '#9aa7b4',
      size: 28,
    });

    if (this.gs.cfg.boostersAllowed) {
      for (const b of BOOSTERS) {
        const bg = this.add.graphics();
        const icon = this.add.text(0, -2, BOOSTER_ICONS[b.id], { fontSize: '30px' }).setOrigin(0.5);
        const count = this.add
          .text(22, 20, '0', {
            fontFamily: font(),
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 4,
          })
          .setOrigin(0.5);
        const c = this.add.container(0, 0, [bg, icon, count]);
        c.setSize(66, 66).setInteractive({ useHandCursor: true });
        c.on('pointerdown', () => {
          this.gs.useBooster(b.id);
          this.refreshBoosters();
        });
        this.boosterBtns.push({ id: b.id, c, count, bg });
      }
      this.refreshBoosters();
    }

    this.layout();
    this.gs.events.off('layout');
    this.gs.events.off('requestPause');
    this.gs.events.on('layout', this.layout, this);
    this.gs.events.on('requestPause', this.togglePause, this);
    this.events.once('shutdown', () => {
      this.gs.events.off('layout', this.layout, this);
      this.gs.events.off('requestPause', this.togglePause, this);
    });
    this.showStartHint();
  }

  private layout(): void {
    const st = this.sys.settings.status;
    if (!this.scoreText?.scene || st < Phaser.Scenes.CREATING || st > Phaser.Scenes.SLEEPING) return;
    try {
      this.doLayout();
    } catch {
      // A HUD from a round that is shutting down; the new HUD lays itself out.
    }
  }

  private doLayout(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const land = this.gs.isLandscape();
    const gs = this.gs;
    const versus = gs.cfg.versus;
    if (land) {
      const lw = gs.worldToScreen(-170, 70);
      const rw = gs.worldToScreen(TUNING.TANK_W + 170, 70);
      this.scoreLabel.setPosition(lw.x, lw.y - 34);
      this.scoreText.setPosition(lw.x, lw.y + 8);
      if (versus) {
        this.p2Label!.setPosition(rw.x, rw.y - 34);
        this.p2Text!.setPosition(rw.x, rw.y + 8);
        const tp = gs.worldToScreen(TUNING.TANK_W / 2, -30);
        this.timerLabel.setPosition(tp.x - 70, tp.y);
        this.timerText.setPosition(tp.x + 30, tp.y).setFontSize(34);
      } else {
        this.timerLabel.setPosition(rw.x, rw.y - 34);
        this.timerText.setPosition(rw.x, rw.y + 8);
      }
      const gp = gs.worldToScreen(-170, 400);
      this.goalText?.setPosition(gp.x, gp.y).setWordWrapWidth(220);
      this.pauseBtn.setPosition(W - 50, 44);
      this.boosterBtns.forEach((b, i) => {
        const p = gs.worldToScreen(TUNING.TANK_W + 105 + (i % 2) * 130, 260 + Math.floor(i / 2) * 120);
        b.c.setPosition(p.x, p.y);
      });
    } else {
      const top = gs.worldToScreen(0, -96);
      const l = gs.worldToScreen(110, -96);
      const r = gs.worldToScreen(TUNING.TANK_W - 110, -96);
      this.scoreLabel.setPosition(l.x, top.y - 30);
      this.scoreText.setPosition(l.x, top.y + 12);
      if (versus) {
        this.p2Label!.setPosition(r.x, top.y - 30);
        this.p2Text!.setPosition(r.x, top.y + 12);
        const c = gs.worldToScreen(TUNING.TANK_W / 2, -96);
        this.timerLabel.setPosition(c.x, top.y - 30);
        this.timerText.setPosition(c.x, top.y + 12).setFontSize(40);
      } else {
        this.timerLabel.setPosition(r.x, top.y - 30);
        this.timerText.setPosition(r.x, top.y + 12);
      }
      const gp = gs.worldToScreen(TUNING.TANK_W / 2, 70);
      this.goalText?.setPosition(gp.x, gp.y).setWordWrapWidth(520);
      const pc = gs.worldToScreen(TUNING.TANK_W / 2, -96);
      this.pauseBtn.setPosition(versus ? W - 46 : pc.x, versus ? 40 : top.y + 4);
      this.boosterBtns.forEach((b, i) => {
        const p = gs.worldToScreen(
          TUNING.TANK_W / 2 - 36 + (i % 2) * 72,
          TUNING.TANK_H + 132 + Math.floor(i / 2) * 76,
        );
        b.c.setPosition(p.x, p.y);
      });
    }
    const mid = gs.worldToScreen(TUNING.TANK_W / 2, TUNING.TANK_H * 0.38);
    this.banner.setPosition(mid.x, mid.y).setWordWrapWidth(Math.min(W - 40, 560 * gs.zoomLevel()));
    this.pauseLayer?.setPosition(0, 0);
    void H;
  }

  private boosterSig = '';

  refreshBoosters(): void {
    const sig = this.boosterBtns
      .map(
        (b) =>
          `${Save.data.boosters[b.id] ?? 0}${this.gs.boosterAvailable(b.id)}${this.gs.selectMode === b.id}`,
      )
      .join('|');
    if (sig === this.boosterSig) return;
    this.boosterSig = sig;
    for (const b of this.boosterBtns) {
      const n = Save.data.boosters[b.id] ?? 0;
      const ok = this.gs.boosterAvailable(b.id);
      const sel = this.gs.selectMode === b.id;
      b.count.setText(`${n}`);
      b.bg.clear();
      b.bg.fillStyle(sel ? 0xffd23d : 0x000000, sel ? 0.9 : 0.45).fillRoundedRect(-31, -31, 62, 62, 16);
      b.bg.lineStyle(3, 0xffffff, ok ? 0.7 : 0.15).strokeRoundedRect(-31, -31, 62, 62, 16);
      b.c.setAlpha(ok ? 1 : 0.35);
    }
  }

  update(): void {
    const gs = this.gs;
    if (!gs || !gs.cfg || !gs.sys.isActive()) return;
    if (gs.cfg.versus) {
      this.scoreText.setText(`${gs.scores[0]}`);
      this.p2Text!.setText(`${gs.scores[1]}`);
    } else {
      this.scoreText.setText(`${gs.score}`);
      if (gs.score > this.lastScore) {
        this.tweens.add({ targets: this.scoreText, scale: { from: 1.18, to: 1 }, duration: 160 });
      }
    }
    this.lastScore = gs.score;
    if (gs.timeLeftMs !== null) {
      const s = Math.ceil(gs.timeLeftMs / 1000);
      this.timerLabel.setText(gs.suddenDeath ? 'SUDDEN DEATH' : 'TIME');
      this.timerText.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
      this.timerText.setColor(s <= TUNING.TIMER_WARNING_SECONDS ? '#ff5252' : this.textColor);
    } else {
      this.timerLabel.setText(gs.cfg.gameType === 'ringToss' ? 'RINGS' : 'BALLS');
      this.timerText.setText(`${gs.piecesLeft()}`);
      this.timerText.setColor(gs.piecesLeft() <= 3 ? '#ff8a65' : this.textColor);
    }
    if (this.goalText && gs.cfg.goal) {
      const st = evaluateGoal(gs.cfg.goal, gs.stats);
      const counter =
        gs.cfg.goal.type === 'score' || gs.cfg.goal.type === 'noWrong' ? '' : `  ${st.progress}/${st.target}`;
      this.goalText.setText(`🎯 ${goalText(gs.cfg.goal)}${counter}`);
    }
    if (gs.message) {
      this.banner.setText(gs.message.text).setVisible(true);
    } else this.banner.setVisible(false);
    if (gs.hotHands && !this.hot) {
      const p = this.timerText;
      this.hot = this.add
        .text(p.x, p.y + 44, '🔥 HOT HANDS 🔥', {
          fontFamily: font(),
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ffb74d',
          stroke: '#000',
          strokeThickness: 4,
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: this.hot,
        scale: { from: 0.9, to: 1.1 },
        duration: 300,
        yoyo: true,
        repeat: -1,
      });
    }
    if (this.boosterBtns.length) this.refreshBoosters();
  }

  private togglePause(): void {
    if (this.gs.ended) return;
    if (this.pauseLayer) {
      this.pauseLayer.destroy();
      this.pauseLayer = undefined;
      this.gs.setPaused(false);
      return;
    }
    this.gs.setPaused(true);
    const W = this.scale.width;
    const H = this.scale.height;
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    const p = panel(this, W / 2, H / 2, 460, 470, 0.55);
    const title = text(this, W / 2, H / 2 - 170, 'Paused', 52, ThemeManager.current.frame.trim, {
      fontStyle: 'bold',
    });
    const resume = button(this, W / 2, H / 2 - 70, 340, 84, 'Resume', () => this.togglePause());
    const restart = button(
      this,
      W / 2,
      H / 2 + 30,
      340,
      84,
      'Restart',
      () => {
        this.gs.setPaused(false);
        this.scene.stop();
        this.gs.scene.restart({ config: this.gs.originalCfg });
      },
      { color: ThemeManager.current.buttons.right },
    );
    const quit = button(
      this,
      W / 2,
      H / 2 + 130,
      340,
      84,
      'Quit to menu',
      () => {
        this.gs.setPaused(false);
        this.gs.endRound('quit');
      },
      { color: '#9aa7b4' },
    );
    this.pauseLayer = this.add.container(0, 0, [shade, p, title, resume, restart, quit]).setDepth(100);
  }

  private showStartHint(): void {
    const gs = this.gs;
    const flags = Save.data.flags;
    let msg: string | null = null;
    const lvl = gs.cfg.levelId ? LEVELS[gs.cfg.gameType].find((l) => l.id === gs.cfg.levelId) : undefined;
    if (lvl?.hint) msg = lvl.hint;
    else if (!flags.seenHint) {
      msg =
        gs.cfg.gameType === 'ringToss'
          ? 'Tap the buttons to blast bubbles!\nSame color on a peg = streak bonus.'
          : 'Tap the buttons to blast bubbles!\nDrop balls DOWN through a hoop. Same color = streak!';
      flags.seenBasketballHint = gs.cfg.gameType === 'basketball' || flags.seenBasketballHint;
      flags.seenHint = true;
      Save.save();
    } else if (gs.cfg.gameType === 'basketball' && !flags.seenBasketballHint) {
      msg = 'Blast balls up, then let them drop DOWN through a hoop.\nSame color in a row = streak!';
      flags.seenBasketballHint = true;
      Save.save();
    } else if (gs.cfg.versus) {
      msg = 'Player 1: left button (A)\nPlayer 2: right button (L)';
    }
    if (!msg) return;
    const W = this.scale.width;
    const mid = gs.worldToScreen(TUNING.TANK_W / 2, TUNING.TANK_H * 0.55);
    const t = text(this, 0, 0, msg, 28, '#ffffff', {
      fontStyle: 'bold',
      wordWrap: { width: Math.min(W - 60, 520) },
      lineSpacing: 6,
    });
    const bg = this.add.graphics();
    bg.fillStyle(hex(ThemeManager.current.ui.panel), 0.92).fillRoundedRect(
      -t.width / 2 - 24,
      -t.height / 2 - 20,
      t.width + 48,
      t.height + 40,
      20,
    );
    bg.lineStyle(3, hex(ThemeManager.current.frame.trim), 1).strokeRoundedRect(
      -t.width / 2 - 24,
      -t.height / 2 - 20,
      t.width + 48,
      t.height + 40,
      20,
    );
    const arrows: Phaser.GameObjects.Text[] = [];
    for (const bp of gs.buttonPositions()) {
      const s = gs.worldToScreen(bp.x, bp.y - 150);
      const a = text(this, s.x - mid.x, s.y - mid.y, '⬇', 54, ThemeManager.current.frame.trim);
      this.tweens.add({ targets: a, y: a.y + 16, duration: 450, yoyo: true, repeat: -1 });
      arrows.push(a);
    }
    this.hint = this.add.container(mid.x, mid.y, [bg, t, ...arrows]).setDepth(50);
    const dismiss = () => {
      if (!this.hint) return;
      const h = this.hint;
      this.hint = undefined;
      this.tweens.add({ targets: h, alpha: 0, duration: 300, onComplete: () => h.destroy() });
    };
    this.time.delayedCall(5500, dismiss);
    this.input.once('pointerdown', dismiss);
    this.input.keyboard?.once('keydown', dismiss);
    AudioManager.unlock();
  }
}
