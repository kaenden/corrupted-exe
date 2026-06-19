import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { menuButton, backButton, card, hdCamera, FONT, TXT } from '../ui/widgets.js';

export class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }
  init(data) { this.returnTo = data?.returnTo || 'MenuScene'; }

  create() {
    const cx = CONFIG.WIDTH / 2;
    hdCamera(this);
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);
    backButton(this, () => this.scene.start(this.returnTo));
    this.add.text(cx, 38, 'SETTINGS', { ...TXT, fontSize: '20px' }).setOrigin(0.5);

    const row = (label, y, getLbl, cb) => {
      card(this, cx, y, 380, 42, { accent: COLORS.cyan });
      this.add.text(cx - 168, y, label, { ...TXT, fontSize: '15px', color: '#bfe9f2' }).setOrigin(0, 0.5);
      const btn = menuButton(this, cx + 138, y, getLbl(), () => { cb(); btn.setText(getLbl()); }, { size: '15px', accent: COLORS.green });
      return btn;
    };

    const settings = [['SOUND', 'soundEnabled'], ['MUSIC', 'musicEnabled'], ['TIMER (speedrun)', 'showSpeedrunTimer']];
    settings.forEach(([label, key], i) => {
      row(label, 96 + i * 50, () => this._lbl(key), () => { GameState.setSetting(key, !GameState.getSetting(key)); SoundSystem.applySettings(); });
    });

    // Manual fullscreen toggle (mobile-friendly; auto-fullscreen also fires on first tap)
    row('FULLSCREEN', 96 + settings.length * 50, () => (this.scale.isFullscreen ? '[ ON ]' : '[ OFF ]'), () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else { this.scale.startFullscreen(); window.screen?.orientation?.lock?.('landscape').catch(() => {}); }
    });

    this.add.text(cx, CONFIG.HEIGHT - 22, 'changes save automatically', { ...TXT, fontSize: '11px', color: '#3a5a62' }).setOrigin(0.5);
  }

  _lbl(key) { return `[ ${GameState.getSetting(key) ? 'ON' : 'OFF'} ]`; }
}
