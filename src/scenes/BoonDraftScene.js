import Phaser from 'phaser';
import { CONFIG } from '../config/game.js';
import { RunState, BOONS } from '../state/RunState.js';
import { hdCamera, FONT } from '../ui/widgets.js';

// Between rooms: draft 1 of 3 boons to build your run.
export class BoonDraftScene extends Phaser.Scene {
  constructor() { super('BoonDraftScene'); }
  init(data) { this.gained = data?.gained || 0; }

  create() {
    hdCamera(this);
    this.cameras.main.setBackgroundColor(0x05030f);
    const cx = CONFIG.WIDTH / 2;

    this.add.text(cx, 38, 'ROOM CLEARED', { ...FONT, fontSize: '22px', color: '#00ff88' }).setOrigin(0.5);
    this.add.text(cx, 66, `+${this.gained} ⬡     DEPTH ${RunState.index}/${RunState.rooms.length}     ◇ ${RunState.integrity}/${RunState.maxIntegrity}${RunState.shield ? ' +FW' : ''}`,
      { ...FONT, fontSize: '12px', color: '#c4a6ff' }).setOrigin(0.5);
    this.add.text(cx, 100, 'DRAFT ONE', { ...FONT, fontSize: '14px', color: '#7a6aa0' }).setOrigin(0.5);

    const pool = Phaser.Utils.Array.Shuffle([...BOONS]).slice(0, 3);
    const w = 200, gap = 22, cy = 235;
    const total = pool.length * w + (pool.length - 1) * gap;
    let x = cx - total / 2 + w / 2;
    pool.forEach((b) => {
      const card = this.add.rectangle(x, cy, w, 160, 0x0a0a18, 0.96).setStrokeStyle(2, 0xbb6bff)
        .setInteractive({ useHandCursor: true });
      const xx = x;
      this.add.text(xx, cy - 52, b.name, { ...FONT, fontSize: '15px', color: '#c4a6ff', align: 'center', wordWrap: { width: w - 20 } }).setOrigin(0.5);
      this.add.text(xx, cy + 2, b.desc, { ...FONT, fontSize: '12px', color: '#9fd6df', align: 'center', wordWrap: { width: w - 24 } }).setOrigin(0.5);
      this.add.text(xx, cy + 60, '[ TAKE ]', { ...FONT, fontSize: '13px', color: '#dffcff' }).setOrigin(0.5);
      card.on('pointerover', () => card.setFillStyle(0x14142a, 0.96));
      card.on('pointerout', () => card.setFillStyle(0x0a0a18, 0.96));
      card.on('pointerup', () => {
        RunState.addBoon(b);
        const room = RunState.currentRoom();
        this.scene.start('GameScene', { world: room.world, levelIndex: room.levelIndex, run: true });
      });
      x += w + gap;
    });
  }
}
