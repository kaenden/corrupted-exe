import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';

// HD render: zoom the scene camera by RENDER_SCALE so the 720×405 logical world fills the
// 1440×810 backing buffer crisply. Call once at the start of every scene's create().
export function hdCamera(scene) {
  const c = scene.cameras.main;
  c.setZoom(CONFIG.RENDER_SCALE);
  c.centerOn(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);
  c.fadeIn(240, 1, 3, 8); // smooth materialize from black on every scene entry
}

// Fade the camera to black, then start another scene (polished transition).
export function fadeTo(scene, key, data, dur = 220) {
  const c = scene.cameras.main;
  c.fadeOut(dur, 1, 3, 8);
  c.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

// Subtle CRT scanline overlay (GDD §22 polish). Call once per scene.
export function addScanlines(scene) {
  return scene.add.tileSprite(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, 'scanline')
    .setOrigin(0, 0).setScrollFactor(0).setAlpha(0.12).setDepth(1000);
}

export const FONT = 'monospace';
export const RES = 3; // render text at 3× → crisp under the smooth (non-pixelArt) upscale
export const TXT = { fontFamily: FONT, color: '#dffcff', resolution: RES };

// A simple terminal-style button. Returns the Text game object.
export function textButton(scene, x, y, label, cb, opts = {}) {
  const t = scene.add.text(x, y, label, {
    fontFamily: FONT,
    fontSize: opts.size || '18px',
    color: opts.color || '#dffcff',
    backgroundColor: opts.bg || '#0a2a33',
    padding: { x: opts.padX ?? 16, y: opts.padY ?? 8 },
    align: 'center',
    resolution: RES,
  }).setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);

  if (opts.disabled) { t.setAlpha(0.4); return t; }

  t.setInteractive({ useHandCursor: true })
    .on('pointerover', () => t.setColor('#ffffff'))
    .on('pointerout', () => t.setColor(opts.color || '#dffcff'))
    .on('pointerdown', () => { t.setScale(0.96); })
    .on('pointerup', () => { t.setScale(1); cb?.(); });
  return t;
}

// Neon framed button (corner-bracket panel + accent tick + hover glow) — matches the game's HUD/portal look.
export function neonButton(scene, x, y, label, cb, opts = {}) {
  const w = opts.w || 250, h = opts.h || 44;
  const accent = opts.accent ?? COLORS.cyan;
  const base = opts.color || '#dffcff';
  const c = scene.add.container(x, y);
  const panel = neonPanel(scene, 0, 0, w, h, accent);
  const tick = scene.add.rectangle(-w / 2 + 13, 0, 4, h - 20, accent, 0.9);
  const txt = scene.add.text(8, 0, label, { fontFamily: FONT, fontSize: opts.size || '18px', color: base, resolution: RES }).setOrigin(0.5);
  c.add([panel, tick, txt]);
  c.setSize(w, h).setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
  c.on('pointerover', () => { txt.setColor('#ffffff'); tick.setAlpha(1); scene.tweens.add({ targets: c, scale: 1.05, duration: 110, ease: 'Quad.out' }); });
  c.on('pointerout', () => { txt.setColor(base); tick.setAlpha(0.9); scene.tweens.add({ targets: c, scale: 1, duration: 110 }); });
  c.on('pointerdown', () => c.setScale(0.97));
  c.on('pointerup', () => { c.setScale(1.05); cb?.(); });
  return c;
}

export function backButton(scene, cb) {
  return textButton(scene, 14, 22, '← BACK', cb, { size: '14px', originX: 0, originY: 0.5, padX: 10, padY: 5 });
}

// Top-right shard badge with the crystal icon. Returns { text, icon, update }.
export function shardBadge(scene, x, y) {
  const t = scene.add.text(x, y, '', { fontFamily: FONT, fontSize: '15px', color: '#ffe27a', resolution: RES }).setOrigin(1, 0.5);
  const icon = scene.add.image(0, y, 'icon_shard').setOrigin(1, 0.5).setDisplaySize(17, 17);
  const update = () => { t.setText(GameState.data.totalShards.toLocaleString()); icon.x = t.x - t.width - 3; };
  update();
  return { text: t, icon, update };
}

// Neon UI panel frame (9-slice 'ui_panel'); optional tint for red/grey variants.
export function neonPanel(scene, cx, cy, w, h, tint) {
  const p = scene.add.nineslice(cx, cy, 'ui_panel', undefined, w, h, 16, 16, 16, 16);
  if (tint != null && tint !== COLORS.cyan) p.setTint(tint);
  return p;
}

export function panelRect(scene, cx, cy, w, h, accent = COLORS.cyan) {
  return neonPanel(scene, cx, cy, w, h, accent);
}
