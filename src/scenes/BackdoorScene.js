import Phaser from 'phaser';
import { CONFIG } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { textButton, backButton, hdCamera, FONT } from '../ui/widgets.js';

// ESCAPE meta-shop — spend BACKDOOR KEYS (earned by clean escapes) on permanent upgrades.
// Levels stored as integers in backdoor.upgrades. All effects apply in chase/escape levels.
const UPGRADES = [
  { id: 'speed',    name: 'OVERCLOCK',    desc: '+7% run speed',          base: 6,  step: 5, max: 4 },
  { id: 'jump',     name: 'SPRING BOOT',  desc: '+5% jump height',        base: 6,  step: 5, max: 4 },
  { id: 'slow',     name: 'COLD BOOT',    desc: '-6% corruption speed',   base: 8,  step: 6, max: 4 },
  { id: 'bug',      name: 'DEBUGGER',     desc: '+0.45s bug slowdown',    base: 6,  step: 5, max: 4 },
  { id: 'platform', name: 'WIDE BUS',     desc: 'wider platforms',        base: 6,  step: 5, max: 4 },
  { id: 'keymult',  name: 'SKELETON KEY', desc: '+0.5x key payout',       base: 10, step: 8, max: 3 },
  { id: 'alarm',    name: 'TRIPWIRE',     desc: 'trap proximity alarm',   base: 10, step: 0, max: 1 },
  { id: 'shield',   name: 'FIREWALL',     desc: 'absorb 1 death / level', base: 12, step: 0, max: 1 },
];

export class BackdoorScene extends Phaser.Scene {
  constructor() { super('BackdoorScene'); }

  create() {
    hdCamera(this);
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);
    backButton(this, () => this.scene.start('MenuScene'));
    const cx = CONFIG.WIDTH / 2;

    this.add.text(cx, 24, 'BACKDOOR', { ...FONT, fontSize: '24px', color: '#ffd24a' }).setOrigin(0.5);
    this.add.text(cx, 48, 'escape clean to bank keys — spend them to outrun the corruption', { ...FONT, fontSize: '10px', color: '#9a8a4a' }).setOrigin(0.5);
    this.keyText = this.add.text(cx, 74, '', { ...FONT, fontSize: '14px', color: '#ffe27a' }).setOrigin(0.5);

    textButton(this, cx, 110, '▶  ESCAPE  (OUTRUN)', () => {
      this.scene.start('GameScene', { world: 'alpha', levelIndex: 17 });
    }, { size: '18px', padX: 24, padY: 9, color: '#2affff', bg: '#0e1f2a' });

    this.rows = this.add.container(0, 0);
    this._refresh();
  }

  _cost(u, lvl) { return u.base + lvl * u.step; }

  _refresh() {
    const m = GameState.data.backdoor;
    this.keyText.setText(`${m.keys} BACKDOOR KEYS`);
    this.rows.removeAll(true);
    UPGRADES.forEach((u, i) => {
      const col = i < 4 ? 0 : 1;
      const x0 = col === 0 ? 30 : 374;
      const y = 156 + (i % 4) * 52;
      const lvl = m.upgrades[u.id] || 0;
      const maxed = lvl >= u.max;
      const cost = this._cost(u, lvl);
      this.rows.add(this.add.text(x0, y - 9, `${u.name}${u.max > 1 ? '  Lv' + lvl + '/' + u.max : ''}`, { ...FONT, fontSize: '12px', color: '#dffcff' }).setOrigin(0, 0.5));
      this.rows.add(this.add.text(x0, y + 8, u.desc, { ...FONT, fontSize: '9px', color: '#7a8a90' }).setOrigin(0, 0.5));
      const can = !maxed && m.keys >= cost;
      const btn = textButton(this, x0 + 286, y, maxed ? '[ MAX ]' : `[ ${cost} ]`, () => {
        if (maxed || GameState.data.backdoor.keys < cost) return;
        GameState.data.backdoor.keys -= cost;
        GameState.data.backdoor.upgrades[u.id] = lvl + 1;
        GameState.save();
        this._refresh();
      }, { size: '12px', originX: 1, disabled: maxed || !can, color: can ? '#ffe27a' : '#888' });
      this.rows.add(btn);
    });
  }
}
