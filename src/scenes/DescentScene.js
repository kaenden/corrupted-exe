import Phaser from 'phaser';
import { CONFIG } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { RunState } from '../state/RunState.js';
import { textButton, backButton, hdCamera, FONT } from '../ui/widgets.js';

// Permanent meta-shop upgrades (spend GLITCH KEYS). Stored as integer levels in descent.upgrades.
const UPGRADES = [
  { id: 'integrity', name: 'REINFORCE', desc: '+1 starting max integrity', base: 8, step: 6, max: 4 },
  { id: 'greed', name: 'AVARICE', desc: '+0.25 starting key multiplier', base: 10, step: 8, max: 4 },
  { id: 'shield', name: 'PREBOOT FIREWALL', desc: 'Begin each run with a firewall', base: 14, step: 0, max: 1 },
];

export class DescentScene extends Phaser.Scene {
  constructor() { super('DescentScene'); }

  create() {
    hdCamera(this);
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);
    backButton(this, () => this.scene.start('MenuScene'));
    const cx = CONFIG.WIDTH / 2;

    this.add.text(cx, 28, 'THE DESCENT', { ...FONT, fontSize: '24px', color: '#c4a6ff' }).setOrigin(0.5);
    this.add.text(cx, 54, 'the deeper you fall, the harder the simulation lies', { ...FONT, fontSize: '11px', color: '#7a6aa0' }).setOrigin(0.5);
    this.keyText = this.add.text(cx, 82, '', { ...FONT, fontSize: '14px', color: '#ffe27a' }).setOrigin(0.5);

    textButton(this, cx, 128, '▶  DESCEND', () => {
      RunState.start();
      const room = RunState.currentRoom();
      this.scene.start('GameScene', { world: room.world, levelIndex: room.levelIndex, run: true });
    }, { size: '22px', padX: 30, padY: 12, color: '#c4a6ff', bg: '#1a0e2e' });

    this.add.text(cx, 178, 'PERMANENT UPGRADES', { ...FONT, fontSize: '11px', color: '#7a6aa0' }).setOrigin(0.5);
    this.rows = this.add.container(0, 0);
    this._refresh();
  }

  _cost(u, lvl) { return u.base + lvl * u.step; }

  _refresh() {
    const m = GameState.data.descent;
    this.keyText.setText(`⬡ ${m.glitchKeys} GLITCH KEYS     BEST DEPTH ${m.bestDepth}`);
    this.rows.removeAll(true);
    const cx = CONFIG.WIDTH / 2;
    UPGRADES.forEach((u, i) => {
      const y = 210 + i * 52;
      const lvl = m.upgrades[u.id] || 0;
      const maxed = lvl >= u.max;
      const cost = this._cost(u, lvl);
      this.rows.add(this.add.text(cx - 255, y - 8, `${u.name}   ${u.max > 1 ? 'Lv' + lvl + '/' + u.max : ''}`, { ...FONT, fontSize: '14px', color: '#dffcff' }).setOrigin(0, 0.5));
      this.rows.add(this.add.text(cx - 255, y + 10, u.desc, { ...FONT, fontSize: '10px', color: '#7a6aa0' }).setOrigin(0, 0.5));
      const can = !maxed && m.glitchKeys >= cost;
      const btn = textButton(this, cx + 210, y, maxed ? '[ MAX ]' : `[ ${cost} ⬡ ]`, () => {
        if (maxed || GameState.data.descent.glitchKeys < cost) return;
        GameState.data.descent.glitchKeys -= cost;
        GameState.data.descent.upgrades[u.id] = lvl + 1;
        GameState.save();
        this._refresh();
      }, { size: '13px', originX: 1, disabled: maxed || !can, color: can ? '#ffe27a' : '#888' });
      this.rows.add(btn);
    });
  }
}
