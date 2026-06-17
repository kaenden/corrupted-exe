import Phaser from 'phaser';
import { CONFIG } from '../config/game.js';
import { COSMETICS } from '../data/cosmetics.js';
import { SoundSystem } from './SoundSystem.js';
import { RunState } from '../state/RunState.js';
import { GameState } from '../state/GameState.js';

// Neon line-art player: a small glowing square with a motion trail (camera bloom does the glow).
// Instant horizontal movement, single fixed-height jump, coyote time + jump buffer.
export class PlayerSystem {
  constructor(scene) {
    this.scene = scene;
    this.sprite = null;
    this.trail = null;
    this.color = 0x00ffff;
    this._lastGroundTime = -9999;
    this._jumpQueuedAt = -9999;
    this._wasAir = false;
    this._fallVy = 0;
  }

  create(x, y) {
    const S = 20;
    const s = this.scene.add.rectangle(x, y, S, S, 0x00ffff, 0.9).setStrokeStyle(2.5, 0xffffff, 0.95);
    this.scene.physics.add.existing(s);
    s.body.setSize(S, S);
    // BACKDOOR upgrades apply in ALL levels — corruption is the game's through-line.
    const up = GameState.data.backdoor?.upgrades || {};
    this._speed = CONFIG.PLAYER_SPEED * (1 + 0.07 * (up.speed || 0));
    this._jumpV = CONFIG.PLAYER_JUMP_VELOCITY * (1 + 0.05 * (up.jump || 0));
    s.body.setMaxVelocity(this._speed, CONFIG.PLAYER_MAX_FALL);
    s.setDepth(5);
    this.sprite = s;

    // Robot face (visual only — follows the body each frame; eyes/antenna + glitch + expression)
    const D = 6;
    this.antenna = this.scene.add.rectangle(x, y - 14, 2, 9, 0xffffff, 0.85).setDepth(D);
    this.tip = this.scene.add.circle(x, y - 18, 2.6, 0xff2a4d, 1).setDepth(D);
    this.eyeL = this.scene.add.rectangle(x - 4, y - 1, 4, 5, 0x06121a, 1).setDepth(D);
    this.eyeR = this.scene.add.rectangle(x + 4, y - 1, 4, 5, 0x06121a, 1).setDepth(D);
    this.faceParts = [this.antenna, this.tip, this.eyeL, this.eyeR];
    this._glitchAt = 0; this._glitchGap = 800;

    const k = this.scene.input.keyboard;
    this.keys = k.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', up: 'UP', w: 'W', space: 'SPACE' });
    return s;
  }

  applyCosmetics(equipped) {
    const skin = COSMETICS.skins[equipped.skin] || COSMETICS.skins.skin_default;
    this.color = skin.color || 0x00ffff;
    this.sprite.setFillStyle(this.color, skin.alpha ?? 0.9);
    this.sprite.setStrokeStyle(2.5, 0xffffff, 0.95);

    this.trail?.destroy();
    this.trail = this.scene.add.particles(0, 0, 'particle_spark', {
      follow: this.sprite, frequency: 28, lifespan: 320,
      scale: { start: 0.5, end: 0 }, alpha: { start: 0.6, end: 0 },
      tint: this.color, speed: 0, blendMode: 'ADD', emitting: false,
    });
    this.trail.setDepth(4);
  }

  update(time, mobileInput) {
    const s = this.sprite;
    if (!s || !s.active) return;
    const k = this.keys, mi = mobileInput || {};
    const b = s.body;

    const left = k.left.isDown || k.a.isDown || mi.left;
    const right = k.right.isDown || k.d.isDown || mi.right;
    const jumpDown = Phaser.Input.Keyboard.JustDown(k.up) || Phaser.Input.Keyboard.JustDown(k.w)
      || Phaser.Input.Keyboard.JustDown(k.space) || mi.jumpJustPressed;

    if (left && !right) b.setVelocityX(-this._speed);
    else if (right && !left) b.setVelocityX(this._speed);
    else b.setVelocityX(0);

    const onFloor = b.blocked.down || b.touching.down;
    if (onFloor) this._lastGroundTime = time;
    if (jumpDown) this._jumpQueuedAt = time;

    const coyote = CONFIG.COYOTE_TIME + (RunState.active ? RunState.coyoteBonus : 0);
    if (time - this._jumpQueuedAt <= CONFIG.JUMP_BUFFER && time - this._lastGroundTime <= coyote) {
      b.setVelocityY(this._jumpV);
      this._jumpQueuedAt = -9999;
      this._lastGroundTime = -9999;
      SoundSystem.play('sfx_jump');
      s.scaleX = 0.8; s.scaleY = 1.25;          // launch stretch
      this._puff(s.x, s.y + 10, 5, this.color, { min: 200, max: 340 });
    }

    // squash & stretch: stretch in the air, snappy squash on landing
    const vy = b.velocity.y;
    if (!onFloor) this._fallVy = Math.max(this._fallVy, vy);
    let tSX = 1, tSY = 1;
    if (!onFloor) {
      const st = Phaser.Math.Clamp(Math.abs(vy) / 600, 0, 1);
      tSY = 1 + (vy < 0 ? 0.18 : 0.12) * st;
      tSX = 1 - (vy < 0 ? 0.14 : 0.10) * st;
    }
    if (onFloor && this._wasAir && this._fallVy > 180) {
      s.scaleX = 1.34; s.scaleY = 0.62;         // landing squash
      this._puff(s.x, s.y + 9, 8, 0xbfffff, { min: 200, max: 340 }, true);
      if (this._fallVy > 380) this.scene.cameras.main.shake(80, 0.004);
    }
    this._wasAir = !onFloor;
    if (onFloor) this._fallVy = 0;
    s.scaleX = Phaser.Math.Linear(s.scaleX, tSX, 0.22);
    s.scaleY = Phaser.Math.Linear(s.scaleY, tSY, 0.22);

    // tilt slightly with horizontal motion (a touch of "stickman/Q" character)
    s.rotation = Phaser.Math.Linear(s.rotation, Phaser.Math.Clamp(b.velocity.x / 1400, -0.18, 0.18), 0.2);
    if (this.trail) this.trail.emitting = (left || right || !onFloor);
    this._updateRobot(time);
  }

  // Glitch-robot visuals: body flickers, antenna tip pulses, eyes widen + go red as the wall nears.
  _updateRobot(time) {
    const s = this.sprite;
    if (!this.faceParts || !s.visible) return;
    const prox = this.scene._wallProx || 0;
    const scared = prox > 0.45;
    if (time - this._glitchAt > this._glitchGap) { this._glitchAt = time; this._glitchGap = Math.max(180, Phaser.Math.Between(500, 1100) - prox * 350); }
    const glitch = time - this._glitchAt < 70;
    s.setFillStyle(this.color, glitch ? 0.5 : 0.92);
    const eyeColor = scared ? 0xff3b5c : 0x06121a;
    this.eyeL.fillColor = eyeColor; this.eyeR.fillColor = eyeColor;
    this.eyeL._bs = this.eyeR._bs = scared ? 1.3 : 1;
    this.tip._bs = 0.85 + 0.25 * Math.sin(time / 140) + (scared ? 0.35 : 0);
    this.antenna._bs = 1;
    const cos = Math.cos(s.rotation), sin = Math.sin(s.rotation);
    const jx = glitch ? Phaser.Math.Between(-3, 3) : 0, jy = glitch ? Phaser.Math.Between(-2, 2) : 0;
    const place = (obj, ox, oy) => {
      const sx = (ox + jx) * s.scaleX, sy = (oy + jy) * s.scaleY;
      obj.x = s.x + sx * cos - sy * sin;
      obj.y = s.y + sx * sin + sy * cos;
      obj.rotation = s.rotation;
      obj.scaleX = s.scaleX * (obj._bs || 1); obj.scaleY = s.scaleY * (obj._bs || 1);
    };
    place(this.eyeL, -4, -1); place(this.eyeR, 4, -1);
    place(this.antenna, 0, -14); place(this.tip, 0, -18);
  }

  _puff(x, y, n, tint, angle, wide) {
    const em = this.scene.add.particles(x, y, 'particle_spark', {
      lifespan: wide ? 300 : 260, scale: { start: wide ? 0.5 : 0.42, end: 0 }, alpha: { start: 0.6, end: 0 },
      tint, blendMode: 'ADD', quantity: n, emitting: false,
      ...(wide ? { speedX: { min: -120, max: 120 }, speedY: { min: -45, max: -5 } } : { speed: { min: 30, max: 95 }, angle }),
    }).setDepth(4);
    em.explode(n);
    this.scene.time.delayedCall(360, () => em.destroy());
  }

  playDeathFx(deathFxId) {
    const fx = COSMETICS.deathFx[deathFxId] || COSMETICS.deathFx.fx_default;
    const { x, y } = this.sprite;
    const count = fx.kind === 'explode' ? 28 : 18;
    const em = this.scene.add.particles(x, y, 'particle_spark', {
      lifespan: fx.kind === 'melt' ? 600 : 420,
      speed: { min: fx.kind === 'yeet' ? 160 : 50, max: fx.kind === 'explode' ? 340 : 200 },
      gravityY: fx.kind === 'melt' ? 500 : 0,
      angle: fx.kind === 'yeet' ? { min: -100, max: -80 } : { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 }, blendMode: 'ADD',
      tint: fx.kind === 'glitch' ? [0x00ffff, 0xff2222, 0xffffff] : this.color,
      quantity: count, emitting: false,
    });
    em.explode(count);
    this.scene.time.delayedCall(700, () => em.destroy());
    this.sprite.setVisible(false);
    this.faceParts?.forEach((p) => p.setVisible(false));
    if (this.trail) this.trail.emitting = false;
  }

  respawn(x, y) {
    const s = this.sprite;
    s.setVisible(true);
    this.faceParts?.forEach((p) => p.setVisible(true));
    s.body.setVelocity(0, 0);
    s.setRotation(0);
    s.setScale(1);
    s.setPosition(x, y);
    this._lastGroundTime = -9999;
    this._jumpQueuedAt = -9999;
    this._wasAir = false;
    this._fallVy = 0;
  }
}
