import { LEVELS_ALPHA } from './levels_alpha.js';
import { LEVELS_BETA } from './levels_beta.js';

export const WORLDS = { alpha: LEVELS_ALPHA, beta: LEVELS_BETA };

export const WORLD_META = {
  alpha: { name: 'SIM_ALPHA', subtitle: 'NEON_BLUE', accent: 0x00ffff },
  beta:  { name: 'SIM_BETA',  subtitle: 'CORRUPT_RED', accent: 0xff3344 },
};

export function getLevels(world) { return WORLDS[world] || []; }
export function getLevel(world, index) { return (WORLDS[world] || [])[index]; }
export function isBossIndex(index) { return (index + 1) % 5 === 0; }
