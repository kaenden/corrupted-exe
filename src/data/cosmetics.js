// Maps shop item IDs → render config. Shop only writes equippedItems; PlayerSystem READS this and
// applies it. Refreshed to match the current neon look (vivid skins incl. an animated PRISM, trails
// with their own colour + motion, and richer death effects).
export const COSMETICS = {
  // Player head tint (the big-head robot). `anim:'prism'` cycles hue every frame.
  skins: {
    skin_default: { color: 0xffb43b },                  // AMBER
    skin_gold:    { color: 0xffd24a },                  // SOLAR
    skin_glitch:  { color: 0xff3df0, anim: 'prism' },   // PRISM — shifts through the spectrum
    skin_red:     { color: 0xff5a3b },                  // EMBER
    skin_ghost:   { color: 0xcfffff, alpha: 0.5 },      // PHANTOM
    skin_void:    { color: 0x9b6bff },                  // VOID
  },
  deathFx: {
    fx_default: { kind: 'scatter' },
    fx_melt:    { kind: 'melt' },
    fx_explode: { kind: 'explode' },
    fx_glitch:  { kind: 'glitch' },
    fx_yeet:    { kind: 'yeet' },
    fx_nova:    { kind: 'nova' },     // bright expanding shock-ring + burst
  },
  // Each trail now carries its OWN colour + behaviour (read in PlayerSystem.applyCosmetics).
  trails: {
    trail_none:  null,
    trail_spark: { tint: 0xffffff, frequency: 24, lifespan: 300, scale: 0.55, alpha: 0.6 },
    trail_neon:  { tint: 0x2affff, frequency: 22, lifespan: 430, scale: 0.62, alpha: 0.7 },
    trail_code:  { tint: 0x00ff88, frequency: 30, lifespan: 470, scale: 0.5, alpha: 0.6, gravityY: 150 },
    trail_fire:  { tint: 0x9b6bff, frequency: 20, lifespan: 520, scale: 0.72, alpha: 0.6 },           // PLASMA
    trail_ember: { tint: 0xff7a3b, frequency: 26, lifespan: 430, scale: 0.58, alpha: 0.7, gravityY: -130 }, // EMBER (rises)
  },
};
