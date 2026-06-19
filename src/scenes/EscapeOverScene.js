import Phaser from 'phaser';
import { CONFIG } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { menuButton, card, hdCamera, addScanlines, TXT } from '../ui/widgets.js';

// Endless ESCAPE run-over — fixed camera (no follow/scroll), clean results + actions.
export class EscapeOverScene extends Phaser.Scene {
  constructor() { super('EscapeOverScene'); }

  create(data) {
    hdCamera(this);
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);
    const cx = CONFIG.WIDTH / 2, cy = CONFIG.HEIGHT / 2;
    const { final = 0, keys = 0, best = false } = data || {};

    card(this, cx, cy - 6, 380, 260, { accent: 0xff2a4d, active: true });
    this.add.text(cx, cy - 96, 'PURGED', { ...TXT, fontSize: '22px', color: '#ff5a6e' }).setOrigin(0.5);
    this.add.text(cx, cy - 58, `${final}`, { ...TXT, fontSize: '46px' }).setOrigin(0.5);
    this.add.text(cx, cy - 26, 'METERS BANKED', { ...TXT, fontSize: '11px', color: '#6f9aa3' }).setOrigin(0.5);
    this.add.text(cx, cy + 2, best ? '★ NEW BEST ★' : `BEST  ${GameState.data.backdoor.highScore} m`,
      { ...TXT, fontSize: '14px', color: best ? '#ffe27a' : '#7fb8c2' }).setOrigin(0.5);
    this.add.text(cx, cy + 28, `+${keys} BACKDOOR KEYS  (total ${GameState.data.backdoor.keys})`,
      { ...TXT, fontSize: '13px', color: '#ffd24a' }).setOrigin(0.5);

    menuButton(this, cx, cy + 72, '↻  ESCAPE AGAIN', () => this.scene.start('EscapeScene'), { size: '17px', accent: 0x2affff, color: '#bdf6ff' });
    menuButton(this, cx - 76, cy + 112, 'UPGRADES', () => this.scene.start('BackdoorScene'), { size: '13px', accent: 0xffd24a });
    menuButton(this, cx + 76, cy + 112, 'MENU', () => this.scene.start('MenuScene'), { size: '13px', accent: 0x9b8aff });

    addScanlines(this);
  }
}
