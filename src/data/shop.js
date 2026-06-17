// Shop catalogue (GDD §11). `slot` matches GameState.equippedItems keys.
// unlock: 'always' | 'purchase' | 'achievement' (achievement items are earned, not bought).
export const SHOP = {
  skin: {
    slot: 'skin', label: 'SKIN',
    items: [
      { id: 'skin_default', name: 'MODEL_00', cost: 0,   unlock: 'always',      desc: 'Standard cyan build' },
      { id: 'skin_gold',    name: 'MODEL_AU', cost: 300, unlock: 'purchase',    desc: 'Gilded gold chassis' },
      { id: 'skin_glitch',  name: 'MODEL_GL', cost: 500, unlock: 'purchase',    desc: 'Magenta corruption glitch' },
      { id: 'skin_red',     name: 'MODEL_CR', cost: 400, unlock: 'purchase',    desc: 'Crimson alert unit' },
      { id: 'skin_ghost',   name: 'MODEL_GH', cost: 800, unlock: 'purchase',    desc: 'Translucent phantom shell' },
      { id: 'skin_void',    name: 'MODEL_VD', cost: 0,   unlock: 'achievement', desc: 'Violet void core', hint: 'Clear an ALPHA level deathless' },
    ],
  },
  deathFx: {
    slot: 'deathFx', label: 'DEATH FX',
    items: [
      { id: 'fx_default', name: 'SCATTER',  cost: 0,   unlock: 'always',   desc: 'Pixels scatter outward' },
      { id: 'fx_melt',    name: 'MELT',     cost: 200, unlock: 'purchase', desc: 'Body melts into the floor' },
      { id: 'fx_explode', name: 'OVERLOAD', cost: 350, unlock: 'purchase', desc: 'Violent particle burst' },
      { id: 'fx_glitch',  name: 'CORRUPT',  cost: 250, unlock: 'purchase', desc: 'Dissolves into glitch noise' },
      { id: 'fx_yeet',    name: 'YEET',     cost: 150, unlock: 'purchase', desc: 'Launched clean off-screen' },
    ],
  },
  trail: {
    slot: 'trail', label: 'TRAIL',
    items: [
      { id: 'trail_none',  name: 'NO_TRAIL', cost: 0,   unlock: 'always',   desc: 'No trail' },
      { id: 'trail_spark', name: 'SPARK',    cost: 150, unlock: 'purchase', desc: 'White spark trail' },
      { id: 'trail_neon',  name: 'NEON',     cost: 200, unlock: 'purchase', desc: 'Cyan neon streak' },
      { id: 'trail_code',  name: 'CODE',     cost: 300, unlock: 'purchase', desc: 'Green datastream' },
      { id: 'trail_fire',  name: 'PLASMA',   cost: 400, unlock: 'purchase', desc: 'Blue plasma wake' },
    ],
  },
};

export const SHOP_TABS = ['skin', 'deathFx', 'trail'];
