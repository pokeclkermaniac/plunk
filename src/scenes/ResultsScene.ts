import Phaser from 'phaser';
import { levelConfig, LEVELS } from '../modes/LevelMode';
import { AudioManager } from '../systems/AudioManager';
import {
  addXp,
  applyReward,
  rewardLabel,
  starRewards,
  starsFor,
  xpForRound,
  xpToNext,
  type Reward,
} from '../systems/Progression';
import { Save } from '../systems/SaveSystem';
import { ThemeManager } from '../systems/ThemeManager';
import { backdrop, button, heading, panel, restartOnResize, text } from '../ui/ui';
import type { RoundSummary } from './GameScene';

interface Computed {
  newBest: boolean;
  best: number;
  stars: number;
  xp: number;
  levelsGained: number;
  rewards: Reward[];
}

/** End screen. Also the single place where a finished round is written to the save. */
export class ResultsScene extends Phaser.Scene {
  private sum!: RoundSummary;
  private computed: Computed | null = null;

  constructor() {
    super('Results');
  }

  init(data: RoundSummary & { _computed?: Computed }): void {
    this.sum = data;
    this.computed = data._computed ?? null;
  }

  create(): void {
    if (!this.computed) this.computed = this.record();
    restartOnResize(this, { ...this.sum, _computed: this.computed });
    backdrop(this);
    const W = this.scale.width;
    const H = this.scale.height;
    const land = W > H;
    const cx = W / 2;
    const s = this.sum;
    const c = this.computed;
    const cfg = s.cfg;
    const t = ThemeManager.current;

    let title = "Time's up!";
    if (cfg.mode === 'levels') title = s.goalMet ? 'Level complete!' : 'Level failed';
    else if (cfg.mode === 'endless') title = 'Out of rings!';
    if (cfg.versus) title = s.winner === -1 ? "It's a draw!" : `Player ${s.winner + 1} wins!`;
    heading(this, cx, land ? 60 : 130, title, land ? 50 : 60);
    text(this, cx, land ? 108 : 195, cfg.title, 24).setAlpha(0.85);

    const top = land ? 150 : 250;
    const ph = land ? 440 : 640;
    panel(this, cx, top + ph / 2, land ? 760 : 620, ph);
    let y = top + 50;
    if (cfg.versus) {
      text(this, cx - 140, y + 20, `P1\n${s.scores[0]}`, 54, t.buttons.left, { fontStyle: 'bold' });
      text(this, cx + 140, y + 20, `P2\n${s.scores[1]}`, 54, t.buttons.right, { fontStyle: 'bold' });
      y += 140;
    } else {
      const scoreT = text(this, cx, y + 20, '0', 88, '#ffffff', { fontStyle: 'bold' });
      this.tweens.addCounter({
        from: 0,
        to: s.score,
        duration: 900,
        ease: 'Quad.easeOut',
        onUpdate: (tw) => scoreT.setText(`${Math.round(tw.getValue() ?? 0)}`),
      });
      y += 90;
      if (c.newBest && s.score > 0) {
        const nb = text(this, cx, y, '★ NEW BEST! ★', 34, t.frame.trim, { fontStyle: 'bold' });
        this.tweens.add({ targets: nb, scale: { from: 0.9, to: 1.1 }, yoyo: true, repeat: -1, duration: 400 });
      } else text(this, cx, y, `Best: ${c.best}`, 28).setAlpha(0.85);
      y += 50;
    }
    if (cfg.mode === 'levels') {
      const starStr = [0, 1, 2].map((i) => (i < c.stars ? '★' : '☆')).join(' ');
      text(this, cx, y + 10, starStr, 64, '#ffd54f');
      y += 70;
      if (s.bonus > 0) {
        text(this, cx, y, `Completion bonus +${s.bonus}`, 24).setAlpha(0.85);
        y += 36;
      }
    }

    const st = s.stats;
    const lines: string[] = [];
    if (cfg.gameType === 'ringToss') {
      lines.push(`Rings landed: ${st.landed}`, `Full pegs: ${st.fullPegs}`, `Best streak: x${st.bestStreak}`);
      if (st.wrong) lines.push(`Wrong colors: ${st.wrong}`);
    } else {
      lines.push(`Baskets: ${st.baskets}`, `Swishes: ${st.swishes}`, `Best streak: x${st.bestStreak}`, `Full tubes: ${st.fullTubes}`);
    }
    if (s.boostersUsed) lines.push('(boosters used: counts as a boosted best)');
    text(this, cx, y + 60, lines.join('\n'), 26, '#ffffff', { lineSpacing: 8 });
    y += 60 + lines.length * 20 + 40;

    // XP bar
    const save = Save.data;
    const barY = top + ph - (c.rewards.length ? 110 : 60);
    text(this, cx, barY - 34, `+${c.xp} XP${c.levelsGained ? `  ·  LEVEL UP! Lv ${save.level}` : `  ·  Lv ${save.level}`}`, 26, t.frame.trim, {
      fontStyle: 'bold',
    });
    const bw = land ? 520 : 480;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4).fillRoundedRect(cx - bw / 2, barY - 10, bw, 20, 10);
    const frac = Math.min(1, save.xp / xpToNext(save.level));
    const fill = this.add.graphics();
    this.tweens.addCounter({
      from: 0,
      to: frac,
      duration: 900,
      onUpdate: (tw) => {
        fill.clear();
        fill.fillStyle(0x7cff6b, 1).fillRoundedRect(cx - bw / 2, barY - 10, Math.max(20, bw * (tw.getValue() ?? 0)), 20, 10);
      },
    });
    if (c.rewards.length) {
      text(this, cx, barY + 50, '🎁 Unlocked: ' + c.rewards.map(rewardLabel).join(', '), 22, '#a5ff8a', {
        wordWrap: { width: land ? 700 : 560 },
      });
    }

    // buttons
    const by = land ? H - 60 : H - 230;
    const nextLevel = this.nextLevel();
    const bwid = land ? 300 : 460;
    if (land) {
      button(this, cx - 320, by, bwid, 76, 'Play again', () => this.again());
      if (nextLevel !== null) button(this, cx, by, bwid, 76, 'Next level ›', () => this.startLevel(nextLevel), { color: t.buttons.right });
      button(this, cx + 320, by, bwid, 76, 'Menu', () => this.toMenu(), { color: '#9aa7b4' });
    } else {
      button(this, cx, by, bwid, 90, 'Play again', () => this.again());
      if (nextLevel !== null) button(this, cx, by + 104, bwid, 90, 'Next level ›', () => this.startLevel(nextLevel), { color: t.buttons.right });
      button(this, cx, by + (nextLevel !== null ? 208 : 104), bwid, 90, 'Menu', () => this.toMenu(), { color: '#9aa7b4' });
    }
    AudioManager.startMusic();
  }

  private nextLevel(): number | null {
    const cfg = this.sum.cfg;
    if (cfg.mode !== 'levels' || !this.sum.goalMet || cfg.levelIndex === undefined) return null;
    const list = LEVELS[cfg.gameType];
    return cfg.levelIndex + 1 < list.length ? cfg.levelIndex + 1 : null;
  }

  private startLevel(i: number): void {
    const list = LEVELS[this.sum.cfg.gameType];
    this.scene.start('Game', { config: levelConfig(list[i], i) });
  }

  private again(): void {
    this.scene.start('Game', { config: this.sum.cfg });
  }

  private toMenu(): void {
    const cfg = this.sum.cfg;
    if (cfg.mode === 'levels') this.scene.start('LevelSelect', { gameType: cfg.gameType });
    else this.scene.start('Menu', { screen: 'modes', gameType: cfg.gameType });
  }

  /** Writes bests, stats, XP and unlocks. */
  private record(): Computed {
    const s = this.sum;
    const save = Save.data;
    const cfg = s.cfg;
    const st = s.stats;
    save.stats.rounds++;
    save.stats.rings += cfg.gameType === 'ringToss' ? st.landed : 0;
    save.stats.baskets += st.baskets;
    save.stats.swishes += st.swishes;
    save.stats.fullPegs += st.fullPegs;
    save.stats.fullTubes += st.fullTubes;
    save.stats.bestStreak = Math.max(save.stats.bestStreak, st.bestStreak);

    let newBest = false;
    let best = 0;
    let stars = 0;
    const rewards: Reward[] = [];
    const boosted = s.boostersUsed;
    const updateBest = (key: 'ringTimed' | 'basketballTimed' | 'endless') => {
      const k = (boosted ? `${key}Boosted` : key) as keyof typeof save.bests;
      const prev = save.bests[k] as number;
      if (s.score > prev) {
        (save.bests as any)[k] = s.score;
        newBest = true;
      }
      best = Math.max(prev, s.score);
    };
    if (cfg.mode === 'timed') updateBest(cfg.gameType === 'ringToss' ? 'ringTimed' : 'basketballTimed');
    else if (cfg.mode === 'endless') updateBest('endless');
    else if (cfg.mode === 'levels' && cfg.levelId && cfg.stars) {
      stars = starsFor(s.goalMet, s.score, cfg.stars);
      const prev = save.bests.levels[cfg.levelId] ?? { stars: 0, best: 0 };
      if (s.goalMet && s.score > prev.best) newBest = prev.best > 0 || true;
      for (const r of starRewards(prev.stars, stars)) {
        applyReward(save, r);
        rewards.push(r);
      }
      save.bests.levels[cfg.levelId] = {
        stars: Math.max(prev.stars, stars),
        best: s.goalMet ? Math.max(prev.best, s.score) : prev.best,
      };
      best = save.bests.levels[cfg.levelId].best;
      newBest = s.goalMet && s.score >= best && s.score > prev.best;
    }

    const xp = xpForRound({
      score: cfg.versus ? Math.max(...s.scores) : s.score,
      fullBonuses: s.fullBonuses,
      newBest: newBest && !cfg.versus,
      stars,
    });
    const res = addXp(save, xp);
    rewards.push(...res.rewards);
    Save.save();
    return { newBest, best, stars, xp, levelsGained: res.levelsGained, rewards };
  }
}
