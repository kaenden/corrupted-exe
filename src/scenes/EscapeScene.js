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
    this.pickups = [];
    this.gates = [];
    this.pads = [];        // launch pads (boost up)
    this.portals = [];     // teleport pairs (cross a big gap)
    this._lastSpecial = false;
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
    this.physics.add.collider(this.player.sprite, this.platforms, (_pl, plat) => this._onPlatform(plat));

    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    // mobile: lift the framing so the player/ground sit higher, clear of the bottom thumb/controls zone
    cam.setFollowOffset(-110, CONFIG.IS_MOBILE ? -28 : 36);

    try { cam.postFX?.addBloom(0xffffff, 1, 1, 0.5, 1.9, 3); } catch (_) { /* tighter spread, punchier glow */ }

    this._setupWall();
    this._buildHud();
    addScanlines(this);
    SoundSystem.playMusic('mus_beta');
    AdSystem.gameplayStart();
    this._announceSkills();
    this.events.once('shutdown', () => this._teardown());
  }

  // ---- procedural generation ----
  _floor(x, y, w) {
    const r = this.add.rectangle(x, y, w, 16, 0x09202e, 0.9).setOrigin(0, 0).setStrokeStyle(3, 0x2affff, 1).setDepth(2);
    this.physics.add.existing(r, true);
    r.body.setSize(w, 16).setOffset(0, 0);
    r.body.updateFromGameObject();
    this.platforms.add(r);
    this._lastPlat = { x, y, w };   // for gate placement
    return r;
  }

  // Reachability helpers — every gap/step is kept inside the jump envelope (≤~140px gap, ≤~46px rise)
  // so a generated layout is ALWAYS traversable. Specials that need a bigger gap (launch/portal) supply
  // their own way across.
  _nextY(up = 44, down = 64) { return Phaser.Math.Clamp(this._lastY + Phaser.Math.Between(-up, down), 264, 372); }
  _gap(d, mob) { return Phaser.Math.Between(72, 116) + Math.round(d * 16) - (mob ? 20 : 0); }

  _spike(x, y) {
    // base SOCKET (dark slot + red rim) so the spike reads as a MOUNTED hazard ON the platform, not a
    // red speck blended into the floor — the "is that part of the platform?" ambiguity, fixed.
    const socket = this.add.rectangle(x + 8, y, 22, 5, 0x1a0c10, 0.95).setOrigin(0.5, 1).setStrokeStyle(1.5, 0xff3b3b, 0.6).setDepth(2);
    const s = this.add.image(x, y, 'spike_neon').setOrigin(0, 1).setDepth(3);
    s._socket = socket;
    this.physics.add.existing(s, true);
    if (CONFIG.IS_MOBILE) s.body.setSize(8, 9).setOffset(4, 6); else s.body.setSize(12, 12).setOffset(2, 4);
    s.body.updateFromGameObject();
    this.hazards.push(s);
  }

  // Pattern dispatcher — the run is built from varied "chunks" so endless draws on the whole campaign
  // toolbox (launch pads, teleport portals, ghost platforms, crumbling floors) instead of platform+spike.
  _genChunk() {
    const E = CONFIG.ESCAPE;
    const d = Math.min(1, this._genX / E.RAMP_DIST);
    const mob = CONFIG.IS_MOBILE;
    let kind = 'flat';
    if (this._genX > 1200 && !this._lastSpecial && Phaser.Math.Between(0, 100) < E.SPECIAL_CHANCE) {
      kind = ['launch', 'portal', 'ghost', 'crumble', 'launch', 'ghost'][Phaser.Math.Between(0, 5)];
    }
    this._lastSpecial = kind !== 'flat';
    this[`_gen_${kind}`](d, mob);
    // periodic gate (banking checkpoint) on whatever platform we just laid
    if (this._genX - (this._lastGateX || 0) > 1300 && this._lastPlat) {
      this._lastGateX = this._genX;
      this._gate(this._lastPlat.x + this._lastPlat.w / 2, this._lastPlat.y);
    }
  }

  _gen_flat(d, mob) {
    const w = Phaser.Math.Between(140, 240) - Math.round(d * 30) + (mob ? 70 : 0);
    const y = this._nextY();
    this._floor(this._genX, y, w);
    const r = Phaser.Math.Between(0, 100);
    if (w > 150 && r < (mob ? 16 : 24 + d * 18)) this._spike(this._genX + w / 2, y);
    else if (r < 52) this._bug(this._genX + w / 2, y - Phaser.Math.Between(24, 46));
    this._genX += w + this._gap(d, mob);
    this._lastY = y;
  }

  _gen_crumble(d, mob) {
    // narrower than before + a normal jumpable gap after, so you can land-and-go before it drops
    const w = Phaser.Math.Between(128, 172) + (mob ? 44 : 0);
    const y = this._nextY();
    const fl = this._floor(this._genX, y, w);
    fl._crumble = true; fl.setFillStyle(0x2a1a06, 0.92).setStrokeStyle(3, 0xffae3d, 1);
    this._genX += w + this._gap(d, mob);
    this._lastY = y;
  }

  _gen_ghost(d, mob) {
    // platform stays invisible + non-solid until you get close, then materialises (trust jump)
    const w = Phaser.Math.Between(150, 210) + (mob ? 55 : 0);
    const y = this._nextY();
    const fl = this._floor(this._genX, y, w);
    fl._ghost = true; fl.setAlpha(0); fl.body.enable = false;
    this._genX += w + this._gap(d, mob);
    this._lastY = y;
  }

  _gen_launch(d, mob) {
    // launch pad flings you UP onto a higher landing platform you couldn't reach by jumping. Build BOTH
    // platforms here (wide landing, controlled height/distance) so the boost always lands cleanly.
    const w = Phaser.Math.Between(150, 190) + (mob ? 50 : 0);
    const y = this._nextY();
    this._floor(this._genX, y, w);
    this._launchPad(this._genX + w - 24, y);
    this._genX += w + Phaser.Math.Between(44, 74);
    const ly = Phaser.Math.Clamp(y - Phaser.Math.Between(58, 90), 250, 360);   // higher landing
    const lw = Phaser.Math.Between(180, 240) + (mob ? 50 : 0);                  // wide → easy to land on
    this._floor(this._genX, ly, lw);
    this._genX += lw + this._gap(d, mob);
    this._lastY = ly;
  }

  _gen_portal(d, mob) {
    // a gap too wide to jump — a teleport portal carries you across it
    const wA = Phaser.Math.Between(120, 160) + (mob ? 40 : 0);
    const yA = this._nextY();
    this._floor(this._genX, yA, wA);
    const ax = this._genX + wA - 16, ay = yA - 18;
    this._genX += wA + Phaser.Math.Between(200, 260);   // un-jumpable gap → portal required
    const yB = this._nextY(50, 50);
    const wB = Phaser.Math.Between(150, 210) + (mob ? 55 : 0);
    this._floor(this._genX, yB, wB);
    this._portalPair(ax, ay, this._genX + 20, yB - 18);
    this._genX += wB + this._gap(d, mob);
    this._lastY = yB;
  }

  // launch pad — boosts the player straight up on contact
  _launchPad(x, y) {
    const pad = this.add.rectangle(x, y, 32, 6, 0x0a2a14, 0.92).setOrigin(0.5, 1).setStrokeStyle(2.5, 0x8cff3d, 1).setDepth(3);
    const chev = this.add.text(x, y - 9, '▲', { fontFamily: 'monospace', fontSize: '13px', color: '#8cff3d', resolution: 3 }).setOrigin(0.5);
    pad._chev = chev; pad._cd = 0;
    pad._tw = this.tweens.add({ targets: chev, y: y - 14, alpha: 0.45, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.pads.push(pad);
  }

  // teleport portal pair — entering A warps you to B (one-way, forward)
  _portalPair(ax, ay, bx, by) {
    const mk = (x, y) => {
      const r = this.add.circle(x, y, 15, 0x000000, 0).setStrokeStyle(3, 0xbb6bff, 1).setDepth(3);
      const i = this.add.circle(x, y, 8, 0x000000, 0).setStrokeStyle(2, 0xe0b0ff, 1).setDepth(3);
      const tw = this.tweens.add({ targets: r, scale: 1.18, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      return { x, y, r, i, tw };
    };
    this.portals.push({ a: mk(ax, ay), b: mk(bx, by), used: false });
  }

  _dimPortal(g) { g.tw?.pause(); g.r.setScale(1).setStrokeStyle(2, 0x5a4a72, 0.4); g.i.setStrokeStyle(1.5, 0x5a4a72, 0.4); }

  // corruption-BUG pickup — collect to slow the chasing wall (the only tactical breather in a run)
  _bug(x, y) {
    const b = this.add.image(x, y, 'item_bug').setDepth(3);
    const ring = this.add.circle(x, y, 11, 0x2affff, 0.12).setDepth(2);
    b._ring = ring;
    b._tw = this.tweens.add({ targets: [b, ring], y: y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.pickups.push(b);
  }

  _collectBug(b) {
    this._slowUntil = this._wallT + CONFIG.ESCAPE.BUG_SLOW_MS;
    const em = this.add.particles(b.x, b.y, 'particle_spark', { lifespan: 420, speed: { min: 30, max: 150 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0x2affff, 0xffffff], quantity: 12, blendMode: 'ADD', emitting: false }).setDepth(5);
    em.explode(12); this.time.delayedCall(440, () => em.destroy());
    SoundSystem.play('sfx_shard');
    this._flash('CORRUPTION SLOWED', '#2affff');
    b._tw?.remove(); b._ring?.destroy(); b.destroy();
  }

  // a crumbling platform flashes then drops out from under you a moment after contact
  _onPlatform(plat) {
    if (!plat._crumble || plat._crumbling) return;
    plat._crumbling = true;
    this.tweens.add({ targets: plat, alpha: 0.5, duration: 80, yoyo: true, repeat: 2 });
    // grace scales with width — wider platforms (more landing room) give a touch more reaction time,
    // so a narrow crumble platform never feels like an instant drop.
    this.time.delayedCall(Math.round(300 + plat.width * 0.5), () => {
      if (!plat.active) return;
      plat.body.checkCollision.none = true; plat.body.enable = false;
      const em = this.add.particles(plat.x + plat.width / 2, plat.y + 6, 'particle_spark', { lifespan: 360, speed: { min: 30, max: 150 }, angle: { min: 200, max: 340 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffae3d, 0xffffff], quantity: 10, blendMode: 'ADD', emitting: false }).setDepth(5);
      em.explode(10); this.time.delayedCall(400, () => em.destroy());
      this.tweens.add({ targets: plat, alpha: 0, y: plat.y + 60, duration: 320, onComplete: () => plat.destroy() });
    });
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
    // keep tween refs so they can be STOPPED when the gate is culled — otherwise these infinite
    // (repeat:-1) tweens pile up in the tween manager over a long run (a gate every ~1300px).
    c.tws = [
      this.tweens.add({ targets: sq, rotation: Math.PI * 2, duration: 6000, repeat: -1 }),
      this.tweens.add({ targets: di, rotation: -Math.PI * 2, duration: 4000, repeat: -1 }),
      this.tweens.add({ targets: core, scale: 1.6, alpha: 0.55, angle: 90, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' }),
      this.tweens.add({ targets: halo, scale: 1.35, alpha: 0.24, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' }),
    ];
    return c;
  }

  // ---- corruption wall ----
  _setupWall() {
    const h = CONFIG.HEIGHT;
    this.wallX = this.startX - CONFIG.ESCAPE.HEAD_START;
    this.wallSpeed = CONFIG.ESCAPE.WALL_BASE;
    this._wallT = 0;
    this._slowUntil = 0;
    this.wallFill = this.add.rectangle(0, 0, 10, h * 3, 0x3a0014, 0.45).setOrigin(1, 0).setDepth(6);
    this.wallEdge = this.add.rectangle(0, 0, 10, h * 3, 0xff2a4d, 0.95).setOrigin(0, 0).setDepth(7);
    this.wallPs = this.add.particles(0, 0, 'particle_spark', {
      x: 0, y: { min: -h, max: h * 2 }, lifespan: 480, speedX: { min: 20, max: 90 },
      scale: { start: 0.5, end: 0 }, tint: [0xff2a4d, 0xff7a4d], frequency: 26, quantity: 2, blendMode: 'ADD',
    }).setDepth(7);
  }

  _updateWall(delta) {
    this._wallT += delta;
    const E = CONFIG.ESCAPE;
    const d = Math.min(1, this.player.sprite.x / E.RAMP_DIST);
    this.wallSpeed = E.WALL_BASE + d * (E.WALL_MAX - E.WALL_BASE); // accelerates over the run
    const upg = Math.min(0.4, (GameState.data.backdoor.upgrades.slow || 0) * E.UPGRADE_SLOW);
    let factor = 1 - upg;
    if (this._wallT < this._slowUntil) factor *= E.BUG_SLOW_FACTOR; // active corruption-slow (bug/gate)
    this.wallX += this.wallSpeed * factor * (delta / 1000);
    // RUBBER-BAND: never let the wall fall further than MAX_GAP behind — so you can't outrun it into
    // irrelevance; it stays a looming threat at the left edge and surges the moment you slow down.
    const minX = this.player.sprite.x - E.MAX_GAP;
    if (this.wallX < minX) this.wallX = minX;
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
    if (this._mobile) { this._mobile.jumpJustPressed = false; this._mobile.ghostJustPressed = false; }
    this._updateWall(delta);

    // keep the grid covering the view
    const v = this.cameras.main.worldView;
    this.grid.setPosition(v.x - 128, v.y - 128);
    this.grid.tilePositionX = v.x * 0.5;
    this._layoutHud(v);

    // stream generation + cull behind
    while (this._genX < v.right + 500) this._genChunk();
    this.platforms.getChildren().forEach((p) => { if (p.x + p.width < v.x - 300) { p.destroy(); } });
    this.hazards = this.hazards.filter((s) => { if (s.x < v.x - 300) { s._socket?.destroy(); s.destroy(); return false; } return true; });

    // hazard overlap
    for (const s of this.hazards) {
      if (this.physics.overlap(this.player.sprite, s) && !this.player.isGhosting()) { this._die(); break; }
    }
    // gate overlap → bank
    for (const g of this.gates) {
      if (!g.banked && this.physics.overlap(this.player.sprite, g.img)) this._bank(g);
    }
    this.gates = this.gates.filter((g) => { if (g.x < v.x - 300) { g.portal.tws?.forEach((t) => t?.stop()); g.img.destroy(); g.portal.destroy(); return false; } return true; });

    // corruption-BUG pickups: cull behind, collect on touch (proximity — no body needed)
    this.pickups = this.pickups.filter((b) => {
      if (b.x < v.x - 300) { b._tw?.remove(); b._ring?.destroy(); b.destroy(); return false; }
      if (Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, b.x, b.y) < 20) { this._collectBug(b); return false; }
      return true;
    });

    const px = this.player.sprite.x, py = this.player.sprite.y;
    // GHOST platforms: materialise + turn solid as the player nears (trust jump)
    this.platforms.getChildren().forEach((p) => {
      if (p._ghost && !p._revealed && px > p.x - 150) {
        p._revealed = true; p.body.enable = true;
        this.tweens.add({ targets: p, alpha: 1, duration: 170 });
      }
    });
    // LAUNCH PADS: boost straight up on contact (with a short cooldown so it fires once)
    this.pads = this.pads.filter((pad) => {
      if (pad.x < v.x - 300) { pad._tw?.remove(); pad._chev?.destroy(); pad.destroy(); return false; }
      if (time > pad._cd && Math.abs(px - pad.x) < 20 && py > pad.y - 34 && py < pad.y + 8) {
        this.player.sprite.body.setVelocityY(CONFIG.ESCAPE.LAUNCH_VY);
        pad._cd = time + 500;
        const em = this.add.particles(pad.x, pad.y, 'particle_spark', { lifespan: 360, speedY: { min: -150, max: -40 }, speedX: { min: -40, max: 40 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0x8cff3d, 0xffffff], quantity: 10, blendMode: 'ADD', emitting: false }).setDepth(5);
        em.explode(10); this.time.delayedCall(380, () => em.destroy());
        SoundSystem.play('sfx_jump');
      }
      return true;
    });
    // TELEPORT PORTALS: entering A warps you to B across an un-jumpable gap (one-way, forward)
    this.portals = this.portals.filter((p) => {
      if (p.b.x < v.x - 300) { [p.a, p.b].forEach((g) => { g.tw?.remove(); g.r.destroy(); g.i.destroy(); }); return false; }
      if (!p.used && Phaser.Math.Distance.Between(px, py, p.a.x, p.a.y) < 28) {
        p.used = true;
        const vx = Math.max(150, this.player.sprite.body.velocity.x);
        this.player.sprite.setPosition(p.b.x, p.b.y);
        this.player.sprite.body.setVelocity(vx, 0);
        this._dimPortal(p.a); this._dimPortal(p.b);
        const em = this.add.particles(p.b.x, p.b.y, 'particle_spark', { lifespan: 340, speed: { min: 30, max: 140 }, scale: { start: 0.6, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xbb6bff, 0xffffff], quantity: 14, blendMode: 'ADD', emitting: false }).setDepth(8);
        em.explode(14); this.time.delayedCall(360, () => em.destroy());
        SoundSystem.play('sfx_portal');
      }
      return true;
    });

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
    // reward: reaching a gate buys a brief breather (wall slows) + a celebratory burst
    this._slowUntil = Math.max(this._slowUntil, this._wallT + CONFIG.ESCAPE.GATE_SLOW_MS);
    const em = this.add.particles(g.x, g.portal.y, 'particle_spark', { lifespan: 520, speed: { min: 40, max: 170 }, scale: { start: 0.6, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0x2affff, 0x00ff88, 0xffffff], quantity: 16, blendMode: 'ADD', emitting: false }).setDepth(8);
    em.explode(16); this.time.delayedCall(560, () => em.destroy());
    SoundSystem.play('sfx_win');
    this._flash('BANKED  ' + this.banked, '#00ff88');
  }

  // Campaign-earned skills carry into endless — tell the player so the run plays to them.
  _announceSkills() {
    const u = GameState.data.unlocks || {};
    const mob = CONFIG.IS_MOBILE;
    const lines = [];
    if (u.airDash) lines.push(`AIR-DASH  ·  ${mob ? 'tap JUMP again midair' : 'jump again midair'}`);
    if (u.ghostStep) lines.push(`PHASE  ·  ${mob ? 'tap PHASE through hazards' : 'SHIFT / X through hazards'}`);
    if (!lines.length) return;
    this.time.delayedCall(650, () => {
      const v = this.cameras.main.worldView;
      lines.forEach((ln, i) => {
        const t = this.add.text(v.centerX, v.y + 150 + i * 22, ln, { ...TXT, fontSize: '13px', color: '#bd8aff' }).setOrigin(0.5).setDepth(60).setAlpha(0);
        this.tweens.add({ targets: t, alpha: 1, duration: 240, delay: i * 120 });
        this.tweens.add({ targets: t, alpha: 0, duration: 500, delay: 2200 + i * 120, onComplete: () => t.destroy() });
      });
    });
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
    this.keyHud = this.add.text(0, 0, `🔑 ${GameState.data.backdoor.keys}`, { ...TXT, fontSize: '12px', color: '#ffd24a' }).setOrigin(1, 0).setDepth(50);
    // touch: visible joystick + JUMP (+ PHASE if unlocked) live in a STATIC overlay scene (this scene's
    // camera follows the player, so it can't host screen-fixed controls). It writes to this._mobile.
    const touch = this.sys.game.device.input.touch || navigator.maxTouchPoints > 0;
    if (touch) {
      this._mobile = { left: false, right: false, jump: false, jumpJustPressed: false, ghostJustPressed: false };
      this.scene.launch('ControlsScene', { input: this._mobile, hasGhost: !!GameState.data.unlocks?.ghostStep, gameKey: 'EscapeScene' });
    } else { this._mobile = null; }
  }

  _layoutHud(v) {
    this.scoreText.setPosition(v.centerX, v.y + 12);
    this.bankText.setPosition(v.centerX, v.y + 38);
    this.bestText.setPosition(v.x + 30, v.y + 10);
    this.keyHud.setPosition(v.right - 14, v.y + 10);
  }

  // explicit teardown on scene shutdown — stop the wall + any leftover infinite tweens (gate portals,
  // uncollected bug pickups) so nothing keeps ticking after the run ends.
  _teardown() {
    this.scene.stop('ControlsScene');
    this.wallPs?.destroy(); this.wallFill?.destroy(); this.wallEdge?.destroy();
    this.gates?.forEach((g) => g.portal?.tws?.forEach((t) => t?.stop()));
    this.pickups?.forEach((b) => b._tw?.remove());
    this.pads?.forEach((pad) => pad._tw?.remove());
    this.portals?.forEach((p) => { p.a.tw?.remove(); p.b.tw?.remove(); });
  }

  _die() {
    if (this.dead) return;
    this.dead = true;
    this.scene.stop('ControlsScene');
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
