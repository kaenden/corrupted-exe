import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { neonButton, addScanlines, hdCamera, FONT } from '../ui/widgets.js';

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
    try { this.cameras.main.postFX?.addBloom(0xffffff, 1, 1, 1.1, 1.3, 8); } catch (_) { /* no bloom */ }

    // cinematic ambience: drifting data-motes + a periodic corruption sweep behind everything
    this.add.particles(0, 0, 'particle_spark', {
      x: { min: 0, max: CONFIG.WIDTH }, y: { min: 0, max: CONFIG.HEIGHT }, lifespan: 4200,
      speedY: { min: -14, max: -4 }, scale: { start: 0.14, end: 0 }, alpha: { start: 0.22, end: 0 },
      frequency: 230, quantity: 1, tint: 0x2affff, blendMode: 'ADD',
    }).setDepth(-7);
    this._corruptionSweep(cx);

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

    // Main menu — Campaign / Escape / Shop / Settings, cascading in
    this._menuBtn(cx, 202, '▶  CAMPAIGN', () => this._go(), { w: 264, size: '20px', accent: 0x00ff88 }, 0);
    this._menuBtn(cx, 252, '∞  ESCAPE', () => this.scene.start('BackdoorScene'), { w: 264, size: '18px', accent: 0x2affff, color: '#bdf6ff' }, 90);
    this._menuBtn(cx, 300, 'SHOP', () => this.scene.start('ShopScene'), { w: 264, size: '17px', accent: 0xffd24a }, 180);
    this._menuBtn(cx, 346, 'SETTINGS', () => this.scene.start('SettingsScene'), { w: 264, size: '17px', accent: 0x9b8aff }, 270);

    this.add.text(CONFIG.WIDTH - 8, CONFIG.HEIGHT - 6, 'v0.1', { fontFamily: FONT, fontSize: '10px', color: '#2a4a52' }).setOrigin(1, 1);

    addScanlines(this);
    SoundSystem.playMusic('mus_menu');
  }

  _menuBtn(x, y, label, cb, opts, delay) {
    const b = neonButton(this, x, y + 18, label, cb, opts).setAlpha(0);
    this.tweens.add({ targets: b, alpha: 1, y, duration: 380, delay, ease: 'Cubic.out' });
    return b;
  }

  // Periodic red corruption bar sweeping across the backdrop (cinematic, on-theme)
  _corruptionSweep(cx) {
    const bar = this.add.rectangle(-30, CONFIG.HEIGHT / 2, 14, CONFIG.HEIGHT * 1.4, 0xff2a4d, 0).setDepth(-6);
    const run = () => {
      bar.x = -30; bar.setAlpha(0.5);
      this.tweens.add({
        targets: bar, x: CONFIG.WIDTH + 30, duration: 1700, ease: 'Sine.inOut',
        onUpdate: () => { bar.y = CONFIG.HEIGHT / 2 + Phaser.Math.Between(-3, 3); },
        onComplete: () => { bar.setAlpha(0); this.time.delayedCall(Phaser.Math.Between(5000, 9000), run); },
      });
    };
    this.time.delayedCall(3500, run);
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
    const delay = Phaser.Math.Between(2600, 5200);
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
