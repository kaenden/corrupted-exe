// CORRUPTED.EXE — all tuning values live here (GDD §3). Never hardcode numbers elsewhere.
export const CONFIG = {
  // Canvas — logical coords stay 720×405; the canvas is rendered at RENDER_SCALE× (HD)
  // and each scene's camera zooms by RENDER_SCALE, so vector shapes/text stay crisp.
  WIDTH: 720,
  HEIGHT: 405,
  RENDER_SCALE: 2,   // 720×405 logical → 1440×810 crisp backing buffer
  IS_MOBILE: false,  // set true at boot on touch devices → gentler tune (wider platforms, smaller spikes)

  // Player physics
  PLAYER_SPEED: 225,          // px/s horizontal
  PLAYER_JUMP_VELOCITY: -480, // negative = upward
  PLAYER_GRAVITY: 1100,       // px/s² (snappier fall)
  PLAYER_MAX_FALL: 1350,      // px/s terminal fall speed
  COYOTE_TIME: 80,            // ms — can jump after leaving platform edge
  JUMP_BUFFER: 100,           // ms — jump input buffered before landing

  // Platform / hazard timing
  FALL_PLATFORM_DELAY: 800,   // ms before a falling platform drops
  FAKE_PLATFORM_REVEAL: 200,  // ms flicker on fake-platform contact
  SHIFT_PLATFORM_SPEED: 120,  // px/s for moving platforms
  SPIKE_BLINK_WARN: 450,      // ms warning before a hidden spike emerges (Alpha; Beta may tighten)
  GHOST_PROXIMITY: 60,        // px fade-in radius for ghost platforms
  GRAVITY_PULSE_ACCEL: 260,   // net UPWARD accel during a gravity pulse (gentle float, not a rocket)

  // Camera
  CAMERA_SHAKE_DEATH: { duration: 200, intensity: 0.012 },
  CAMERA_SHAKE_TRICK: { duration: 100, intensity: 0.006 },

  // Death
  DEATH_FREEZE_MS: 400,       // freeze frame on death
  RESPAWN_DELAY_MS: 880,      // total delay from death to respawn (lets the death FX play out)

  // Economy
  SHARD_PER_DEATH: 2,         // shards accrued per death this run (paid on complete; doubled by 2× ad)
  SHARD_PER_STAR: { 1: 80, 2: 150, 3: 250 },
  SHARD_2X_AD: true,

  // Stars — per-level death PAR (level.parDeaths). 3★: <=par · 2★: <=par+margin · else 1★.
  STAR_TWO_MARGIN: 5,

  // Onboarding / fairness off-ramp
  HINT_ON_FIRST_TRICK: true,
  HINT_PURCHASE_AFTER_DEATHS: 10,
  HINT_PURCHASE_COST: 50,
  MOCKERY_SOFTEN_AFTER: 8,

  // World layout (single source of truth)
  LEVELS_PER_WORLD: 30,

  // Per-chapter neon color (each 5-level chapter gets its own vivid accent — "Q Neon" reference)
  CHAPTER_COLORS: [0x00ffff, 0xff3df0, 0x8cff3d, 0xffb13d, 0x9b6bff, 0xff5a4d, 0x3df0ff, 0xffe24a],

  // Ads — retention first, revenue second. (Platforms ALSO auto-throttle: CrazyGames max 1/3min.)
  AD_INTERSTITIAL_EVERY_N: 5,    // signal a midgame opportunity every N completions (first at level N → clean start)
  AD_SKIP_IF_DEATHS_OVER: 5,     // never show a midgame right after a frustrating, high-death clear

  // Dev affordances are driven off the BUILD MODE — no manual flag to flip before release.
  // Vite inlines `import.meta.env.DEV` as `true` under `npm run dev` and statically `false`
  // under `vite build` (the dead branches are then tree-shaken out of the production bundle).
  DEV_UNLOCK_ALL: import.meta.env.DEV,  // dev: unlock all worlds/levels + N/P/R skip keys · prod: locked progression
  DEBUG_SKIP_MENU: false,     // dev-only (gated): boot straight into DEBUG_START instead of MenuScene
  DEBUG_START: { world: 'alpha', levelIndex: 0 },
};

// Palette (GDD §1 visual language) — used by placeholder generation + UI.
export const COLORS = {
  bg: 0x05070d,
  cyan: 0x00ffff,
  cyanDim: 0x0a3a44,
  platform: 0x334455,
  platformFall: 0x443300,
  fallEdge: 0xff8800,
  red: 0xff2222,
  green: 0x00ff88,
  white: 0xffffff,
  void: 0x000000,
};
