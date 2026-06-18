import Phaser from 'phaser';
import { CONFIG, COLORS } from './config/game.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { WorldSelectScene } from './scenes/WorldSelectScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { BackdoorScene } from './scenes/BackdoorScene.js';
import { EscapeScene } from './scenes/EscapeScene.js';
import { EscapeOverScene } from './scenes/EscapeOverScene.js';

// Global: every text renders at RENDER_SCALE+1× resolution so it stays crisp under the
// camera's HD zoom (no per-call `resolution` needed). Texts that set their own keep it.
const _textFactory = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  style = style || {};
  if (style.resolution == null) style.resolution = CONFIG.RENDER_SCALE + 1;
  return _textFactory.call(this, x, y, text, style);
};

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: CONFIG.WIDTH * CONFIG.RENDER_SCALE,
  height: CONFIG.HEIGHT * CONFIG.RENDER_SCALE,
  backgroundColor: COLORS.bg,
  pixelArt: false,      // smooth bilinear scaling — matches the neon look, no crunchy pixels
  roundPixels: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: CONFIG.PLAYER_GRAVITY },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, SettingsScene, WorldSelectScene, LevelSelectScene, ShopScene, GameScene, UIScene, BackdoorScene, EscapeScene, EscapeOverScene],
};

const game = new Phaser.Game(config);
window.game = game; // exposed for debugging / automated tests
import('./state/GameState.js').then((m) => { window.GameState = m.GameState; });

// Mobile: on the first tap, enter fullscreen + lock landscape (Android Chrome). iOS blocks
// fullscreen / orientation lock → it gracefully falls back to the rotate prompt + FIT.
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) {
  // Retry on every tap until fullscreen sticks (one attempt can be dropped). Once in
  // fullscreen the guard makes further taps no-ops. iOS ignores it → the dvh CSS still fits.
  const goFull = () => {
    try {
      if (game.scale && !game.scale.isFullscreen) game.scale.startFullscreen();
      window.screen?.orientation?.lock?.('landscape').catch(() => {});
    } catch (_) { /* unsupported */ }
    setTimeout(() => game.scale?.refresh(), 300); // re-fit after the viewport changes
  };
  window.addEventListener('pointerdown', goFull);
}

// Force the FIT scaler to recompute after an orientation flip (mobile reports new dims late).
window.addEventListener('orientationchange', () => setTimeout(() => game.scale?.refresh(), 250));
window.addEventListener('resize', () => game.scale?.refresh());
