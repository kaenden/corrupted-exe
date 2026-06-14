import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { SHOP, SHOP_TABS } from '../data/shop.js';
import { COSMETICS } from '../data/cosmetics.js';
import { textButton, backButton, shardBadge, hdCamera, FONT } from '../ui/widgets.js';

export class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  create() {
    hdCamera(this);
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);
    backButton(this, () => this.scene.start('MenuScene'));
    this.add.text(CONFIG.WIDTH / 2, 22, 'SHOP', { fontFamily: FONT, fontSize: '18px', color: '#dffcff' }).setOrigin(0.5);
    this.badge = shardBadge(this, CONFIG.WIDTH - 14, 22);

    this.activeTab = 'skin';
    this._tabBtns = {};
    SHOP_TABS.forEach((tab, i) => {
      const x = 110 + i * 175;
      this._tabBtns[tab] = textButton(this, x, 64, SHOP[tab].label, () => this._setTab(tab), { size: '13px' });
    });

    this.grid = this.add.container(0, 0);
    this.preview = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 44, 30, 30, 0x00ffff, 0.9).setStrokeStyle(2.5, 0xffffff);
    this._setTab('skin');
  }

  _setTab(tab) {
    this.activeTab = tab;
    SHOP_TABS.forEach((t) => this._tabBtns[t].setColor(t === tab ? '#ffffff' : '#7fb8c2'));
    this._render();
  }

  _render() {
    this.grid.removeAll(true);
    const cfg = SHOP[this.activeTab];
    const slot = cfg.slot;
    const cols = 4, cw = 150, ch = 110, gap = 14;
    const gridW = cols * cw + (cols - 1) * gap;
    const x0 = (CONFIG.WIDTH - gridW) / 2 + cw / 2;
    const y0 = 150;

    cfg.items.forEach((item, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      this._card(item, slot, x0 + col * (cw + gap), y0 + row * (ch + gap), cw, ch);
    });

    // preview equipped skin (neon square)
    const skin = COSMETICS.skins[GameState.getEquipped('skin')] || COSMETICS.skins.skin_default;
    this.preview.setFillStyle(skin.color || 0x00ffff, skin.alpha ?? 0.9);
  }

  _card(item, slot, x, y, w, h) {
    const owned = GameState.data.ownedItems.includes(item.id) || item.unlock === 'always';
    const equipped = GameState.getEquipped(slot) === item.id;
    const affordable = GameState.data.totalShards >= item.cost;
    const achievement = item.unlock === 'achievement' && !owned;

    const accent = equipped ? COLORS.green : achievement ? 0x555555 : COLORS.cyan;
    this.grid.add(this.add.rectangle(x, y, w, h, 0x081820, 0.95).setStrokeStyle(2, accent));
    this.grid.add(this.add.text(x, y - 34, item.name, { fontFamily: FONT, fontSize: '13px', color: '#dffcff' }).setOrigin(0.5));

    let line2, action, cb, disabled = false;
    if (achievement) { line2 = '🔒'; action = item.hint || '???'; disabled = true; }
    else if (equipped) { line2 = ''; action = '[ ACTIVE ]'; disabled = true; }
    else if (owned) { line2 = ''; action = '[ EQUIP ]'; cb = () => { GameState.equipItem(slot, item.id); this._render(); }; }
    else { line2 = `${item.cost}◈`; action = '[ BUY ]'; disabled = !affordable; cb = () => this._buy(item, slot); }

    if (line2) this.grid.add(this.add.text(x, y - 6, line2, { fontFamily: FONT, fontSize: '14px', color: affordable || owned ? '#ffe27a' : '#a55' }).setOrigin(0.5));

    const btn = textButton(this, x, y + 30, action, cb, {
      size: '12px', disabled, color: equipped ? '#00ff88' : '#dffcff',
      bg: equipped ? '#06301f' : '#0a2a33',
    });
    this.grid.add(btn);
  }

  _buy(item, slot) {
    if (!GameState.spendShards(item.cost)) return;
    GameState.unlockItem(item.id);
    GameState.equipItem(slot, item.id);
    this.badge.update();
    this._render();
  }
}
