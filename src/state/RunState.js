// THE DESCENT — roguelite run state. A run pulls rooms from the 60-level pool, escalating in
// difficulty (= corruption). Integrity = lives; draft a boon between rooms; bank keys on end.
import { GameState } from './GameState.js';

// Room pool ordered by rough difficulty: alpha 0..29 (easy→hard) then beta 0..29 (harder).
const POOL = [];
for (let i = 0; i < 30; i++) POOL.push({ world: 'alpha', levelIndex: i });
for (let i = 0; i < 30; i++) POOL.push({ world: 'beta', levelIndex: i });

const ROOMS_PER_RUN = 8;
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// Run-scoped boons (passive, build-variety — never grant double-jump/dash, that breaks identity).
export const BOONS = [
  { id: 'maxint', name: '+1 MAX INTEGRITY', desc: 'Raise & restore max lives', apply: (r) => { r.maxIntegrity++; r.integrity++; } },
  { id: 'repair', name: 'REPAIR', desc: 'Restore 1 integrity', apply: (r) => { r.integrity = Math.min(r.maxIntegrity, r.integrity + 1); } },
  { id: 'coyote', name: 'LATENCY BUFFER', desc: 'More forgiving jump timing', apply: (r) => { r.coyoteBonus += 55; } },
  { id: 'greed', name: 'GREED PROTOCOL', desc: 'Keys x1.5 from now on', apply: (r) => { r.keyMult *= 1.5; } },
  { id: 'firewall', name: 'FIREWALL', desc: 'Absorb your next death', apply: (r) => { r.shield = true; } },
];

export const RunState = {
  active: false,
  rooms: [], index: 0,
  integrity: 3, maxIntegrity: 3,
  keys: 0,
  coyoteBonus: 0, keyMult: 1, shield: false,
  lastSummary: null,

  start() {
    const up = GameState.data.descent.upgrades;
    this.maxIntegrity = 3 + (up.integrity || 0);
    this.integrity = this.maxIntegrity;
    this.keys = 0;
    this.index = 0;
    this.coyoteBonus = 0;
    this.keyMult = 1 + 0.25 * (up.greed || 0);
    this.shield = !!up.shield;
    this.rooms = this._pick(ROOMS_PER_RUN);
    this.active = true;
  },

  _pick(n) {
    const out = []; const used = new Set();
    for (let j = 0; j < n; j++) {
      const center = Math.round((j / (n - 1)) * (POOL.length - 1)); // escalate with depth
      let pick, tries = 0;
      do { pick = ri(Math.max(0, center - 5), Math.min(POOL.length - 1, center + 5)); tries++; }
      while (used.has(pick) && tries < 8);
      used.add(pick); out.push(POOL[pick]);
    }
    return out;
  },

  currentRoom() { return this.rooms[this.index]; },

  // Returns { gained, won }.
  completeRoom() {
    const gained = Math.round((4 + this.index * 2) * this.keyMult);
    this.keys += gained;
    this.index++;
    return { gained, won: this.index >= this.rooms.length };
  },

  // Returns true if the run is over (integrity depleted). Firewall absorbs one death.
  loseLife() {
    if (this.shield) { this.shield = false; return false; }
    this.integrity--;
    return this.integrity <= 0;
  },

  addBoon(boon) { boon.apply(this); },

  bank(won) {
    const meta = GameState.data.descent;
    meta.glitchKeys += this.keys;
    meta.bestDepth = Math.max(meta.bestDepth, this.index);
    this.lastSummary = { won, keys: this.keys, depth: this.index };
    this.active = false;
    GameState.save();
    return this.lastSummary;
  },
};
