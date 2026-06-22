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
export const HOVER = '#4dff5a'; // neon-green hover highlight (thematic — matches the menu title)

// Shared on-screen touch controls: joystick (left) + JUMP (right) + optional PHASE (above JUMP).
// MUST run in a STATIC hd-camera scene (logical 0..720 / 0..405 coords) so pointer regions are
// screen-fixed — a following/zoomed camera makes pointer.x a scrolling world coord (the old escape
// bug). Writes to `input` {left,right,jump,jumpJustPressed,ghostJustPressed}; the gameplay scene
// consumes jumpJustPressed/ghostJustPressed after reading. opts: { hasGhost, gameKey }.
export function buildTouchControls(scene, input, opts = {}) {
  const { hasGhost = false, gameKey = null } = opts;
  scene.input.addPointer(3); // multi-touch: move + jump (+ phase) together
  const jx = 78, jy = CONFIG.HEIGHT - 64, R = 46;
  scene.add.circle(jx, jy, R, 0x0a2a33, 0.28).setStrokeStyle(2, 0x2affff, 0.4).setDepth(30);
  const thumb = scene.add.circle(jx, jy, 22, 0x2affff, 0.5).setStrokeStyle(2, 0x2affff, 0.8).setDepth(31);
  const jbx = CONFIG.WIDTH - 70, jby = CONFIG.HEIGHT - 64;
  const jbtn = scene.add.circle(jbx, jby, 40, 0x0a2a33, 0.3).setStrokeStyle(2, 0x2affff, 0.5).setDepth(30);
  scene.add.text(jbx, jby, 'JUMP', { fontFamily: FONT, fontSize: '13px', color: '#dffcff', resolution: RES }).setOrigin(0.5).setDepth(31);
  let ghostBtn = null;
  if (hasGhost) {                                   // PHASE (GHOST STEP) — only shown once the skill is unlocked
    const gx = CONFIG.WIDTH - 70, gy = CONFIG.HEIGHT - 144;
    scene.add.circle(gx, gy, 30, 0x1a0e2e, 0.32).setStrokeStyle(2, 0xbd8aff, 0.6).setDepth(30);
    scene.add.text(gx, gy, 'PHASE', { fontFamily: FONT, fontSize: '11px', color: '#d6c2ff', resolution: RES }).setOrigin(0.5).setDepth(31);
    ghostBtn = { gx, gy, r: 34 };
  }
  let joyId = -1, jumpId = -1;
  const moveThumb = (lx) => { const dx = Phaser.Math.Clamp(lx - jx, -R, R); thumb.x = jx + dx; input.left = dx < -12; input.right = dx > 12; };
  // pointer.x/y are in the GAME BASE resolution (CONFIG.WIDTH*RENDER_SCALE); divide by the zoom to get
  // the LOGICAL coords the controls + regions are laid out in. (Without this the PHASE hit-test never
  // matched and the jump/joystick split was off — the mobile control bug.)
  const RS = CONFIG.RENDER_SCALE;
  scene.input.on('pointerdown', (p) => {
    const lx = p.x / RS, ly = p.y / RS;
    if ((gameKey && scene.scene.isPaused(gameKey)) || ly < CONFIG.HEIGHT * 0.4) return; // ignore HUD/top band
    if (ghostBtn && Phaser.Math.Distance.Between(lx, ly, ghostBtn.gx, ghostBtn.gy) < ghostBtn.r) { input.ghostJustPressed = true; return; }
    if (lx >= CONFIG.WIDTH * 0.5) { jumpId = p.id; input.jump = true; input.jumpJustPressed = true; jbtn.setFillStyle(0x2affff, 0.45); }
    else { joyId = p.id; moveThumb(lx); }
  });
  scene.input.on('pointermove', (p) => { if (p.id === joyId) moveThumb(p.x / RS); });
  const up = (p) => {
    if (p.id === jumpId) { jumpId = -1; input.jump = false; jbtn.setFillStyle(0x0a2a33, 0.3); }
    if (p.id === joyId) { joyId = -1; thumb.x = jx; input.left = false; input.right = false; }
  };
  scene.input.on('pointerup', up);
  scene.input.on('pointerupoutside', up);
}

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
    .on('pointerover', () => t.setColor(HOVER))
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
    t.setColor(HOVER); const w = t.width;
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

// Dark content card — rounded corners (joined, soft), thick accent frame. opts.onClick makes the
// WHOLE card tappable; on hover only the frame brightens (the fill stays).
export function card(scene, cx, cy, w, h, opts = {}) {
  const accent = opts.accent ?? COLORS.cyan;
  const active = !!opts.active;
  const x = cx - w / 2, y = cy - h / 2, rad = Math.min(14, h / 4);
  const baseW = active ? 2.6 : 2.1, baseA = active ? 1 : 0.6, fillA = active ? 0.97 : 0.92;
  const g = scene.add.graphics();
  const paint = (sw, sa) => {
    g.clear();
    g.fillStyle(0x05080b, fillA).fillRoundedRect(x, y, w, h, rad);
    g.lineStyle(sw, accent, sa).strokeRoundedRect(x, y, w, h, rad);
  };
  paint(baseW, baseA);
  if (opts.onClick) {
    g.setInteractive(new Phaser.Geom.Rectangle(x, y, w, h), Phaser.Geom.Rectangle.Contains);
    g.on('pointerover', () => paint(baseW + 1.2, 1));
    g.on('pointerout', () => paint(baseW, baseA));
    g.on('pointerup', () => opts.onClick());
  }
  return g;
}

export function backButton(scene, cb) {
  const t = scene.add.text(16, 22, '‹ BACK', { fontFamily: FONT, fontSize: '14px', color: '#7fb8c2', resolution: RES })
    .setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
  t.on('pointerover', () => t.setColor(HOVER));
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
