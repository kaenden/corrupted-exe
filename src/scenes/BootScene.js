import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { AdSystem } from '../systems/ad/AdSystem.js';

// STEP 01-02: scaffold + procedurally generate every placeholder texture so the game is
// fully playable before any art exists (GDD §13). Early build boots straight into a level;
// MenuScene becomes the entry point at STEP 15.
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // Neon line-art look: player/platforms are SHAPES, spikes/exit/grid are procedural neon
    // textures (generated in create). Only the menu backdrop + shard icon load from disk.
    const IMG = 'assets/images/';
    const img = (key, file) => this.load.image(key, IMG + (file || key) + '.png');
    img('bg_menu');
    img('icon_shard');
    this.load.on('loaderror', (f) => console.warn('[art] missing, using placeholder:', f.key));
  }

  create() {
    GameState.init();
    SoundSystem.init(this);
    this.createPlaceholders();
    this.createBackground();
    this.createVignette();

    // Ad SDK init (provider-agnostic). loadingStart/Stop bracket asset load (synchronous here).
    AdSystem.init(SoundSystem).then(() => { AdSystem.loadingStart(); AdSystem.loadingStop(); });

    if (CONFIG.DEBUG_SKIP_MENU) {
      const { world, levelIndex } = CONFIG.DEBUG_START;
      this.scene.start('GameScene', { world, levelIndex });
    } else {
      this.scene.start('MenuScene');
    }
  }

  createPlaceholders() {
    const g = this.make.graphics({ add: false });
    const has = (k) => this.textures.exists(k); // skip if real art already loaded

    const platform = (key, fill, edge) => {
      if (has(key)) return;
      g.clear();
      g.fillStyle(fill, 1).fillRect(0, 0, 96, 12);
      g.fillStyle(edge, 0.22).fillRect(0, 0, 96, 2);   // top highlight (sleeker)
      g.lineStyle(1, edge, 0.55).strokeRect(0, 0, 96, 12);
      g.generateTexture(key, 96, 12);
    };

    // Robot player (28×34) + variants for skins
    const robot = (key, body, eye = COLORS.void, alpha = 1) => {
      if (has(key)) return;
      g.clear();
      g.fillStyle(body, alpha).fillRect(0, 0, 28, 34);
      g.fillStyle(eye, 1).fillRect(6, 8, 6, 6).fillRect(16, 8, 6, 6);
      g.fillStyle(COLORS.void, 0.4 * alpha).fillRect(5, 24, 18, 3); // mouth slot
      g.generateTexture(key, 28, 34);
    };
    robot('robot', COLORS.cyan);
    robot('robot_gold', 0xffcc33);
    robot('robot_red', 0xff4444);
    robot('robot_glitch', 0x66ffcc);
    robot('robot_ghost', COLORS.cyan, COLORS.void, 0.5);
    robot('robot_void', 0x111111, 0x333333);

    // Platforms (fake is byte-identical to solid by design — §6.2)
    platform('platform_solid', COLORS.platform, COLORS.cyan);
    platform('platform_fake', COLORS.platform, COLORS.cyan);
    platform('platform_fall', COLORS.platformFall, COLORS.fallEdge);

    // Spikes 16×16 (safe is identical to real — the trick)
    const spike = (key, fill) => {
      if (has(key)) return;
      g.clear();
      g.fillStyle(fill, 1).fillTriangle(0, 16, 8, 0, 16, 16);
      g.generateTexture(key, 16, 16);
    };
    spike('spike_real', COLORS.red);
    spike('spike_safe', COLORS.red);
    // Hidden spike shares the lethal look once revealed
    spike('spike_hidden', COLORS.red);

    // Exit door 32×48
    if (!has('exit_door')) {
      g.clear();
      g.fillStyle(COLORS.green, 1).fillRect(0, 0, 32, 48);
      g.fillStyle(COLORS.void, 1).fillRect(8, 22, 16, 26);
      g.lineStyle(2, COLORS.white, 0.5).strokeRect(0, 0, 32, 48);
      g.generateTexture('exit_door', 32, 48);
    }

    // Particle 8×8
    g.clear();
    g.fillStyle(COLORS.white, 1).fillRect(0, 0, 8, 8);
    g.generateTexture('particle_spark', 8, 8);

    // Faint neon grid tile (2× res for HD; white → tinted; top+left lines tile seamlessly)
    g.clear();
    g.lineStyle(2, 0xffffff, 0.5).lineBetween(0, 0, 128, 0).lineBetween(0, 0, 0, 128);
    g.generateTexture('grid', 128, 128);

    // Neon spike — FILLED triangle (a stroked sharp apex leaves a miter "whisker" above the tip).
    // Bloom supplies the glow. Used at natural 16×16 for all spike hazards.
    g.clear();
    g.fillStyle(0xff3b3b, 1).fillPoints([{ x: 1.5, y: 15.5 }, { x: 8, y: 1.5 }, { x: 14.5, y: 15.5 }], true);
    g.generateTexture('spike_neon', 16, 16);

    // Neon exit gate (green double-outline) 32×48
    g.clear();
    g.lineStyle(2.5, 0x00ff88, 1).strokeRect(1.5, 1.5, 29, 45);
    g.lineStyle(1.5, 0x00ff88, 0.45).strokeRect(6, 6, 20, 38);
    g.generateTexture('exit_gate', 32, 48);

    // BUG item (cyan glitch diamond) — collect to slow the corruption
    g.clear();
    g.fillStyle(0x2affff, 1).fillPoints([{ x: 8, y: 1 }, { x: 15, y: 8 }, { x: 8, y: 15 }, { x: 1, y: 8 }], true);
    g.fillStyle(0x06222a, 1).fillPoints([{ x: 8, y: 5 }, { x: 11, y: 8 }, { x: 8, y: 11 }, { x: 5, y: 8 }], true);
    g.generateTexture('item_bug', 16, 16);

    // BACKDOOR KEY (gold) — bank on a clean clear → meta currency
    g.clear();
    g.lineStyle(2, 0xffd24a, 1).strokeCircle(8, 5, 3.5);   // bow
    g.fillStyle(0xffd24a, 1).fillRect(7, 8, 2, 8);          // shaft
    g.fillRect(9, 12, 3, 2); g.fillRect(9, 15, 3, 2);       // teeth
    g.generateTexture('item_key', 16, 18);

    // Player head — big rounded square (smooth, high-res, tinted at runtime) + separate outline
    g.clear();
    g.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, 104, 92, 30);
    g.generateTexture('p_head', 104, 92);
    g.clear();
    g.lineStyle(7, 0xffffff, 1).strokeRoundedRect(4, 4, 96, 84, 27);
    g.generateTexture('p_head_line', 104, 92);

    // Neon UI panel frame (9-slice, 64×64, 16px border) — dark glass + cyan border + corner brackets
    {
      const S = 64, c = 14;
      g.clear();
      g.fillStyle(0x07151f, 0.95).fillRect(0, 0, S, S);
      g.lineStyle(2, COLORS.cyan, 0.85).strokeRect(2, 2, S - 4, S - 4);
      g.lineStyle(1, COLORS.cyan, 0.18).strokeRect(7, 7, S - 14, S - 14);
      g.lineStyle(3, COLORS.cyan, 1);
      g.lineBetween(3, 3, 3 + c, 3); g.lineBetween(3, 3, 3, 3 + c);                 // TL
      g.lineBetween(S - 3, 3, S - 3 - c, 3); g.lineBetween(S - 3, 3, S - 3, 3 + c); // TR
      g.lineBetween(3, S - 3, 3 + c, S - 3); g.lineBetween(3, S - 3, 3, S - 3 - c); // BL
      g.lineBetween(S - 3, S - 3, S - 3 - c, S - 3); g.lineBetween(S - 3, S - 3, S - 3, S - 3 - c); // BR
      g.generateTexture('ui_panel', S, S);
    }

    // Neon star icons — drawn procedurally (vector) at high-res so they stay crisp at any size.
    const starPts = (cx, cy, outer, inner) => {
      const p = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        p.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      return p;
    };
    const starTex = (key, fill, edge, fillA) => {
      g.clear();
      const pts = starPts(33, 34, 28, 12);
      if (fillA) g.fillStyle(fill, fillA).fillPoints(pts, true);
      g.lineStyle(3, edge, 1).strokePoints(pts, true, true);
      g.generateTexture(key, 66, 68);
    };
    starTex('icon_star', 0xffd24a, 0xfff0b8, 1);          // filled gold neon
    starTex('icon_star_empty', 0x0a1820, 0x3a5560, 0);    // dim hollow outline

    // Scanline tile (CRT overlay) — 2×2 with a 1px dark line
    g.clear();
    g.fillStyle(0x000000, 0.5).fillRect(0, 0, 2, 1);
    g.generateTexture('scanline', 2, 2);

    g.destroy();
  }

  // Radial red vignette (danger glow as the corruption wall closes in) — canvas gradient texture
  createVignette() {
    if (this.textures.exists('vignette')) return;
    const w = 480, h = 270;
    let cv;
    try { cv = this.textures.createCanvas('vignette', w, h); } catch (_) { return; }
    if (!cv) return;
    const ctx = cv.getContext();
    const grd = ctx.createRadialGradient(w / 2, h / 2, h * 0.52, w / 2, h / 2, h * 0.98);
    grd.addColorStop(0, 'rgba(255,40,60,0)');
    grd.addColorStop(0.55, 'rgba(255,40,60,0)');   // clear center — gameplay stays visible
    grd.addColorStop(1, 'rgba(255,28,48,0.92)');    // red only at the screen edges
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    cv.refresh();
  }

  // Scrolling grid background tile
  createBackground() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.bg, 1).fillRect(0, 0, 64, 64);
    g.lineStyle(1, COLORS.cyan, 0.08).strokeRect(0, 0, 64, 64);
    g.lineBetween(0, 32, 64, 32);
    g.lineBetween(32, 0, 32, 64);
    g.generateTexture('bg_tile', 64, 64);
    g.destroy();
  }
}
