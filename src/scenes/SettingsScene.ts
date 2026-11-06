import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { Haptics } from '../systems/Haptics';
import { Save } from '../systems/SaveSystem';
import { Tilt } from '../systems/Tilt';
import { ThemeManager } from '../systems/ThemeManager';
import { backdrop, button, heading, restartOnResize, slider, text, toggle } from '../ui/ui';
import { applySettings, applyTheme } from './BootScene';

export class SettingsScene extends Phaser.Scene {
  private confirmReset = false;

  constructor() {
    super('Settings');
  }

  init(): void {
    this.confirmReset = false;
  }

  create(): void {
    backdrop(this);
    restartOnResize(this);
    const W = this.scale.width;
    const H = this.scale.height;
    const land = W > H;
    const cx = W / 2;
    const s = Save.data.settings;
    heading(this, cx, land ? 46 : 110, 'Settings', land ? 46 : 60);
    const save = () => {
      Save.save();
      applySettings();
    };
    const rowH = land ? 58 : 84;
    let y = land ? 110 : 230;
    const labelX = land ? cx - 330 : cx - 280;
    const ctrlX = land ? cx + 130 : cx + 120;
    const row = (label: string) => {
      text(this, labelX, y, label, land ? 24 : 28, '#ffffff', { align: 'left' }).setOrigin(0, 0.5);
    };
    const sliderRow = (label: string, key: 'master' | 'music' | 'sfx') => {
      row(label);
      slider(this, ctrlX, y, land ? 300 : 280, s[key], (v) => {
        s[key] = Math.round(v * 100) / 100;
        save();
        if (key === 'sfx') AudioManager.play('clack');
      });
      y += rowH;
    };
    const toggleRow = (label: string, get: () => boolean, set: (v: boolean) => Promise<boolean> | boolean | void) => {
      row(label);
      toggle(this, ctrlX + (land ? 110 : 100), y, get(), set);
      y += rowH;
    };
    sliderRow('Master volume', 'master');
    sliderRow('Music', 'music');
    sliderRow('Sound effects', 'sfx');
    toggleRow('Mute all', () => s.mute, (v) => {
      s.mute = v;
      save();
    });
    toggleRow(Haptics.supported() ? 'Vibration' : 'Vibration (not on this device)', () => s.haptics, (v) => {
      s.haptics = v;
      save();
      Haptics.tap();
    });
    toggleRow('Tilt to nudge water', () => s.tilt, async (v) => {
      if (v) {
        const ok = await Tilt.enable();
        s.tilt = ok;
        save();
        return ok;
      }
      Tilt.disable();
      s.tilt = false;
      save();
      return false;
    });
    toggleRow('Reduce motion', () => s.reduceMotion, (v) => {
      s.reduceMotion = v;
      save();
    });
    row('Timed round length');
    const lengths = [60, 90, 120];
    lengths.forEach((len, i) => {
      button(this, ctrlX - 85 + i * 85 + (land ? 30 : 30), y, 78, 52, `${len}`, () => {
        s.roundSeconds = len;
        save();
        this.scene.restart();
      }, { color: s.roundSeconds === len ? ThemeManager.current.frame.trim : '#7d8590', size: 22 });
    });
    y += rowH + 10;
    const resetBtn = button(this, cx, y, 380, 66, 'Reset progress', () => {
      if (!this.confirmReset) {
        this.confirmReset = true;
        resetBtn.setLabel?.('Tap again to confirm');
        return;
      }
      Save.reset();
      applySettings();
      applyTheme(this);
      this.scene.restart();
    }, { color: '#e57373', size: 24 });
    y += land ? 56 : 90;
    if (!land) text(this, cx, Math.min(y, H - 130), 'Plunk! v1.0 · No ads, no tracking, fully offline.\nAll art and sound are generated in code.', 18).setAlpha(0.7);
    button(this, land ? 110 : cx, land ? H - 46 : H - 70, 220, 64, '‹ Back', () => this.scene.start('Menu'), {
      color: '#9aa7b4',
      size: 26,
    });
  }
}
