import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { textButton, addScanlines, hdCamera, FONT } from '../ui/widgets.js';

const LOG_LINES = [
  'SIM_ALPHA initializing...',
  'loading containment grid... OK',
  'WARNING: containment breach detected',
  'UNIT_7 has escaped test zone',
  'INITIATING PURGE PROTOCOL',
  'rewriting physics constants...',
  'ERR: reality checksum mismatch',
  'the exit is a lie',
  'do not trust the floor',
];

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    hdCamera(this);
    const cx = CONFIG.WIDTH / 2;
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);

    // Scrolling terminal log (faded, top)
    this.log = this.add.text(16, CONFIG.HEIGHT, LOG_LINES.join('\n'), {
      fontFamily: FONT, fontSize: '11px', color: '#1f6b78', lineSpacing: 4,
    }).setDepth(-5);

    this._buildMascot(cx, 58);

    // Title + glitch copies
    this.title = this.add.text(cx, 120, 'CORRUPTED.EXE', { fontFamily: FONT, fontSize: '40px', color: '#dffcff', resolution: 3 }).setOrigin(0.5);
    this.titleR = this.add.text(cx, 120, 'CORRUPTED.EXE', { fontFamily: FONT, fontSize: '40px', color: '#ff2a55', resolution: 3 }).setOrigin(0.5).setAlpha(0);
    this.titleB = this.add.text(cx, 120, 'CORRUPTED.EXE', { fontFamily: FONT, fontSize: '40px', color: '#2affff', resolution: 3 }).setOrigin(0.5).setAlpha(0);
    this.add.text(cx, 152, 'a simulation is lying to you', { fontFamily: FONT, fontSize: '12px', color: '#5b8a93', resolution: 3 }).setOrigin(0.5);
    this._scheduleGlitch();

    // Main buttons
    textButton(this, cx, 184, '▶  START', () => this._go(), { size: '22px', padX: 28, padY: 11 });
    textButton(this, cx, 228, '▼  ESCAPE', () => this.scene.start('BackdoorScene'), { size: '18px', color: '#2affff', bg: '#0e1f2a', padX: 18, padY: 8 });
    textButton(this, cx, 268, '▼  THE DESCENT', () => this.scene.start('DescentScene'), { size: '15px', color: '#c4a6ff', bg: '#1a0e2e', padX: 14, padY: 6 });
    textButton(this, cx - 58, 306, 'WORLDS', () => this.scene.start('WorldSelectScene'), { size: '14px' });
    textButton(this, cx + 58, 306, 'SHOP', () => this.scene.start('ShopScene'), { size: '14px' });

    // Audio toggles + settings gear (bottom)
    this.sesBtn = textButton(this, cx - 70, 360, this._lbl('SOUND', 'soundEnabled'), () => this._toggle('soundEnabled', this.sesBtn, 'SOUND'), { size: '13px' });
    this.muzBtn = textButton(this, cx, 360, this._lbl('MUSIC', 'musicEnabled'), () => this._toggle('musicEnabled', this.muzBtn, 'MUSIC'), { size: '13px' });
    textButton(this, cx + 80, 360, '⚙', () => this.scene.start('SettingsScene'), { size: '16px', padX: 10 });

    this.add.text(CONFIG.WIDTH - 8, CONFIG.HEIGHT - 6, 'v0.1', { fontFamily: FONT, fontSize: '10px', color: '#2a4a52' }).setOrigin(1, 1);

    addScanlines(this);
    SoundSystem.playMusic('mus_menu');
  }

  _lbl(name, key) { return `${name}: ${GameState.getSetting(key) ? 'ON' : 'OFF'}`; }
  _toggle(key, btn, name) {
    GameState.setSetting(key, !GameState.getSetting(key));
    btn.setText(this._lbl(name, key));
    SoundSystem.applySettings();
  }

  _go() {
    // BAŞLAT → resume into the worlds flow (later: jump to last-played level)
    this.scene.start('WorldSelectScene');
  }

  // Mascot — same big-head character as the player, bobbing above the title
  _buildMascot(cx, y) {
    const HW = 58, HH = 52;
    const legL = this.add.rectangle(cx - 10, y + 25, 9, 13, 0xffb43b, 0.95);
    const legR = this.add.rectangle(cx + 10, y + 25, 9, 13, 0xffb43b, 0.95);
    const head = this.add.image(cx, y, 'p_head').setDisplaySize(HW, HH).setTint(0xffb43b).setAlpha(0.92);
    const line = this.add.image(cx, y, 'p_head_line').setDisplaySize(HW, HH);
    const eyeL = this.add.ellipse(cx - 10, y - 3, 10, 13, 0x06121a, 1);
    const eyeR = this.add.ellipse(cx + 10, y - 3, 10, 13, 0x06121a, 1);
    const parts = [legL, legR, head, line, eyeL, eyeR];
    this.tweens.add({ targets: parts, y: '-=7', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.addEvent({
      delay: 2600, loop: true, callback: () => {
        eyeL.x = cx - 10 + Phaser.Math.Between(-3, 3); eyeR.x = cx + 10 + Phaser.Math.Between(-3, 3);
        this.time.delayedCall(110, () => { eyeL.x = cx - 10; eyeR.x = cx + 10; });
      },
    });
  }

  _scheduleGlitch() {
    const delay = Phaser.Math.Between(4000, 8000);
    this.time.delayedCall(delay, () => { this._glitch(); this._scheduleGlitch(); });
  }

  _glitch() {
    const ox = Phaser.Math.Between(-4, 4);
    this.titleR.setAlpha(0.8).setX(this.title.x - 4 + ox);
    this.titleB.setAlpha(0.8).setX(this.title.x + 4 + ox);
    this.title.setX(this.title.x + ox);
    this.time.delayedCall(200, () => {
      this.titleR.setAlpha(0); this.titleB.setAlpha(0);
      this.title.setX(CONFIG.WIDTH / 2);
    });
  }

  update(_t, dt) {
    // Scroll the log upward, loop
    this.log.y -= 0.012 * dt;
    if (this.log.y < -this.log.height) this.log.y = CONFIG.HEIGHT;
  }
}
