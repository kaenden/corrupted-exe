import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { getLevels, isBossIndex, WORLD_META } from '../data/levels.js';
import { backButton, shardBadge, hdCamera, FONT } from '../ui/widgets.js';

const COLS = 6, CELL_W = 104, CELL_H = 60, GAP = 8;  // 6×5 grid fits 30 levels in 720×405

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
      this.add.text(CONFIG.WIDTH / 2, 200, 'levels coming soon...', { fontFamily: FONT, fontSize: '14px', color: '#5b8a93' }).setOrigin(0.5);
      return;
    }

    const gridW = COLS * CELL_W + (COLS - 1) * GAP;
    const x0 = (CONFIG.WIDTH - gridW) / 2 + CELL_W / 2;
    const y0 = 50 + CELL_H / 2;

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

    const box = this.add.rectangle(x, y, CELL_W, CELL_H, 0x05080b, unlocked ? 0.92 : 0.95).setStrokeStyle(1.5, accent, unlocked ? 0.7 : 0.5);
    this.add.text(x, y - 15, lvl.code, { fontFamily: FONT, fontSize: '12px', color: unlocked ? '#dffcff' : '#555', resolution: 3 }).setOrigin(0.5);

    if (!unlocked) {
      this.add.text(x, y + 8, '🔒', { fontSize: '18px' }).setOrigin(0.5);
      return;
    }

    if (boss) this.add.text(x + CELL_W / 2 - 10, y - CELL_H / 2 + 10, '☠', { fontSize: '13px', color: '#ff6677' }).setOrigin(0.5);

    const shown = Math.max(0, stars);
    for (let i = 0; i < 3; i++) {
      const key = i < shown ? 'icon_star' : 'icon_star_empty';
      this.add.image(x - 15 + i * 15, y + 13, key).setDisplaySize(12, 12);
    }

    box.setInteractive({ useHandCursor: true })
      .on('pointerover', () => box.setStrokeStyle(2.5, accent, 1).setFillStyle(0x0b131a, 0.95))
      .on('pointerout', () => box.setStrokeStyle(1.5, accent, 0.7).setFillStyle(0x05080b, 0.92))
      .on('pointerup', () => { this.scene.stop('UIScene'); this.scene.start('GameScene', { world: this.world, levelIndex: index }); });
  }
}
