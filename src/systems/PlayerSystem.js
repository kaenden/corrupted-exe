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
  }

  create(x, y) {
    const S = 20;
    const s = this.scene.add.rectangle(x, y, S, S, 0x00ffff, 0.9).setStrokeStyle(2.5, 0xffffff, 0.95);
    this.scene.physics.add.existing(s);
    s.body.setSize(S, S);
    // BACKDOOR upgrades apply only in ESCAPE (chase) levels — keeps the campaign balance pure.
    const esc = !!this.scene.levelData?.chase;
    const up = GameState.data.backdoor?.upgrades || {};
    this._speed = CONFIG.PLAYER_SPEED * (esc ? 1 + 0.07 * (up.speed || 0) : 1);
    this._jumpV = CONFIG.PLAYER_JUMP_VELOCITY * (esc ? 1 + 0.05 * (up.jump || 0) : 1);
    s.body.setMaxVelocity(this._speed, CONFIG.PLAYER_MAX_FALL);
    s.setDepth(5);
    this.sprite = s;

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
    }

    // tilt slightly with horizontal motion (a touch of "stickman/Q" character)
    s.rotation = Phaser.Math.Linear(s.rotation, Phaser.Math.Clamp(b.velocity.x / 1400, -0.18, 0.18), 0.2);
    if (this.trail) this.trail.emitting = (left || right || !onFloor);
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
    if (this.trail) this.trail.emitting = false;
  }

  respawn(x, y) {
    const s = this.sprite;
    s.setVisible(true);
    s.body.setVelocity(0, 0);
    s.setRotation(0);
    s.setPosition(x, y);
    this._lastGroundTime = -9999;
    this._jumpQueuedAt = -9999;
  }
}
