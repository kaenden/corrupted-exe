import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { AdSystem } from '../systems/ad/AdSystem.js';
import { neonPanel, hdCamera } from '../ui/widgets.js';
import { RunState } from '../state/RunState.js';

const FONT = { fontFamily: 'monospace', color: '#dffcff', resolution: 3 };
const ERR_CODES = ['SEGMENTATION_FAULT', 'NULL_REFERENCE', 'STACK_OVERFLOW', 'ACCESS_VIOLATION',
  'DIVIDE_BY_ZERO', 'KERNEL_PANIC', 'ILLEGAL_INSTRUCTION', 'BUS_ERROR', 'TIMEOUT_EXCEEDED'];
const ENCOURAGE = ['ANALYZING... keep going', 'SO CLOSE :: try again', 'CRACK THE PATTERN :: again', 'YOU ARE LEARNING :: continue'];

// Parallel HUD overlay (GDD §10.6). No physics. Reads/writes simple state for GameScene.
export class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  init(data) {
    this.gameScene = data.gameScene;
    this.mobileInput = { left: false, right: false, jump: false, jumpJustPressed: false };
  }

  create() {
    hdCamera(this);
    const lvl = this.gameScene.levelData;
    const worldName = this.gameScene.world === 'beta' ? 'SIM_BETA' : 'SIM_ALPHA';

    this.add.text(8, 8, '⏸', { ...FONT, fontSize: '20px' }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._togglePause());
    this.add.text(40, 11, `${worldName} · ${lvl.code}${lvl.name ? ' · ' + lvl.name : ''}`, { ...FONT, fontSize: '12px' });
    if (CONFIG.DEV_UNLOCK_ALL) {
      this.add.text(8, CONFIG.HEIGHT - 12, 'DEV: N→next  P→prev  R→restart', { ...FONT, fontSize: '10px', color: '#3a6a72' }).setOrigin(0, 1);
    }
    this.deathText = this.add.text(CONFIG.WIDTH / 2, 11, 'DEATHS: 0', { ...FONT, fontSize: '13px' }).setOrigin(0.5, 0);
    this.runMode = RunState.active;
    if (this.runMode) this.setIntegrity();   // reuse deathText for the run HUD

    // Progress bar (top-right)
    this.add.rectangle(CONFIG.WIDTH - 122, 16, 110, 8, 0x000000).setOrigin(0, 0.5).setStrokeStyle(1, COLORS.cyanDim);
    this.progFill = this.add.rectangle(CONFIG.WIDTH - 121, 16, 0, 6, COLORS.cyan).setOrigin(0, 0.5);

    this.hintText = this.add.text(CONFIG.WIDTH / 2, 60, '', { ...FONT, fontSize: '16px', color: '#ff66aa' })
      .setOrigin(0.5).setAlpha(0);

    const touch = this.sys.game.device.input.touch || navigator.maxTouchPoints > 0;
    if (touch) this._buildTouchControls();

    // Danger vignette: pulses red as the corruption wall closes on the player
    if (this.textures.exists('vignette')) {
      this.vignette = this.add.image(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'vignette')
        .setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(900).setAlpha(0);
    }

    this.events.on('shutdown', () => this.input.removeAllListeners());
  }

  update() {
    if (!this.vignette) return;
    const prox = this.gameScene?._wallProx || 0;
    const pulse = 0.85 + 0.15 * Math.sin(this.time.now / 110);
    this.vignette.setAlpha(Phaser.Math.Linear(this.vignette.alpha, prox * 0.5 * pulse, 0.12));
  }

  _buildTouchControls() {
    this.input.addPointer(3); // multi-touch: move + jump at the same time
    const jx = 78, jy = CONFIG.HEIGHT - 64, R = 46;

    // Visuals only (input is REGION-based below — GameObject hit-tests are unreliable under the
    // zoomed camera, which is why the jump button wasn't registering taps).
    this.add.circle(jx, jy, R, 0x0a2a33, 0.28).setStrokeStyle(2, 0x2affff, 0.4).setDepth(30);
    const thumb = this.add.circle(jx, jy, 22, 0x2affff, 0.5).setStrokeStyle(2, 0x2affff, 0.8).setDepth(31);
    const jbx = CONFIG.WIDTH - 70, jby = CONFIG.HEIGHT - 64;
    const jbtn = this.add.circle(jbx, jby, 40, 0x0a2a33, 0.3).setStrokeStyle(2, 0x2affff, 0.5).setDepth(30);
    this.add.text(jbx, jby, 'JUMP', { ...FONT, fontSize: '13px' }).setOrigin(0.5).setDepth(31);

    // Left bottom = joystick, right bottom = jump. Tracked by pointer id for multi-touch.
    this._joyId = -1; this._jumpId = -1;
    const moveThumb = (x) => {
      const dx = Phaser.Math.Clamp(x - jx, -R, R);
      thumb.x = jx + dx;
      this.mobileInput.left = dx < -12;
      this.mobileInput.right = dx > 12;
    };
    this.input.on('pointerdown', (p) => {
      if (this.scene.isPaused('GameScene') || p.y < CONFIG.HEIGHT * 0.4) return; // ignore HUD/top
      if (p.x >= CONFIG.WIDTH * 0.5) {
        this._jumpId = p.id;
        this.mobileInput.jump = true; this.mobileInput.jumpJustPressed = true;
        jbtn.setFillStyle(0x2affff, 0.45);
      } else {
        this._joyId = p.id; moveThumb(p.x);
      }
    });
    this.input.on('pointermove', (p) => { if (p.id === this._joyId) moveThumb(p.x); });
    const up = (p) => {
      if (p.id === this._jumpId) { this._jumpId = -1; this.mobileInput.jump = false; jbtn.setFillStyle(0x0a2a33, 0.3); }
      if (p.id === this._joyId) { this._joyId = -1; thumb.x = jx; this.mobileInput.left = false; this.mobileInput.right = false; }
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  // NOTE: the jump latch is consumed by GameScene.update (which runs BEFORE UIScene's input
  // dispatch). Clearing it here would wipe it in the same step it was set → the jump never fires.

  setDeaths(n) { this.deathText.setText(`DEATHS: ${n}`); }

  // Run HUD reuses deathText (proven safe to update) — integrity / depth / keys.
  setIntegrity() {
    if (!this.runMode || !this.deathText?.active) return;
    const r = RunState;
    this.deathText.setColor('#c4a6ff')
      .setText(`INTEGRITY ${r.integrity}/${r.maxIntegrity}${r.shield ? ' +FW' : ''}   DEPTH ${r.index + 1}/${r.rooms.length}   KEYS ${r.keys}`);
  }
  setProgress(p) { this.progFill.width = 108 * p; }

  // Death feedback: snarky error code, softening to encouragement at 8+; paid-hint off-ramp at 10.
  onDeath(n) {
    const soft = n >= CONFIG.MOCKERY_SOFTEN_AFTER;
    this._flash(soft ? Phaser.Utils.Array.GetRandom(ENCOURAGE) : Phaser.Utils.Array.GetRandom(ERR_CODES),
      soft ? '#7fd6a0' : '#ff6a8a');
    if (n >= CONFIG.HINT_PURCHASE_AFTER_DEATHS && !this._hintBtn) this._showHintButton();
  }

  _flash(text, color) {
    this._deathFlash?.destroy();
    this._deathFlash = this.add.text(CONFIG.WIDTH / 2, 96, text, { ...FONT, fontSize: '13px', color }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: this._deathFlash, alpha: 0, duration: 1300, delay: 500, onComplete: () => { this._deathFlash?.destroy(); this._deathFlash = null; } });
  }

  _showHintButton() {
    const cost = CONFIG.HINT_PURCHASE_COST;
    this._hintBtn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 18, `[ BUY HINT — ${cost}◈ ]`, {
      ...FONT, fontSize: '13px', color: '#ffd24a', backgroundColor: '#3a2e06', padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(40).setInteractive({ useHandCursor: true });
    this._hintBtn.on('pointerup', () => {
      if (GameState.spendShards(cost)) { this.gameScene.tricks.revealOneTrick(); this._flash('1 TRAP REVEALED', '#00ffff'); }
      else this._flash('NOT ENOUGH SHARDS', '#ff6a8a');
    });
  }

  showHint(text) {
    if (!text) return;
    this.hintText.setText(text).setAlpha(0);
    this.tweens.add({ targets: this.hintText, alpha: 1, duration: 200, yoyo: true, hold: 1600 });
  }

  _togglePause() {
    const gs = this.gameScene;
    if (this.scene.isPaused('GameScene')) { this.scene.resume('GameScene'); AdSystem.gameplayStart(); this._pausePanel?.destroy(); this._pausePanel = null; return; }
    this.scene.pause('GameScene');
    AdSystem.gameplayStop();
    this._pausePanel = this._panel(
      ['RESUME', () => this._togglePause()],
      ['RESTART', () => { this.scene.stop(); gs.scene.start('GameScene', { world: gs.world, levelIndex: gs.levelIndex }); }],
      ['LEVELS', () => { this.scene.resume('GameScene'); gs.goLevelSelect(); }],
      ['MAIN MENU', () => { this.scene.stop(); gs.scene.stop(); gs.scene.start('MenuScene'); }],
    );
  }

  // Level-complete overlay (§10.8). onReward() returns the rewarded-ad promise (watched bool).
  showComplete(lvl, r, onContinue, onReward) {
    const cx = CONFIG.WIDTH / 2, cy = CONFIG.HEIGHT / 2;
    const panel = this.add.container(0, 0).setDepth(50);
    panel.add(neonPanel(this, cx, cy, 360, 280, COLORS.green));
    panel.add(this.add.text(cx, cy - 100, 'PROCESS_TERMINATED', { ...FONT, fontSize: '12px', color: '#5b8a93' }).setOrigin(0.5));
    panel.add(this.add.text(cx, cy - 80, `${lvl.code} — CLEARED`, { ...FONT, fontSize: '16px', color: '#00ff88' }).setOrigin(0.5));

    this._animStars(panel, cx, cy - 40, r.stars);

    const shardLabel = this.add.text(cx, cy + 2, `◈ +${r.shardsEarned} CORE SHARD`, { ...FONT, fontSize: '15px', color: '#ffe27a' }).setOrigin(0.5);
    panel.add(shardLabel);

    let row = cy + 36;
    if (CONFIG.SHARD_2X_AD && r.shardsEarned > 0) {
      const ad = this.add.text(cx, row, '[ WATCH FOR 2× SHARDS ]', { ...FONT, fontSize: '13px', color: '#ffd24a', backgroundColor: '#3a2e06', padding: { x: 10, y: 5 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      ad.on('pointerup', () => {
        ad.disableInteractive().setAlpha(0.6);
        Promise.resolve(onReward?.()).then((watched) => {
          if (watched) { shardLabel.setText(`◈ +${r.shardsEarned * 2} CORE SHARD`); ad.setText('[ 2× CLAIMED ✓ ]'); }
          else ad.setText('[ NO AD ]');
        });
      });
      panel.add(ad);
      row += 38;
    }

    panel.add(this.add.text(cx, row, '[ CONTINUE ▶ ]', { ...FONT, fontSize: '16px', backgroundColor: '#0a3a44', padding: { x: 12, y: 6 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => { panel.destroy(); onContinue(); }));

    panel.add(this.add.text(cx, row + 34, 'LEVELS', { ...FONT, fontSize: '12px', color: '#7fb8c2' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => { panel.destroy(); this.gameScene.goLevelSelect(); }));
  }

  _animStars(panel, cx, y, count) {
    for (let i = 0; i < 3; i++) {
      const key = i < count ? 'icon_star' : 'icon_star_empty';
      const s = this.add.image(cx - 42 + i * 42, y, key);
      s.setDisplaySize(34, 34); const base = s.scaleX; s.setScale(0);
      panel.add(s);
      this.tweens.add({ targets: s, scale: base, delay: 300 * i, duration: 240, ease: 'Back.out' });
    }
  }

  _panel(...buttons) {
    const cx = CONFIG.WIDTH / 2;
    const cy = CONFIG.HEIGHT / 2;
    const n = buttons.length;
    const h = 50 + n * 40;
    const panel = this.add.container(0, 0).setDepth(50);
    panel.add(neonPanel(this, cx, cy, 320, h));
    const startY = cy - ((n - 1) * 40) / 2;
    buttons.forEach(([label, cb], i) => {
      const t = this.add.text(cx, startY + i * 40, label, { ...FONT, fontSize: '15px' })
        .setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerover', () => t.setColor('#ffffff'))
        .on('pointerout', () => t.setColor('#dffcff'))
        .on('pointerup', cb);
      panel.add(t);
    });
    return panel;
  }
}
