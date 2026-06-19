// Shop catalogue (GDD §11). `slot` matches GameState.equippedItems keys.
// unlock: 'always' | 'purchase' | 'achievement' (achievement items are earned, not bought).
export const SHOP = {
  skin: {
    slot: 'skin', label: 'SKIN',
    items: [
      { id: 'skin_default', name: 'AMBER',   cost: 0,   unlock: 'always',      desc: 'Standard amber core' },
      { id: 'skin_gold',    name: 'SOLAR',    cost: 300, unlock: 'purchase',    desc: 'Molten gold plating' },
      { id: 'skin_glitch',  name: 'PRISM',    cost: 650, unlock: 'purchase',    desc: 'Shifts through every colour' },
      { id: 'skin_red',     name: 'EMBER',    cost: 400, unlock: 'purchase',    desc: 'Burning orange-red shell' },
      { id: 'skin_ghost',   name: 'PHANTOM',  cost: 800, unlock: 'purchase',    desc: 'Half-rendered, translucent' },
      { id: 'skin_void',    name: 'VOID',     cost: 0,   unlock: 'achievement', desc: 'Violet void core', hint: 'Clear an ALPHA level deathless' },
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
      { id: 'fx_nova',    name: 'NOVA',     cost: 500, unlock: 'purchase', desc: 'Bright shock-ring detonation' },
    ],
  },
  trail: {
    slot: 'trail', label: 'TRAIL',
    items: [
      { id: 'trail_none',  name: 'NO_TRAIL', cost: 0,   unlock: 'always',   desc: 'No trail' },
      { id: 'trail_spark', name: 'SPARK',    cost: 150, unlock: 'purchase', desc: 'White spark wake' },
      { id: 'trail_neon',  name: 'NEON',     cost: 200, unlock: 'purchase', desc: 'Cyan neon streak' },
      { id: 'trail_code',  name: 'CODE',     cost: 300, unlock: 'purchase', desc: 'Falling green datastream' },
      { id: 'trail_fire',  name: 'PLASMA',   cost: 400, unlock: 'purchase', desc: 'Violet plasma wake' },
      { id: 'trail_ember', name: 'EMBER',    cost: 450, unlock: 'purchase', desc: 'Orange sparks that rise' },
    ],
  },
};

export const SHOP_TABS = ['skin', 'deathFx', 'trail'];
