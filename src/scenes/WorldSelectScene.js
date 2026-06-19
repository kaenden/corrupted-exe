import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { getLevels, WORLD_META } from '../data/levels.js';
import { menuButton, backButton, shardBadge, card, hdCamera, FONT } from '../ui/widgets.js';

export class WorldSelectScene extends Phaser.Scene {
  constructor() { super('WorldSelectScene'); }

  create() {
    hdCamera(this);
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);
    backButton(this, () => this.scene.start('MenuScene'));
    shardBadge(this, CONFIG.WIDTH - 14, 22);
    this.add.text(CONFIG.WIDTH / 2, 22, 'SELECT WORLD', { fontFamily: FONT, fontSize: '16px', color: '#9fd6df' }).setOrigin(0.5);

    this._card('alpha', 180, true);
    this._card('beta', 540, GameState.data.unlockedWorlds.includes('beta') || CONFIG.DEV_UNLOCK_ALL);
  }

  _card(world, cx, unlocked) {
    const meta = WORLD_META[world];
    const cy = 210;
    card(this, cx, cy, 280, 230, {
      accent: unlocked ? meta.accent : 0x444444, active: unlocked,
      onClick: unlocked ? () => this.scene.start('LevelSelectScene', { world }) : null,
    }).setAlpha(unlocked ? 1 : 0.9);

    const title = this.add.text(cx, cy - 80, meta.name, { fontFamily: FONT, fontSize: '22px', color: unlocked ? '#dffcff' : '#777' }).setOrigin(0.5);
    this.add.text(cx, cy - 52, meta.subtitle, { fontFamily: FONT, fontSize: '11px', color: '#5b8a93' }).setOrigin(0.5);

    const levels = getLevels(world);
    const total = levels.length;
    let done = 0, stars = 0;
    for (let i = 0; i < total; i++) {
      const s = GameState.getStars(world, i);
      if (s > 0) { done++; stars += s; }
    }

    if (unlocked) {
      this.add.text(cx, cy - 10, `${done} / ${total} complete`, { fontFamily: FONT, fontSize: '14px', color: '#9fd6df' }).setOrigin(0.5);
      this.add.image(cx - 18, cy + 16, 'icon_star').setDisplaySize(18, 18);
      this.add.text(cx - 2, cy + 16, `${stars}`, { fontFamily: FONT, fontSize: '16px', color: '#ffe27a' }).setOrigin(0, 0.5);
      this.add.text(cx, cy + 80, 'ENTER  ▶', { fontFamily: FONT, fontSize: '17px', color: '#bdf6ff', resolution: 3 }).setOrigin(0.5);
    } else {
      // static-noise look for locked world
      this.add.text(cx, cy - 6, '[ ACCESS DENIED ]', { fontFamily: FONT, fontSize: '13px', color: '#ff5566' }).setOrigin(0.5);
      this.add.text(cx, cy + 30, 'clear all of SIM_ALPHA', { fontFamily: FONT, fontSize: '11px', color: '#777' }).setOrigin(0.5);
      this._noise(cx, cy);
    }
  }

  _noise(cx, cy) {
    const g = this.add.graphics().setDepth(5);
    const redraw = () => {
      g.clear();
      for (let i = 0; i < 60; i++) {
        const x = cx - 135 + Math.floor(Phaser.Math.Between(0, 270));
        const y = cy - 110 + Math.floor(Phaser.Math.Between(0, 220));
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.02, 0.12)).fillRect(x, y, 2, 2);
      }
    };
    this.time.addEvent({ delay: 90, loop: true, callback: redraw });
  }
}
