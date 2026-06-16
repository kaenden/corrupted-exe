import Phaser from 'phaser';
import { CONFIG } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { RunState } from '../state/RunState.js';
import { textButton, hdCamera, FONT } from '../ui/widgets.js';

export class RunOverScene extends Phaser.Scene {
  constructor() { super('RunOverScene'); }
  init(data) { this.summary = data || RunState.lastSummary || { won: false, keys: 0, depth: 0 }; }

  create() {
    hdCamera(this);
    this.cameras.main.setBackgroundColor(0x05030f);
    const cx = CONFIG.WIDTH / 2;
    const s = this.summary;

    this.add.text(cx, 68, s.won ? 'SYSTEM PURGED' : 'INTEGRITY LOST', { ...FONT, fontSize: '26px', color: s.won ? '#00ff88' : '#ff5a7a' }).setOrigin(0.5);
    this.add.text(cx, 108, `DEPTH REACHED  ${s.depth} / ${RunState.rooms.length}`, { ...FONT, fontSize: '16px', color: '#c4a6ff' }).setOrigin(0.5);
    this.add.text(cx, 136, `⬡ +${s.keys} GLITCH KEYS BANKED`, { ...FONT, fontSize: '16px', color: '#ffe27a' }).setOrigin(0.5);
    this.add.text(cx, 162, `total ⬡ ${GameState.data.descent.glitchKeys}`, { ...FONT, fontSize: '11px', color: '#7a6aa0' }).setOrigin(0.5);

    textButton(this, cx, 226, '▶  DESCEND AGAIN', () => {
      RunState.start();
      const room = RunState.currentRoom();
      this.scene.start('GameScene', { world: room.world, levelIndex: room.levelIndex, run: true });
    }, { size: '18px', padX: 24, padY: 10, color: '#c4a6ff', bg: '#1a0e2e' });
    textButton(this, cx, 276, 'UPGRADES', () => this.scene.start('DescentScene'), { size: '14px' });
    textButton(this, cx, 314, 'MAIN MENU', () => this.scene.start('MenuScene'), { size: '14px' });
  }
}
