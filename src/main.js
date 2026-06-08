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
  scene: [BootScene, MenuScene, SettingsScene, WorldSelectScene, LevelSelectScene, ShopScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);

// Mobile: on the first tap, enter fullscreen + lock landscape (Android Chrome). iOS blocks
// fullscreen / orientation lock → it gracefully falls back to the rotate prompt + FIT.
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) {
  const goFull = async () => {
    window.removeEventListener('pointerdown', goFull);
    try {
      if (game.scale && !game.scale.isFullscreen) game.scale.startFullscreen();
      await window.screen?.orientation?.lock?.('landscape');
    } catch (_) { /* unsupported — rotate prompt handles it */ }
  };
  window.addEventListener('pointerdown', goFull);
}
