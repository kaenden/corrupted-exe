// Shop catalogue (GDD §11). `slot` matches GameState.equippedItems keys.
// unlock: 'always' | 'purchase' | 'achievement' (achievement items are earned, not bought).
export const SHOP = {
  skin: {
    slot: 'skin', label: 'SKIN',
    items: [
      { id: 'skin_default', name: 'MODEL_00', cost: 0,   unlock: 'always' },
      { id: 'skin_gold',    name: 'MODEL_AU', cost: 300, unlock: 'purchase' },
      { id: 'skin_glitch',  name: 'MODEL_GL', cost: 500, unlock: 'purchase' },
      { id: 'skin_red',     name: 'MODEL_CR', cost: 400, unlock: 'purchase' },
      { id: 'skin_ghost',   name: 'MODEL_GH', cost: 800, unlock: 'purchase' },
      { id: 'skin_void',    name: 'MODEL_VD', cost: 0,   unlock: 'achievement', hint: 'clear an ALPHA level deathless' },
    ],
  },
  deathFx: {
    slot: 'deathFx', label: 'DEATH FX',
    items: [
      { id: 'fx_default', name: 'SCATTER',        cost: 0,   unlock: 'always' },
      { id: 'fx_melt',    name: 'MELT',           cost: 200, unlock: 'purchase' },
      { id: 'fx_explode', name: 'EXPLOSIVE_EXIT', cost: 350, unlock: 'purchase' },
      { id: 'fx_glitch',  name: 'CORRUPT',        cost: 250, unlock: 'purchase' },
      { id: 'fx_yeet',    name: 'YEET',           cost: 150, unlock: 'purchase' },
    ],
  },
  trail: {
    slot: 'trail', label: 'TRAIL',
    items: [
      { id: 'trail_none',  name: 'NO_TRAIL', cost: 0,   unlock: 'always' },
      { id: 'trail_spark', name: 'SPARK',    cost: 150, unlock: 'purchase' },
      { id: 'trail_neon',  name: 'NEON',     cost: 200, unlock: 'purchase' },
      { id: 'trail_code',  name: 'CODE',     cost: 300, unlock: 'purchase' },
      { id: 'trail_fire',  name: 'FLAME',    cost: 400, unlock: 'purchase' },
    ],
  },
};

export const SHOP_TABS = ['skin', 'deathFx', 'trail'];
