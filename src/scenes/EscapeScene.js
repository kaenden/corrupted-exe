import Phaser from 'phaser';
import { CONFIG } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { AdSystem } from '../systems/ad/AdSystem.js';
import { PlayerSystem } from '../systems/PlayerSystem.js';
import { addScanlines, TXT } from '../ui/widgets.js';

// ENDLESS ESCAPE — flee the corruption forever. Procedural route, accelerating wall, periodic
// gates that BANK your distance (checkpoint), chasing a high score. Backdoor upgrades all apply.
const GROUND = 348;          // baseline platform top
const DEATH_Y = 470;
const VIEW = CONFIG.WIDTH;    // logical world width visible (zoom = RENDER_SCALE)

export class EscapeScene extends Phaser.Scene {
  constructor() { super('EscapeScene'); }

  create() {
    const cam = this.cameras.main;
    cam.setZoom(CONFIG.RENDER_SCALE);
    cam.fadeIn(240, 1, 3, 8);

    // scrolling grid backdrop (parallax)
    this.grid = this.add.tileSprite(0, 0, VIEW + 256, CONFIG.HEIGHT + 256, 'grid')
      .setOrigin(0, 0).setAlpha(0.10).setTint(0x2affff).setDepth(-12);

    this.platforms = this.add.group();
    this.hazards = [];
    this.gates = [];
    this._genX = 0;
    this._lastY = GROUND;
    this.dead = false;
    this.banked = 0;
    this.startX = 120;

    // a generous starting runway
    this._floor(0, GROUND, 360);
    this._genX = 360;
    for (let i = 0; i < 8; i++) this._genChunk(); // pre-build ahead

    this.player = new PlayerSystem(this);
    this.player.create(this.startX, GROUND - 40);
    this.player.applyCosmetics(GameState.data.equippedItems);
    this.physics.add.collider(this.player.sprite, this.platforms);

    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    cam.setFollowOffset(-110, 36);

    try { cam.postFX?.addBloom(0xffffff, 1, 1, 0.5, 1.9, 3); } catch (_) { /* tighter spread, punchier glow */ }

    this._setupWall();
    this._buildHud();
    addScanlines(this);
    SoundSystem.playMusic('mus_beta');
    AdSystem.gameplayStart();
  }

  // ---- procedural generation ----
  _floor(x, y, w) {
    const r = this.add.rectangle(x, y, w, 16, 0x09202e, 0.9).setOrigin(0, 0).setStrokeStyle(3, 0x2affff, 1).setDepth(2);
    this.physics.add.existing(r, true);
    r.body.setSize(w, 16).setOffset(0, 0);
    r.body.updateFromGameObject();
    this.platforms.add(r);
    return r;
  }

  _spike(x, y) {
    const s = this.add.image(x, y, 'spike_neon').setOrigin(0, 1).setDepth(3);
    this.physics.add.existing(s, true);
    if (CONFIG.IS_MOBILE) s.body.setSize(8, 9).setOffset(4, 6); else s.body.setSize(12, 12).setOffset(2, 4);
    s.body.updateFromGameObject();
    this.hazards.push(s);
  }

  _genChunk() {
    const d = Math.min(1, this._genX / 9000);            // 0→1 difficulty ramp
    const mob = CONFIG.IS_MOBILE;
    const w = Phaser.Math.Between(150, 300) - Math.round(d * 60) + (mob ? 80 : 0); // wider on touch
    let y = Phaser.Math.Clamp(this._lastY + Phaser.Math.Between(-34, 34), 270, 372);
    this._floor(this._genX, y, w);
    // occasional spike on wider platforms (rarer on touch)
    if (w > 170 && Phaser.Math.Between(0, 100) < (mob ? 18 : 30 + d * 30)) this._spike(this._genX + w / 2, y);
    // gate roughly every ~1300px of generated track
    if (this._genX - (this._lastGateX || 0) > 1300) {
      this._lastGateX = this._genX;
      this._gate(this._genX + w / 2, y);
    }
    this._genX += w + Phaser.Math.Between(80, 130) + Math.round(d * 45) - (mob ? 28 : 0); // gap (smaller on touch)
    this._lastY = y;
  }

  _gate(x, y) {
    const cy = y - 26;
    const body = this.add.rectangle(x, cy, 30, 52, 0x000000, 0).setDepth(4); // invisible hull for overlap
    this.physics.add.existing(body, true);
    body.body.updateFromGameObject();
    const portal = this._gatePortal(x, cy);
    this.gates.push({ img: body, portal, x, banked: false });
  }

  _gatePortal(x, y) {
    const c = this.add.container(x, y).setDepth(3);
    const ng = (n, r, col, w) => {
      const pts = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 - Math.PI / 2; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
      return this.add.polygon(0, 0, pts, 0x000000, 0).setStrokeStyle(w, col, 1).setOrigin(0.5, 0.5);
    };
    const halo = this.add.circle(0, 0, 22, 0x2affff, 0.14);
    const sq = ng(4, 20, 0x2affff, 2.5);
    const di = ng(4, 12, 0xffffff, 2);
    const core = this.add.star(0, 0, 4, 2, 6, 0x2affff, 1);
    c.add([halo, sq, di, core]);
    this.tweens.add({ targets: sq, rotation: Math.PI * 2, duration: 6000, repeat: -1 });
    this.tweens.add({ targets: di, rotation: -Math.PI * 2, duration: 4000, repeat: -1 });
    this.tweens.add({ targets: core, scale: 1.6, alpha: 0.55, angle: 90, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: halo, scale: 1.35, alpha: 0.24, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return c;
  }

  // ---- corruption wall ----
  _setupWall() {
    const h = CONFIG.HEIGHT;
    this.wallX = this.startX - 300;
    this.wallSpeed = 130;
    this._wallT = 0;
    this.wallFill = this.add.rectangle(0, 0, 10, h * 3, 0x3a0014, 0.45).setOrigin(1, 0).setDepth(6);
    this.wallEdge = this.add.rectangle(0, 0, 10, h * 3, 0xff2a4d, 0.95).setOrigin(0, 0).setDepth(7);
    this.wallPs = this.add.particles(0, 0, 'particle_spark', {
      x: 0, y: { min: -h, max: h * 2 }, lifespan: 480, speedX: { min: 20, max: 90 },
      scale: { start: 0.5, end: 0 }, tint: [0xff2a4d, 0xff7a4d], frequency: 26, quantity: 2, blendMode: 'ADD',
    }).setDepth(7);
  }

  _updateWall(delta) {
    this._wallT += delta;
    const d = Math.min(1, this.player.sprite.x / 9000);
    this.wallSpeed = 130 + d * 70;                       // accelerates over the run
    const slow = (GameState.data.backdoor.upgrades.slow || 0) * 0.06;
    this.wallX += this.wallSpeed * (1 - Math.min(0.4, slow)) * (delta / 1000);
    const top = this.cameras.main.worldView.y - CONFIG.HEIGHT;
    this.wallFill.setPosition(this.wallX, top);
    this.wallEdge.setPosition(this.wallX, top).setX(this.wallX + Phaser.Math.Between(-3, 3));
    this.wallPs.setPosition(this.wallX, this.cameras.main.worldView.centerY);
    // proximity for player expression + vignette feel
    this._wallProx = Phaser.Math.Clamp(1 - (this.player.sprite.x - this.wallX) / 260, 0, 1);
    if (this.player.sprite.x < this.wallX + 24) this._die();
  }

  update(time, delta) {
    if (this.dead || !this.player?.sprite) return;
    this.player.update(time, this._mobile);
    if (this._mobile) this._mobile.jumpJustPressed = false;
    this._updateWall(delta);

    // keep the grid covering the view
    const v = this.cameras.main.worldView;
    this.grid.setPosition(v.x - 128, v.y - 128);
    this.grid.tilePositionX = v.x * 0.5;
    this._layoutHud(v);

    // stream generation + cull behind
    while (this._genX < v.right + 500) this._genChunk();
    this.platforms.getChildren().forEach((p) => { if (p.x + p.width < v.x - 300) { p.destroy(); } });
    this.hazards = this.hazards.filter((s) => { if (s.x < v.x - 300) { s.destroy(); return false; } return true; });

    // hazard overlap
    for (const s of this.hazards) {
      if (this.physics.overlap(this.player.sprite, s)) { this._die(); break; }
    }
    // gate overlap → bank
    for (const g of this.gates) {
      if (!g.banked && this.physics.overlap(this.player.sprite, g.img)) this._bank(g);
    }
    this.gates = this.gates.filter((g) => { if (g.x < v.x - 300) { g.img.destroy(); g.portal.destroy(); return false; } return true; });

    // fell off the world
    if (this.player.sprite.y > DEATH_Y) this._die();

    // score
    this.score = Math.max(0, Math.floor((this.player.sprite.x - this.startX) / 20));
    this.scoreText.setText(`${this.score} m`);
    this.bankText.setText(`BANKED ${this.banked}`);
  }

  _bank(g) {
    g.banked = true;
    this.banked = Math.max(this.banked, this.score);
    g.portal.setAlpha(0.3);
    SoundSystem.play('sfx_win');
    this._flash('BANKED  ' + this.banked, '#00ff88');
  }

  _flash(text, color) {
    const v = this.cameras.main.worldView;
    const t = this.add.text(v.centerX, v.y + 80, text, { ...TXT, fontSize: '18px', color }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 26, duration: 1100, onComplete: () => t.destroy() });
  }

  _buildHud() {
    // world objects repositioned to the camera view each frame (scrollFactor 0 is unreliable under follow+zoom)
    this.scoreText = this.add.text(0, 0, '0 m', { ...TXT, fontSize: '20px' }).setOrigin(0.5, 0).setDepth(50);
    this.bankText = this.add.text(0, 0, 'BANKED 0', { ...TXT, fontSize: '11px', color: '#00ff88' }).setOrigin(0.5, 0).setDepth(50);
    this.bestText = this.add.text(0, 0, `BEST ${GameState.data.backdoor.highScore} m`, { ...TXT, fontSize: '11px', color: '#ffe27a' }).setOrigin(0, 0).setDepth(50);
    this._mobile = (this.sys.game.device.input.touch || navigator.maxTouchPoints > 0) ? this._touch() : null;
  }

  _layoutHud(v) {
    this.scoreText.setPosition(v.centerX, v.y + 12);
    this.bankText.setPosition(v.centerX, v.y + 38);
    this.bestText.setPosition(v.x + 30, v.y + 10);
  }

  // region-based touch: left half = run right (held), right half = jump. Same coord space as UIScene.
  _touch() {
    const mi = { left: false, right: false, jump: false, jumpJustPressed: false };
    this.input.addPointer(3);
    this.input.on('pointerdown', (p) => {
      if (p.x >= CONFIG.WIDTH * 0.5) { mi.jump = true; mi.jumpJustPressed = true; } else { mi.right = true; }
    });
    this.input.on('pointerup', () => { mi.right = false; mi.jump = false; });
    this.input.on('pointerupoutside', () => { mi.right = false; mi.jump = false; });
    return mi;
  }

  _die() {
    if (this.dead) return;
    this.dead = true;
    this.player.playDeathFx(GameState.getEquipped('deathFx'));
    this.cameras.main.shake(200, 0.012);
    this.cameras.main.flash(140, 90, 0, 16);
    SoundSystem.play('sfx_death');
    AdSystem.gameplayStop();
    const final = Math.max(this.banked, 0);
    const km = 1 + 0.5 * (GameState.data.backdoor.upgrades.keymult || 0);
    const keys = Math.floor((final / 30) * km);
    GameState.data.backdoor.keys += keys;
    const best = final > GameState.data.backdoor.highScore;
    if (best) GameState.data.backdoor.highScore = final;
    GameState.save();
    this.time.delayedCall(750, () => this.scene.start('EscapeOverScene', { final, keys, best }));
  }
}
