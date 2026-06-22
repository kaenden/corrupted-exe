import Phaser from 'phaser';
import { CONFIG } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { menuButton, addScanlines, hdCamera, FONT } from '../ui/widgets.js';

const LOG_LINES = [
  'SIM_ALPHA initializing',
  'loading containment grid',
  'WARNING :: containment breach',
  'UNIT_7 escaped the test zone',
  'INITIATING PURGE PROTOCOL',
  'the exit is a lie',
  'do not trust the floor',
  'reality checksum mismatch',
];
const REVEAL = 1050; // boot-curtain time before the menu is unveiled

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    hdCamera(this);
    const cx = CONFIG.WIDTH / 2;
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);
    try { this.cameras.main.postFX?.addBloom(0xffffff, 1, 1, 0.5, 1.8, 3); } catch (_) { /* tighter glow */ }

    this.add.particles(0, 0, 'particle_spark', {
      x: { min: 0, max: CONFIG.WIDTH }, y: { min: 0, max: CONFIG.HEIGHT }, lifespan: 4200,
      speedY: { min: -14, max: -4 }, scale: { start: 0.14, end: 0 }, alpha: { start: 0.22, end: 0 },
      frequency: 230, quantity: 1, tint: 0x2affff, blendMode: 'ADD',
    }).setDepth(-7);
    this._corruptionSweep(cx);

    // single-line terminal ticker (bottom-left): types a line, holds, erases, next
    this._ticker = this.add.text(18, CONFIG.HEIGHT - 32, '', { fontFamily: FONT, fontSize: '13px', color: '#3f95a6', resolution: 3 }).setOrigin(0, 0.5).setDepth(2);
    this.time.delayedCall(REVEAL + 200, () => this._tick(0));

    this._buildMascot(cx, 58);

    // Title (neon green, pre-corruption) + chromatic glitch copies (fade in when the curtain opens)
    this.title = this.add.text(cx, 120, 'CORRUPTED.EXE', { fontFamily: FONT, fontSize: '40px', color: '#4dff5a', resolution: 3 }).setOrigin(0.5).setAlpha(0);
    this.titleR = this.add.text(cx, 120, 'CORRUPTED.EXE', { fontFamily: FONT, fontSize: '40px', color: '#ff2a55', resolution: 3 }).setOrigin(0.5).setAlpha(0);
    this.titleB = this.add.text(cx, 120, 'CORRUPTED.EXE', { fontFamily: FONT, fontSize: '40px', color: '#2affff', resolution: 3 }).setOrigin(0.5).setAlpha(0);
    this.sub = this.add.text(cx, 153, 'the simulation lies — every glitch is a trap', { fontFamily: FONT, fontSize: '13px', color: '#8fe9f2', resolution: 3 }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [this.title, this.sub], alpha: 1, duration: 520, delay: REVEAL });
    this._scheduleGlitch();

    // CAMPAIGN lands you straight in the next unplayed level (CrazyGames: ≤1 click to gameplay).
    // LEVELS opens the world/level picker for replaying / chapter select.
    this._menuBtn(182, 'CAMPAIGN', () => this._play(), 0x00ff88, REVEAL + 0);
    this._menuBtn(216, 'LEVELS', () => this._go(), 0x5ad1ff, REVEAL + 55);
    this._menuBtn(250, 'ESCAPE', () => this.scene.start('EscapeScene'), 0x2affff, REVEAL + 110);
    this._menuBtn(284, 'UPGRADES', () => this.scene.start('BackdoorScene'), 0xff5a9e, REVEAL + 165);
    this._menuBtn(318, 'SHOP', () => this.scene.start('ShopScene'), 0xffd24a, REVEAL + 220);
    this._menuBtn(352, 'SETTINGS', () => this.scene.start('SettingsScene'), 0x9b8aff, REVEAL + 275);

    this.add.text(CONFIG.WIDTH - 8, CONFIG.HEIGHT - 6, 'v0.1', { fontFamily: FONT, fontSize: '10px', color: '#2a4a52' }).setOrigin(1, 1);
    addScanlines(this);
    SoundSystem.playMusic('mus_menu');
    this._bootIntro();
  }

  _menuBtn(y, label, cb, accent, delay) {
    menuButton(this, CONFIG.WIDTH / 2, y, label, cb, { accent, delay, size: '21px' });
  }

  // Boot curtain: black halves + "initializing" loader, then split open + reveal the menu.
  _bootIntro() {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    const top = this.add.rectangle(0, 0, W, H / 2, 0x02030a).setOrigin(0, 0).setDepth(1000);
    const bot = this.add.rectangle(0, H / 2, W, H / 2, 0x02030a).setOrigin(0, 0).setDepth(1000);
    const load = this.add.text(W / 2, H / 2 - 4, 'SIM_ALPHA initializing', { fontFamily: FONT, fontSize: '15px', color: '#2affff', resolution: 3 }).setOrigin(0.5).setDepth(1001);
    const dots = this.add.text(W / 2 + load.width / 2 + 4, H / 2 - 4, '', { fontFamily: FONT, fontSize: '15px', color: '#2affff', resolution: 3 }).setOrigin(0, 0.5).setDepth(1001);
    let d = 0;
    const ev = this.time.addEvent({ delay: 230, loop: true, callback: () => { d = (d + 1) % 4; dots.setText('.'.repeat(d)); } });
    this.time.delayedCall(REVEAL - 100, () => {
      ev.remove();
      this.tweens.add({ targets: [load, dots], alpha: 0, duration: 180 });
      this.tweens.add({ targets: top, y: -H / 2, duration: 540, ease: 'Cubic.inOut', delay: 140 });
      this.tweens.add({ targets: bot, y: H, duration: 540, ease: 'Cubic.inOut', delay: 140, onComplete: () => { top.destroy(); bot.destroy(); load.destroy(); dots.destroy(); } });
    });
  }

  // Typewriter ticker — type → hold → erase → next line (loop)
  _tick(li) {
    const full = LOG_LINES[li % LOG_LINES.length];
    let i = 0;
    const step = () => {
      if (!this._ticker?.active) return;
      if (i < full.length) { this._ticker.setText(full.slice(0, ++i) + '_'); this.time.delayedCall(42, step); }
      else { this._ticker.setText(full); this.time.delayedCall(1600, erase); }
    };
    const erase = () => {
      if (!this._ticker?.active) return;
      if (i > 0) { this._ticker.setText(full.slice(0, --i) + '_'); this.time.delayedCall(20, erase); }
      else this.time.delayedCall(360, () => this._tick(li + 1));
    };
    step();
  }

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
    this.time.delayedCall(REVEAL + 2500, run);
  }

  _go() { this.scene.start('WorldSelectScene'); }

  // 1-click "land in gameplay": jump straight into the first unlocked-but-unplayed level (the player's
  // next step), falling back to alpha-0 for a brand-new save or a fully-cleared one.
  _play() { this.scene.start('GameScene', this._nextLevel()); }
  _nextLevel() {
    const N = CONFIG.LEVELS_PER_WORLD;
    for (const world of ['alpha', 'beta']) {
      if (!GameState.data.unlockedWorlds.includes(world)) continue;
      for (let i = 0; i < N; i++) if (GameState.getStars(world, i) === 0) return { world, levelIndex: i };
    }
    return { world: 'alpha', levelIndex: 0 };
  }

  // Mascot — big-head character with emoji-like expressions (squint, smile, blink) + glitch.
  _buildMascot(cx, y) {
    const C = 0xffa81a, HW = 58, HH = 52;
    const legL = this.add.rectangle(cx - 10, y + 33, 9, 13, C, 1);
    const legR = this.add.rectangle(cx + 10, y + 33, 9, 13, C, 1);
    const head = this.add.image(cx, y, 'p_head').setDisplaySize(HW, HH).setTint(C).setAlpha(1);
    const eyeL = this.add.ellipse(cx - 10, y - 3, 11, 14, 0x05121a, 1);
    const eyeR = this.add.ellipse(cx + 10, y - 3, 11, 14, 0x05121a, 1);
    const mouth = this.add.graphics().setPosition(cx, y + 11);
    const drawMouth = (smile) => {
      mouth.clear().lineStyle(2.5, 0x05121a, 1);
      if (smile) { mouth.beginPath(); mouth.arc(0, -3, 7, 0.18 * Math.PI, 0.82 * Math.PI, false); mouth.strokePath(); }
      else { mouth.lineBetween(-4, 0, 4, 0); }
    };
    drawMouth(false);
    const parts = [legL, legR, head, eyeL, eyeR, mouth];
    parts.forEach((p) => p.setAlpha(0));
    this.tweens.add({ targets: parts, alpha: 1, duration: 520, delay: REVEAL });
    this.tweens.add({ targets: parts, y: '-=7', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const eyes = (sy) => { eyeL.scaleY = sy; eyeR.scaleY = sy; };
    const neutral = () => { eyes(1); drawMouth(false); };
    const happy = () => { eyes(0.45); drawMouth(true); };
    const blink = () => { eyes(0.12); this.time.delayedCall(120, () => eyes(1)); };
    const glitch = () => {
      let n = 0;
      const g = this.time.addEvent({ delay: 45, repeat: 4, callback: () => {
        const o = Phaser.Math.Between(-4, 4);
        head.x = cx + o; eyeL.x = cx - 10 + o; eyeR.x = cx + 10 + o; head.setTint(n % 2 ? 0xff2a55 : C); n++;
      } });
      this.time.delayedCall(280, () => { head.x = cx; eyeL.x = cx - 10; eyeR.x = cx + 10; head.setTint(C); });
      return g;
    };
    this.time.addEvent({ delay: 2300, loop: true, callback: () => {
      const r = Phaser.Math.Between(0, 3);
      if (r === 0) { happy(); this.time.delayedCall(950, neutral); }
      else if (r === 1) blink();
      else if (r === 2) glitch();
      else { happy(); this.time.delayedCall(650, blink); this.time.delayedCall(1050, neutral); }
    } });
  }

  _scheduleGlitch() {
    this.time.delayedCall(Phaser.Math.Between(2600, 5200), () => { this._glitch(); this._scheduleGlitch(); });
  }

  _glitch() {
    if (!this.title?.active || this.title.alpha < 0.5) return;
    const ox = Phaser.Math.Between(-4, 4);
    this.titleR.setAlpha(0.8).setX(this.title.x - 4 + ox);
    this.titleB.setAlpha(0.8).setX(this.title.x + 4 + ox);
    this.title.setX(CONFIG.WIDTH / 2 + ox);
    this.time.delayedCall(200, () => {
      this.titleR.setAlpha(0); this.titleB.setAlpha(0);
      this.title.setX(CONFIG.WIDTH / 2);
    });
  }
}
