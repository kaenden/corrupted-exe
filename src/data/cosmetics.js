// Maps shop item IDs → render config (GDD §11b). Shop only writes equippedItems;
// PlayerSystem READS this registry and applies it. Without it, purchases are invisible.
export const COSMETICS = {
  // Neon-square player: each skin is a glowing color (the player is drawn as a shape now).
  skins: {
    skin_default: { color: 0xffb43b },             // amber — pops against the cyan world
    skin_gold:    { color: 0xffd24a },             // gold
    skin_glitch:  { color: 0xff3df0 },             // magenta glitch
    skin_red:     { color: 0xff4d4d },             // red
    skin_ghost:   { color: 0xbfffff, alpha: 0.55 }, // pale translucent
    skin_void:    { color: 0x9b6bff },             // violet
  },
  deathFx: {
    fx_default: { kind: 'scatter' },
    fx_melt:    { kind: 'melt' },
    fx_explode: { kind: 'explode' },
    fx_glitch:  { kind: 'glitch' },
    fx_yeet:    { kind: 'yeet' },
  },
  trails: {
    trail_none:  null,
    trail_spark: { texture: 'particle_spark', frequency: 60, lifespan: 250 },
    trail_neon:  { texture: 'particle_spark', tint: 0x00ffff, frequency: 30, lifespan: 350 },
    trail_code:  { texture: 'particle_spark', tint: 0x00ff88, frequency: 80, lifespan: 400 },
    trail_fire:  { texture: 'particle_spark', tint: 0x3388ff, frequency: 25, lifespan: 300 },
  },
};
