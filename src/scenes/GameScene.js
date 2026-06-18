import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { RunState } from '../state/RunState.js';
import { PlayerSystem } from '../systems/PlayerSystem.js';
import { TrickSystem } from '../systems/TrickSystem.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { AdSystem } from '../systems/ad/AdSystem.js';
import { addScanlines, neonPanel, hdCamera } from '../ui/widgets.js';
import { getLevels, getLevel } from '../data/levels.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.runMode = data.run === true;       // THE DESCENT roguelite run
    this.world = data.world || 'alpha';
    this.levelIndex = data.levelIndex ?? 0;
    this.levelData = getLevel(this.world, this.levelIndex);
    this.deathCount = 0;
    this.runDeathShards = 0;
    this.adShownThisLevel = false;
    this.dying = false;
    this.finished = false;
  }

  create() {
    const lvl = this.levelData;
    if (!lvl) { this.add.text(20, 20, 'NO LEVEL DATA', { color: '#f33' }); return; }

    this.physics.world.setBounds(0, 0, lvl.bounds.width, lvl.bounds.height + 200);
    hdCamera(this); // HD zoom (crisp shapes/text). No camera bounds → zoom/centerOn aligns like the menu.

    // Per-chapter neon accent color (each 5-level chapter has its own — "Q Neon" reference)
    const cc = CONFIG.CHAPTER_COLORS;
    this.chapterColor = cc[Math.floor(this.levelIndex / 5) % cc.length];

    // Pure-black backdrop + faint neon grid in the chapter color (clean line-art look)
    this.cameras.main.setBackgroundColor(0x02030a);
    // Screen-fixed animated grid: repositioned each frame to cover the camera view, with
    // parallax + constant drift → always the same moving backdrop, never "shifts" with progress.
    this.grid = this.add.tileSprite(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, 'grid')
      .setOrigin(0, 0).setDepth(-12).setTint(this.chapterColor).setAlpha(0.45).setTileScale(0.5, 0.5);
    // ambient drifting motes in the chapter color
    this.add.particles(0, 0, 'particle_spark', {
      x: { min: 0, max: lvl.bounds.width }, y: { min: 0, max: lvl.bounds.height },
      lifespan: 4200, speedY: { min: -10, max: -3 }, speedX: { min: -5, max: 5 },
      scale: { start: 0.18, end: 0 }, alpha: { start: 0, end: 0.25, ease: 'Sine.out' },
      tint: this.chapterColor, frequency: 300, quantity: 1, blendMode: 'ADD',
    }).setDepth(-8);
    // Global neon bloom — makes every outline glow (WebGL only; guarded for flaky mobile GPUs)
    try { this.cameras.main.postFX?.addBloom(0xffffff, 1, 1, 1.1, 1.4, 8); } catch (_) { /* no bloom */ }

    this._startGlitchFx(); // atmospheric "the system is watching/lying" background glitches

    // Tricks (register the first-encounter hint listener BEFORE build, which emits them)
    this.tricks = new TrickSystem(this);
    this._pendingHints = [];
    this.events.off('firstTrick');   // avoid accumulation across scene.restart
    this.events.on('firstTrick', (type) => this._pendingHints.push(this._hintFor(type)));
    this.tricks.build(lvl);

    // Player + cosmetics
    this.player = new PlayerSystem(this);
    this.player.create(lvl.spawnPoint.x, lvl.spawnPoint.y);
    this.player.applyCosmetics(GameState.data.equippedItems);

    // Exit gate (neon outline; origin bottom-center; y = ground line). Bloom makes it glow.
    this.exit = this.physics.add.staticImage(lvl.exit.x, lvl.exit.y, 'exit_gate').setOrigin(0.5, 1);
    this.exit.body.setSize(28, 44).setOffset(2, 4);
    this.exit.body.updateFromGameObject();
    this._decorateExit(lvl.exit.x, lvl.exit.y);

    // Collisions (TrickSystem exposes plain arrays; Arcade colliders accept arrays)
    this.physics.add.collider(this.player.sprite, this.tricks.solids,
      (_pl, plat) => this.tricks.onPlatformContact(plat));
    this.physics.add.collider(this.player.sprite, this.tricks.moving,
      (_pl, plat) => this.tricks.onPlatformContact(plat));
    this.physics.add.overlap(this.player.sprite, this.tricks.fakes,
      (_pl, fake) => this.tricks.onFakeContact(fake));
    this.physics.add.overlap(this.player.sprite, this.tricks.hazards,
      (_pl, hz) => { if (this.tricks.isLethal(hz)) this.die(); });
    this.physics.add.overlap(this.player.sprite, this.exit, () => this.complete());
    this._setupPickups(lvl);
    // BACKDOOR upgrades that work in EVERY level (corruption is the through-line)
    const bup = GameState.data.backdoor?.upgrades || {};
    this._shieldAvail = (bup.shield || 0) > 0;   // absorb one death (per level)
    this._alarmOn = (bup.alarm || 0) > 0;        // trap proximity warning
    this._bugSlowMs = 1300 + (bup.bug || 0) * 450;

    // Camera follows on larger levels
    // Side-scroll levels (wider than the screen): bound the camera + follow the player.
    if (lvl.bounds.width > CONFIG.WIDTH || lvl.bounds.height > CONFIG.HEIGHT) {
      this.cameras.main.setBounds(0, 0, lvl.bounds.width, lvl.bounds.height);
      this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    }

    // HUD (parallel scene) — flush the level/first-trick hint once UIScene is up
    this.scene.launch('UIScene', { gameScene: this });
    this.time.delayedCall(350, () => {
      const ui = this.scene.get('UIScene');
      if (lvl.hint) ui?.showHint?.(lvl.hint);
      else if (this._pendingHints.length) ui?.showHint?.(this._pendingHints[0]);
    });

    addScanlines(this);
    // ambient data-motes drifting up — subtle atmospheric depth
    this.add.particles(0, 0, 'particle_spark', {
      x: { min: 0, max: lvl.bounds.width }, y: { min: 0, max: lvl.bounds.height },
      lifespan: 3800, speedY: { min: -16, max: -5 }, speedX: { min: -6, max: 6 },
      scale: { start: 0.16, end: 0 }, alpha: { start: 0.26, end: 0 },
      frequency: 200, quantity: 1, tint: this.chapterColor || 0x2affff, blendMode: 'ADD',
    }).setDepth(-8);
    SoundSystem.playMusic(this.world === 'beta' ? 'mus_beta' : 'mus_alpha');
    AdSystem.gameplayStart();
    this._setupChase(lvl); // corruption wall in EVERY level — the game's through-line
    if (CONFIG.DEV_UNLOCK_ALL && !this.runMode) this._enableDevKeys();
    this._totalDist = Math.max(1, Phaser.Math.Distance.Between(lvl.spawnPoint.x, lvl.spawnPoint.y, lvl.exit.x, lvl.exit.y));
  }

  _hintFor(type) {
    const map = {
      fake: 'FALSE FLOOR :: DO NOT TRUST',
      falling: 'FLOOR COLLAPSING :: BE QUICK',
      spike_safe: 'NOT EVERY SPIKE KILLS',
      spike_hidden: 'DO NOT PAUSE :: HIDDEN DANGER',
      ghost: 'SOMETHING IS IN THE AIR',
      inverse: 'WHAT LOOKS DEADLY MAY BE SAFE',
      shifting: 'TIMING MATTERS',
      portal: 'THE GATE CARRIES YOU ACROSS',
    };
    return map[type] || 'CORRUPTION DETECTED';
  }

  update(time, delta) {
    const ui = this.scene.get('UIScene');
    if (this.dying || this.finished || !this.player?.sprite) {
      if (ui?.mobileInput) ui.mobileInput.jumpJustPressed = false; // drop stale latch
      return;
    }
    this.player.update(time, ui?.mobileInput);
    if (ui?.mobileInput) ui.mobileInput.jumpJustPressed = false; // consume after the player read it
    this.tricks.update(time, this.player);
    this._updateChase(delta);
    this._updateAlarm();
    if (this.chaseEdge) {
      const gap = this.player.sprite.x - this.chaseX;
      this._wallProx = Phaser.Math.Clamp(1 - gap / 280, 0, 1); // 1 = wall on top of you
    }

    // keep the grid covering the camera view; parallax-scroll its texture + constant drift
    if (this.grid) {
      const v = this.cameras.main.worldView;
      this.grid.setPosition(v.x, v.y).setSize(v.width, v.height);
      this.grid.tilePositionX = v.x * 0.5 + time * 0.012;
      this.grid.tilePositionY = time * 0.006;
    }

    // shift_exit — slide the real exit on approach (non-lethal)
    const es = this.tricks.exitShift;
    if (es && !es.done && this.player.sprite.x > es.triggerX) {
      es.done = true;
      const dx = (es.dir === 'left' ? -1 : 1) * (es.tiles || 3) * 32;
      this.tweens.add({
        targets: [this.exit, this.exitDecor].filter(Boolean), x: this.exit.x + dx, duration: 250,
        onUpdate: () => this.exit.body.updateFromGameObject(),
      });
    }

    // Death floor
    if (this.player.sprite.y > this.levelData.deathFloorY) this.die();

    // Progress (spawn → exit distance)
    const d = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.levelData.exit.x, this.levelData.exit.y);
    const prog = Phaser.Math.Clamp(1 - d / this._totalDist, 0, 1);
    ui?.setProgress?.(prog);
  }

  die() {
    if (this.dying || this.finished) return;
    this.dying = true;
    this.deathCount++;
    // FIREWALL upgrade: absorb one death per level (keeps the clean-clear key bank intact)
    if (this._shieldAvail) { this._shieldAvail = false; this.deathCount--; this._pickupFlash('FIREWALL ABSORBED', '#2affff'); }
    this.player.sprite.body.setVelocity(0, 0);
    this.player.sprite.body.enable = false;
    this.player.playDeathFx(GameState.getEquipped('deathFx'));
    this.cameras.main.shake(CONFIG.CAMERA_SHAKE_DEATH.duration, CONFIG.CAMERA_SHAKE_DEATH.intensity);
    this.cameras.main.flash(130, 90, 0, 16);
    SoundSystem.play('sfx_death');
    AdSystem.gameplayStop();

    const respawn = () => {
      this.tricks.reset(this.player);
      this.player.respawn(this.levelData.spawnPoint.x, this.levelData.spawnPoint.y);
      this.player.sprite.body.enable = true;
      this.dying = false;
      this._resetChase();
      this._resetPickups();
      AdSystem.gameplayStart();
    };

    if (this.runMode) {
      const over = RunState.loseLife();
      // schedule the outcome FIRST so a HUD hiccup can never strand the run
      this.time.delayedCall(CONFIG.RESPAWN_DELAY_MS, () => { over ? this._endRun(false) : respawn(); });
      this.scene.get('UIScene')?.setIntegrity?.();
      return;
    }

    this.runDeathShards += CONFIG.SHARD_PER_DEATH;
    this.scene.get('UIScene')?.setDeaths?.(this.deathCount);
    this.scene.get('UIScene')?.onDeath?.(this.deathCount);
    this.time.delayedCall(CONFIG.RESPAWN_DELAY_MS, respawn);
  }

  // Fake LEVEL COMPLETE overlay (level_complete_fake, §6.3). CONTINUE kills. Whole-game max 1.
  // ---- atmospheric background glitches (cosmetic; rendered BEHIND gameplay, never interactive) ----
  _startGlitchFx() {
    const tick = () => {
      if (!this.scene.isActive()) return;
      if (!this.finished && !this.dying) this._spawnGlitch();
      this.time.delayedCall(Phaser.Math.Between(3500, 8000), tick);
    };
    this.time.delayedCall(Phaser.Math.Between(2200, 4500), tick);
  }

  _spawnGlitch() {
    const v = this.cameras.main.worldView;
    const roll = Math.random();
    if (roll < 0.55) this._glitchText(v);
    else if (roll < 0.82) this._glitchBar(v);
    else this._colorSurge();
  }

  _glitchText(v) {
    const msgs = ['TRUST_THE_FLOOR', 'SAFE?', 'ERR0R', '0110_1001', 'FOLLOW', 'LIE', 'REBOOT…',
      "DON'T_FALL", 'NULL_REF', 'VERIFIED?', 'HELP_ME', 'WATCHING', '↑ ?', 'NO_EXIT', 'TRUST_ME'];
    const m = msgs[Phaser.Math.Between(0, msgs.length - 1)];
    const x = Phaser.Math.Between(v.x + 70, v.right - 70);
    const y = Phaser.Math.Between(v.y + 50, v.bottom - 70);
    const color = Math.random() < 0.4 ? '#ff3b6b' : '#' + this.chapterColor.toString(16).padStart(6, '0');
    const t = this.add.text(x, y, m, { fontFamily: 'monospace', fontSize: '24px', color })
      .setOrigin(0.5).setDepth(-7).setAlpha(0).setBlendMode('ADD');
    this.tweens.add({ targets: t, alpha: 0.3, duration: 110, yoyo: true, hold: 240, repeat: 1, onComplete: () => t.destroy() });
    this.time.addEvent({ delay: 55, repeat: 7, callback: () => { if (t.active) t.x = x + Phaser.Math.Between(-5, 5); } });
  }

  _glitchBar(v) {
    const y = Phaser.Math.Between(v.y + 40, v.bottom - 40);
    const bar = this.add.rectangle(v.centerX, y, v.width, Phaser.Math.Between(2, 5), 0xffffff, 0.4)
      .setDepth(-7).setBlendMode('ADD');
    this.tweens.add({ targets: bar, alpha: 0, scaleY: 3, duration: 200, onComplete: () => bar.destroy() });
  }

  _colorSurge() {
    if (!this.grid) return;
    const palette = [0xff3df0, 0x00ffff, 0x8cff3d, 0xffb13d, 0x9b6bff, 0xff5a4d];
    this.grid.setTint(palette[Phaser.Math.Between(0, palette.length - 1)]);
    this.tweens.add({ targets: this.grid, alpha: 0.72, duration: 180, yoyo: true, hold: 220,
      onComplete: () => { if (this.grid) { this.grid.setAlpha(0.45); this.grid.setTint(this.chapterColor); } } });
  }

  showFakeComplete() {
    if (this.dying || this.finished || this._fakePanel) return;
    // Does NOT pause the game. IGNORE it and keep walking to the REAL exit — it auto-dismisses.
    // Only TAPPING [CONTINUE] is the trap (it kills you). The lesson: never trust the win screen.
    const v = this.cameras.main.worldView;
    const cx = v.centerX, cy = v.centerY;
    const c = this.add.container(0, 0).setDepth(60);
    this._fakePanel = c;
    c.add(neonPanel(this, cx, cy, 360, 200, 0xff2e63));
    const title = this.add.text(cx, cy - 50, 'LEVEL C0MPLETE', { fontFamily: 'monospace', fontSize: '20px', color: '#ff5a7a' }).setOrigin(0.5);
    c.add(title);
    c.add(this.add.text(cx, cy - 18, 'PR0CESS VERIFIED?', { fontFamily: 'monospace', fontSize: '11px', color: '#9b6bff' }).setOrigin(0.5));
    const btn = this.add.text(cx, cy + 42, '[ C0NTINUE ▶ ]', { fontFamily: 'monospace', fontSize: '16px', color: '#ffd24a', backgroundColor: '#3a0a1e', padding: { x: 12, y: 6 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => { this._dismissFake(); this.die(); });
    c.add(btn);
    // jitter + flicker + corrupted title swaps
    const swaps = ['LEVEL C0MPLETE', 'L3VEL C0MPL3TE', '1EVEL C0RRUPT', 'LEVEL C0MP???E', 'L£VEL C0MPLETE'];
    this._fakeGlitch = this.time.addEvent({ delay: 130, loop: true, callback: () => {
      if (!c.active) return;
      c.setPosition(Phaser.Math.Between(-3, 3), Phaser.Math.Between(-2, 2));
      c.setAlpha(Phaser.Math.FloatBetween(0.8, 1));
      if (Math.random() < 0.45) title.setText(swaps[Phaser.Math.Between(0, swaps.length - 1)]);
    } });
    this.time.delayedCall(2500, () => this._dismissFake()); // didn't take the bait → it glitches away
  }

  _dismissFake() {
    this._fakeGlitch?.remove(); this._fakeGlitch = null;
    this._fakePanel?.destroy(); this._fakePanel = null;
  }

  complete() {
    if (this.finished || this.dying) return;
    this.finished = true;
    this.player.sprite.body.setVelocity(0, 0);
    this.player.sprite.body.enable = false;
    SoundSystem.play('sfx_win');
    AdSystem.gameplayStop();

    // BACKDOOR KEYS bank only on a CLEAN clear (no deaths / never caught)
    if (this._keysThisLevel > 0 && this.deathCount === 0) {
      const mult = 1 + 0.5 * (GameState.data.backdoor.upgrades.keymult || 0);
      const gained = Math.round(this._keysThisLevel * mult);
      GameState.data.backdoor.keys += gained;
      GameState.save();
      this._pickupFlash(`+${gained} BACKDOOR KEYS BANKED`, '#ffd24a');
    }

    if (this.runMode) {
      const { gained, won } = RunState.completeRoom();
      if (won) { this._endRun(true); return; }
      this.scene.stop('UIScene');
      this.scene.start('BoonDraftScene', { gained });
      return;
    }

    const r = GameState.saveLevelResult(this.world, this.levelIndex, this.deathCount, this.runDeathShards, this.levelData.parDeaths);
    console.log(`[LEVEL COMPLETE] ${this.levelData.code} stars=${r.stars} shardsEarned=${r.shardsEarned} deaths=${this.deathCount}`);
    this.scene.get('UIScene')?.showComplete?.(this.levelData, r, () => this.nextLevel(),
      // 2× rewarded: re-credit completion shards, only if the ad actually finished. Returns watched bool.
      () => AdSystem.showRewarded(() => { GameState.addShards(r.shardsEarned); this.adShownThisLevel = true; }));
  }

  nextLevel() {
    const go = () => {
      this.scene.stop('UIScene');
      if (getLevel(this.world, this.levelIndex + 1)) this.scene.start('GameScene', { world: this.world, levelIndex: this.levelIndex + 1 });
      else this.scene.start('WorldSelectScene');
    };
    // Interstitial on DEVAM: relaxed cadence + clean start + mutual exclusion + celebration buffer.
    const c = GameState.sessionLevelCount;
    const due = c >= CONFIG.AD_INTERSTITIAL_EVERY_N && c % CONFIG.AD_INTERSTITIAL_EVERY_N === 0;
    if (due && !this.adShownThisLevel && this.deathCount <= CONFIG.AD_SKIP_IF_DEATHS_OVER) {
      this.adShownThisLevel = true;
      AdSystem.showInterstitial().finally(go);
    } else go();
  }

  goLevelSelect() {
    this.scene.stop('UIScene');
    this.scene.start('LevelSelectScene', { world: this.world });
  }

  _endRun(won) {
    const summary = RunState.bank(won);
    this.scene.stop('UIScene');
    this.scene.start('RunOverScene', summary);
  }

  // ESCAPE archetype: a wall of corruption sweeps in from the left, ACCELERATING — run or die.
  // BUG pickups slow it momentarily; permanent 'slow' upgrade lowers the base speed.
  // Base speed scales every 10 levels (tier) + per world; within a level it RUSHES toward the
  // finale (progress multiplier). Early levels = slow (learn the wall), finales = rush mode.
  _setupChase(lvl) {
    const h = lvl.bounds.height;
    const ch = lvl.chase || {};
    const tier = Math.floor((this.levelIndex ?? 0) / 10);          // 0,1,2 across a 30-level world
    const worldAdd = this.world === 'beta' ? 18 : 0;
    const slowUp = (GameState.data.backdoor?.upgrades.slow || 0) * 0.06; // -6% per COLD BOOT level
    this.chaseBaseSpeed = (ch.speed ?? (96 + tier * 22 + worldAdd)) * (1 - Math.min(0.4, slowUp));
    this.chaseRush = ch.rush ?? 0.5;                               // ×(1+rush) at the exit
    this.chaseStartX = (lvl.spawnPoint.x ?? 64) - (ch.headStart ?? 250);
    this.chaseDelay = ch.delay ?? 1100;
    this._spawnX = lvl.spawnPoint.x ?? 64;
    this._exitX = lvl.exit?.x ?? lvl.bounds.width;
    this.chaseX = this.chaseStartX;
    this._chaseT = 0;
    this.chaseSlowT = 0;
    this.chaseFill = this.add.rectangle(0, 0, Math.max(1, this.chaseX), h, 0x3a0014, 0.45).setOrigin(0, 0).setDepth(6);
    this.chaseEdge = this.add.rectangle(this.chaseX, 0, 10, h, 0xff2a4d, 0.95).setOrigin(0, 0).setDepth(7);
    this.chaseParticles = this.add.particles(this.chaseX, 0, 'particle_spark', {
      x: 0, y: { min: 0, max: h }, lifespan: 480, speedX: { min: 20, max: 90 }, scale: { start: 0.5, end: 0 },
      tint: [0xff2a4d, 0xff7a4d], frequency: 28, quantity: 2, blendMode: 'ADD',
    }).setDepth(7);

    // Level elements the corruption EATS as it passes (redden → blacken → fade). Snapshot so a
    // respawn restores them. Skip invisible elements (fakes, armed hidden spikes).
    const t = this.tricks || {};
    const cons = [...(t.solids || []), ...(t.moving || []), ...(t.fakes || []), ...(t.hazards || []), ...(this.bugs || []), ...(this.bkeys || [])]
      .filter((o) => o && o.visible && o.alpha > 0 && (o.setTint ? true : ((o.strokeAlpha ?? 0) > 0.05 || (o.fillAlpha ?? 0) > 0.05)));
    this._consSnap = cons.map((o) => ({ o, a: o.alpha, sc: o.strokeColor, sa: o.strokeAlpha, sw: o.lineWidth, fc: o.fillColor, fa: o.fillAlpha, fil: o.isFilled }));
    cons.forEach((o) => { o._consumed = false; });
  }

  _resetChase() {
    if (this.chaseEdge == null) return;
    this.chaseX = this.chaseStartX;
    this._chaseT = 0;
    this.chaseSlowT = 0;
    for (const s of this._consSnap || []) {
      const o = s.o; if (!o) continue;
      o._consumed = false;
      o.setVisible(true); o.setAlpha(s.a);
      if (o.setFillStyle) {
        o.setStrokeStyle(s.sw || 2.5, s.sc ?? 0xffffff, s.sa ?? 1);
        if (s.fil) o.setFillStyle(s.fc ?? 0x03101c, s.fa ?? 0.82);
      } else if (o.clearTint) { o.clearTint(); }
    }
  }

  // redden → blacken → fade an element the corruption wall just swept over
  _consume(o, s) {
    o._consumed = true;
    const isShape = o.setFillStyle != null;
    if (isShape) {
      o.setStrokeStyle(s.sw || 2.5, 0xff2a4d, 1);
      if (s.fil) o.setFillStyle(0xff2a4d, Math.max(0.45, s.fa || 0.45));
    } else if (o.setTintFill) { o.setTintFill(0xff2a4d); }
    this.time.delayedCall(140, () => {
      if (!o.active) return;
      if (isShape) { o.setStrokeStyle(s.sw || 2.5, 0x000000, 1); if (s.fil) o.setFillStyle(0x000000, s.fa || 0.45); }
      else if (o.setTintFill) { o.setTintFill(0x050505); }
      this.tweens.add({ targets: o, alpha: 0, duration: 420, ease: 'Quad.in', onComplete: () => o.setVisible(false) });
    });
  }

  _updateChase(delta) {
    if (this.chaseEdge == null) return;
    this._chaseT += delta;
    if (this._chaseT > this.chaseDelay) {
      const denom = this._exitX - this._spawnX;
      const progress = Math.abs(denom) < 150
        ? Phaser.Math.Clamp((this._chaseT - this.chaseDelay) / 9000, 0, 1)   // narrow level → time ramp
        : Phaser.Math.Clamp((this.player.sprite.x - this._spawnX) / denom, 0, 1);
      const slowed = this.chaseSlowT > 0;
      if (slowed) this.chaseSlowT -= delta;
      const eff = this.chaseBaseSpeed * (1 + progress * this.chaseRush);
      this.chaseX += (slowed ? eff * 0.18 : eff) * (delta / 1000);
    }
    this.chaseFill.width = Math.max(1, this.chaseX);
    this.chaseEdge.setFillStyle(this.chaseSlowT > 0 ? 0x2affff : 0xff2a4d, 0.95).x = this.chaseX + Phaser.Math.Between(-3, 3);
    this.chaseParticles.setX(this.chaseX);
    const edge = this.chaseX;
    for (const s of this._consSnap || []) {
      if (!s.o._consumed && s.o.active && s.o.x < edge - 2) this._consume(s.o, s);
    }
    if (this.player.sprite.x < this.chaseX + 26) this.die();
  }

  // ALARM upgrade: a warning pip + beep when a lethal hazard is just ahead (chase levels).
  _updateAlarm() {
    if (!this._alarmOn || !this.player?.sprite) return;
    const px = this.player.sprite.x, py = this.player.sprite.y;
    let near = false;
    for (const hz of this.tricks.hazards) {
      if (!hz.getData('lethal')) continue;
      if (hz.x > px - 24 && hz.x - px < 115 && Math.abs(hz.y - py) < 90) { near = true; break; }
    }
    if (near) {
      if (!this._alarmIcon) this._alarmIcon = this.add.text(px, py - 30, '⚠', { fontFamily: 'monospace', fontSize: '20px', color: '#ff5a4d', resolution: 3 }).setOrigin(0.5).setDepth(40);
      this._alarmIcon.setPosition(px, py - 30).setAlpha(0.55 + 0.45 * Math.sin(this.time.now / 70));
      if (this.time.now - (this._lastBeep || 0) > 650) { SoundSystem.play('sfx_alarm'); this._lastBeep = this.time.now; }
    } else if (this._alarmIcon) {
      this._alarmIcon.destroy(); this._alarmIcon = null;
    }
  }

  // Conceptual exit gateway — halo + rotating tick-ring + rising motes + a gentle gate pulse.
  _decorateExit(x, y) {
    const cy = y - 24;
    this.exit.setDepth(4);
    const c = this.add.container(x, cy).setDepth(3);
    const halo = this.add.circle(0, 0, 26, 0x00ff88, 0.12);
    this.tweens.add({ targets: halo, scale: 1.35, alpha: 0.24, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const ring = this.add.container(0, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const d = this.add.rectangle(Math.cos(a) * 30, Math.sin(a) * 30, 7, 2.5, 0x00ff88, 0.85);
      d.rotation = a; ring.add(d);
    }
    this.tweens.add({ targets: ring, rotation: Math.PI * 2, duration: 7000, repeat: -1 });
    const motes = this.add.particles(0, 22, 'particle_spark', {
      y: { min: -40, max: 6 }, x: { min: -11, max: 11 }, lifespan: 1200, speedY: { min: -28, max: -10 },
      scale: { start: 0.34, end: 0 }, alpha: { start: 0.55, end: 0 }, tint: 0x00ff88, frequency: 150, quantity: 1, blendMode: 'ADD',
    });
    c.add([halo, ring, motes]);
    this.exitDecor = c;
    this.tweens.add({ targets: this.exit, scale: 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  // ---- BUG / BACKDOOR KEY pickups ----
  _setupPickups(lvl) {
    this._keysThisLevel = 0;
    this.bugs = (lvl.bugs || []).map((b) => this._mkPickup(b.x, b.y, 'item_bug'));
    this.bkeys = (lvl.backdoorKeys || []).map((k) => this._mkPickup(k.x, k.y, 'item_key'));
    if (this.bugs.length) this.physics.add.overlap(this.player.sprite, this.bugs, (_p, o) => this._collect(o, 'bug'));
    if (this.bkeys.length) this.physics.add.overlap(this.player.sprite, this.bkeys, (_p, o) => this._collect(o, 'key'));
  }

  _mkPickup(x, y, tex) {
    const o = this.physics.add.staticImage(x, y, tex).setDepth(4);
    o.setData('taken', false).setData('homeY', y);
    this.tweens.add({ targets: o, y: y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return o;
  }

  _collect(o, kind) {
    if (o.getData('taken')) return;
    o.setData('taken', true);
    o.setVisible(false); o.body.enable = false;
    const burst = this.add.particles(o.x, o.y, 'particle_spark', {
      lifespan: 320, speed: { min: 30, max: 120 }, scale: { start: 0.6, end: 0 },
      tint: kind === 'bug' ? 0x2affff : 0xffd24a, quantity: 12, blendMode: 'ADD', emitting: false,
    });
    burst.explode(12); this.time.delayedCall(360, () => burst.destroy());
    SoundSystem.play('sfx_shard');
    if (kind === 'bug') { this.chaseSlowT = this._bugSlowMs; this._pickupFlash('CORRUPTION SLOWED', '#2affff'); }
    else { this._keysThisLevel++; this._pickupFlash(`BACKDOOR KEY  +1  (${this._keysThisLevel})`, '#ffd24a'); }
  }

  _resetPickups() {
    this._keysThisLevel = 0;
    [...(this.bugs || []), ...(this.bkeys || [])].forEach((o) => {
      o.setData('taken', false); o.setVisible(true); o.body.enable = true;
    });
  }

  _pickupFlash(text, color) {
    const v = this.cameras.main.worldView;
    const t = this.add.text(v.centerX, v.y + 70, text, { fontFamily: 'monospace', fontSize: '15px', color, resolution: 3 }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 22, duration: 1100, onComplete: () => t.destroy() });
  }

  // QA shortcuts (DEV_UNLOCK_ALL): N = next level, P = previous, R = restart level.
  _enableDevKeys() {
    const jump = (delta) => {
      const ni = this.levelIndex + delta;
      if (!getLevel(this.world, ni)) return;
      this.scene.stop('UIScene');
      this.scene.start('GameScene', { world: this.world, levelIndex: ni });
    };
    this.input.keyboard.on('keydown-N', () => jump(1));
    this.input.keyboard.on('keydown-P', () => jump(-1));
    this.input.keyboard.on('keydown-R', () => { this.scene.stop('UIScene'); this.scene.start('GameScene', { world: this.world, levelIndex: this.levelIndex }); });
  }
}
