import Phaser from 'phaser';
import { pieceKey, texScale } from '../game/Textures';
import { PART_SLOTS, prettyId, slotLabel, UNLOCK_TABLE, type PartSlot } from '../systems/Progression';
import { Save } from '../systems/SaveSystem';
import { getTheme, hex, THEME_ORDER, ThemeManager } from '../systems/ThemeManager';
import { backdrop, button, heading, restartOnResize, text } from '../ui/ui';
import { applyTheme } from './BootScene';

type Tab = 'themes' | PartSlot;
const EQUIP_KEY: Record<PartSlot, 'tank' | 'water' | 'rings' | 'balls' | 'background'> = {
  tanks: 'tank',
  water: 'water',
  rings: 'rings',
  balls: 'balls',
  backgrounds: 'background',
};

/** Which player level unlocks an item (for the lock label). */
function unlockLevel(tab: Tab, id: string): number | null {
  for (const [lvl, rewards] of Object.entries(UNLOCK_TABLE)) {
    for (const r of rewards) {
      if (r.type === 'theme' && r.id === id) return Number(lvl);
      if (tab !== 'themes' && r.type === 'part' && r.slot === tab && r.id === id) return Number(lvl);
    }
  }
  return null;
}

/** Equip whole themes or mix-and-match parts, with a live preview. */
export class CollectionScene extends Phaser.Scene {
  private tab: Tab = 'themes';

  constructor() {
    super('Collection');
  }

  init(data: { tab?: Tab }): void {
    this.tab = data.tab ?? 'themes';
  }

  create(): void {
    backdrop(this);
    restartOnResize(this, { tab: this.tab });
    const W = this.scale.width;
    const H = this.scale.height;
    const land = W > H;
    const cx = W / 2;
    const t = ThemeManager.current;
    heading(this, cx, land ? 40 : 90, 'Collection', land ? 44 : 56);

    // tabs
    const tabs: Tab[] = ['themes', ...PART_SLOTS];
    const tw = land ? 150 : 112;
    tabs.forEach((tb, i) => {
      const x = cx - ((tabs.length - 1) * (tw + 6)) / 2 + i * (tw + 6);
      button(this, x, land ? 98 : 170, tw, 54, tb === 'themes' ? 'Themes' : slotLabel(tb), () => this.scene.restart({ tab: tb }), {
        color: this.tab === tb ? t.frame.trim : '#7d8590',
        size: land ? 20 : 18,
      });
    });

    // preview
    const pv = land ? { x: W - 190, y: 420, s: 0.38 } : { x: cx, y: 425, s: 0.3 };
    this.preview(pv.x, pv.y, pv.s);

    // grid of items
    const unlocked = this.tab === 'themes' ? Save.data.unlocked.themes : Save.data.unlocked[this.tab];
    const equippedId = this.tab === 'themes' ? Save.data.equipped.theme : Save.data.equipped[EQUIP_KEY[this.tab]];
    const cols = land ? 3 : 2;
    const cw = land ? 250 : 320;
    const ch = land ? 100 : 108;
    const gx = land ? 40 + cw / 2 : cx - ((cols - 1) * (cw + 12)) / 2;
    const gy = land ? 140 : 660;
    THEME_ORDER.forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gx + col * (cw + 12);
      const y = gy + ch / 2 + row * (ch + 12);
      const has = unlocked.includes(id);
      const lvl = unlockLevel(this.tab, id);
      const th = getTheme(id);
      const sw = this.swatch(this.tab, id);
      const card = button(
        this,
        x,
        y,
        cw,
        ch,
        has ? prettyId(id) : '🔒',
        () => {
          if (!has) return;
          this.equip(id);
        },
        {
          color: id === equippedId ? '#ffffff' : has ? sw : '#5c6370',
          size: 24,
          sub: has ? (id === equippedId ? 'Equipped' : 'Tap to equip') : lvl ? `Player level ${lvl}` : 'Locked',
        },
      );
      void th;
      if (has) {
        const dots = this.add.graphics();
        const colors = this.tab === 'balls' ? th.balls.colors : th.rings.colors;
        colors.slice(0, 6).forEach((c, k) => dots.fillStyle(hex(c), 1).fillCircle(x - 50 + k * 20, y - ch / 2 + 16, 7));
      }
      void card;
    });

    button(this, land ? 110 : cx, land ? H - 46 : H - 70, 220, 64, '‹ Back', () => this.scene.start('Menu'), {
      color: '#9aa7b4',
      size: 26,
    });
  }

  private swatch(tab: Tab, id: string): string {
    const th = getTheme(id);
    switch (tab) {
      case 'water':
        return th.water.bottom;
      case 'rings':
        return th.rings.colors[1];
      case 'balls':
        return th.balls.colors[5];
      case 'backgrounds':
        return th.background.top;
      default:
        return th.frame.shell;
    }
  }

  private equip(id: string): void {
    const eq = Save.data.equipped;
    if (this.tab === 'themes') {
      // A whole theme equips every part that's unlocked for it.
      eq.theme = id;
      for (const slot of PART_SLOTS) if (Save.data.unlocked[slot].includes(id)) eq[EQUIP_KEY[slot]] = id;
    } else {
      eq[EQUIP_KEY[this.tab]] = id;
    }
    Save.save();
    applyTheme(this);
    this.scene.restart({ tab: this.tab });
  }

  private preview(x: number, y: number, s: number): void {
    const land = this.scale.width > this.scale.height;
    const c = this.add.container(x, y);
    const frame = this.add.image(0, 0, 'frame_port').setScale(texScale() * s);
    const bg = this.add.image(0, 0, 'tank_bg').setScale(texScale() * s);
    const water = this.add.image(0, 0, 'tank_water').setScale(texScale() * s);
    // tank sits at (0,0) of the frame's local coords: offset so it's centred in the window
    const fw = frame.displayWidth;
    const fh = frame.displayHeight;
    frame.setPosition(0, 0);
    bg.setPosition(-fw / 2 + 50 * s + bg.displayWidth / 2, -fh / 2 + 150 * s + bg.displayHeight / 2);
    water.setPosition(bg.x, bg.y);
    c.add([bg, water]);
    for (let i = 0; i < 3; i++) {
      const k = pieceKey({ color: i, kind: 'normal' });
      const px = bg.x - 120 * s + i * 120 * s;
      c.add(this.add.image(px, bg.y + 200 * s, `ring_back_${k}`).setScale(texScale() * s * 1.2));
      c.add(this.add.image(px, bg.y + 200 * s, `ring_front_${k}`).setScale(texScale() * s * 1.2));
      c.add(this.add.image(px + 60 * s, bg.y - 120 * s + i * 40 * s, `ball_${k}`).setScale(texScale() * s * 1.2));
    }
    c.add(frame);
    c.add(this.add.image(-fw / 2 + 175 * s, fh / 2 - 270 * s, 'btn_left_up').setScale(texScale() * s * 0.9));
    c.add(this.add.image(fw / 2 - 175 * s, fh / 2 - 270 * s, 'btn_right_up').setScale(texScale() * s * 0.9));
    const name = ThemeManager.current.name;
    c.add(text(this, 0, fh / 2 + 24, `Now: ${name}`, 22).setAlpha(0.9));
    if (!land) c.setY(y);
  }
}
