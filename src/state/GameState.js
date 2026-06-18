// Single source of truth for all persistent data (GDD §4). Never touch localStorage elsewhere.
import { CONFIG } from '../config/game.js';

const STORAGE_KEY = 'corrupted_exe_v1';
export const SCHEMA_VERSION = 1;

export const GameState = {
  defaults: {
    schemaVersion: SCHEMA_VERSION,
    unlockedWorlds: ['alpha'],
    levelProgress: {},               // { 'alpha_0': { stars: 3, bestDeaths: 0 } }
    totalShards: 0,
    spentShards: 0,
    ownedItems: ['skin_default'],
    equippedItems: { skin: 'skin_default', deathFx: 'fx_default', trail: 'trail_none' },
    settings: { soundEnabled: true, musicEnabled: true, showSpeedrunTimer: false },
    seenTricks: [],                  // trick TYPEs already introduced (first-time hints)
    stats: { totalDeaths: 0, totalLevelsCleared: 0, totalShardEarned: 0 },
    // ESCAPE — BACKDOOR KEYS meta (earned by clean clears) + permanent upgrades
    backdoor: { keys: 0, highScore: 0, upgrades: { speed: 0, jump: 0, slow: 0, bug: 0, platform: 0, alarm: 0, shield: 0, keymult: 0 } },
  },

  data: null,
  sessionLevelCount: 0,              // in-memory only — truly resets each page load (ad cadence)

  // Deep-merge `src` onto a clone of `base` so saves missing newly-added fields backfill.
  _deepMerge(base, src) {
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const k in src) {
      const a = out[k];
      const b = src[k];
      out[k] = (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a))
        ? this._deepMerge(a, b)
        : b;
    }
    return out;
  },

  init() {
    const fresh = structuredClone(this.defaults); // deep clone — never share nested refs with defaults
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); }
    catch { saved = null; }                        // corrupt save → defaults, never crash boot
    this.data = saved ? this._deepMerge(fresh, saved) : fresh;
    this.data.schemaVersion = SCHEMA_VERSION;      // (run migrations here when bumping version)
    this.sessionLevelCount = 0;
  },

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); }
    catch { /* private mode / quota — ignore, game still playable this session */ }
  },

  getLevelKey(world, index) { return `${world}_${index}`; },

  // `runDeathShards` = SHARD_PER_DEATH * deaths. `parDeaths` = level.parDeaths.
  saveLevelResult(world, index, deaths, runDeathShards = 0, parDeaths = 0) {
    const key = this.getLevelKey(world, index);
    const m = CONFIG.STAR_TWO_MARGIN;
    const stars = deaths <= parDeaths ? 3 : deaths <= parDeaths + m ? 2 : 1;
    const prev = this.data.levelProgress[key];
    const improved = !prev || stars > prev.stars;

    // Star shards pay only the positive DIFFERENCE on improvement (§9). No replay farm.
    const prevStarShards = prev ? (CONFIG.SHARD_PER_STAR[prev.stars] || 0) : 0;
    const starShards = improved ? Math.max(0, CONFIG.SHARD_PER_STAR[stars] - prevStarShards) : 0;

    if (improved) {
      this.data.levelProgress[key] = { stars, bestDeaths: deaths };
    } else if (deaths < (prev.bestDeaths ?? Infinity)) {
      prev.bestDeaths = deaths;
    }

    // Unlock next level (entry = unlocked-but-unplayed marker)
    const nextKey = this.getLevelKey(world, index + 1);
    if (!this.data.levelProgress[nextKey]) {
      this.data.levelProgress[nextKey] = { stars: 0, bestDeaths: null };
    }

    const earned = starShards + runDeathShards;
    this.data.totalShards += earned;
    this.data.stats.totalShardEarned += earned;
    this.data.stats.totalDeaths += deaths;
    this.data.stats.totalLevelsCleared += 1;
    this.sessionLevelCount += 1;

    this.checkWorldUnlock();
    this.save();

    return { stars, improved, starShards, deathShards: runDeathShards, shardsEarned: earned };
  },

  // 2× rewarded ad: credit the same amount again, once.
  addShards(amount) {
    this.data.totalShards += amount;
    this.data.stats.totalShardEarned += amount;
    this.save();
  },

  checkWorldUnlock() {
    if (this.data.unlockedWorlds.includes('beta')) return;
    const allAlphaDone = Array.from({ length: CONFIG.LEVELS_PER_WORLD }, (_, i) => {
      const k = this.getLevelKey('alpha', i);
      return this.data.levelProgress[k]?.stars > 0;
    }).every(Boolean);
    if (allAlphaDone) { this.data.unlockedWorlds.push('beta'); this.save(); }
  },

  // -1 = locked, 0 = unlocked but unplayed, 1-3 = finished.
  getStars(world, index) {
    const entry = this.data.levelProgress[this.getLevelKey(world, index)];
    if (entry) return entry.stars;
    return this.isLevelUnlocked(world, index) ? 0 : -1;
  },

  isLevelUnlocked(world, index) {
    if (index === 0) return this.data.unlockedWorlds.includes(world);
    const prev = this.data.levelProgress[this.getLevelKey(world, index - 1)];
    return (prev?.stars ?? 0) > 0;
  },

  spendShards(amount) {
    if (this.data.totalShards < amount) return false;
    this.data.totalShards -= amount;
    this.data.spentShards += amount;
    this.save();
    return true;
  },

  unlockItem(itemId) {
    if (!this.data.ownedItems.includes(itemId)) {
      this.data.ownedItems.push(itemId);
      this.save();
    }
  },

  equipItem(slot, itemId) {
    this.data.equippedItems[slot] = itemId;
    this.save();
  },
  getEquipped(slot) { return this.data.equippedItems[slot]; },

  // First-time hints: true once per trick type, then records it.
  isFirstEncounter(trickType) {
    if (this.data.seenTricks.includes(trickType)) return false;
    this.data.seenTricks.push(trickType);
    this.save();
    return true;
  },

  setSetting(key, value) { this.data.settings[key] = value; this.save(); },
  getSetting(key) { return this.data.settings[key]; },
};
