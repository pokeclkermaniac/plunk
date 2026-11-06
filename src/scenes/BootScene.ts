import Phaser from 'phaser';
import { generateTextures } from '../game/Textures';
import { AudioManager } from '../systems/AudioManager';
import { Haptics } from '../systems/Haptics';
import { Save } from '../systems/SaveSystem';
import { ThemeManager } from '../systems/ThemeManager';

/** Applies the save (settings, equipped theme), draws all procedural textures, then shows the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    applySettings();
    applyTheme(this);
    document.getElementById('loading')?.remove();
    // Unlock audio on the very first touch anywhere (iOS requirement).
    const unlock = () => AudioManager.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    this.scene.start('Menu');
  }
}

export function applySettings(): void {
  const s = Save.data.settings;
  AudioManager.setVolumes({ master: s.master, music: s.music, sfx: s.sfx, mute: s.mute });
  Haptics.setEnabled(s.haptics);
}

export function applyTheme(scene: Phaser.Scene): void {
  ThemeManager.apply(Save.data);
  generateTextures(scene, ThemeManager.current);
  AudioManager.pack = ThemeManager.current.sound;
}
