// CORRUPTED.EXE — all tuning values live here (GDD §3). Never hardcode numbers elsewhere.

// RELEASE_BUILD = the real portal release (npm run build:cg / build:poki set VITE_AD_PROVIDER).
// Those builds are LOCKED + free of every dev affordance. EVERY other build — `npm run dev` AND the
// plain `npm run build` that GitHub Pages auto-deploys (our QA mirror) — stays UNLOCKED + debuggable.
// So the public GitHub Pages site keeps full unlock/skip/window.game for testing; only the CrazyGames
// upload is clean. (build:cg bakes VITE_AD_PROVIDER='crazygames'; plain build leaves it unset.)
export const RELEASE_BUILD =
  import.meta.env.VITE_AD_PROVIDER === 'crazygames' ||
  import.meta.env.VITE_AD_PROVIDER === 'poki' ||
  import.meta.env.VITE_AD_PROVIDER === 'playgama';

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
  SPIKE_BLINK_WARN: 620,      // ms the hidden spike SLOWLY emerges (non-lethal) before it strikes — a
                              // fair, readable telegraph: you watch it rise out of its socket and step away
  SPIKE_LETHAL_MS: 600,       // ms the hidden spike stays up + lethal after striking, then retracts
  GHOST_PROXIMITY: 60,        // px fade-in radius for ghost platforms
  GRAVITY_PULSE_ACCEL: 260,   // net UPWARD accel during a gravity pulse (gentle float, not a rocket)

  // Camera
  CAMERA_SHAKE_DEATH: { duration: 200, intensity: 0.012 },
  CAMERA_SHAKE_TRICK: { duration: 100, intensity: 0.006 },

  // Death
  DEATH_FREEZE_MS: 180,       // brief freeze frame on death (snappy — death must be cheap to be tolerable)
  RESPAWN_DELAY_MS: 480,      // total delay from death to respawn (FX still reads, but you're back fast)

  // Economy — calibrated to the shop (~5100 shards of items). A clean 3★ run of the whole 60-level
  // campaign (×2 with the bonus claim) roughly funds the shop; without the bonus it funds ~half, so
  // cosmetics are a real goal, not unlocked in 2-3 levels. Star shards pay only the IMPROVEMENT
  // difference (no replay farm), so 3★ (skill) is rewarded over scraping 1★.
  SHARD_PER_DEATH: 1,         // small pity shard per death this run (paid on complete; doubled by 2× ad)
  SHARD_PER_STAR: { 1: 12, 2: 25, 3: 45 },
  SHARD_2X_AD: true,

  // Stars — per-level death PAR (level.parDeaths). 3★: <=par · 2★: <=par+margin · else 1★.
  STAR_TWO_MARGIN: 5,

  // Onboarding / fairness off-ramp
  // OFF: mechanics teach by design now (L1 honest-lie, spike telegraphs, self-evident wall), and the
  // auto-hint would fire on L1's fake and spoil the game's whole first "aha". Levels that still want a
  // one-liner set their own `hint`. The help-when-stuck purchase off-ramp (below) is untouched.
  HINT_ON_FIRST_TRICK: false,
  HINT_PURCHASE_AFTER_DEATHS: 10,
  HINT_PURCHASE_COST: 25,     // help-when-stuck off-ramp — kept cheap vs the leaner economy
  MOCKERY_SOFTEN_AFTER: 8,

  // World layout (single source of truth)
  LEVELS_PER_WORLD: 30,

  // Per-chapter neon color (each 5-level chapter gets its own vivid accent — "Q Neon" reference)
  CHAPTER_COLORS: [0x00ffff, 0xff3df0, 0x8cff3d, 0xffb13d, 0x9b6bff, 0xff5a4d, 0x3df0ff, 0xffe24a],

  // ENDLESS (Escape) — tuned SEPARATELY from the campaign chase for a faster, tactical "flow/action"
  // feel. The wall ramps over distance; collecting corruption-BUGS buys breathing room, so the run is a
  // push-your-luck flow (grab the slower / risk the gap) instead of a flat damage-race.
  ESCAPE: {
    WALL_BASE: 150,          // px/s at the start
    WALL_MAX: 210,           // px/s at full ramp
    RAMP_DIST: 9000,         // px over which the wall accelerates BASE→MAX
    HEAD_START: 300,         // px runway before the wall becomes a threat
    MAX_GAP: 380,            // RUBBER-BAND: the wall never falls further than this behind the player, so
                             // it stays a visible, looming threat instead of being outrun off-screen
    LAUNCH_VY: -560,         // upward velocity a launch pad gives (reach a higher path / clear a big gap)
    SPECIAL_CHANCE: 52,      // % of post-runway chunks that use a special pattern (launch/portal/ghost/crumble)
    UPGRADE_SLOW: 0.06,      // wall slowdown per backdoor 'slow' upgrade level (capped 0.40)
    BUG_SLOW_MS: 1900,       // how long a collected corruption-BUG slows the wall
    BUG_SLOW_FACTOR: 0.30,   // wall speed multiplier while a bug-slow is active (70% slow)
    BUG_CHANCE: 30,          // % chance a generated chunk drops a corruption-BUG pickup
    CRUMBLE_CHANCE: 15,      // % chance a (non-spiked, wide) platform CRUMBLES — collapses shortly after contact
    GATE_SLOW_MS: 900,       // banking a gate briefly slows the wall (reward for reaching it)
  },

  // Ads — retention first, revenue second. (Platforms ALSO auto-throttle: CrazyGames max 1/3min.)
  AD_INTERSTITIAL_EVERY_N: 5,    // signal a midgame opportunity every N completions (first at level N → clean start)
  AD_SKIP_IF_DEATHS_OVER: 5,     // never show a midgame right after a frustrating, high-death clear

  // Unlock-all + N/P/R skip keys: ON for dev AND the GitHub Pages QA mirror, OFF only in the portal
  // release build (build:cg). No manual flag — driven off RELEASE_BUILD above (tree-shaken in release).
  DEV_UNLOCK_ALL: !RELEASE_BUILD,
  // TEMPORARY (video capture on the live GitHub Pages site): hide the on-screen "DEV: N→next…" hint so
  // nothing dev appears in the recording, while keeping unlock-all + N/P/R navigation (both invisible)
  // so any level / endless / skin can be reached for the shots. Set back to false after recording.
  CAPTURE_MODE: false,
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
