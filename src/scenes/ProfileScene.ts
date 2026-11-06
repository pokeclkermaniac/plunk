import Phaser from 'phaser';
import { BOOSTERS, rewardLabel, rewardsForLevel, xpToNext } from '../systems/Progression';
import { Save } from '../systems/SaveSystem';
import { LEVELS } from '../modes/LevelMode';
import { ThemeManager } from '../systems/ThemeManager';
import { backdrop, button, heading, panel, restartOnResize, text } from '../ui/ui';

export class ProfileScene extends Phaser.Scene {
  constructor() {
    super('Profile');
  }

  create(): void {
    backdrop(this);
    restartOnResize(this);
    const W = this.scale.width;
    const H = this.scale.height;
    const land = W > H;
    const cx = W / 2;
    const s = Save.data;
    const t = ThemeManager.current;
    heading(this, cx, land ? 46 : 110, 'Profile', land ? 46 : 60);
    text(this, cx, land ? 100 : 190, `Player level ${s.level}`, land ? 34 : 42, '#ffffff', {
      fontStyle: 'bold',
    });
    const bw = 460;
    const by = land ? 140 : 245;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4).fillRoundedRect(cx - bw / 2, by - 12, bw, 24, 12);
    g.fillStyle(0x7cff6b, 1).fillRoundedRect(
      cx - bw / 2,
      by - 12,
      Math.max(24, (bw * s.xp) / xpToNext(s.level)),
      24,
      12,
    );
    text(this, cx, by + 36, `${s.xp} / ${xpToNext(s.level)} XP`, 22).setAlpha(0.85);
    const next = rewardsForLevel(s.level + 1);
    if (next.length)
      text(this, cx, by + 70, `Next: ${next.map(rewardLabel).join(', ')}`, 20, '#a5ff8a', {
        wordWrap: { width: W - 60 },
      });

    const starsRing = LEVELS.ringToss.reduce((a, l) => a + (s.bests.levels[l.id]?.stars ?? 0), 0);
    const starsBall = LEVELS.basketball.reduce((a, l) => a + (s.bests.levels[l.id]?.stars ?? 0), 0);
    const bests = [
      `Ring Toss timed best: ${s.bests.ringTimed}${s.bests.ringTimedBoosted ? `  (boosted ${s.bests.ringTimedBoosted})` : ''}`,
      `Shootout best: ${s.bests.basketballTimed}${s.bests.basketballTimedBoosted ? `  (boosted ${s.bests.basketballTimedBoosted})` : ''}`,
      `Endless best: ${s.bests.endless}${s.bests.endlessBoosted ? `  (boosted ${s.bests.endlessBoosted})` : ''}`,
      `Level stars: Ring Toss ${starsRing}/${LEVELS.ringToss.length * 3} · Basketball ${starsBall}/${LEVELS.basketball.length * 3}`,
    ];
    const stats = [
      `Rounds played: ${s.stats.rounds}`,
      `Rings landed: ${s.stats.rings}`,
      `Baskets: ${s.stats.baskets}  ·  Swishes: ${s.stats.swishes}`,
      `Full pegs: ${s.stats.fullPegs}  ·  Full tubes: ${s.stats.fullTubes}`,
      `Best streak: x${s.stats.bestStreak}`,
    ];
    const boosters = BOOSTERS.map((b) => `${b.name}: ${s.boosters[b.id] ?? 0}`).join('   ');
    const py = land ? 420 : 740;
    const ph = land ? 400 : 640;
    panel(this, cx, py + (land ? 20 : 0), land ? 1100 : 640, ph - (land ? 120 : 0));
    if (land) {
      text(this, cx - 270, py - 30, bests.join('\n'), 22, '#ffffff', {
        lineSpacing: 10,
        wordWrap: { width: 520 },
      });
      text(this, cx + 280, py - 30, stats.join('\n'), 22, '#ffffff', { lineSpacing: 10 });
      text(this, cx, py + 150, `Boosters (earned only)\n${boosters}`, 22, t.frame.trim, { lineSpacing: 6 });
    } else {
      text(this, cx, py - 200, bests.join('\n'), 24, '#ffffff', {
        lineSpacing: 10,
        wordWrap: { width: 600 },
      });
      text(this, cx, py + 30, stats.join('\n'), 24, '#ffffff', { lineSpacing: 10 });
      text(this, cx, py + 230, `Boosters (earned only)\n${boosters}`, 22, t.frame.trim, {
        lineSpacing: 6,
        wordWrap: { width: 600 },
      });
    }
    button(this, land ? 110 : cx, land ? H - 46 : H - 70, 220, 64, '‹ Back', () => this.scene.start('Menu'), {
      color: '#9aa7b4',
      size: 26,
    });
  }
}
