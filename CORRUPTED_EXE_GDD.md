# CORRUPTED.EXE — Game Design Document
**Version:** 1.1  
**Engine:** Phaser 3 + Arcade Physics  
**Target:** CrazyGames (primary) · Poki (secondary — via AdProvider abstraction)  
**Orientation:** Landscape (720×405) — mobile + desktop  
**Build Model:** Vibe coding with Claude Opus 4.8  
**Audio:** SFX + music (see §13b SoundSystem)  

> **v1.1 changelog** is at the end of this document. v1.1 fixes the shard-economy exploit, the CrazyGames ad-callback bug, save migration, the cosmetics render gap, and adds the SoundSystem, AdProvider, level-data trick schemas, and a batched level-authoring plan.

---

## OPUS 4.8 — READING THIS DOCUMENT

This document is modular. Each section is independently implementable. Follow the **Build Order** at the end exactly — do not skip ahead. Every section marked `[MODULE]` is a self-contained unit.

**Three rules:**
1. Never mix scene logic. Each Phaser Scene is its own file.
2. All config values live in `src/config/game.js`. Never hardcode numbers inline.
3. All save data goes through `GameState.js`. Never call `localStorage` directly elsewhere.

When a section says **"Placeholder OK"** — build with colored rectangles first, replace art later.

---

## 1. CONCEPT

### One-Line Pitch
A robot trapped in a corrupted simulation tries to reach the exit — but the simulation is actively trying to kill it with visual lies, fake platforms, and broken physics.

### Narrative Frame
The player is testing a corporation's AI simulation. Something goes wrong. The simulation becomes hostile — it doesn't want to be shut down. Instead of fighting back with enemies, it fights back with **deception**. Platforms vanish. Exits move. Safe zones kill.

This framing makes every trick feel *logical* within the world: "the simulation is broken" is the reason anything can happen.

### Tone
- Dark, glitchy, neon-lit
- Frustrated but fair — tricks are learnable, not random
- The game mocks you when you die, celebrates when you win
- Every death message is a system error code: `SEGMENTATION_FAULT`, `STACK_OVERFLOW`, `NULL_REFERENCE`

### Visual Language
- Color palette: deep black bg, electric cyan/blue primary, warning red for hazards, bright white for UI
- Geometric shapes — no rounded organic forms
- Scanlines, pixel corruption on trick reveals
- Robot character: small, square-ish, mechanical — Placeholder: 32×40px rectangle (matches asset manifest §2 and the placeholder code §13)

---

## 2. TECH STACK

```
Framework:     Phaser 3.60+
Physics:       Phaser Arcade Physics (NOT Matter.js — simpler for platformer)
Build:         Vite 5.x
Language:      JavaScript (ES6+)
Storage:       localStorage via GameState singleton
Ad SDK:        CrazyGames SDK v3
Resolution:    720×405 (16:9 landscape)
Scale Mode:    Phaser.Scale.FIT + CENTER_BOTH
```

### Project Structure

```
corrupted-exe/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── assets/
│       ├── images/
│       │   ├── robot.png           32×40px  — player sprite
│       │   ├── platform_solid.png  96×16px  — normal platform
│       │   ├── platform_fake.png   96×16px  — hologram (same look, no collision)
│       │   ├── platform_fall.png   96×16px  — falls after 0.8s contact
│       │   ├── spike_visible.png   16×16px  — looks dangerous (safe)
│       │   ├── spike_hidden.png    16×16px  — looks safe (kills)
│       │   ├── exit_door.png       32×48px  — level exit
│       │   ├── bg_tile.png         720×405px — scrolling grid bg
│       │   ├── particle_spark.png  8×8px
│       │   ├── star_full.png       32×32px
│       │   ├── star_empty.png      32×32px
│       │   └── ui/
│       │       ├── btn_normal.png  — 9-slice button
│       │       └── panel_bg.png    — modal background
│       └── (audio — handled separately)
└── src/
    ├── main.js
    ├── config/
    │   └── game.js
    ├── state/
    │   └── GameState.js
    ├── data/
    │   ├── levels_alpha.js     — SIM_ALPHA 20 levels
    │   ├── levels_beta.js      — SIM_BETA 20 levels
    │   └── cosmetics.js        — item ID → render config (skin/deathFx/trail). §11b
    ├── scenes/
    │   ├── BootScene.js
    │   ├── MenuScene.js
    │   ├── WorldSelectScene.js
    │   ├── LevelSelectScene.js
    │   ├── ShopScene.js        — scene key 'ShopScene' (§10.9)
    │   ├── SettingsScene.js    — audio toggles + speedrun-timer flag (§10.10)
    │   ├── GameScene.js
    │   └── UIScene.js          — HUD overlay, runs parallel to GameScene
    └── systems/
        ├── TrickSystem.js      — all trick platform logic
        ├── PlayerSystem.js     — movement, jump, death, cosmetics application
        ├── SoundSystem.js      — SFX + music, first-interaction unlock, mute bus (§13b)
        └── ad/
            ├── AdSystem.js     — provider-agnostic facade used by scenes
            ├── AdProvider.js   — interface (init/loadingStart/Stop/gameplayStart/Stop/showInterstitial/showRewarded)
            ├── CrazyGamesProvider.js
            └── PokiProvider.js
```

---

## 3. CONFIG VALUES

**File:** `src/config/game.js` — All tuning values live here. Never hardcode elsewhere.

```javascript
export const CONFIG = {
  // Canvas
  WIDTH: 720,
  HEIGHT: 405,

  // Player physics
  PLAYER_SPEED: 200,          // px/s horizontal
  PLAYER_JUMP_VELOCITY: -420, // negative = upward
  PLAYER_GRAVITY: 800,        // px/s²
  COYOTE_TIME: 80,            // ms — can jump after leaving platform edge
  JUMP_BUFFER: 100,           // ms — jump input buffered before landing

  // Platform types timing
  FALL_PLATFORM_DELAY: 800,   // ms before falling platform drops
  FAKE_PLATFORM_REVEAL: 200,  // ms after first contact, platform fades out
  SHIFT_PLATFORM_SPEED: 120,  // px/s for moving platforms
  SPIKE_BLINK_WARN: 300,      // ms warning blink before hidden spike appears

  // Camera
  CAMERA_SHAKE_DEATH: { duration: 200, intensity: 0.012 },
  CAMERA_SHAKE_TRICK: { duration: 100, intensity: 0.006 },

  // Death
  DEATH_FREEZE_MS: 400,       // freeze frame on death before restart
  RESPAWN_DELAY_MS: 600,      // total delay from death to player respawn

  // Economy
  SHARD_PER_DEATH: 2,         // shards accumulated per death THIS RUN (paid on level complete; doubled by 2× ad)
  SHARD_PER_STAR: { 1: 80, 2: 150, 3: 250 }, // shards for 1/2/3 star finish
  SHARD_2X_AD: true,          // gate: show the rewarded "2× shard" button on overlays

  // Stars — based on a PER-LEVEL death PAR (level.parDeaths, ≈ the level's distinct
  // trick/hard-spot count; 0 for pure-platforming levels). 3★: deaths <= par ·
  // 2★: deaths <= par + STAR_TWO_MARGIN · else 1★. Makes 3★ reachable on a clean-ish
  // first clear instead of demanding a memorized 0-death run.
  STAR_TWO_MARGIN: 5,

  // Onboarding / fairness off-ramp
  HINT_ON_FIRST_TRICK: true,       // auto-show a hint the first time each trick TYPE appears
  HINT_PURCHASE_AFTER_DEATHS: 10,  // death overlay offers a paid trick-location reveal after N deaths this run
  HINT_PURCHASE_COST: 50,          // shards to reveal one trick location
  MOCKERY_SOFTEN_AFTER: 8,         // death-overlay tone shifts snarky → helpful at this death count

  // World layout (single source of truth — used by GameState.checkWorldUnlock and UI)
  LEVELS_PER_WORLD: 20,

  // Ads
  AD_INTERSTITIAL_EVERY_N: 3, // show interstitial (CrazyGames 'midgame') every N level completions
};
```

---

## 4. GAME STATE

**File:** `src/state/GameState.js`

Manages all persistent data. Single source of truth.

```javascript
export const SCHEMA_VERSION = 1;

export const GameState = {
  // Default state shape
  defaults: {
    schemaVersion: SCHEMA_VERSION,
    unlockedWorlds: ['alpha'],       // 'beta' unlocks after alpha complete
    levelProgress: {},               // { 'alpha_0': { stars: 3, bestDeaths: 0 } }
    totalShards: 0,
    spentShards: 0,
    ownedItems: ['skin_default'],    // item IDs from shop catalogue
    equippedItems: {
      skin: 'skin_default',
      deathFx: 'fx_default',
      trail: 'trail_none',
    },
    settings: {                      // see SettingsScene §10.10 / SoundSystem §13b
      soundEnabled: true,
      musicEnabled: true,
      showSpeedrunTimer: false,
    },
    seenTricks: [],                  // trick TYPEs already introduced (for first-time hints)
    stats: {
      totalDeaths: 0,
      totalLevelsCleared: 0,
      totalShardEarned: 0,
    },
  },

  data: null,
  sessionLevelCount: 0,              // IN-MEMORY only — truly resets each page load (ad cadence)

  // Deep-merge `src` onto a clone of `base` so saves missing newly-added fields backfill.
  _deepMerge(base, src) {
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const k in src) {
      const a = out[k], b = src[k];
      out[k] = (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a))
        ? this._deepMerge(a, b) : b;
    }
    return out;
  },

  init() {
    const fresh = structuredClone(this.defaults);   // deep clone — never share nested refs with defaults
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('corrupted_exe_v1')); }
    catch { saved = null; }                          // corrupt save → fall back to defaults, never crash boot
    this.data = saved ? this._deepMerge(fresh, saved) : fresh;  // backfill missing fields
    this.data.schemaVersion = SCHEMA_VERSION;        // (run migrations here when bumping the version)
    this.sessionLevelCount = 0;
  },

  save() {
    localStorage.setItem('corrupted_exe_v1', JSON.stringify(this.data));
  },

  // Level key format: 'alpha_0', 'alpha_1', 'beta_0' etc.
  getLevelKey(world, index) { return `${world}_${index}`; },

  // `runDeathShards` = CONFIG.SHARD_PER_DEATH * deaths. `parDeaths` = level.parDeaths.
  saveLevelResult(world, index, deaths, runDeathShards = 0, parDeaths = 0) {
    const key = this.getLevelKey(world, index);
    const m = CONFIG.STAR_TWO_MARGIN;
    const stars = deaths <= parDeaths ? 3 : deaths <= parDeaths + m ? 2 : 1; // per-level PAR
    const prev = this.data.levelProgress[key];
    const improved = !prev || stars > prev.stars;

    // STAR shards pay only the positive DIFFERENCE on improvement (§9). A replay that does
    // not beat the stored star count earns 0 star-shards → no infinite farm.
    const prevStarShards = prev ? (CONFIG.SHARD_PER_STAR[prev.stars] || 0) : 0;
    const starShards = improved ? Math.max(0, CONFIG.SHARD_PER_STAR[stars] - prevStarShards) : 0;

    if (improved) {
      this.data.levelProgress[key] = { stars, bestDeaths: deaths };
    } else if (deaths < (prev.bestDeaths ?? Infinity)) {
      prev.bestDeaths = deaths; // still record a better (lower-death) run
    }

    // Unlock next level (entry = unlocked-but-unplayed marker)
    const nextKey = this.getLevelKey(world, index + 1);
    if (!this.data.levelProgress[nextKey]) {
      this.data.levelProgress[nextKey] = { stars: 0, bestDeaths: null };
    }

    // DEATH shards (CONFIG.SHARD_PER_DEATH per death) are an intentional repeatable trickle.
    const earned = starShards + runDeathShards;
    this.data.totalShards += earned;
    this.data.stats.totalShardEarned += earned;
    this.data.stats.totalDeaths += deaths;
    this.data.stats.totalLevelsCleared += 1;
    this.sessionLevelCount += 1;

    this.checkWorldUnlock();
    this.save();

    // shardsEarned reflects the ACTUAL credit so the overlay shows the right number.
    return { stars, improved, starShards, deathShards: runDeathShards, shardsEarned: earned };
  },

  // Used by the "2× shard" rewarded ad: credit the same amount again, once.
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
    if (allAlphaDone) this.data.unlockedWorlds.push('beta');
  },

  // Star count for UI. -1 = LOCKED, 0 = unlocked but unplayed, 1-3 = finished.
  // Must not report an unlocked-but-unplayed level (e.g. fresh-save level 0) as locked.
  getStars(world, index) {
    const entry = this.data.levelProgress[this.getLevelKey(world, index)];
    if (entry) return entry.stars;                 // 0..3
    return this.isLevelUnlocked(world, index) ? 0 : -1;
  },

  isLevelUnlocked(world, index) {
    if (index === 0) return true;
    const prevKey = this.getLevelKey(world, index - 1);
    return (this.data.levelProgress[prevKey]?.stars ?? 0) > 0;
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

  // First-time hints: returns true once per trick type, then records it.
  isFirstEncounter(trickType) {
    if (this.data.seenTricks.includes(trickType)) return false;
    this.data.seenTricks.push(trickType);
    this.save();
    return true;
  },

  setSetting(key, value) {            // 'soundEnabled' | 'musicEnabled' | 'showSpeedrunTimer'
    this.data.settings[key] = value;
    this.save();
  },
  getSetting(key) { return this.data.settings[key]; },
};
```

---

## 5. PLAYER MECHANICS

### 5.1 Movement
- **Left / Right:** Arrow keys or A/D on desktop. On-screen buttons (◀ ▶) on mobile.
- **Jump:** Up arrow, W, or Spacebar on desktop. On-screen JUMP button on mobile.
- Player does **not** auto-run. They stand still if no input.
- Horizontal movement is instant (no acceleration). Stopping is instant.
- This is intentional: tricks rely on careful step-by-step movement.

### 5.2 Jump Feel
- Single jump only (no double jump — makes trick landings more punishing).
- **Coyote time:** Player can jump up to `COYOTE_TIME` ms after walking off a platform edge. Feels fair.
- **Jump buffer:** If jump pressed up to `JUMP_BUFFER` ms before landing, it fires on land. Prevents missed jump inputs.
- Jump is **fixed height** — holding jump does not increase height. No variable jump arc.

### 5.3 Death Conditions
Player dies when:
- Touching any object tagged `kills_player: true`
- Falling below the level's `deathFloorY` value
- Touching an active hidden spike during its reveal window

On death:
1. Player sprite plays death animation (pixel scatter)
2. Camera shakes
3. `DEATH_FREEZE_MS` pause (dramatic effect)
4. Death counter increments
5. After `RESPAWN_DELAY_MS` total: player respawns at level's `spawnPoint`
6. All platforms reset to their initial state

### 5.4 Win Condition
Player reaches the exit door. Exit door is always visually distinct — it must never be a trick target. The door is the one thing the game never lies about.

---

## 6. TRICK SYSTEM

**File:** `src/systems/TrickSystem.js`

All tricks are defined per-level in level data. TrickSystem reads the level data and applies behaviors to game objects at runtime.

### 6.1 Platform Types

Each platform has a `type` field. Default is `solid`.

---

#### TYPE: `solid`
Standard platform. Behaves normally.  
No special behavior.

---

#### TYPE: `fake`
Looks identical to a solid platform — intentional no-tell trust trick (Rule 2 exception, §6.4).  
Has **no collision** — player falls through immediately.  
Visual feedback: when player would collide, platform briefly flickers (alpha 0.3) then returns to full opacity. Player is already falling.  
Use sparingly — most effective on first encounter.  
**First introduction (alpha 3–4) must be forgiving:** place the first `fake` over a shallow, hazard-free landing so the teaching death costs only the fall, not a kill. Ramp stakes afterward.  
**Dev/testing:** `platform_fake` placeholder is byte-identical to `platform_solid` by design; gate a tiny debug marker behind `CONFIG.DEBUG_TRICKS` so authors can verify placement without breaking the trick in real art.

---

#### TYPE: `falling`
Looks identical to solid platform.  
Collision works normally until player lands on it.  
After `FALL_PLATFORM_DELAY` ms of contact, platform shakes briefly then drops.  
Drops below screen, never returns during the level.  
Warning signal: brief color tint change + rumble animation before drop.

---

#### TYPE: `shifting`
A platform that moves on a defined path (horizontal or vertical) at `SHIFT_PLATFORM_SPEED`.  
Path defined by `pathStart` and `pathEnd` in level data.  
Moves back and forth automatically. Player can ride it.  
Can be used as the only path forward — requires timing.

---

#### TYPE: `ghost`
Invisible until player is within 60px proximity.  
Fades in over 200ms when player approaches.  
Fully solid — can be stood on. Never kills.  
Teaches: look for visual hints (slight shimmer in the air).

---

#### TYPE: `inverse`
Appears dangerous (spike graphics on top, red coloring).  
Is actually safe — player can stand on it.  
The real danger is usually the normal-looking area beside it.  
Best used after player has learned to fear spikes.

---

#### TYPE: `shift_exit`
The exit door has this applied. The door is real — it works. But just as the player reaches it, it slides 2–3 tiles in one direction. Player must adjust. Only used in mid/late levels, never as the first encounter with the exit.

---

### 6.2 Hazard Types

Each hazard has a `type` field.

---

#### HAZARD: `spike_real`
Standard lethal spike. Clearly marked. Kills on touch.  
Color: bright red. Player expects this to kill them. It does.

---

#### HAZARD: `spike_safe`
Looks like `spike_real` — identical graphics.  
Does **not** kill. Player can walk or land on it.  
Best used after player has been killed by real spikes multiple times.  
First encounter should be unexpected — place where player was trying to avoid it.

---

#### HAZARD: `spike_hidden`
Appears as flat ground or platform surface — but carries a **persistent, perceptible tell BEFORE the trigger** (a hairline crack / a slightly off tile texture / a faint pulsing glow), so an attentive player can read it without dying first. This satisfies Trick Rule 2 (§6.4).  
After player steps within a 32px trigger zone:  
- `SPIKE_BLINK_WARN` ms warning flash (Alpha World uses ~450–500 ms so it's readable; Beta may tighten to 300 ms)  
- A grace window: stepping back out of the zone during the warning **saves the player** (rewards the lesson instead of only punishing it)  
- Spike emerges from ground  
- If player is still in zone after the warning, they die  
Player learns: hesitate before safe-looking areas that show the tell.

---

#### HAZARD: `ceiling_trap`
Mounted on ceiling. Invisible until player jumps near it.  
Triggers 100ms after player's jump arc reaches ceiling proximity.  
Drops down briefly, then retracts. If player hits it mid-jump — death.  
Warning: faint ceiling marking (a line, a texture change) is visible.

---

#### HAZARD: `text_trap`
A UI text element appears saying something reassuring:  
`"SAFE ZONE DETECTED"` / `"THIS PLATFORM IS STABLE"` / `"EXIT VERIFIED"`  
Clicking or touching the text object kills the player.  
The text itself is the hitbox. Used sparingly — maximum 2 per world.

---

### 6.3 Environment Tricks

These affect the level environment, not specific objects.

---

#### ENV: `gravity_pulse`
At a defined trigger zone, gravity temporarily reverses for 1.5 seconds.  
Player floats to ceiling. If ceiling has no platform — death.  
Warning: brief directional arrow flash before zone activates.

---

#### ENV: `scroll_fake`
The background scrolls as if player is moving right.  
But the player's actual position is not advancing.  
A hidden wall is blocking them.  
**Tell (required — otherwise this reads as an engine bug, not a trick):** on contact the wall flickers into partial visibility as a faint scanline/glitch column and the robot emits pixel-corruption particles at the bump point; pair the first occurrence with a one-time hint (`GEÇERSİZ KOORDİNAT — ATLA`).  
Player must jump over the wall.  
First occurrence late only (Boss 3 / level 15), never as a first impression. Used once per world maximum.

---

#### ENV: `level_complete_fake`
A fake "LEVEL COMPLETE" overlay appears — styled identically to the real one.  
It has a `[CONTINUE]` button. Pressing it triggers a spike from below.  
Only the real exit door completes the level.  
Used maximum once in the entire game (memorable, not repetitive).

---

### 6.4 Trick Design Rules

1. **Every trick must be learnable.** After dying once, the player should understand what happened.
2. **Visual consistency.** Real hazards and fake hazards share visual language — but there are always subtle tells (a flicker, a missing shadow, a color temperature difference). Never make tricks purely random.
   - **Explicit exceptions (no-tell "trust" tricks):** `fake` platforms, `text_trap`, and `level_complete_fake` are *intentionally* indistinguishable on first encounter — the lesson is "distrust the simulation's surfaces/UI itself." These are the only tricks exempt from Rule 2. They are rare by design (see §6.2/§6.3 usage caps) and gated late, so the deception premise is already established before they appear. (Decision v1.1: kept lethal as designed.)
3. **Boss levels are trick clusters.** Boss levels (every 5th) combine multiple tricks in sequence. Regular levels introduce 1–2 new tricks max.
4. **Same trick, new context.** Reuse trick types across levels but in different arrangements. Once a player learns `fake` platforms, place them in unexpected positions.
5. **The exit door is sacred.** Never apply a lethal trick to the exit door itself. `shift_exit` is the only exception and it's non-lethal.
6. **The REAL UI is inviolable.** The genuine HUD, the genuine Level-Complete overlay, and the genuine `[DEVAM]`/exit must be visually distinct and *never* lie. `text_trap`/`level_complete_fake` may imitate them, but the real ones must stay trustworthy so players can still act on legitimate UI. (This is what keeps the no-tell trust-tricks "fair-in-aggregate.")
7. **Mobile fairness margin.** No hazard, hidden-spike tell, or fake-platform edge may sit inside the bottom-left/bottom-right on-screen-control thumb zones (see §7 `safeZones` / §10.6). Tricks must read identically on desktop and mobile.

---

## 7. LEVEL DATA FORMAT

**Files:** `src/data/levels_alpha.js` / `src/data/levels_beta.js`

```javascript
export const LEVELS_ALPHA = [
  {
    id: 0,
    world: 'alpha',
    index: 0,
    code: 'ERR_001',           // displayed in HUD
    name: 'BOOT_SEQUENCE',     // optional subtitle
    // NOTE: this object is a FORMAT sample showing assorted trick fields. The REAL
    // ERR_001 per §8.3 is pure platforming (no fake/spikes) — see the teaching arc.

    // Scoring: death PAR for stars (§9). ≈ distinct tricks/hard spots; 0 = pure platforming.
    parDeaths: 0,

    // Player
    spawnPoint: { x: 80, y: 300 },
    deathFloorY: 420,          // y position below which player dies (off screen)

    // Exit
    exit: { x: 640, y: 280 },

    // Camera bounds (if level is larger than screen)
    bounds: { width: 720, height: 405 },

    // Platforms array. `ghost` adds `proximity` (px). `shifting` references a paths[] entry.
    platforms: [
      { x: 0,   y: 390, w: 720, h: 15, type: 'solid' },  // floor
      { x: 150, y: 320, w: 96,  h: 16, type: 'solid' },
      { x: 280, y: 260, w: 96,  h: 16, type: 'solid' },
      { x: 420, y: 300, w: 96,  h: 16, type: 'fake'  },  // first trick (over safe landing)
      { x: 560, y: 280, w: 96,  h: 16, type: 'solid' },
      // { x: 300, y: 200, w: 96, h: 16, type: 'ghost', proximity: 60 },
      // { x: 200, y: 180, w: 96, h: 16, type: 'shifting', pathIndex: 0 },
    ],

    // Hazards array. Trigger-bearing hazards carry their own trigger fields (see §7.1).
    hazards: [
      { x: 350, y: 374, type: 'spike_real' },
      { x: 460, y: 374, type: 'spike_safe' },  // looks same, is safe
      // { x: 500, y: 388, type: 'spike_hidden', trigger: { x: 484, y: 372, w: 32, h: 20 } },
      // { x: 600, y: 40,  type: 'ceiling_trap', dropDistance: 48, armProximity: 64 },
      // { x: 520, y: 120, type: 'text_trap', message: 'SAFE ZONE DETECTED', w: 140, h: 24 },
    ],

    // Environment tricks (see §7.1 for each type's shape).
    envTricks: [
      // { type: 'gravity_pulse', zone: { x: 300, y: 0, w: 80, h: 405 }, duration: 1500, arrowDir: 'up' },
      // { type: 'scroll_fake',   wallX: 360, hint: 'GEÇERSİZ KOORDİNAT — ATLA' },
      // { type: 'level_complete_fake' },  // whole-game max 1
    ],

    // shift_exit (optional) — the real exit slides on approach. Non-lethal.
    // exitShift: { dir: 'right', tiles: 3, triggerX: 600 },

    // Shifting-platform paths, referenced by platform.pathIndex.
    paths: [
      // { axis: 'h', from: { x: 200, y: 180 }, to: { x: 360, y: 180 }, speed: 120, pingpong: true },
    ],

    // Mobile no-trick thumb zones (screen-space, see §10.6). Authoring/validator must keep
    // hazards, hidden-spike tells, and fake edges OUT of these on touch builds.
    safeZones: [
      { x: 0,   y: 305, w: 150, h: 100 },  // bottom-left ◀ ▶ cluster
      { x: 570, y: 305, w: 150, h: 100 },  // bottom-right ZIPLAT
    ],

    // Hint text (shown briefly at level start, fades after 2s).
    // In addition, when CONFIG.HINT_ON_FIRST_TRICK is true, TrickSystem auto-shows a
    // one-time hint the FIRST time each trick TYPE appears (GameState.isFirstEncounter),
    // then never again — so authoring `hint` is only for extra narrative beats.
    hint: null,  // e.g. "TRUST NOTHING" — null if no hint
  },
  // ... more levels
];
```

### 7.1 Trick data schemas (authoritative)

Every trick that needs runtime parameters carries them in level data — `TrickSystem`
reads these, never magic numbers. Defaults come from `CONFIG`.

| Trick | Lives in | Required fields |
|---|---|---|
| `solid` / `fake` / `falling` | `platforms[]` | `{ x, y, w, h, type }` |
| `ghost` | `platforms[]` | `+ proximity` (px fade-in radius, default 60) |
| `shifting` | `platforms[]` + `paths[]` | platform `+ pathIndex`; path `{ axis:'h'|'v', from:{x,y}, to:{x,y}, speed?, pingpong? }` |
| `inverse` | `hazards[]` | `{ x, y, type:'inverse' }` (safe; looks dangerous) |
| `spike_real` / `spike_safe` | `hazards[]` | `{ x, y, type }` |
| `spike_hidden` | `hazards[]` | `+ trigger:{ x, y, w, h }` (32px default), `warnMs?` |
| `ceiling_trap` | `hazards[]` | `{ x, y, type, dropDistance, armProximity }` |
| `text_trap` | `hazards[]` | `{ x, y, type, message, w, h }` (text object IS the kill hitbox; lives in GameScene, not UIScene) |
| `gravity_pulse` | `envTricks[]` | `{ type, zone:{x,y,w,h}, duration, arrowDir }` |
| `scroll_fake` | `envTricks[]` | `{ type, wallX, hint? }` |
| `level_complete_fake` | `envTricks[]` | `{ type }` (whole-game max 1) |
| `shift_exit` | level `exitShift` | `{ dir:'left'|'right', tiles, triggerX }` (non-lethal) |

---

## 8. WORLD & LEVEL DESIGN

### 8.1 Two Worlds

| World | Code | Color Palette | Tone | Unlock Condition |
|---|---|---|---|---|
| SIM_ALPHA | Neon Blue | Deep navy + electric cyan | Tutorial → deceptive | Available from start |
| SIM_BETA | Corrupt Red | Dark red + white + static | Fast + chaotic | Complete all 20 alpha levels (any star) |

### 8.2 Level Naming Convention

- Regular levels: `ERR_001` through `ERR_020` (alpha), `ERR_101` through `ERR_120` (beta)
- Alpha boss levels (every 5th): `BOSS_005`, `BOSS_010`, `BOSS_015`, `BOSS_020`
- Beta boss levels (every 5th): `BOSS_105`, `BOSS_110`, `BOSS_115`, `BOSS_120`
- Code is derived from the level index: alpha `ERR_{index+1:03}`, beta `ERR_{index+101:03}`; the 5th/10th/15th/20th of each world use the matching `BOSS_*` code. (Internal arrays are 0-based; human-facing codes are 1-based.)
- Boss levels in UI: different border color, skull icon

### 8.3 Alpha World — 20 Level Teaching Arc

| Levels | Focus | New Tricks Introduced |
|---|---|---|
| 1–2 | Basic movement, jump feel | None — pure platforming |
| 3–4 | First deception | `fake` platform |
| 5 | Boss 1 | `fake` + `falling` combined |
| 6–7 | Hazard confusion | `spike_safe` (looks deadly, isn't) |
| 8–9 | Timing | `falling` platform + timing gap |
| 10 | Boss 2 | `ghost` platform + `spike_hidden` |
| 11–12 | Visual lies | `inverse` hazard, `text_trap` |
| 13–14 | Environmental | `gravity_pulse` |
| 15 | Boss 3 | `scroll_fake` + `ceiling_trap` |
| 16–17 | Speed + tricks | `shifting` + `spike_hidden` |
| 18–19 | Gauntlet | Multiple tricks per screen |
| 20 | Final Boss | All trick types, `level_complete_fake` |

### 8.4 Beta World — Escalation

Beta assumes player has mastered all alpha tricks. Beta introduces:
- Faster platforms (`SHIFT_PLATFORM_SPEED` × 1.5)
- Tricks that trigger off-screen (player can't see them coming)
- Reversed gravity zones stacked together
- `shift_exit` on most levels

### 8.5 Beta World — 20 Level Escalation Arc

Beta reuses alpha trick types in harder combinations (no brand-new mechanics, except
stacking/off-screen variants). STEP 19 authors beta against THIS table, not §8.3.

| Levels | Focus | Trick Combination |
|---|---|---|
| 101–102 | Re-entry / speed | `shifting` ×1.5 speed, `fake` in fast sequences |
| 103–104 | Hidden under pressure | `spike_hidden` (300 ms tight) + `falling` |
| 105 | `BOSS_105` | `shifting` + `spike_hidden` + `shift_exit` |
| 106–107 | Off-screen triggers | `ceiling_trap` triggered before on-screen |
| 108–109 | Stacked gravity | `gravity_pulse` zones back-to-back |
| 110 | `BOSS_110` | stacked `gravity_pulse` + `ceiling_trap` |
| 111–112 | Trust erosion | `inverse` + `text_trap` (cap 2/world) + `shift_exit` |
| 113–114 | Blind scroll | `scroll_fake` (cap 1/world) + `fake` |
| 115 | `BOSS_115` | `scroll_fake` + `shifting` + `gravity_pulse` |
| 116–117 | Full gauntlet | multiple trick types per screen, `shift_exit` |
| 118–119 | Endurance gauntlet | dense combinations, off-screen `ceiling_trap` |
| 120 | `BOSS_120` (Final) | all trick types; `shift_exit`. (`level_complete_fake` is whole-game max 1 — used once, at alpha 20.) |

---

## 9. STAR SYSTEM

Stars are awarded per level based on death count during that **run** (not cumulative),
measured against the level's **death PAR** (`level.parDeaths`, ≈ its distinct trick count;
0 for pure-platforming levels). This makes 3★ a fair clean-ish-clear target, not a memorized
0-death run.

| Deaths (relative to PAR) | Stars | Shard Reward |
|---|---|---|
| ≤ `parDeaths` | ★★★ | 250 |
| ≤ `parDeaths + 5` | ★★☆ | 150 |
| more | ★☆☆ | 80 |

> Example: a level introducing 2 tricks → `parDeaths: 2`. ≤2 deaths = 3★, ≤7 = 2★, 8+ = 1★. A pure-platforming level has `parDeaths: 0`, so 3★ there still means a clean (0-death) run — fair, since there is no trick to learn by dying.

- Stars are saved permanently. Higher star count overwrites lower (a worse run never lowers your stars).
- **Star shards pay only the DIFFERENCE on improvement** (implemented in `GameState.saveLevelResult`). 2★→3★ earns `250 − 150 = 100`. A replay that does **not** beat your stored stars earns **0** star-shards — no infinite farming.
- Player always earns at least 1 star for finishing a level.
- **Death shards:** each death this run accumulates `SHARD_PER_DEATH` (2). They are credited on level-complete (`runDeathShards`) and are an intentional repeatable trickle (separate from star shards). The death-overlay "2× SHARD" rewarded ad doubles the run's accumulated death shards, once.
- *Open tuning (see §15):* 3★ requires a 0-death run, which is a memorized-replay target. If playtests show the 3★ chase has no pull (shards buy only cosmetics), add a non-cosmetic 3★ incentive or a per-level death PAR.

---

## 10. SCENES

### 10.1 BootScene

**Purpose:** Init systems, load all assets, go to MenuScene.

**Boot order:**
1. `GameState.init()` (loads/migrates save)
2. `SoundSystem.init(this)` (registers SFX/music; does NOT start audio yet — §13b)
3. `await AdSystem.init(SoundSystem)` (selects provider; awaits SDK init)
4. `AdSystem.loadingStart()` → begin asset load → on Phaser loader `progress`, feed the bar (Poki: also `gameLoadingProgress(p)`) → on `complete`, `AdSystem.loadingStop()`

**Loading screen:**
- Black background
- `CORRUPTED.EXE` text centered, letter-by-letter reveal
- Loading bar below, styled as a terminal progress bar: `[=========>   ] 78%`
- Loads all images, SFX, and music (see §13b for the audio manifest)

**On complete:** `this.scene.start('MenuScene')`

---

### 10.2 MenuScene

**Layout (landscape):**
```
[top area — scrolling log text, small, faded]

      CORRUPTED.EXE
    [  glitch animation  ]

        [ BAŞLAT ]        ← primary CTA, prominent
        [ DÜNYALAR ]
        [ DÜKKAN ]

  [SES]  [MÜZİK]           ← icon buttons, bottom center
```

**Scrolling log background:**  
Terminal text scrolls slowly upward. Contains lore fragments:
- `SIM_ALPHA initializing...`
- `WARNING: containment breach detected`
- `UNIT_7 has escaped test zone`
- `INITIATING PURGE PROTOCOL`

Player doesn't need to read this. It rewards curious players.

**Glitch animation on logo:**  
Every 4–8 seconds (random), logo briefly distorts: offset by 4px, color channel split, then snaps back. Total duration 200ms.

**Scene transitions:**
- BAŞLAT → WorldSelectScene
- DÜNYALAR → WorldSelectScene  
- DÜKKAN → ShopScene
- ⚙ (gear, near SES/MÜZİK) → SettingsScene
- `[SES]` / `[MÜZİK]` icons → toggle `GameState.settings.*` directly (shortcut, no scene change)

---

### 10.3 WorldSelectScene

**Layout (landscape):**
```
[← GERİ]                           [◈ 2,450]

   ┌─────────────────┐    ┌─────────────────────┐
   │   SIM_ALPHA     │    │     SIM_BETA         │
   │  [neon blue]    │    │  [static/locked]     │
   │  12 / 20 done   │    │  [ERİŞİM REDDEDİLDİ] │
   │  ★ 34 total     │    │  tüm ALPHA'yı bitir  │
   │   [ GİR ]       │    │                      │
   └─────────────────┘    └─────────────────────┘
```

**SIM_BETA when locked:**
- Grayscale / desaturated
- Static noise overlay (animated)
- `[ERİŞİM REDDEDİLDİ]` text on button
- Shows unlock condition: "SIM_ALPHA'yı tamamla"

**Scene transitions:**
- GİR → LevelSelectScene (passes world: 'alpha' or 'beta')
- GERİ → MenuScene

---

### 10.4 LevelSelectScene

**Layout (landscape, scrollable):**
```
[← GERİ]    SIM_ALPHA          [◈ 2,450]

  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
  │ERR001│ │ERR002│ │ERR003│ │ERR004│ │BOSS05│
  │ ★★★ │ │ ★★☆ │ │ ★☆☆ │ │ ★★★ │ │[!]☆☆│
  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
  ┌──────┐ ┌──────┐ ┌──────┐ ...
  │ERR006│ │ 🔒  │ │ 🔒  │
  │ ☆☆☆ │ │     │ │     │
  └──────┘ └──────┘ └──────┘
```

**Grid:** 5 columns × 4 rows = 20 cells. Each cell 120×80px. Gap: 8px.

**Cell states:**
- **Completed (1–3 stars):** Normal background + star count
- **Unlocked, not finished:** Normal background + empty stars + highlight border
- **Locked:** Dark overlay + lock icon + grayed text
- **Boss level:** Distinct red border + skull icon in corner

**On cell tap:** Starts GameScene with `{ world, levelIndex }`

**Scroll:** If grid overflows height, enable vertical scroll.

---

### 10.5 GameScene

**Main gameplay scene.** Runs in parallel with UIScene.

**On init:**
```javascript
init(data) {
  this.world = data.world;           // 'alpha' or 'beta'
  this.levelIndex = data.levelIndex;
  this.levelData = /* load from levels_alpha or levels_beta */;
  this.deathCount = 0;
  this.runDeathShards = 0;           // CONFIG.SHARD_PER_DEATH per death; doubled by 2× ad
  this.adShownThisLevel = false;     // mutual-exclusion guard (§12)
  this.levelStartTime = this.time.now; // Phaser clock — for optional speedrun timer
}
```

**On create:**
1. Set world bounds from `levelData.bounds`
2. Set camera bounds
3. Create background (tiled bg_tile image)
4. Build all platforms from `levelData.platforms` via TrickSystem
5. Build all hazards from `levelData.hazards` via TrickSystem
6. Apply env tricks from `levelData.envTricks` (+ `exitShift` if present)
7. Spawn player at `levelData.spawnPoint`, then **apply equipped cosmetics**: `PlayerSystem.applyCosmetics(player, GameState.data.equippedItems)` — sets skin texture and spawns the trail emitter (§11b)
8. Spawn exit door at `levelData.exit`
9. Launch UIScene: `this.scene.launch('UIScene', { gameScene: this })`
10. Call `AdSystem.gameplayStart()`

**On death:**
1. `this.deathCount++`; `this.runDeathShards += CONFIG.SHARD_PER_DEATH`
2. Play the **equipped** death effect: `PlayerSystem.playDeathFx(GameState.getEquipped('deathFx'))` (§11b; `fx_default` = pixel scatter)
3. Camera shake
4. Emit `'playerDied'` event (UIScene listens, updates death counter)
5. Show the in-scene Death Overlay (§10.7). While it's up, `AdSystem.gameplayStop()`
6. On YENİDEN BAŞLAT / after `RESPAWN_DELAY_MS`: reset all trick platforms, respawn player, `AdSystem.gameplayStart()`

**On level complete (player touches exit):**
1. `AdSystem.gameplayStop()`
2. Stop UIScene: `this.scene.stop('UIScene')`
3. Save: `const r = GameState.saveLevelResult(world, levelIndex, deathCount, this.runDeathShards, levelData.parDeaths)` → `r.stars`, `r.shardsEarned`
4. Show Level-Complete overlay FIRST (win + stars + `r.shardsEarned`) — celebration buffer
5. Interstitial gating on the `DEVAM` transition: if `AdSystem` cadence is due AND `!this.adShownThisLevel` AND the run wasn't a high-death slog → `await AdSystem.showInterstitial(); this.adShownThisLevel = true;` then load next level. If the interstitial fired, the overlay's 2× rewarded button is hidden (mutual exclusion, §12).

> **Pause** (from UIScene ⏸): `this.scene.pause('GameScene')` + `AdSystem.gameplayStop()` + `SoundSystem.pauseForMenu()`. Resume reverses all three. Do **not** call gameplayStop on tab blur — the SDK handles focus.

---

### 10.6 UIScene

**Runs parallel to GameScene.** Pure UI overlay — no physics.

**HUD elements (all in landscape layout):**

```
[⏸]  SIM_ALPHA · ERR_007           ÖLÜM: 7           [====------] 55%
```

| Element | Position | Content | Update Trigger |
|---|---|---|---|
| Pause button | Top-left, 40×32px | ⏸ icon | — |
| World · Level | Top-left after pause | `SIM_ALPHA · ERR_007` (3-digit, §8.2) | Once on start |
| Death counter | Top-center | `ÖLÜM: [count]` | `playerDied` event |
| Progress bar | Top-right | Filled bar, % | **distance spawn→exit**, not raw x (levels can scroll/move vertically) — `clamp(distTravelledTowardExit / totalDist)` |

**Mobile touch controls (shown only on touch devices):**

```
Bottom-left: [◀]  [▶]     Bottom-right: [ZIPLAT]
```

Each button: 64×52px, **alpha ~0.35 + thin outline** (findable without occluding hazards), no fill border.  
They sit in the level's `safeZones` (§7) — authoring/validator keeps hazards & tells out of those thumb rectangles so tricks read identically on desktop and mobile.  
Detect touch device: `this.sys.game.device.input.touch || navigator.maxTouchPoints > 0` (also expose a manual toggle in Settings for hybrid laptops).

**Pause overlay:**
When ⏸ pressed — GameScene pauses, audio pauses (`SoundSystem.pauseForMenu()`), `AdSystem.gameplayStop()`, semi-transparent overlay appears; DEVAM ET reverses all three:
```
        [DEVAM ET]
        [YENİDEN BAŞLAT]
        [LEVEL SEÇ]
        [ANA MENÜ]
```

---

### 10.7 Death Overlay

Shown in GameScene (not a separate scene — avoid transition delay).

```
┌─────────────────────────────┐
│  RUNTIME_EXCEPTION          │
│                             │
│  SEGMENTATION_FAULT         │  ← random error code from list
│                             │
│  Bu bölümde ölüm:           │
│         7                   │  ← large, bold (this run's deathCount)
│                             │
│  [YENİDEN BAŞLAT]           │  ← primary, full width
│  [2× SHARD İÇİN İZLE]      │  ← rewarded ad, secondary (gated on CONFIG.SHARD_2X_AD)
│  [LEVEL SEÇ]                │  ← small, tertiary
└─────────────────────────────┘
```

Random error codes pool:
```
SEGMENTATION_FAULT · NULL_REFERENCE · STACK_OVERFLOW · 
ACCESS_VIOLATION · DIVIDE_BY_ZERO · KERNEL_PANIC · 
ILLEGAL_INSTRUCTION · BUS_ERROR · TIMEOUT_EXCEEDED
```

**While shown:** `AdSystem.gameplayStop()` (resume on respawn).  
**Tone softens with deaths:** for `deathCount < MOCKERY_SOFTEN_AFTER` (8) the flavor line is a snarky error code; at 8+ it shifts to an encouraging/helpful line (`HATA ANALİZ EDİLİYOR… denemeye devam`). Keeps charm without turning hostile on hard levels.  
**Off-ramp — paid hint:** once `deathCount >= HINT_PURCHASE_AFTER_DEATHS` (10), show `[İPUCU AL — 50◈]`. On tap: `GameState.spendShards(CONFIG.HINT_PURCHASE_COST)` → `TrickSystem.revealOneTrick()` highlights one trick location for this run. Converts frustration into the shard loop instead of a bounce (no level skip).  
**YENİDEN BAŞLAT:** Respawn in same level, death count continues.  
**2× SHARD İZLE:** `AdSystem.showRewarded(() => { GameState.addShards(this.runDeathShards); markUsed(); })` — doubles the run's accumulated death shards. Reward fires **only if the ad finished** (never on error/no-fill). One-time; button then disabled.  
**LEVEL SEÇ:** Go to LevelSelectScene — this run is not saved (player abandoned).

---

### 10.8 Level Complete Overlay

Shown in GameScene after touching exit.

```
┌─────────────────────────────┐
│  PROCESS_TERMINATED         │
│  ERR_007 — GEÇİLDİ         │
│                             │
│    ★     ★     ☆           │  ← animate one by one, 300ms apart
│                             │
│  En iyi: 3 ölüm             │  ← levelProgress[key].bestDeaths (always numeric here)
│                             │
│  ◈ +120 CORE SHARD          │  ← r.shardsEarned (actual delta; 0 on a non-improving replay)
│                             │
│  [2× SHARD İÇİN İZLE]      │  ← hidden if the interstitial fired this level (§12 mutual excl.)
│  [DEVAM ▶]                  │
│  [LEVEL SEÇ]                │
└─────────────────────────────┘
```

**DEVAM:** Start next level (index + 1). If last level of world: go to WorldSelectScene. Interstitial cadence is checked here (celebration buffer, §12).  
**2× SHARD:** `AdSystem.showRewarded(() => GameState.addShards(r.shardsEarned))` — re-credits the same completion shards, one-time, only if the ad finished.

---

### 10.9 ShopScene

**Layout (landscape):**

```
[← GERİ]    DÜKKAN              [◈ 2,450 CORE SHARD]

[ROBOT SKİN]  [ÖLÜM EFEKTİ]  [TRAIL]      ← tab bar

┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│MODEL │ │ ALTIN│ │GLITCH│ │  ??  │
│ 00   │ │ 300◈ │ │ 500◈ │ │ 🔒  │
│[AKTİF│ │[AL]  │ │[AL]  │ │[???] │
└──────┘ └──────┘ └──────┘ └──────┘
```

**Three tabs:** Robot Skin · Ölüm Efekti · Trail  
Active tab highlighted. Content grid below.

**Item card states:**
- Owned + Equipped: `[AKTİF]` badge, distinct border
- Owned, not equipped: `[KULLAN]` button
- Not owned, affordable: `[AL]` button with shard cost
- Not owned, not affordable: `[AL]` button disabled (grayed)
- Achievement-locked: `[🔒]` with unlock condition tooltip

**Buy/equip flow:** `[AL]` → `GameState.spendShards(cost)` + `unlockItem(id)`. `[KULLAN]` → `GameState.equipItem(slot, id)`. Equipping only WRITES state; the visible result is produced when GameScene reads `equippedItems` and applies them via the cosmetics registry — see **§11b** (required, or purchases have no effect).

---

### 10.10 SettingsScene

**Scene key `'SettingsScene'`.** Reached from MenuScene (gear icon) and the Pause overlay.

```
[← GERİ]    AYARLAR
   SES        [ AÇIK ]   ← toggles GameState.settings.soundEnabled
   MÜZİK      [ AÇIK ]   ← toggles GameState.settings.musicEnabled
   SÜRE       [ KAPALI]  ← showSpeedrunTimer (Open Decision #3 → hidden by default)
   DOKUNMATİK [ OTO ]    ← force touch controls on hybrid laptops
```

Each toggle calls `GameState.setSetting(key, value)` (persists immediately) and, for
audio, `SoundSystem.applySettings()`. The MenuScene `[SES] [MÜZİK]` icons are shortcuts
to the same two flags. Speedrun timer, when on, shows in the HUD (UIScene).

---

## 11. SHOP CATALOGUE

### Robot Skins

| ID | Name | Cost | Unlock Condition | Description |
|---|---|---|---|---|
| `skin_default` | MODEL_00 | Free | Always owned | Default gray robot |
| `skin_gold` | MODEL_AU | 300◈ | Purchase | Gold plating |
| `skin_glitch` | MODEL_GL | 500◈ | Purchase | Glitching pixel body |
| `skin_red` | MODEL_CR | 400◈ | Purchase | Corrupted red variant |
| `skin_ghost` | MODEL_GH | 800◈ | Purchase | Semi-transparent |
| `skin_void` | MODEL_VD | 0◈ | Complete alpha with 0 deaths on any level | Pure black |

### Death Effects (plays when player dies)

| ID | Name | Cost | Description |
|---|---|---|---|
| `fx_default` | SCATTER | Free | Pixel scatter outward |
| `fx_melt` | MELT | 200◈ | Robot melts downward |
| `fx_explode` | EXPLOSIVE_EXIT | 350◈ | Explosive debris burst |
| `fx_glitch` | CORRUPT | 250◈ | Glitch static dissolve |
| `fx_yeet` | YEET | 150◈ | Robot flies off-screen humorously |

### Trail Effects (visible behind player while moving)

| ID | Name | Cost | Description |
|---|---|---|---|
| `trail_none` | NO_TRAIL | Free | No trail |
| `trail_spark` | SPARK | 150◈ | Small sparks |
| `trail_neon` | NEON | 200◈ | Neon light streak |
| `trail_code` | CODE | 300◈ | Falling code characters |
| `trail_fire` | FLAME | 400◈ | Blue pixel fire |

---

## 11b. COSMETICS REGISTRY  *(REQUIRED — without it, purchases have no visible effect)*

**File:** `src/data/cosmetics.js`. Maps every shop item ID to a render config. The shop
only writes `equippedItems`; GameScene/PlayerSystem READ this registry and apply it.
This closes the "sold-but-never-rendered" gap.

```javascript
export const COSMETICS = {
  skins: {
    skin_default: { textureKey: 'robot' },
    skin_gold:    { textureKey: 'robot_gold' },
    skin_glitch:  { textureKey: 'robot_glitch' },
    skin_red:     { textureKey: 'robot_red' },
    skin_ghost:   { textureKey: 'robot', alpha: 0.5 },
    skin_void:    { textureKey: 'robot', tint: 0x000000 },
  },
  deathFx: {                       // emitter/anim presets played by PlayerSystem.playDeathFx
    fx_default: { kind: 'scatter' },
    fx_melt:    { kind: 'melt' },
    fx_explode: { kind: 'explode' },
    fx_glitch:  { kind: 'glitch' },
    fx_yeet:    { kind: 'yeet' },
  },
  trails: {                        // particle emitter configs spawned behind the moving player
    trail_none:  null,
    trail_spark: { texture: 'particle_spark', frequency: 60, lifespan: 250 },
    trail_neon:  { texture: 'particle_spark', tint: 0x00ffff, frequency: 30, lifespan: 350 },
    trail_code:  { texture: 'particle_code',  frequency: 80, lifespan: 400 },
    trail_fire:  { texture: 'particle_spark', tint: 0x3388ff, frequency: 25, lifespan: 300 },
  },
};
```

**PlayerSystem consumption (required methods):**
- `applyCosmetics(player, equipped)` — set `player` texture/alpha/tint from `COSMETICS.skins[equipped.skin]`; spawn (or clear) the trail emitter from `COSMETICS.trails[equipped.trail]` and follow the player while moving.
- `playDeathFx(deathFxId)` — dispatch on `COSMETICS.deathFx[id].kind`. `fx_default`/`scatter` is the existing pixel-scatter; the other four are new presets.

Placeholders for the extra skins/particles can be procedural (tinted rects) until art lands.

---

## 12. AD INTEGRATION

**Files:** `src/systems/ad/AdSystem.js` (facade) · `AdProvider.js` (interface) · `CrazyGamesProvider.js` · `PokiProvider.js`

### Provider abstraction

Scenes only ever call `AdSystem.*`. `AdSystem` delegates to ONE provider chosen at boot, so a Poki build is a provider swap, not a rewrite. Provider is selected by a build flag (`import.meta.env.VITE_AD_PROVIDER`), defaulting to `crazygames`; if no SDK loads (local dev) a NullProvider is used that resolves rewarded ads as **not watched** (no free reward).

```javascript
// AdProvider.js — the interface every provider implements.
// All methods are async and MUST be safe to call with no SDK (resolve gracefully).
export class AdProvider {
  async init() {}
  loadingStart() {}                 // bracket the BootScene asset-loading phase
  loadingStop()  {}
  gameplayStart() {}                // call on every resume (level start, respawn, unpause, post-ad)
  gameplayStop()  {}                // call on every break (pause, death overlay, level-complete, pre-ad)
  async showInterstitial() {}       // returns when the break is over
  async showRewarded() { return false; } // resolves TRUE only if the ad actually finished
}
```

```javascript
// AdSystem.js — provider-agnostic facade. `sound` is the SoundSystem (§13b) for ad muting.
import { CrazyGamesProvider } from './CrazyGamesProvider.js';
import { PokiProvider } from './PokiProvider.js';
import { AdProvider } from './AdProvider.js';

export const AdSystem = {
  provider: new AdProvider(),       // NullProvider behaviour until init() swaps it

  async init(sound) {
    this.sound = sound;
    const choice = import.meta.env?.VITE_AD_PROVIDER ?? 'crazygames';
    const P = choice === 'poki' ? PokiProvider : CrazyGamesProvider;
    try { const p = new P(this.sound); await p.init(); this.provider = p; }
    catch { /* local dev — keep NullProvider */ }
  },

  loadingStart()  { this.provider.loadingStart(); },
  loadingStop()   { this.provider.loadingStop(); },
  gameplayStart() { this.provider.gameplayStart(); },
  gameplayStop()  { this.provider.gameplayStop(); },
  showInterstitial() { return this.provider.showInterstitial(); },
  // onComplete fires ONLY when the ad truly finished (never on error/no-fill/cooldown).
  async showRewarded(onComplete) {
    const watched = await this.provider.showRewarded();
    if (watched) onComplete?.();
    return watched;
  },
};
```

```javascript
// CrazyGamesProvider.js — CrazyGames SDK v3. requestAd is CALLBACK-based, not a Promise.
export class CrazyGamesProvider {
  constructor(sound) { this.sound = sound; this.sdk = null; }

  async init() {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    this.sdk = window.CrazyGames?.SDK;
    await this.sdk.init();            // MUST await — SDK unusable until initialized
  }

  loadingStart()  { this.sdk?.game.loadingStart(); }
  loadingStop()   { this.sdk?.game.loadingStop(); }
  gameplayStart() { this.sdk?.game.gameplayStart(); }   // NOTE: do NOT call on tab focus/blur — SDK handles that
  gameplayStop()  { this.sdk?.game.gameplayStop(); }

  // 'midgame' is the SDK string for an interstitial ('interstitial' is NOT a valid type).
  showInterstitial() {
    if (!this.sdk) return Promise.resolve();
    this.gameplayStop();
    return new Promise((resolve) => {
      this.sdk.ad.requestAd('midgame', {
        adStarted:  () => this.sound?.muteForAd(true),
        adFinished: () => { this.sound?.muteForAd(false); this.gameplayStart(); resolve(); },
        adError:    () => { this.sound?.muteForAd(false); this.gameplayStart(); resolve(); },
      });
    });
  }

  // Resolves TRUE only from adFinished. adError/no-fill/cooldown → FALSE (no reward).
  showRewarded() {
    if (!this.sdk) return Promise.resolve(false);
    this.gameplayStop();
    return new Promise((resolve) => {
      this.sdk.ad.requestAd('rewarded', {
        adStarted:  () => this.sound?.muteForAd(true),
        adFinished: () => { this.sound?.muteForAd(false); this.gameplayStart(); resolve(true); },
        adError:    () => { this.sound?.muteForAd(false); this.gameplayStart(); resolve(false); },
      });
    });
  }
}
```

```javascript
// PokiProvider.js — Poki SDK. Different API + mandatory loading/commercial/rewarded calls.
export class PokiProvider {
  constructor(sound) { this.sound = sound; this.sdk = null; }

  async init() {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    this.sdk = window.PokiSDK;
    await this.sdk.init();
  }

  loadingStart()  { this.sdk?.gameLoadingStart(); }
  loadingStop()   { this.sdk?.gameLoadingFinished(); }   // also feed gameLoadingProgress(0..1) from BootScene
  gameplayStart() { this.sdk?.gameplayStart(); }
  gameplayStop()  { this.sdk?.gameplayStop(); }

  // Poki: commercialBreak() resolves AFTER the break; mute+disable input during it.
  async showInterstitial() {
    if (!this.sdk) return;
    this.gameplayStop(); this.sound?.muteForAd(true);
    await this.sdk.commercialBreak();
    this.sound?.muteForAd(false); this.gameplayStart();
  }

  async showRewarded() {
    if (!this.sdk) return false;
    this.gameplayStop(); this.sound?.muteForAd(true);
    const watched = await this.sdk.rewardedBreak();   // resolves boolean
    this.sound?.muteForAd(false); this.gameplayStart();
    return watched;
  }
}
```

> **Poki note:** Poki mandates ≥2 `commercialBreak()` positions, ≥1 `rewardedBreak()`, and the `gameLoadingStart/Progress/Finished` events; the same call sites used for CrazyGames satisfy these.

### Ad Trigger Points

| Trigger | Ad Type | Notes |
|---|---|---|
| Every `AD_INTERSTITIAL_EVERY_N` level completions | Interstitial (`midgame`) | Check `AdSystem`/`sessionLevelCount` |
| Death overlay → "2× SHARD" button | Rewarded | Doubles death shards accumulated this level (one-time) |
| Level complete overlay → "2× SHARD" button | Rewarded | Doubles completion shards, one-time per level |

**Mutual exclusion (enforced, not just stated):** GameScene keeps a per-level
`adShownThisLevel` flag. On level-complete, the interstitial check runs FIRST;
if it fires, the overlay's 2× rewarded button is **hidden** for that overlay (and
vice-versa). Never show an interstitial AND a rewarded on the same level.

**Celebration buffer:** show the level-complete overlay (win + stars) BEFORE any
interstitial; only fire the interstitial on the `DEVAM` (next-level) transition,
and skip it if the just-finished level had a high death count (avoid stacking
frustration after a hard-won clear).

**Never show ads:**
- During active gameplay
- Immediately on page load
- More than once per level in total (interstitial OR rewarded, not both)

**Always, around every ad:** `gameplayStop()` before / `gameplayStart()` after, and
mute audio on `adStarted`, unmute on `adFinished` AND `adError` (handled by the
providers above). Do NOT add a tab focus/blur handler — the CrazyGames SDK manages
focus pause/mute itself.

---

## 13. PLACEHOLDER SYSTEM

When real art assets are not ready, generate all textures procedurally in BootScene:

```javascript
createPlaceholders() {
  const g = this.make.graphics({ add: false });

  // Robot player
  g.fillStyle(0x00FFFF).fillRect(0, 0, 32, 40);
  g.fillStyle(0x000000).fillRect(8, 8, 8, 8).fillRect(16, 8, 8, 8); // eyes
  g.generateTexture('robot', 32, 40); g.clear();

  // Solid platform
  g.fillStyle(0x334455).fillRect(0, 0, 96, 16);
  g.lineStyle(1, 0x00FFFF, 0.5).strokeRect(0, 0, 96, 16);
  g.generateTexture('platform_solid', 96, 16); g.clear();

  // Fake platform (same look — identical to solid)
  g.fillStyle(0x334455).fillRect(0, 0, 96, 16);
  g.lineStyle(1, 0x00FFFF, 0.5).strokeRect(0, 0, 96, 16);
  g.generateTexture('platform_fake', 96, 16); g.clear();

  // Falling platform (slight orange tint)
  g.fillStyle(0x443300).fillRect(0, 0, 96, 16);
  g.lineStyle(1, 0xFF8800, 0.5).strokeRect(0, 0, 96, 16);
  g.generateTexture('platform_fall', 96, 16); g.clear();

  // Spike real
  g.fillStyle(0xFF2222);
  g.fillTriangle(0, 16, 8, 0, 16, 16);
  g.generateTexture('spike_real', 16, 16); g.clear();

  // Spike safe (same as real — that's the trick)
  g.fillStyle(0xFF2222);
  g.fillTriangle(0, 16, 8, 0, 16, 16);
  g.generateTexture('spike_safe', 16, 16); g.clear();

  // Exit door
  g.fillStyle(0x00FF88).fillRect(0, 0, 32, 48);
  g.fillStyle(0x000000).fillRect(8, 24, 16, 24);
  g.generateTexture('exit_door', 32, 48); g.clear();

  g.destroy();
}
```

---

## 13b. SOUNDSYSTEM  *(v1.1 — SFX + music)*

**File:** `src/systems/SoundSystem.js`. Single audio bus. Honors the §10.10 settings and
the CrazyGames audio rules (mute during ads; start only after first user gesture).

**Audio manifest (events → asset keys; place files in `public/assets/audio/`):**

| Event | Key | Trigger |
|---|---|---|
| Jump | `sfx_jump` | player jump |
| Land | `sfx_land` | player lands |
| Death | `sfx_death` | on death (layer over deathFx) |
| Trick reveal | `sfx_glitch` | fake/falling/hidden-spike reveal |
| Shard | `sfx_shard` | shard credited |
| Button | `sfx_ui` | any UI button |
| Win | `sfx_win` | level complete |
| Music — menu | `mus_menu` | MenuScene (loop) |
| Music — alpha | `mus_alpha` | SIM_ALPHA gameplay (loop) |
| Music — beta | `mus_beta` | SIM_BETA gameplay (loop) |

**API:**
```javascript
export const SoundSystem = {
  unlocked: false,
  init(scene) { /* register all keys; read GameState.settings */ },
  // Web audio must start from a user gesture — bind ONCE to the first pointerdown.
  unlock() { if (this.unlocked) return; this.unlocked = true; this.applySettings(); },
  play(key) { if (this.unlocked && GameState.getSetting('soundEnabled')) /* play SFX */; },
  playMusic(key) { if (GameState.getSetting('musicEnabled')) /* crossfade loop */; },
  muteForAd(on) { /* mute the WHOLE bus during ads; restore prior state when off */ },
  pauseForMenu() { /* pause music + suspend SFX while a menu/pause overlay is up */ },
  applySettings() { /* apply soundEnabled/musicEnabled from GameState.settings */ },
};
```

**Rules:** no audio before `unlock()` (first gesture); `muteForAd(true/false)` driven by the
ad providers (§12); music respects `musicEnabled`, SFX respects `soundEnabled`; both persist
via GameState. *(Build decision: v1 ships SFX **and** music.)*

---

## 14. BUILD ORDER

Follow exactly. Do not proceed to next step until current step works in browser — and
EVERY step has an explicit, observable Test line. GameScene is built **incrementally**:
its §10.5 create() is the final state; early steps stub the not-yet-built calls
(TrickSystem → 08-10/18, UIScene.launch → 14, AdSystem → 20, cosmetics → 17b). Guard each
forward call so earlier steps run (e.g. `AdSystem?.gameplayStart?.()`).

```
STEP 01 — Project scaffold
         Vite + Phaser install. main.js with game config.
         Empty BootScene that logs "boot ok". Test: canvas renders.

STEP 02 — Placeholder assets
         Add createPlaceholders() to BootScene.
         Test: all textures generate, no console errors.

STEP 03 — GameState
         Implement GameState.js fully (deep-clone defaults, deep-merge load, try/catch).
         Test: save → reload → data persists; corrupt the value → boot still loads defaults.

STEP 04 — Player movement (GameScene built incrementally; stub TrickSystem/UIScene/AdSystem)
         Flat floor, robot sprite. Left/right + jump. Gravity.
         Test: player moves, jumps, lands correctly.

STEP 05 — Coyote time + jump buffer
         Add COYOTE_TIME and JUMP_BUFFER.
         Test: jump just after edge works; queued jump fires on land.

STEP 06 — Death system
         Death floor. Death counter. Respawn at spawn point. Camera shake. Freeze frame.
         Test: fall off screen → counter increments → respawn.

STEP 07 — Level data loader + VERTICAL-SLICE SEED
         Create levels_alpha.js with 3 hand-made test levels (mix of solid + the early tricks).
         GameScene reads levelData and builds platforms.
         Test: platforms appear where defined; player can stand on them.

STEP 08 — TrickSystem: fake platform (+ first-encounter hint)
         type 'fake'. No collision. Dev marker behind CONFIG.DEBUG_TRICKS.
         HINT_ON_FIRST_TRICK: on first 'fake' ever, GameState.isFirstEncounter('fake') → show
         one-time hint banner (UIScene).
         Test: player walks through it; flicker visible; hint shows once, never on replay.

STEP 09 — TrickSystem: falling platform
         type 'falling'. Drops after FALL_PLATFORM_DELAY. Resets on death.
         Test: platform drops, player falls, death, platform resets.

STEP 10 — TrickSystem: spike_safe + spike_real
         Identical look; only spike_real kills.
         Test: player dies on real, survives on safe.

STEP 11 — Exit + level-complete LOGIC (no presentation yet)
         Exit collision → GameState.saveLevelResult(world,index,deaths,runDeathShards,parDeaths).
         Test (debug readout): on exit, console/debug-text prints stars=N and shardsEarned;
         deaths ≤ parDeaths → 3★ + 250; replay same level → stars unchanged, shardsEarned=0.

STEP 12 — Death overlay (+ tone softening + paid-hint off-ramp)
         In-scene overlay. Random error code. deathCount shown. gameplayStop while up.
         Tone softens at MOCKERY_SOFTEN_AFTER (8). [İPUCU AL — 50◈] appears at 10 deaths →
         spendShards + TrickSystem.revealOneTrick().
         Test: die → overlay → restart; 2× disabled after one use; at 10 deaths hint button
         charges 50◈ and reveals one trick.

STEP 13 — Level-complete overlay
         Stars animate in sequence. r.shardsEarned shown. DEVAM → next level.
         Test: complete → overlay → next level loads; shardsEarned matches STEP 11.

STEP 13b — ★ VERTICAL-SLICE PLAYTEST GATE (human: Bora)
         Play the 3 test levels end-to-end: menu-less loop play→die→retry→complete→reward→next.
         Decide jump feel + infinite-retry frustration BEFORE authoring 40 levels.
         Test: sign-off that core feel is fun; tune CONFIG physics if not.

STEP 14 — UIScene (HUD)
         Launch parallel. Death counter (event). Progress bar = spawn→exit distance.
         Touch buttons (alpha 0.35) inside safeZones, on touch device.
         Test: die → HUD counter increments live; buttons don't cover hazards.

STEP 15 — MenuScene + SettingsScene
         Menu layout, scrolling log, logo glitch. Gear → SettingsScene; SES/MÜZİK toggle settings.
         Test: all 4 buttons navigate to the correct scene; logo glitches within 8s;
               toggling SES persists across reload.

STEP 16 — WorldSelectScene + LevelSelectScene
         World cards (alpha unlocked, beta locked w/ static). Grid w/ star + lock states.
         Test: level 0 shows UNLOCKED (not locked) on a fresh save; locked level shows lock
               icon and is non-tappable; a 3-star level shows 3 filled stars; tap → correct level.

STEP 17 — ShopScene
         Tabs. Item grid. Purchase (spendShards) + equip (equipItem). Persist.
         Test: buy → shards decrease & persist; equip → AKTİF badge moves.

STEP 17b — Cosmetics consumption (§11b)
         cosmetics.js registry. PlayerSystem.applyCosmetics + playDeathFx.
         Test: equip each skin/trail/deathFx → player VISIBLY changes in GameScene.

STEP 18 — Remaining trick types (one sub-step each, EASY → HARD, each with its own test)
         18a ghost      — Test: invisible until proximity, fades in, solid, never kills.
         18b inverse    — Test: spiky-looking but safe to stand on.
         18c text_trap  — Test: tapping the reassuring text kills; real HUD unaffected.
         18d shift_exit — Test: exit slides on approach; still completes on touch (non-lethal).
         18e ceiling_trap — Test: drops on jump-arc proximity; mistimed jump dies.
         18f gravity_pulse — Test: gravity reverses in zone 1.5s; arrow warning; ceiling-gap death.
         18g scroll_fake — Test: bg scrolls, player.x fixed at wall, contact tell shows, jump clears.
         18h level_complete_fake — Test: fake CONTINUE triggers spike; real exit still completes.
         (Build 18f/18g against the STEP-07 slice so core-controller regressions surface now.)

STEP 19 — Author all 40 levels IN GATED BATCHES (largest, riskiest step)
         Per-level acceptance checklist: spawn→exit provably traversable; every platform/hazard
         within bounds; jump gaps ≤ max jump distance; each trick has its tell; safeZones clear;
         parDeaths set (≈ distinct tricks); hint authored only where a narrative beat is wanted.
         19a alpha 1–5 + BOSS_005  → human playtest sign-off
         19b alpha 6–10 + BOSS_010 → sign-off
         19c alpha 11–15 + BOSS_015 → sign-off
         19d alpha 16–20 + BOSS_020 → sign-off (§8.3)
         19e beta 101–110 (incl. BOSS_105/110) → sign-off (§8.5)
         19f beta 111–120 (incl. BOSS_115/120) → sign-off (§8.5)
         Test (per batch): every level completable start→exit in a manual playthrough.

STEP 20 — Ad integration (provider-agnostic)
         AdSystem facade + AdProvider + CrazyGamesProvider (+ PokiProvider stub). Select via
         VITE_AD_PROVIDER. loadingStart/Stop in BootScene. gameplayStart/Stop on every
         play/break (incl. pause + death + level-complete). Rewarded only credits on adFinished.
         Interstitial 'midgame' every N w/ mutual-exclusion + celebration buffer. Mute on adStarted.
         Test: local (SDK absent) → no free reward, graceful; type='midgame'; reward NOT granted on error.

STEP 21 — Audio (SoundSystem §13b)
         SFX + music. First-pointerdown unlock. muteForAd / pauseForMenu. Honor settings.
         Test: no audio before first click; ad mutes & restores; SES/MÜZİK off silences correctly.

STEP 22 — Polish + performance pass
         Particles per equipped deathFx/trail. Scanline overlay. Cap concurrent emitters.
         Perf budget: 60fps desktop / 30fps+ low-end mobile (profile in DevTools device mode).
         Final build: npm run build. Test: dist/ < 50MB AND 30fps+ on a throttled mobile profile.

STEP 23 — QA / regression pass (after all 40 levels)
         Replay every level + re-verify each trick still fires (late tricks can break early levels).
         Test: full clear of alpha + beta with no broken trick, no off-bounds object, no soft-lock.

STEP 24 — Pre-submit checklist
         [ ] No external login or account system
         [ ] Ad SDK initialized in BootScene (provider-agnostic)
         [ ] loadingStart/loadingStop bracket asset loading
         [ ] gameplayStart/Stop on every play/break (incl. pause, death, level-complete)
         [ ] Rewarded reward granted ONLY on adFinished; never on adError/no-fill
         [ ] Interstitial uses 'midgame'; never stacked with rewarded on the same level
         [ ] Audio muted during ads; audio starts only after first user interaction
         [ ] Equipped cosmetics visibly render; settings (sound/music) persist
         [ ] Mobile touch controls work and don't occlude hazards (DevTools device mode)
         [ ] Scale.FIT works on multiple resolutions; 30fps+ on throttled mobile
         [ ] Build size < 50MB (check dist/ folder)
```

---

## 15. OPEN DECISIONS

### Resolved in v1.1
- **Lethal UI tricks** (`text_trap`, `level_complete_fake`): **kept lethal as designed** (Bora's call). Reconciled with Trick Rule 2 via an explicit no-tell exception (§6.4) + the "REAL UI is inviolable" rule.
- **Mobile fairness margin:** resolved via per-level `safeZones` (§7) + 0.35-alpha controls (§10.6) + Trick Rule 7.
- **Ad timing on a death-heavy loop:** resolved via the celebration buffer + mutual-exclusion guard (§12).
- **Audio scope:** SFX **and** music (§13b).
- **Poki:** kept via the AdProvider abstraction (§12).
- **Shard economy:** difference-only on improvement (§9).

### Resolved — final (v1.1)
1. **Hint enablement → auto on first encounter.** `CONFIG.HINT_ON_FIRST_TRICK`: TrickSystem shows a one-time hint the first time each trick TYPE appears (`GameState.isFirstEncounter`), then never again. Authored per-level `hint` is for extra narrative beats only.
2. **Death loop → infinite retry + softening tone.** Retries stay infinite; the death-overlay flavor shifts from snarky to helpful at `MOCKERY_SOFTEN_AFTER` (8) deaths (§10.7). No death limit.
3. **Speedrun timer → off by default**, toggle in Settings (`settings.showSpeedrunTimer`, §10.10).
4. **Off-ramp → paid hint, no skip.** After `HINT_PURCHASE_AFTER_DEATHS` (10) deaths, the death overlay offers `[İPUCU AL — 50◈]` to reveal one trick location (§10.7). No level skipping.
5. **3★ → per-level death PAR** (`level.parDeaths`, §9): 3★ = ≤ par, 2★ = ≤ par+5, else 1★. 3★ is now a fair clean-ish clear, not a memorized 0-death run.

*All §15 decisions are now resolved — no design blockers remain for implementation.*

---

## 16. v1.1 CHANGELOG

Driven by a multi-lens adversarial review (48 verified findings). Highlights:

**Critical fixes**
- §4 `saveLevelResult`: star shards now pay only the **improvement difference** (was full reward every replay → infinite farm).
- §12 ad API: rewritten to the **callback-based** `requestAd(type, callbacks)` (was `await`-as-Promise → rewarded on every error/no-fill); reward fires only on `adFinished`.

**High**
- §4 `init`: `structuredClone` defaults + deep-merge load + try/catch (save migration / corrupt-save / no-defaults-pollution).
- §11b: new **Cosmetics registry** + PlayerSystem consumption (skins/trails/deathFx were sold but never rendered).
- §13b: new **SoundSystem** (SFX + music, first-gesture unlock, ad mute) — audio was half-specified.
- §12: ad type `'interstitial'` → **`'midgame'`**; loadingStart/Stop added; **AdProvider** abstraction (CrazyGames + Poki).
- §7.1: full **trick data schemas** (envTricks / hidden-spike triggers / ceiling_trap / text_trap / gravity_pulse / scroll_fake / shift_exit / paths) — were prose-only, blocked level authoring.
- §7/§10.6/§6.4: **mobile `safeZones`** so controls don't occlude hazards.
- §14: STEP 19 split into **gated batches** with per-level acceptance + human playtest sign-off.

**Medium / Low**
- Config-driven star tiers; `LEVELS_PER_WORLD` (no hardcoded 20); `getStars` no longer reports level 0 as locked; death-shard accumulator wired; `sessionLevelCount` in-memory.
- §8.2/§8.5: **Beta boss codes + Beta teaching table**.
- §6.2/§6.3: `spike_hidden` made fair (perceptible tell + grace); `scroll_fake` contact tell.
- §10: SettingsScene (§10.10); gameplayStop on pause/death; interstitial+rewarded mutual exclusion; progress bar = spawn→exit distance.
- Consistency: `ERR_0047`→`ERR_007`; robot 32×40; ShopScene/SettingsScene in structure; footer fixed; audio policy unified.
- §14: explicit `Test:` line on every step; STEP 13b vertical-slice playtest; STEP 22 perf budget (30fps+ mobile); STEP 23 regression pass.

**Reviewed & dismissed (false positives):** unlock-source "contradiction" (actually consistent), `bestDeaths:null` display break (no surface reads it), 47/48 death-count "inconsistency" (current vs best are distinct), 0-vs-1-based numbering (reconciled in §8.2), "no vertical slice" (STEP 07–13 is the de-facto slice — now made explicit at 13b).

---

*CORRUPTED.EXE GDD v1.1 — Complete design (SFX + music). Decisions resolved; ready for Claude Opus 4.8 implementation.*
