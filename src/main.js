import Phaser from 'phaser';
import { CONFIG, COLORS, RELEASE_BUILD } from './config/game.js';
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
import { ControlsScene } from './scenes/ControlsScene.js';

// Global: every text renders at RENDER_SCALE+1× resolution so it stays crisp under the
// camera's HD zoom (no per-call `resolution` needed). Texts that set their own keep it.
const GAME_FONT = "'Chakra Petch', monospace"; // techy display font (loaded in index.html)
const _textFactory = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  style = style || {};
  if (style.resolution == null) style.resolution = CONFIG.RENDER_SCALE + 1;
  if (!style.fontFamily || style.fontFamily === 'monospace') style.fontFamily = GAME_FONT;
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
  scene: [BootScene, MenuScene, SettingsScene, WorldSelectScene, LevelSelectScene, ShopScene, GameScene, UIScene, BackdoorScene, EscapeScene, EscapeOverScene, ControlsScene],
};

let _started = false;
let game = null; // module-scoped so the fullscreen/resize handlers below reach it without a global
const startGame = () => {
  if (_started) return; _started = true;
  game = new Phaser.Game(config);
  // Drop the static first-paint loader once Phaser has booted (its in-engine boot curtain takes over),
  // with a hard fallback timer so the loader can NEVER stick on a portal harness even if 'ready' is late.
  const dropLoader = () => { const el = document.getElementById('boot'); if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 450); } };
  game.events.once('ready', dropLoader);
  setTimeout(dropLoader, 3500);
  // Debug/test handles exist everywhere EXCEPT the portal release build (build:cg) — so the GitHub
  // Pages QA mirror keeps window.game (Playwright tests) + window.GameState, while the CrazyGames
  // upload exposes neither (tree-shaken out → no console level-skipping / save-cheating).
  if (!RELEASE_BUILD) {
    window.game = game;
    import('./state/GameState.js').then((m) => { window.GameState = m.GameState; });
  }
};
// Boot Phaser IMMEDIATELY — never gate the boot on a font load / setTimeout. On a portal harness
// (Playgama/CrazyGames) the game iframe can load hidden/backgrounded, where setTimeout + fonts.load are
// THROTTLED for seconds — that delayed the boot, so the platform's "game ready" signal missed its
// window and the game appeared stuck on the loader. The self-hosted display font is warmed in parallel
// (non-blocking) and is in place well before the menu text renders (after the ~1s boot curtain).
// Warm the display font in parallel (never blocking / throwing — a thrown warm-up must not stop boot).
try { document.fonts?.load?.("600 16px 'Chakra Petch'")?.catch?.(() => {}); } catch { /* ignore */ }
startGame();

// Mobile: on the first tap, enter fullscreen + lock landscape (Android Chrome). iOS blocks
// fullscreen / orientation lock → it gracefully falls back to the rotate prompt + FIT.
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) {
  // Retry on every tap until fullscreen sticks (one attempt can be dropped). Once in
  // fullscreen the guard makes further taps no-ops. iOS ignores it → the dvh CSS still fits.
  const goFull = () => {
    try {
      if (game?.scale && !game.scale.isFullscreen) game.scale.startFullscreen();
      window.screen?.orientation?.lock?.('landscape').catch(() => {});
    } catch (_) { /* unsupported */ }
    setTimeout(() => game?.scale?.refresh(), 300); // re-fit after the viewport changes
  };
  window.addEventListener('pointerdown', goFull);
}

// Force the FIT scaler to recompute after an orientation flip (mobile reports new dims late).
window.addEventListener('orientationchange', () => setTimeout(() => game?.scale?.refresh(), 250));
window.addEventListener('resize', () => game?.scale?.refresh());
