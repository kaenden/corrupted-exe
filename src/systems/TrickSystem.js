import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { SoundSystem } from './SoundSystem.js';

// Neon line-art trick engine. Platforms are glowing OUTLINE rectangles (shapes, crisp at any
// size); spikes/ceiling use a neon-triangle texture. Camera bloom (GameScene) does the glow.
// Collision uses plain arrays (Arcade colliders accept arrays). All trick LOGIC is preserved.
const FALL_COLOR = 0xffb13d;   // amber warning
const DANGER = 0xff3b3b;       // red

export class TrickSystem {
  constructor(scene) {
    this.scene = scene;
    this.solids = [];   // static collidable (solid, ghost, inverse, scroll_wall)
    this.moving = [];   // dynamic collidable (falling, shifting)
    this.fakes = [];    // overlap-only (no collision)
    this.hazards = [];  // overlap (spikes, ceiling traps)
    this.platforms = []; // every platform object (for update/reset)
    this.env = [];
    this.portals = [];
    this._portalCD = 0;
    this._portalArmed = true;
    this.exitShift = null;
    this._fakeCompleteUsed = false;
    this.accent = scene.chapterColor || COLORS.cyan;
  }

  build(levelData) {
    this.accent = this.scene.chapterColor || COLORS.cyan;
    (levelData.platforms || []).forEach((p, i) => this._buildPlatform(p, i, levelData));
    (levelData.hazards || []).forEach((h) => this._buildHazard(h));
    (levelData.envTricks || []).forEach((e) => this._buildEnv(e, levelData));
    (levelData.portals || []).forEach((p) => this._buildPortal(p));
    if (levelData.exitShift) this.exitShift = { ...levelData.exitShift, done: false };
  }

  // Paired teleport portals: enter one → emerge at the other (with a short cooldown).
  _buildPortal(p) {
    const ring = (x, y) => {
      const r = this.scene.add.circle(x, y, 18, 0x000000, 0).setStrokeStyle(3, 0xbb6bff).setDepth(3);
      this.scene.add.circle(x, y, 11, 0x000000, 0).setStrokeStyle(2, 0xe0b0ff).setDepth(3);
      this.scene.tweens.add({ targets: r, scale: 1.18, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    };
    ring(p.a.x, p.a.y); ring(p.b.x, p.b.y);
    this.portals.push({ a: p.a, b: p.b });
    this._maybeHint('portal');
  }

  _updatePortals(time, px, py, player) {
    if (!this.portals.length) return;
    const d = (p) => Phaser.Math.Distance.Between(px, py, p.x, p.y);
    // After a jump, stay DISARMED until the player has physically left every portal AND 1.5s
    // has passed — stops the back-and-forth oscillation bug.
    if (!this._portalArmed) {
      if (time >= this._portalCD && this.portals.every((pt) => d(pt.a) > 36 && d(pt.b) > 36)) this._portalArmed = true;
      return;
    }
    for (const pt of this.portals) {
      const toB = d(pt.a) < 22, toA = d(pt.b) < 22;
      if (toB || toA) {
        const dest = toB ? pt.b : pt.a;
        const burst = this.scene.add.particles(px, py, 'particle_spark', {
          lifespan: 300, speed: { min: 30, max: 130 }, scale: { start: 0.6, end: 0 },
          tint: 0xbb6bff, quantity: 14, blendMode: 'ADD', emitting: false,
        });
        burst.explode(14); this.scene.time.delayedCall(350, () => burst.destroy());
        SoundSystem.play('sfx_portal');
        player.sprite.setPosition(dest.x, dest.y);
        player.sprite.body.setVelocity(0, 0);
        this._portalArmed = false;
        this._portalCD = time + 1500;
        return;
      }
    }
  }

  // ---- shape helpers (origin 0,0 → level data x,y is top-left) ----
  _rect(x, y, w, h, stroke, isStatic) {
    const r = this.scene.add.rectangle(x, y, w, h, 0x03101c, 0.82).setOrigin(0, 0);
    r.setStrokeStyle(2.5, stroke, 1);
    this.scene.physics.add.existing(r, isStatic);
    r.body.setSize(w, h);
    if (isStatic) r.body.updateFromGameObject();
    else { r.body.setAllowGravity(false); r.body.setImmovable(true); }
    return r;
  }

  _maybeHint(type) {
    if (!CONFIG.HINT_ON_FIRST_TRICK) return;
    const d = ['fake', 'falling', 'ghost', 'inverse', 'shifting', 'spike_safe', 'spike_hidden',
      'ceiling_trap', 'text_trap', 'gravity_pulse', 'scroll_fake', 'portal'];
    if (d.includes(type) && GameState.isFirstEncounter(type)) this.scene.events.emit('firstTrick', type);
  }

  // ---- PLATFORMS ----
  _buildPlatform(p, index, levelData) {
    const type = p.type || 'solid';
    const moving = type === 'falling' || type === 'shifting';
    const stroke = type === 'falling' ? FALL_COLOR : this.accent;
    const obj = this._rect(p.x, p.y, p.w, p.h, stroke, !moving);
    obj.setData({ type, home: { x: p.x, y: p.y }, baseStroke: stroke, dropped: false, falling: false });

    if (type === 'fake') { this.fakes.push(obj); }
    else if (moving) { this.moving.push(obj); }
    else { this.solids.push(obj); }

    if (type === 'ghost') {
      obj.setStrokeStyle(2.5, this.accent, 0.0); obj.setFillStyle(0x03101c, 0);
      obj.body.enable = false;
      obj.setData('proximity', p.proximity ?? CONFIG.GHOST_PROXIMITY);
      obj.setData('revealed', false);
    }
    if (type === 'shifting' && levelData.paths && levelData.paths[p.pathIndex]) {
      obj.setData('path', levelData.paths[p.pathIndex]);
    }
    this.platforms.push(obj);
    this._maybeHint(type);
    return obj;
  }

  // ---- HAZARDS ----
  _buildHazard(h) {
    if (h.type === 'inverse') return this._buildInverse(h);
    if (h.type === 'text_trap') return this._buildTextTrap(h);

    const obj = this.scene.add.sprite(h.x, h.y, 'spike_neon').setOrigin(0, 0);
    this.scene.physics.add.existing(obj);
    obj.body.setAllowGravity(false); obj.body.setImmovable(true); obj.body.setSize(16, 16);
    obj.setData({ type: h.type, lethal: h.type === 'spike_real', home: { x: h.x, y: h.y } });

    if (h.type === 'spike_hidden') {
      obj.setVisible(false); obj.setData('lethal', false); obj.setData('state', 'armed');
      obj.setData('trigger', h.trigger || { x: h.x - 8, y: h.y - 12, w: 32, h: 24 });
      obj.setData('homeY', h.y); obj.y = h.y + 12;
    } else if (h.type === 'ceiling_trap') {
      obj.setFlipY(true); obj.setVisible(false); obj.setData('lethal', false); obj.setData('state', 'armed');
      obj.setData('armProximity', h.armProximity ?? 64); obj.setData('dropDistance', h.dropDistance ?? 48);
      obj.setData('homeY', h.y);
      this.scene.add.rectangle(h.x + 8, h.y + 2, 20, 2, 0x335a66).setDepth(1);
    }
    this.hazards.push(obj);
    this._maybeHint(h.type);
    return obj;
  }

  _buildInverse(h) {
    const w = h.w || 96;
    const plat = this._rect(h.x, h.y, w, 12, DANGER, true); // looks dangerous (red), is SAFE
    plat.setData({ type: 'inverse', home: { x: h.x, y: h.y }, baseStroke: DANGER });
    for (let i = 0; i < Math.floor(w / 16); i++) {
      this.scene.add.image(h.x + 8 + i * 16, h.y, 'spike_neon').setOrigin(0.5, 1).setDepth(2);
    }
    this.solids.push(plat);
    this.platforms.push(plat);
    this._maybeHint('inverse');
  }

  _buildTextTrap(h) {
    const t = this.scene.add.text(h.x, h.y, h.message || 'SAFE ZONE DETECTED', {
      fontFamily: 'monospace', fontSize: '12px', color: '#7fffaa', resolution: 3,
      backgroundColor: '#06301f', padding: { x: 6, y: 3 },
    }).setOrigin(0, 0).setDepth(6).setInteractive({ useHandCursor: true });
    t.on('pointerdown', () => this.scene.die());
    this._maybeHint('text_trap');
  }

  // ---- ENVIRONMENT ----
  _buildEnv(e, levelData) {
    if (e.type === 'gravity_pulse') {
      this.env.push({ type: 'gravity_pulse', zone: e.zone, arrowDir: e.arrowDir || 'up', active: false });
      this._maybeHint('gravity_pulse');
    } else if (e.type === 'scroll_fake') {
      const groundY = levelData.bounds?.height || CONFIG.HEIGHT;
      const wallH = 56;
      const wall = this._rect(e.wallX, groundY - wallH, 12, wallH, this.accent, true);
      wall.setStrokeStyle(2.5, this.accent, 0); wall.setFillStyle(0x03101c, 0); // invisible until contact
      wall.setData({ type: 'scroll_wall', hint: e.hint || 'GEÇERSİZ KOORDİNAT — ATLA', tellShown: false, baseStroke: this.accent });
      this.solids.push(wall);
      this.platforms.push(wall);
      this._maybeHint('scroll_fake');
    } else if (e.type === 'level_complete_fake') {
      this.env.push({ type: 'level_complete_fake', triggerX: e.triggerX ?? (levelData.exit.x - 120), fired: false });
    }
  }

  // ---- COLLISION CALLBACKS ----
  onPlatformContact(platform) {
    const type = platform.getData('type');
    if (type === 'scroll_wall') return this._scrollTell(platform);
    if (type !== 'falling' || platform.getData('falling') || platform.getData('dropped')) return;
    if (!platform.body.touching.up) return;
    platform.setData('falling', true);
    this.scene.tweens.add({
      targets: platform, x: platform.x + 2, duration: 50, yoyo: true,
      repeat: Math.floor(CONFIG.FALL_PLATFORM_DELAY / 100),
      onComplete: () => {
        platform.setData('dropped', true);
        platform.body.checkCollision.none = true;
        platform.body.setAllowGravity(true);
        platform.body.setVelocityY(60);
        platform.setStrokeStyle(2.5, DANGER, 1);
      },
    });
  }

  _scrollTell(wall) {
    if (wall.getData('tellShown')) return;
    wall.setData('tellShown', true);
    wall.setStrokeStyle(2.5, this.accent, 1);
    this.scene.tweens.add({ targets: wall, alpha: 0.5, duration: 120, yoyo: true, repeat: 2,
      onComplete: () => { wall.setAlpha(1); } });
    const px = this.scene.player.sprite.x, py = this.scene.player.sprite.y;
    const em = this.scene.add.particles(px, py, 'particle_spark', {
      lifespan: 350, speed: { min: 20, max: 90 }, scale: { start: 0.7, end: 0 },
      tint: [this.accent, DANGER], quantity: 10, blendMode: 'ADD', emitting: false,
    });
    em.explode(10);
    this.scene.time.delayedCall(400, () => em.destroy());
    this.scene.scene.get('UIScene')?.showHint?.(wall.getData('hint'));
    this.scene.time.delayedCall(2200, () => { wall.setData('tellShown', false); wall.setStrokeStyle(2.5, this.accent, 0); });
  }

  onFakeContact(fake) {
    if (fake.getData('flickering')) return;
    fake.setData('flickering', true);
    this.scene.tweens.add({ targets: fake, alpha: 0.25, duration: CONFIG.FAKE_PLATFORM_REVEAL, yoyo: true,
      onComplete: () => { fake.setData('flickering', false); fake.setAlpha(1); } });
    this.scene.cameras.main.shake(CONFIG.CAMERA_SHAKE_TRICK.duration, CONFIG.CAMERA_SHAKE_TRICK.intensity);
  }

  isLethal(hz) { return !!hz.getData('lethal'); }

  // ---- UPDATE ----
  update(time, player) {
    const px = player.sprite.x, py = player.sprite.y;
    for (const obj of this.platforms) {
      const type = obj.getData('type');
      if (type === 'ghost' && !obj.getData('revealed')) {
        if (Phaser.Math.Distance.Between(px, py, obj.x + obj.width / 2, obj.y) <= obj.getData('proximity')) {
          obj.setData('revealed', true); obj.body.enable = true;
          this.scene.tweens.add({ targets: obj, alpha: 1, duration: 200 });
          obj.setStrokeStyle(2.5, this.accent, 1); obj.setFillStyle(0x03101c, 0.82);
        }
      } else if (type === 'shifting') {
        const path = obj.getData('path');
        if (path) {
          const t = (Math.sin(time / 1000 * (path.speed || CONFIG.SHIFT_PLATFORM_SPEED) / 80) + 1) / 2;
          const nx = Phaser.Math.Linear(path.from.x, path.to.x, t);
          const ny = Phaser.Math.Linear(path.from.y, path.to.y, t);
          // carry the rider: if the player is standing on this platform, move them by the same delta
          const pb = player.sprite.body;
          const onTop = (pb.blocked.down || pb.touching.down) &&
            pb.bottom <= obj.y + 6 && pb.bottom >= obj.y - 14 &&
            pb.right > obj.x && pb.left < obj.x + obj.width;
          if (onTop) { player.sprite.x += nx - obj.x; player.sprite.y += ny - obj.y; }
          obj.body.reset(nx, ny);
        }
      }
    }
    this._updateHidden(px, py, player);
    this._updateCeiling(px, py, player);
    this._updateEnv(time, px, py, player);
    this._updatePortals(time, px, py, player);
  }

  _updateHidden(px, py, player) {
    for (const hz of this.hazards) {
      if (hz.getData('type') !== 'spike_hidden' || hz.getData('state') !== 'armed') continue;
      const tz = hz.getData('trigger');
      if (px > tz.x && px < tz.x + tz.w && py > tz.y - 40 && py < tz.y + tz.h + 40) {
        hz.setData('state', 'warning'); hz.setVisible(true).setAlpha(0.3);
        this.scene.tweens.add({ targets: hz, alpha: 1, duration: 120, yoyo: true, repeat: 2 });
        this.scene.time.delayedCall(CONFIG.SPIKE_BLINK_WARN, () => {
          if (!(player.sprite.x > tz.x && player.sprite.x < tz.x + tz.w)) {
            hz.setVisible(false).setAlpha(1); hz.setData('state', 'armed'); return;
          }
          hz.setData('lethal', true); hz.setData('state', 'active');
          this.scene.tweens.add({ targets: hz, y: hz.getData('homeY'), duration: 80 });
          this.scene.time.delayedCall(700, () => {
            hz.setData('lethal', false); hz.setVisible(false);
            hz.y = hz.getData('homeY') + 12; hz.setData('state', 'armed');
          });
        });
      }
    }
  }

  _updateCeiling(px, py, player) {
    for (const hz of this.hazards) {
      if (hz.getData('type') !== 'ceiling_trap' || hz.getData('state') !== 'armed') continue;
      if (Math.abs(px - (hz.x + 8)) < hz.getData('armProximity') && py < hz.y + 140 && player.sprite.body.velocity.y < -10) {
        hz.setData('state', 'triggered');
        this.scene.time.delayedCall(100, () => {
          hz.setVisible(true).setData('lethal', true);
          this.scene.tweens.add({
            targets: hz, y: hz.getData('homeY') + hz.getData('dropDistance'), duration: 120, yoyo: true, hold: 120,
            onComplete: () => {
              hz.setData('lethal', false); hz.setVisible(false); hz.y = hz.getData('homeY');
              this.scene.time.delayedCall(400, () => hz.setData('state', 'armed'));
            },
          });
        });
      }
    }
  }

  _updateEnv(time, px, py, player) {
    for (const e of this.env) {
      if (e.type === 'gravity_pulse') {
        const z = e.zone;
        const inZone = px > z.x && px < z.x + z.w && py > z.y && py < z.y + z.h;
        if (inZone && !e.active) {
          e.active = true;
          player.sprite.body.setGravityY(-(CONFIG.PLAYER_GRAVITY + CONFIG.GRAVITY_PULSE_ACCEL));
          this._arrowFlash(z, e.arrowDir);
        } else if (!inZone && e.active) {
          e.active = false; player.sprite.body.setGravityY(0);
        }
        if (e.active && player.sprite.y < 44) { player.sprite.y = 44; if (player.sprite.body.velocity.y < 0) player.sprite.body.setVelocityY(0); }
      } else if (e.type === 'level_complete_fake') {
        if (!e.fired && !this._fakeCompleteUsed && px > e.triggerX) {
          e.fired = true; this._fakeCompleteUsed = true; this.scene.showFakeComplete();
        }
      }
    }
  }

  _arrowFlash(zone, dir) {
    const t = this.scene.add.text(zone.x + zone.w / 2, zone.y + 30, dir === 'down' ? '▼' : '▲',
      { fontFamily: 'monospace', fontSize: '30px', color: '#88ddff', resolution: 3 }).setOrigin(0.5);
    this.scene.tweens.add({ targets: t, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }

  revealOneTrick() {
    const p = this.platforms.find((o) => ['fake', 'falling', 'ghost', 'scroll_wall'].includes(o.getData('type')))
      || this.hazards.find((o) => ['spike_hidden', 'ceiling_trap'].includes(o.getData('type')));
    let cx, cy;
    if (p) { cx = p.x + (p.width || 16) / 2; cy = p.y + 8; }
    else { const g = this.env.find((e) => e.type === 'gravity_pulse'); if (!g) return; cx = g.zone.x + g.zone.w / 2; cy = g.zone.y + g.zone.h / 2; }
    const ring = this.scene.add.circle(cx, cy, 28).setStrokeStyle(2, COLORS.cyan).setDepth(20);
    this.scene.tweens.add({ targets: ring, alpha: 0, scale: 1.8, duration: 1300, onComplete: () => ring.destroy() });
  }

  reset(player) {
    if (player) player.sprite.body.setGravityY(0);
    for (const obj of this.platforms) {
      const type = obj.getData('type');
      const home = obj.getData('home');
      const base = obj.getData('baseStroke') || this.accent;
      obj.setData('flickering', false);
      if (type === 'falling' || type === 'shifting') {
        obj.body.setAllowGravity(false); obj.body.setVelocity(0, 0); obj.body.checkCollision.none = false;
        if (home) obj.body.reset(home.x, home.y);
        obj.setData('dropped', false); obj.setData('falling', false);
        if (type === 'falling') obj.setStrokeStyle(2.5, FALL_COLOR, 1);
        obj.setAlpha(1);
      } else if (type === 'ghost') {
        obj.setAlpha(0); obj.setStrokeStyle(2.5, this.accent, 0); obj.setFillStyle(0x03101c, 0);
        obj.body.enable = false; obj.setData('revealed', false);
      } else if (type === 'scroll_wall') {
        obj.setAlpha(1); obj.setStrokeStyle(2.5, this.accent, 0); obj.setData('tellShown', false);
      } else {
        obj.setAlpha(1); obj.setStrokeStyle(2.5, base, 1);
      }
    }
    for (const hz of this.hazards) {
      const type = hz.getData('type');
      if (type === 'spike_hidden') { hz.setData('lethal', false); hz.setData('state', 'armed'); hz.setVisible(false).setAlpha(1); hz.y = hz.getData('homeY') + 12; }
      else if (type === 'ceiling_trap') { hz.setData('lethal', false); hz.setData('state', 'armed'); hz.setVisible(false); hz.y = hz.getData('homeY'); }
    }
    for (const e of this.env) { e.active = false; e.fired = false; }
    this._portalCD = 0;
    this._portalArmed = true;
  }
}
