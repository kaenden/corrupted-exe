// SIM_BETA — 20-level escalation arc (GDD §8.5). Reuses alpha trick types in harder
// combinations: faster platforms, off-screen-ish triggers, stacked gravity, shift_exit on most.
const SZ = [{ x: 0, y: 305, w: 150, h: 100 }, { x: 570, y: 305, w: 150, h: 100 }];
const floor = (x = 0, w = 720) => ({ x, y: 390, w, h: 12, type: 'solid' });
const plat = (x, y, type = 'solid', w = 96) => ({ x, y, w, h: 12, type });
const sr = (x, y = 374) => ({ x, y, type: 'spike_real' });
const ss = (x, y = 374) => ({ x, y, type: 'spike_safe' });
const hidden = (x, y = 378) => ({ x, y, type: 'spike_hidden', trigger: { x: x - 16, y: y - 18, w: 36, h: 30 } });
const FAST = 180; // SHIFT_PLATFORM_SPEED × 1.5

let _i = 0;
const lvl = (o) => {
  const index = _i++;
  const boss = (index + 1) % 5 === 0;
  const n = String(index + 1).padStart(2, '0');
  const code = boss ? `BOSS_1${n}` : `ERR_1${n}`;
  return {
    id: index, world: 'beta', index, code,
    spawnPoint: o.spawn || { x: 64, y: 330 }, deathFloorY: (o.bounds?.height || 405) + 25,
    exit: o.exit, bounds: o.bounds || { width: 720, height: 405 },
    platforms: o.platforms, hazards: o.hazards || [], envTricks: o.env || [],
    paths: o.paths || [], exitShift: o.exitShift ?? { dir: 'left', tiles: 2, triggerX: 600 },
    wrap: o.wrap || false, portals: o.portals || [],
    parDeaths: o.par ?? 2, safeZones: SZ, name: o.name, hint: o.hint || null,
  };
};

export const LEVELS_BETA = [
  lvl({ name: 'REENTRY', par: 1, hint: 'DAHA HIZLI', exit: { x: 660, y: 250 },
    platforms: [floor(0, 200), plat(260, 320, 'fake'), plat(260, 320), plat(400, 290, 'fake'), plat(400, 290), plat(540, 250)], exitShift: null }),
  lvl({ name: 'FAST_LIES', par: 2, exit: { x: 660, y: 260 },
    platforms: [floor(0, 160), { x: 240, y: 320, w: 96, h: 16, type: 'shifting' }, plat(420, 290, 'fake'), plat(420, 290), plat(550, 260)],
    paths: [{ axis: 'h', from: { x: 220, y: 320 }, to: { x: 360, y: 320 }, speed: FAST }] }),
  lvl({ name: 'PRESSURE', par: 2, exit: { x: 660, y: 300 },
    platforms: [floor(0, 160), plat(240, 320, 'falling'), plat(380, 300, 'falling'), floor(520, 200)],
    hazards: [hidden(300), sr(330), sr(360), sr(390)] }),
  lvl({ name: 'UNDERSTEP', par: 2, exit: { x: 660, y: 250 },
    platforms: [floor(0, 200), plat(280, 320), plat(440, 280), plat(560, 250)],
    hazards: [hidden(220), hidden(360, 264), ss(440 - 8, 264)] }),

  lvl({ name: 'CASCADE', par: 3, exit: { x: 670, y: 250 }, // BOSS_105
    platforms: [floor(0, 150), { x: 230, y: 320, w: 96, h: 16, type: 'shifting' }, plat(400, 280, 'falling'), plat(540, 250)],
    paths: [{ axis: 'h', from: { x: 210, y: 320 }, to: { x: 330, y: 320 }, speed: FAST }],
    hazards: [hidden(360, 264)], exitShift: { dir: 'right', tiles: 2, triggerX: 600 } }),

  lvl({ name: 'BLINDSIDE', par: 2, exit: { x: 660, y: 390 },
    platforms: [floor()], hazards: [{ x: 360, y: 70, type: 'ceiling_trap', dropDistance: 64, armProximity: 70 }, ss(250), ss(274), sr(420)] }),
  lvl({ name: 'OVERHEAD', par: 2, exit: { x: 660, y: 260 },
    platforms: [floor(0, 200), plat(280, 320), plat(440, 280), plat(560, 250)],
    hazards: [{ x: 300, y: 70, type: 'ceiling_trap', dropDistance: 60, armProximity: 60 }, { x: 470, y: 70, type: 'ceiling_trap', dropDistance: 60, armProximity: 60 }] }),
  lvl({ name: 'DOUBLE_DOWN', par: 3, hint: 'YERÇEKİMİ İSTİFLENDİ', exit: { x: 660, y: 120 },
    platforms: [floor(0, 200), plat(300, 110), plat(440, 110), plat(580, 110)],
    env: [{ type: 'gravity_pulse', zone: { x: 230, y: 130, w: 60, h: 260 }, duration: 1400, arrowDir: 'up' }, { type: 'gravity_pulse', zone: { x: 470, y: 130, w: 60, h: 260 }, duration: 1400, arrowDir: 'up' }] }),
  lvl({ name: 'STACKED', par: 3, exit: { x: 660, y: 120 },
    platforms: [floor(0, 180), plat(280, 110), plat(420, 110), plat(560, 110), plat(470, 300, 'fake'), plat(470, 300)],
    env: [{ type: 'gravity_pulse', zone: { x: 220, y: 130, w: 60, h: 260 }, duration: 1400, arrowDir: 'up' }, { type: 'gravity_pulse', zone: { x: 380, y: 60, w: 60, h: 320 }, duration: 1300, arrowDir: 'down' }] }),

  lvl({ name: 'MELTDOWN', par: 3, exit: { x: 670, y: 120 }, // BOSS_110
    platforms: [floor(0, 180), plat(300, 110), plat(450, 110), plat(580, 110)],
    hazards: [{ x: 360, y: 70, type: 'ceiling_trap', dropDistance: 50, armProximity: 60 }],
    env: [{ type: 'gravity_pulse', zone: { x: 230, y: 130, w: 60, h: 260 }, duration: 1400, arrowDir: 'up' }, { type: 'gravity_pulse', zone: { x: 480, y: 130, w: 60, h: 260 }, duration: 1300, arrowDir: 'up' }],
    exitShift: { dir: 'left', tiles: 3, triggerX: 600 } }),

  lvl({ name: 'DOUBT', par: 2, exit: { x: 660, y: 260 },
    platforms: [floor(0, 220), { x: 300, y: 330, type: 'inverse', w: 160 }, plat(540, 260)],
    hazards: [{ x: 360, y: 180, type: 'text_trap', message: 'EXIT VERIFIED', w: 130, h: 24 }, sr(250), ss(274)] }),
  lvl({ name: 'TWO_FACED', par: 2, exit: { x: 660, y: 250 },
    platforms: [floor(0, 200), plat(280, 320, 'fake'), plat(280, 320), { x: 420, y: 290, type: 'inverse', w: 96 }, plat(560, 250)],
    hazards: [{ x: 300, y: 180, type: 'text_trap', message: 'THIS PLATFORM IS STABLE', w: 180, h: 24 }] }),
  lvl({ name: 'PHASE', par: 3, hint: 'KAPIYI BUL', bounds: { width: 1120, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1070, y: 390 },
    // Portal puzzle (beta): unjumpable gap crossed by a portal + a hidden spike + a ceiling trap.
    platforms: [floor(0, 460), floor(660, 460), plat(840, 300, 'solid', 80)],
    hazards: [hidden(220), { x: 470, y: 70, type: 'ceiling_trap', dropDistance: 60, armProximity: 60 }],
    portals: [{ a: { x: 420, y: 374 }, b: { x: 720, y: 374 } }], exitShift: null }),
  lvl({ name: 'NULL_SPACE', par: 3, exit: { x: 670, y: 250 },
    platforms: [floor(0, 200), plat(300, 320, 'ghost'), plat(450, 290, 'ghost'), plat(560, 250)],
    hazards: [hidden(240)],
    env: [{ type: 'scroll_fake', wallX: 200, hint: 'GEÇERSİZ KOORDİNAT — ATLA' }] }),

  lvl({ name: 'EVENT_HORIZON', par: 4, exit: { x: 670, y: 120 }, // BOSS_115
    platforms: [floor(0, 150), { x: 230, y: 320, w: 96, h: 16, type: 'shifting' }, plat(420, 110), plat(560, 110)],
    paths: [{ axis: 'h', from: { x: 210, y: 320 }, to: { x: 320, y: 320 }, speed: FAST }],
    env: [{ type: 'scroll_fake', wallX: 160, hint: 'GEÇERSİZ KOORDİNAT — ATLA' }, { type: 'gravity_pulse', zone: { x: 360, y: 130, w: 60, h: 260 }, duration: 1400, arrowDir: 'up' }],
    exitShift: { dir: 'left', tiles: 3, triggerX: 600 } }),

  lvl({ name: 'OVERCLOCK', par: 3, exit: { x: 670, y: 250 },
    platforms: [floor(0, 140), { x: 220, y: 320, w: 96, h: 16, type: 'shifting' }, { x: 400, y: 280, w: 96, h: 16, type: 'shifting' }, plat(560, 250)],
    paths: [{ axis: 'h', from: { x: 200, y: 320 }, to: { x: 320, y: 320 }, speed: FAST }, { axis: 'v', from: { x: 400, y: 300 }, to: { x: 400, y: 200 }, speed: FAST }],
    hazards: [hidden(170)] }),
  lvl({ name: 'CHAOS_1', par: 4, exit: { x: 670, y: 300 },
    platforms: [floor(0, 140), plat(200, 330, 'fake'), plat(200, 330), plat(340, 300, 'falling'), plat(480, 280, 'ghost'), floor(580, 140)],
    hazards: [hidden(160), { x: 440, y: 70, type: 'ceiling_trap', dropDistance: 50, armProximity: 55 }, ss(500, 264)] }),
  lvl({ name: 'CHAOS_2', par: 4, exit: { x: 670, y: 120 },
    platforms: [floor(0, 160), { x: 240, y: 320, w: 96, h: 16, type: 'shifting' }, plat(420, 110), plat(560, 110)],
    paths: [{ axis: 'h', from: { x: 220, y: 320 }, to: { x: 340, y: 320 }, speed: FAST }],
    hazards: [hidden(190)],
    env: [{ type: 'gravity_pulse', zone: { x: 360, y: 130, w: 60, h: 260 }, duration: 1300, arrowDir: 'up' }, { type: 'scroll_fake', wallX: 180, hint: 'GEÇERSİZ KOORDİNAT — ATLA' }] }),
  lvl({ name: 'ENDURANCE', par: 4, exit: { x: 670, y: 250 },
    platforms: [floor(0, 140), plat(200, 330, 'falling'), plat(330, 300, 'falling'), plat(460, 280, 'falling'), plat(580, 250)],
    hazards: [sr(180, 374), sr(230, 374), sr(280, 374), sr(330, 374), hidden(560, 364)] }),

  lvl({ name: 'TOTAL_CORRUPTION', par: 5, hint: 'TEŞHİS: SİSTEM SANA YALAN SÖYLÜYOR', exit: { x: 670, y: 250 }, // BOSS_120 (final)
    platforms: [floor(0, 140), plat(200, 330, 'fake'), plat(200, 330), plat(340, 300, 'falling'), plat(470, 270, 'ghost'), { x: 560, y: 250, w: 96, h: 16, type: 'solid' }],
    hazards: [hidden(160), sr(310, 374), ss(334, 374), { x: 300, y: 70, type: 'ceiling_trap', dropDistance: 60, armProximity: 60 }],
    env: [{ type: 'gravity_pulse', zone: { x: 240, y: 130, w: 60, h: 200 }, duration: 1300, arrowDir: 'up' }],
    exitShift: { dir: 'left', tiles: 3, triggerX: 600 } }),
];
