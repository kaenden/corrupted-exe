import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { getLevels, isBossIndex, WORLD_META } from '../data/levels.js';
import { backButton, shardBadge, hdCamera, FONT } from '../ui/widgets.js';

const COLS = 5, CELL_W = 120, CELL_H = 80, GAP = 10;

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }
  init(data) { this.world = data?.world || 'alpha'; }

  create() {
    const meta = WORLD_META[this.world];
    hdCamera(this);
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);
    backButton(this, () => this.scene.start('WorldSelectScene'));
    this.add.text(CONFIG.WIDTH / 2, 22, meta.name, { fontFamily: FONT, fontSize: '16px', color: '#9fd6df' }).setOrigin(0.5);
    shardBadge(this, CONFIG.WIDTH - 14, 22);

    const levels = getLevels(this.world);
    if (!levels.length) {
      this.add.text(CONFIG.WIDTH / 2, 200, 'bölümler yakında...', { fontFamily: FONT, fontSize: '14px', color: '#5b8a93' }).setOrigin(0.5);
      return;
    }

    const gridW = COLS * CELL_W + (COLS - 1) * GAP;
    const x0 = (CONFIG.WIDTH - gridW) / 2 + CELL_W / 2;
    const y0 = 80 + CELL_H / 2;

    levels.forEach((lvl, i) => {
      const col = i % COLS, row = Math.floor(i / COLS);
      this._cell(lvl, i, x0 + col * (CELL_W + GAP), y0 + row * (CELL_H + GAP));
    });
  }

  _cell(lvl, index, x, y) {
    const stars = GameState.getStars(this.world, index);   // -1 locked, 0 unplayed, 1-3 done
    const unlocked = CONFIG.DEV_UNLOCK_ALL || GameState.isLevelUnlocked(this.world, index);
    const boss = isBossIndex(index);
    const accent = boss ? 0xff3344 : (unlocked ? COLORS.cyan : 0x3a3a3a);

    const box = this.add.rectangle(x, y, CELL_W, CELL_H, unlocked ? 0x081820 : 0x0a0a0e, 0.95).setStrokeStyle(2, accent);
    this.add.text(x, y - 22, lvl.code, { fontFamily: FONT, fontSize: '13px', color: unlocked ? '#dffcff' : '#555', resolution: 3 }).setOrigin(0.5);

    if (!unlocked) {
      this.add.text(x, y + 8, '🔒', { fontSize: '20px' }).setOrigin(0.5);
      return;
    }

    if (boss) this.add.text(x + CELL_W / 2 - 12, y - CELL_H / 2 + 12, '☠', { fontSize: '14px', color: '#ff6677' }).setOrigin(0.5);

    const shown = Math.max(0, stars);
    for (let i = 0; i < 3; i++) {
      const key = i < shown ? 'icon_star' : 'icon_star_empty';
      this.add.image(x - 17 + i * 17, y + 11, key).setDisplaySize(14, 14);
    }

    box.setInteractive({ useHandCursor: true })
      .on('pointerover', () => box.setFillStyle(0x0d2630, 0.95))
      .on('pointerout', () => box.setFillStyle(0x081820, 0.95))
      .on('pointerup', () => { this.scene.stop('UIScene'); this.scene.start('GameScene', { world: this.world, levelIndex: index }); });
  }
}
