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
    try { this.cameras.main.postFX?.addBloom(0xffffff, 1, 1, 1, 1.15, 6); } catch (_) { /* no bloom */ }

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
    SoundSystem.playMusic(this.world === 'beta' ? 'mus_beta' : 'mus_alpha');
    AdSystem.gameplayStart();
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

  update(time) {
    const ui = this.scene.get('UIScene');
    if (this.dying || this.finished || !this.player?.sprite) {
      if (ui?.mobileInput) ui.mobileInput.jumpJustPressed = false; // drop stale latch
      return;
    }
    this.player.update(time, ui?.mobileInput);
    if (ui?.mobileInput) ui.mobileInput.jumpJustPressed = false; // consume after the player read it
    this.tricks.update(time, this.player);

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
        targets: this.exit, x: this.exit.x + dx, duration: 250,
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
    this.player.sprite.body.setVelocity(0, 0);
    this.player.sprite.body.enable = false;
    this.player.playDeathFx(GameState.getEquipped('deathFx'));
    this.cameras.main.shake(CONFIG.CAMERA_SHAKE_DEATH.duration, CONFIG.CAMERA_SHAKE_DEATH.intensity);
    SoundSystem.play('sfx_death');
    AdSystem.gameplayStop();

    const respawn = () => {
      this.tricks.reset(this.player);
      this.player.respawn(this.levelData.spawnPoint.x, this.levelData.spawnPoint.y);
      this.player.sprite.body.enable = true;
      this.dying = false;
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
