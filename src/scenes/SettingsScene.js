import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { textButton, backButton, hdCamera, FONT } from '../ui/widgets.js';

export class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }
  init(data) { this.returnTo = data?.returnTo || 'MenuScene'; }

  create() {
    const cx = CONFIG.WIDTH / 2;
    hdCamera(this);
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);
    backButton(this, () => this.scene.start(this.returnTo));
    this.add.text(cx, 40, 'AYARLAR', { fontFamily: FONT, fontSize: '22px', color: '#dffcff' }).setOrigin(0.5);

    const rows = [
      ['SES', 'soundEnabled'],
      ['MÜZİK', 'musicEnabled'],
      ['SÜRE (speedrun)', 'showSpeedrunTimer'],
    ];
    rows.forEach(([label, key], i) => {
      const y = 110 + i * 50;
      this.add.text(cx - 140, y, label, { fontFamily: FONT, fontSize: '16px', color: '#9fd6df' }).setOrigin(0, 0.5);
      const btn = textButton(this, cx + 120, y, this._lbl(key), () => {
        GameState.setSetting(key, !GameState.getSetting(key));
        btn.setText(this._lbl(key));
        SoundSystem.applySettings();
      }, { size: '14px', originX: 1 });
    });

    this.add.text(cx, CONFIG.HEIGHT - 30, 'değişiklikler otomatik kaydedilir', {
      fontFamily: FONT, fontSize: '11px', color: '#3a5a62',
    }).setOrigin(0.5);
  }

  _lbl(key) { return `[ ${GameState.getSetting(key) ? 'AÇIK' : 'KAPALI'} ]`; }
}
