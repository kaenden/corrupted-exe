import Phaser from 'phaser';
import { CONFIG } from '../config/game.js';
import { COSMETICS } from '../data/cosmetics.js';
import { SoundSystem } from './SoundSystem.js';
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
    // Invisible physics hull — the visible character (big head + legs) follows it each frame.
    const s = this.scene.add.rectangle(x, y, S, S, 0x00ffff, 0).setVisible(false);
    this.scene.physics.add.existing(s);
    s.body.setSize(S, S);
    const up = GameState.data.backdoor?.upgrades || {};   // upgrades apply in ALL levels
    this._speed = CONFIG.PLAYER_SPEED * (1 + 0.07 * (up.speed || 0));
    this._jumpV = CONFIG.PLAYER_JUMP_VELOCITY * (1 + 0.05 * (up.jump || 0));
    s.body.setMaxVelocity(this._speed, CONFIG.PLAYER_MAX_FALL);
    this.sprite = s;
    this.color = 0xffb43b;
    this._skinAlpha = 0.92;

    // Iconic look: big rounded head + two stubby legs + eyes. Smooth (texture-based, not blocky).
    // Feet sit on the hull's bottom (y+10) so the character stands ON platforms, not below them.
    const HW = 26, HH = 20;
    this.legL = this.scene.add.rectangle(x - 5, y + 6, 5, 9, this.color, 0.95).setDepth(4);
    this.legR = this.scene.add.rectangle(x + 5, y + 6, 5, 9, this.color, 0.95).setDepth(4);
    this.headFill = this.scene.add.image(x, y, 'p_head').setDisplaySize(HW, HH).setTint(this.color).setAlpha(0.92).setDepth(5);
    this.headLine = this.scene.add.image(x, y, 'p_head_line').setDisplaySize(HW, HH).setDepth(6);
    this.eyeL = this.scene.add.ellipse(x - 5, y - 1, 5, 7, 0x06121a, 1).setDepth(7);
    this.eyeR = this.scene.add.ellipse(x + 5, y - 1, 5, 7, 0x06121a, 1).setDepth(7);
    this.headFill._dsx = this.headFill.scaleX; this.headFill._dsy = this.headFill.scaleY;
    this.headLine._dsx = this.headLine.scaleX; this.headLine._dsy = this.headLine.scaleY;
    this.faceParts = [this.legL, this.legR, this.headFill, this.headLine, this.eyeL, this.eyeR];
    this._glitchAt = 0; this._glitchGap = 800;

    const k = this.scene.input.keyboard;
    this.keys = k.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', up: 'UP', w: 'W', space: 'SPACE' });
    return s;
  }

  applyCosmetics(equipped) {
    const skin = COSMETICS.skins[equipped.skin] || COSMETICS.skins.skin_default;
    this.color = skin.color || 0xffb43b;
    this._skinAlpha = skin.alpha ?? 0.92;
    this._skinAnim = skin.anim || null;
    this.headFill?.setTint(this.color);
    if (this.legL) { this.legL.fillColor = this.color; this.legR.fillColor = this.color; }

    this.trail?.destroy(); this.trail = null;
    const tr = COSMETICS.trails[equipped.trail];   // each trail carries its own colour + motion
    if (tr) {
      this.trail = this.scene.add.particles(0, 0, 'particle_spark', {
        follow: this.sprite, frequency: tr.frequency ?? 28, lifespan: tr.lifespan ?? 320,
        scale: { start: tr.scale ?? 0.5, end: 0 }, alpha: { start: tr.alpha ?? 0.6, end: 0 },
        tint: tr.tint ?? this.color, gravityY: tr.gravityY ?? 0, speed: 0,
        blendMode: 'ADD', emitting: false,
      }).setDepth(4);
    }
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

    const coyote = CONFIG.COYOTE_TIME + (CONFIG.IS_MOBILE ? 55 : 0); // touch gets a longer edge-jump grace
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

  // Big-head character: head flickers (glitch), eyes widen + go red as the wall nears, legs shuffle.
  _updateRobot(time) {
    const s = this.sprite;
    if (!this.faceParts) return;
    if (this._skinAnim === 'prism') {   // animated PRISM skin — cycle hue
      const c = Phaser.Display.Color.HSVToRGB(((time / 16) % 360) / 360, 0.85, 1).color;
      this.color = c; this.legL.fillColor = c; this.legR.fillColor = c;
    }
    const prox = this.scene._wallProx || 0;
    const scared = prox > 0.45;
    if (time - this._glitchAt > this._glitchGap) { this._glitchAt = time; this._glitchGap = Math.max(180, Phaser.Math.Between(500, 1100) - prox * 350); }
    const glitch = time - this._glitchAt < 70;
    this.headFill.setTint(this.color).setAlpha(glitch ? 0.5 : this._skinAlpha);
    const eyeColor = scared ? 0xff3b5c : 0x06121a;
    this.eyeL.fillColor = eyeColor; this.eyeR.fillColor = eyeColor;
    const moving = Math.abs(s.body.velocity.x) > 20 && (s.body.blocked.down || s.body.touching.down);
    const wob = moving ? Math.sin(time / 55) * 2.2 : 0;
    const cos = Math.cos(s.rotation), sin = Math.sin(s.rotation);
    const jx = glitch ? Phaser.Math.Between(-3, 3) : 0, jy = glitch ? Phaser.Math.Between(-2, 2) : 0;
    const place = (obj, ox, oy, bs = 1) => {
      const sx = (ox + jx) * s.scaleX, sy = (oy + jy) * s.scaleY;
      obj.x = s.x + sx * cos - sy * sin;
      obj.y = s.y + sy * cos + sx * sin;
      obj.rotation = s.rotation;
      obj.scaleX = (obj._dsx ?? 1) * s.scaleX * bs;
      obj.scaleY = (obj._dsy ?? 1) * s.scaleY * bs;
    };
    // legs: centered at +5.5 (9 tall → feet at +10 = hull bottom = platform contact)
    place(this.legL, -5, 5.5 + wob);
    place(this.legR, 5, 5.5 - wob);
    place(this.headFill, 0, -9);   // head bottom at +1, sits just above the legs
    place(this.headLine, 0, -9);
    const ew = scared ? 1.3 : 1;
    place(this.eyeL, -5, -10, ew);
    place(this.eyeR, 5, -10, ew);
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
    const big = fx.kind === 'explode' || fx.kind === 'nova';
    const count = big ? 26 : 18;
    const em = this.scene.add.particles(x, y, 'particle_spark', {
      lifespan: fx.kind === 'melt' ? 600 : 420,
      speed: { min: fx.kind === 'yeet' ? 160 : 50, max: big ? 340 : 200 },
      gravityY: fx.kind === 'melt' ? 500 : 0,
      angle: fx.kind === 'yeet' ? { min: -100, max: -80 } : { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 }, blendMode: 'ADD',
      tint: fx.kind === 'glitch' ? [0x00ffff, 0xff2222, 0xffffff] : this.color,
      quantity: count, emitting: false,
    });
    em.explode(count);
    if (fx.kind === 'nova') {
      const ring = this.scene.add.circle(x, y, 24, 0x000000, 0).setStrokeStyle(3, this.color, 1).setDepth(6).setScale(0.2);
      this.scene.tweens.add({ targets: ring, scale: 2.1, alpha: 0, duration: 440, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    }
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
