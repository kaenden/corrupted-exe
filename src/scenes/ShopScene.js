import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { SHOP, SHOP_TABS } from '../data/shop.js';
import { COSMETICS } from '../data/cosmetics.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { textButton, backButton, shardBadge, hdCamera, FONT, TXT } from '../ui/widgets.js';

export class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  create() {
    hdCamera(this);
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);
    backButton(this, () => this.scene.start('MenuScene'));
    this.add.text(CONFIG.WIDTH / 2, 22, 'CUSTOMIZE', { ...TXT, fontSize: '18px' }).setOrigin(0.5);
    this.badge = shardBadge(this, CONFIG.WIDTH - 14, 22);

    this.activeTab = 'skin';
    this._tabBtns = {};
    SHOP_TABS.forEach((tab, i) => {
      const x = 132 + i * 162;
      this._tabBtns[tab] = textButton(this, x, 58, SHOP[tab].label, () => this._setTab(tab), { size: '13px', padX: 12, padY: 5 });
    });

    this.grid = this.add.container(0, 0);
    this._setTab('skin');
  }

  _setTab(tab) {
    this.activeTab = tab;
    SHOP_TABS.forEach((t) => {
      const on = t === tab;
      this._tabBtns[t].setColor(on ? '#ffffff' : '#6f9aa3').setBackgroundColor(on ? '#0e3540' : '#0a2129');
    });
    this._render();
  }

  _render() {
    this.grid.removeAll(true);
    const cfg = SHOP[this.activeTab];
    const slot = cfg.slot;
    const cols = 3, cw = 204, ch = 132, gapX = 12, gapY = 12;
    const x0 = (CONFIG.WIDTH - (cols * cw + (cols - 1) * gapX)) / 2 + cw / 2;
    const y0 = 142;
    cfg.items.forEach((item, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      this._card(item, slot, x0 + col * (cw + gapX), y0 + row * (ch + gapY), cw, ch);
    });
  }

  _card(item, slot, x, y, w, h) {
    const owned = GameState.data.ownedItems.includes(item.id) || item.unlock === 'always';
    const equipped = GameState.getEquipped(slot) === item.id;
    const affordable = GameState.data.totalShards >= item.cost;
    const locked = item.unlock === 'achievement' && !owned;

    const accent = equipped ? COLORS.green : locked ? 0x44525a : owned ? COLORS.cyan : (affordable ? 0xffd24a : 0x6a4a4a);
    this.grid.add(this.add.rectangle(x, y, w, h, equipped ? 0x07241a : 0x081820, 0.96).setStrokeStyle(equipped ? 2.5 : 2, accent));

    this._drawPreview(slot, item, x, y - h / 2 + 30);

    const tag = equipped ? 'ACTIVE' : locked ? 'LOCKED' : owned ? 'OWNED' : null;
    if (tag) this.grid.add(this.add.text(x + w / 2 - 8, y - h / 2 + 10, tag, { ...TXT, fontSize: '9px', color: equipped ? '#00ff88' : locked ? '#7a8a90' : '#8fd8e2' }).setOrigin(1, 0.5));

    this.grid.add(this.add.text(x, y + 4, item.name, { ...TXT, fontSize: '13px', color: locked ? '#9aa8ae' : '#dffcff' }).setOrigin(0.5));
    this.grid.add(this.add.text(x, y + 22, (locked ? item.hint : item.desc) || '', { ...TXT, fontSize: '8.5px', color: '#6f9aa3', align: 'center', wordWrap: { width: w - 26 } }).setOrigin(0.5, 0));

    let action, cb = null, disabled = false, bcolor = '#dffcff', bbg = '#0a2a33';
    if (locked) { action = 'LOCKED'; disabled = true; bcolor = '#7a8a90'; bbg = '#11181b'; }
    else if (equipped) { action = 'ACTIVE'; disabled = true; bcolor = '#00ff88'; bbg = '#06301f'; }
    else if (owned) { action = 'EQUIP'; bcolor = '#dffcff'; cb = () => { GameState.equipItem(slot, item.id); SoundSystem.play('sfx_click'); this._render(); }; }
    else { action = `BUY  ${item.cost}`; disabled = !affordable; bcolor = affordable ? '#ffe27a' : '#b06a6a'; cb = () => this._buy(item, slot); }
    this.grid.add(textButton(this, x, y + h / 2 - 17, action, cb, { size: '12px', disabled, color: bcolor, bg: bbg, padX: 14, padY: 5 }));
  }

  // live/visual preview of how each item actually looks
  _drawPreview(slot, item, cx, cy) {
    if (slot === 'skin') {
      const s = COSMETICS.skins[item.id] || {};
      this.grid.add(this.add.rectangle(cx, cy, 26, 26, s.color ?? 0x00ffff, s.alpha ?? 0.9).setStrokeStyle(2.5, 0xffffff, 0.95));
    } else if (slot === 'trail') {
      const t = COSMETICS.trails[item.id];
      if (t) {
        this.grid.add(this.add.particles(cx - 26, cy, t.texture || 'particle_spark', {
          tint: t.tint ?? 0xffffff, lifespan: 460, frequency: 55, speedX: { min: 30, max: 70 },
          scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', quantity: 1,
        }));
        this.grid.add(this.add.rectangle(cx + 24, cy, 14, 14, 0x00ffff, 0.9).setStrokeStyle(1.5, 0xffffff));
      } else {
        this.grid.add(this.add.text(cx, cy, 'OFF', { ...TXT, fontSize: '11px', color: '#5a7a82' }).setOrigin(0.5));
      }
    } else { // deathFx — a static spray hinting the animation
      const kind = (COSMETICS.deathFx[item.id] || {}).kind || 'scatter';
      this._fxPattern(kind).forEach((d) => this.grid.add(this.add.circle(cx + d.x, cy + d.y, 2.2, 0xff6a5a, 0.95)));
    }
  }

  _fxPattern(kind) {
    switch (kind) {
      case 'melt': return [{ x: 0, y: -7 }, { x: -3, y: -1 }, { x: 3, y: 2 }, { x: 0, y: 7 }, { x: -2, y: 12 }];
      case 'explode': return [{ x: 0, y: -12 }, { x: 11, y: -5 }, { x: 13, y: 6 }, { x: 5, y: 12 }, { x: -6, y: 11 }, { x: -13, y: 3 }, { x: -10, y: -8 }, { x: 0, y: 0 }];
      case 'glitch': return [{ x: -11, y: -4 }, { x: -2, y: 6 }, { x: 6, y: -8 }, { x: 12, y: 5 }, { x: 2, y: -2 }, { x: -7, y: 10 }];
      case 'yeet': return [{ x: -11, y: 11 }, { x: -4, y: 4 }, { x: 2, y: -3 }, { x: 8, y: -9 }, { x: 14, y: -14 }];
      default: return [{ x: 0, y: 0 }, { x: -9, y: -6 }, { x: 9, y: -5 }, { x: 7, y: 7 }, { x: -7, y: 7 }, { x: 0, y: -11 }];
    }
  }

  _buy(item, slot) {
    if (!GameState.spendShards(item.cost)) return;
    GameState.unlockItem(item.id);
    GameState.equipItem(slot, item.id);
    SoundSystem.play('sfx_shard');
    this.badge.update();
    this._render();
  }
}
