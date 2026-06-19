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

// Minimal Q-style text button: clean label, hover glow + scale + accent underline + ▸◂ marks.
// Standalone-text input (reliable under the zoomed camera). Returns the Text object.
export function menuButton(scene, x, y, label, cb, opts = {}) {
  const accent = opts.accent ?? COLORS.cyan;
  const accentHex = '#' + accent.toString(16).padStart(6, '0');
  const base = opts.color || '#84c4d0';
  const sz = opts.size || '20px';
  const t = scene.add.text(x, y, label, { fontFamily: FONT, fontSize: sz, color: base, resolution: RES }).setOrigin(0.5);
  const line = scene.add.rectangle(x, y + parseInt(sz, 10) * 0.62 + 5, 0, 2, accent, 0).setOrigin(0.5);
  const mkL = scene.add.text(x, y, '▸', { fontFamily: FONT, fontSize: '14px', color: accentHex, resolution: RES }).setOrigin(0.5).setAlpha(0);
  const mkR = scene.add.text(x, y, '◂', { fontFamily: FONT, fontSize: '14px', color: accentHex, resolution: RES }).setOrigin(0.5).setAlpha(0);
  t.setInteractive({ useHandCursor: true });
  t.on('pointerover', () => {
    t.setColor('#ffffff'); const w = t.width;
    mkL.setX(x - w / 2 - 18).setAlpha(1); mkR.setX(x + w / 2 + 18).setAlpha(1);
    scene.tweens.add({ targets: t, scale: 1.1, duration: 130, ease: 'Quad.out' });
    scene.tweens.add({ targets: line, width: w + 12, alpha: 0.95, duration: 180, ease: 'Cubic.out' });
  });
  t.on('pointerout', () => {
    t.setColor(base); mkL.setAlpha(0); mkR.setAlpha(0);
    scene.tweens.add({ targets: t, scale: 1, duration: 130 });
    scene.tweens.add({ targets: line, width: 0, alpha: 0, duration: 160 });
  });
  t.on('pointerdown', () => t.setScale(1.04));
  t.on('pointerup', () => { t.setScale(1.1); cb && cb(); });
  if (opts.delay != null) { t.setAlpha(0); scene.tweens.add({ targets: t, alpha: 1, duration: 400, delay: opts.delay, ease: 'Cubic.out' }); }
  return t;
}

// Dark content card (thin accent frame) — separates panels from the backdrop.
// opts.onClick → the WHOLE card is tappable; the frame glows on hover.
export function card(scene, cx, cy, w, h, opts = {}) {
  const accent = opts.accent ?? COLORS.cyan;
  const active = !!opts.active;
  const baseW = active ? 2 : 1.5, baseA = active ? 1 : 0.45, baseFill = 0x05080b, fillA = active ? 0.97 : 0.92;
  const r = scene.add.rectangle(cx, cy, w, h, baseFill, fillA).setStrokeStyle(baseW, accent, baseA);
  if (opts.onClick) {
    r.setInteractive({ useHandCursor: true });
    r.on('pointerover', () => r.setStrokeStyle(2.5, accent, 1).setFillStyle(0x0b131a, 0.95));
    r.on('pointerout', () => r.setStrokeStyle(baseW, accent, baseA).setFillStyle(baseFill, fillA));
    r.on('pointerup', () => opts.onClick());
  }
  return r;
}

export function backButton(scene, cb) {
  const t = scene.add.text(16, 22, '‹ BACK', { fontFamily: FONT, fontSize: '14px', color: '#7fb8c2', resolution: RES })
    .setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
  t.on('pointerover', () => t.setColor('#ffffff'));
  t.on('pointerout', () => t.setColor('#7fb8c2'));
  t.on('pointerup', cb);
  return t;
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
