import Phaser from 'phaser';
import { CONFIG, COLORS } from '../config/game.js';
import { GameState } from '../state/GameState.js';
import { SHOP, SHOP_TABS } from '../data/shop.js';
import { COSMETICS } from '../data/cosmetics.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { backButton, shardBadge, hdCamera, card, FONT, TXT } from '../ui/widgets.js';

// Minimal Q-style shop: clean thin cards, live previews (mini-robot skins, animated FX bursts,
// real trail emitters), tap-to-equip/buy, accent-underline tabs.
export class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  create() {
    hdCamera(this);
    this.add.image(0, 0, 'bg_menu').setOrigin(0, 0).setDisplaySize(CONFIG.WIDTH, CONFIG.HEIGHT).setDepth(-10);
    try { this.cameras.main.postFX?.addBloom(0xffffff, 1, 1, 1.1, 1.2, 6); } catch (_) { /* no bloom */ }
    backButton(this, () => this.scene.start('MenuScene'));
    this.add.text(CONFIG.WIDTH / 2, 22, 'CUSTOMIZE', { ...TXT, fontSize: '18px' }).setOrigin(0.5);
    this.badge = shardBadge(this, CONFIG.WIDTH - 14, 22);

    this.activeTab = 'skin';
    this._tabs = {};
    SHOP_TABS.forEach((tab, i) => {
      const x = 150 + i * 150;
      const t = this.add.text(x, 60, SHOP[tab].label, { ...TXT, fontSize: '14px' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const ul = this.add.rectangle(x, 74, 0, 2, COLORS.cyan, 1).setOrigin(0.5);
      t.on('pointerup', () => this._setTab(tab));
      t.on('pointerover', () => { if (this.activeTab !== tab) t.setColor('#ffffff'); });
      t.on('pointerout', () => { if (this.activeTab !== tab) t.setColor('#6f9aa3'); });
      this._tabs[tab] = { t, ul };
    });

    this.grid = this.add.container(0, 0);
    this._prismHeads = [];
    this._setTab('skin');
  }

  update(time) {
    // animated PRISM skin preview(s) cycle hue
    for (const h of this._prismHeads) {
      h.setTint(Phaser.Display.Color.HSVToRGB(((time / 16) % 360) / 360, 0.85, 1).color);
    }
  }

  _setTab(tab) {
    this.activeTab = tab;
    SHOP_TABS.forEach((t) => {
      const on = t === tab;
      this._tabs[t].t.setColor(on ? '#ffffff' : '#6f9aa3');
      this.tweens.add({ targets: this._tabs[t].ul, width: on ? this._tabs[t].t.width + 8 : 0, duration: 160, ease: 'Cubic.out' });
    });
    this._render();
  }

  _render() {
    this.grid.removeAll(true);
    this._prismHeads = [];
    const cfg = SHOP[this.activeTab];
    const slot = cfg.slot;
    const cols = 3, cw = 200, ch = 122, gapX = 14, gapY = 14;
    const x0 = (CONFIG.WIDTH - (cols * cw + (cols - 1) * gapX)) / 2 + cw / 2;
    const y0 = 152;
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
    const accent = equipped ? COLORS.green : locked ? 0x3a4a52 : owned ? COLORS.cyan : (affordable ? 0xffd24a : 0x5a3a3a);

    // whole card is the click target; the frame glows on hover (action label is just a state cue)
    let label, color, onClick = null;
    if (locked) { label = 'LOCKED'; color = '#5f7a82'; }
    else if (equipped) { label = '— ACTIVE —'; color = '#00ff88'; }
    else if (owned) { label = 'EQUIP'; color = '#bdf6ff'; onClick = () => { GameState.equipItem(slot, item.id); SoundSystem.play('sfx_click'); this._render(); }; }
    else { label = `◈ ${item.cost}`; color = affordable ? '#ffe27a' : '#b06a6a'; onClick = affordable ? () => this._buy(item, slot) : null; }

    this.grid.add(card(this, x, y, w, h, { accent, active: equipped, onClick }));
    this._preview(slot, item, x, y - 30);
    this.grid.add(this.add.text(x, y + 6, item.name, { ...TXT, fontSize: '13px', color: locked ? '#7a8a90' : '#eafdff' }).setOrigin(0.5));
    this.grid.add(this.add.text(x, y + 22, (locked ? item.hint : item.desc) || '', { ...TXT, fontSize: '8px', color: '#6f8a92', align: 'center', wordWrap: { width: w - 26 } }).setOrigin(0.5, 0));
    this.grid.add(this.add.text(x, y + h / 2 - 14, label, { ...TXT, fontSize: '13px', color }).setOrigin(0.5));
  }

  // ---- live previews ----
  _preview(slot, item, cx, cy) {
    if (slot === 'skin') return this._skinPreview(item, cx, cy);
    if (slot === 'trail') return this._trailPreview(item, cx, cy);
    return this._fxPreview(item, cx, cy);
  }

  _skinPreview(item, cx, cy) {
    const s = COSMETICS.skins[item.id] || {};
    const col = s.color ?? 0xffb43b, al = s.alpha ?? 0.95;
    const HW = 34, HH = 30;
    this.grid.add(this.add.rectangle(cx - 6, cy + 16, 5, 8, col, al));
    this.grid.add(this.add.rectangle(cx + 6, cy + 16, 5, 8, col, al));
    const head = this.add.image(cx, cy, 'p_head').setDisplaySize(HW, HH).setTint(col).setAlpha(al);
    this.grid.add(head);
    this.grid.add(this.add.image(cx, cy, 'p_head_line').setDisplaySize(HW, HH));
    this.grid.add(this.add.ellipse(cx - 6, cy - 1, 5, 7, 0x06121a));
    this.grid.add(this.add.ellipse(cx + 6, cy - 1, 5, 7, 0x06121a));
    if (s.anim === 'prism') this._prismHeads.push(head);
  }

  _trailPreview(item, cx, cy) {
    const t = COSMETICS.trails[item.id];
    if (!t) { this.grid.add(this.add.text(cx, cy, 'OFF', { ...TXT, fontSize: '12px', color: '#5a7a82' }).setOrigin(0.5)); return; }
    this.grid.add(this.add.particles(cx - 28, cy, 'particle_spark', {
      tint: t.tint ?? 0xffffff, lifespan: 480, frequency: 50, speedX: { min: 34, max: 78 },
      scale: { start: t.scale ?? 0.55, end: 0 }, alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', quantity: 1,
      gravityY: (t.gravityY ?? 0) * 0.4,
    }));
    this.grid.add(this.add.image(cx + 24, cy, 'p_head').setDisplaySize(16, 14).setTint(0x2affff));
  }

  // animated mini-burst showing each death FX's character (direction + colour)
  _fxPreview(item, cx, cy) {
    const kind = (COSMETICS.deathFx[item.id] || {}).kind || 'scatter';
    const map = {
      scatter: { angle: { min: 0, max: 360 } },
      melt: { angle: { min: 60, max: 120 }, gravityY: 130 },
      explode: { angle: { min: 0, max: 360 }, speed: { min: 45, max: 100 } },
      glitch: { angle: { min: 0, max: 360 }, tint: [0x00ffff, 0xff2222, 0xffffff] },
      yeet: { angle: { min: 250, max: 290 }, speed: { min: 60, max: 110 } },
      nova: { angle: { min: 0, max: 360 }, speed: { min: 50, max: 105 } },
    };
    const c = map[kind] || {};
    this.grid.add(this.add.particles(cx, cy, 'particle_spark', {
      lifespan: 520, speed: { min: 22, max: 55 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.7, end: 0 },
      tint: 0xff6a5a, blendMode: 'ADD', frequency: 60, quantity: 1, ...c,
    }));
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
