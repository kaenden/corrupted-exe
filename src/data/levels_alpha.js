// SIM_ALPHA — 30-level campaign. Difficulty-WEIGHTED, tier-based design (genre research:
// Cat Mario / Trap Adventure 2 / IWBTG / Celeste / Super Meat Boy). Goal: hook → challenge → WOW.
//
// JUMP ENVELOPE (max horizontal reach at a given RISE): Δy0→180 · Δy40→175 · Δy70→155 ·
//   Δy90→135 · Δy100→120 · Δy>105 IMPOSSIBLE. Going DOWN reaches further. Floor top y=390.
//
// TRAP WEIGHTS (mental + execution load, 1 trivial → 5 brutal):
//   solid/spike_real 1 · inverse/spike_safe/falling/gravity_pulse 2 · shifting/ghost/scroll_fake/fake 3
//   · spike_hidden/ceiling_trap/portal/exitShift 4 · level_complete_fake 5
//   (two traps that INTERACT count as +bonus, not just sum.)
// TIERS (sum of weights per level):
//   A 1-11  "fun warm-up"      sum 3-7,  max 2-3, 1-2 distinct, ~no combos (teach→test, difficulty-saw)
//   B 12-20 "maddening doubles" sum 8-14, max 4,  3-4 distinct, 2 linked sequences
//   C 21-30 "hard thinkers"    sum 15-22, max 5,  4-6 distinct, 3 linked; the goal itself can be a trap
// VARIETY: no trap type in >2 consecutive levels; every level mixes BOTH axes (looks-safe-isn't +
//   looks-deadly-isn't); ration signatures (level_complete_fake ≤2 total, exitShift ≤1/5 levels).
// PLAYTEST CALIBRATION: portal / fake / gravity_pulse / exitShift read as LOW alone — never ship
//   them solo; pair each with ≥1 companion trap. Float levels want an upper-ground hazard (stress).
// NEW-TRAP BACKLOG (engine work, not yet built): Mimic Exit, Reverse-Gravity Lip, Decay Spikes,
//   Lure Coin, Echo Platform, Slow Floor. Finale (30) = "Liar's Gauntlet": every trick flipped.
const SZ = [{ x: 0, y: 305, w: 150, h: 100 }, { x: 570, y: 305, w: 150, h: 100 }];
const floor = (x = 0, w = 720) => ({ x, y: 390, w, h: 12, type: 'solid' });
const plat = (x, y, type = 'solid', w = 96) => ({ x, y, w, h: 12, type });
const sr = (x, y = 374) => ({ x, y, type: 'spike_real' });
const ss = (x, y = 374) => ({ x, y, type: 'spike_safe' });
const hidden = (x, y = 378) => ({ x, y, type: 'spike_hidden', trigger: { x: x - 16, y: y - 18, w: 36, h: 30 } });

let _i = 0;
const lvl = (o) => {
  const index = _i++;
  const boss = (index + 1) % 5 === 0;
  const code = boss ? `BOSS_0${String(index + 1).padStart(2, '0')}` : `ERR_0${String(index + 1).padStart(2, '0')}`;
  return {
    id: index, world: 'alpha', index, code,
    spawnPoint: o.spawn || { x: 64, y: 330 }, deathFloorY: (o.bounds?.height || 405) + 25,
    exit: o.exit, bounds: o.bounds || { width: 720, height: 405 },
    platforms: o.platforms, hazards: o.hazards || [], envTricks: o.env || [],
    paths: o.paths || [], exitShift: o.exitShift || null, wrap: false, portals: o.portals || [],
    chase: o.chase || null, noChase: o.noChase || false, bugs: o.bugs || [], backdoorKeys: o.backdoorKeys || [],
    parDeaths: o.par ?? 0, safeZones: SZ, name: o.name, hint: o.hint || null,
  };
};

export const LEVELS_ALPHA = [
  // ── CHAPTER 1 (cyan) ── single trick, gaps near the jump limit (~170px); forgiving floors
  // 1 — pure: real ~175px jumps; the full floor catches misses
  lvl({ name: 'BOOT_SEQUENCE', par: 0, hint: 'TRUST NOTHING', exit: { x: 660, y: 256 }, noChase: true,
    platforms: [floor(),
      plat(200, 338, 'solid', 54), plat(378, 300, 'solid', 50), plat(556, 300, 'solid', 50), plat(626, 256, 'solid', 70)] }),
  // 2 — VERTICAL climb: alternate long-flat and steep-up jumps to a high exit (still no wall — learning)
  lvl({ name: 'WARM_RESET', par: 1, hint: 'CLIMB', exit: { x: 335, y: 130 }, noChase: true,
    platforms: [floor(),
      plat(170, 338, 'solid', 56), plat(345, 302, 'solid', 50), plat(440, 246, 'solid', 48),
      plat(575, 212, 'solid', 60), plat(455, 162, 'solid', 48), plat(300, 130, 'solid', 70)] }),
  // 3 — FAKE (single): the obvious low step is fake; the real sits just above. The wall AWAKENS here (gentle).
  lvl({ name: 'FALSE_FOOTING', par: 1, hint: 'FALSE FLOOR :: DO NOT TRUST', exit: { x: 660, y: 258 },
    chase: { speed: 72, headStart: 330, delay: 2600 },
    platforms: [floor(),
      plat(180, 336, 'solid', 52), plat(340, 326, 'fake', 50), plat(340, 290, 'solid', 50),
      plat(505, 290, 'solid', 50), plat(625, 258, 'solid', 64)] }),
  // 4 — FAKE gauntlet (WIDE): at each stop the LOW platform is fake, the higher one real — read & climb-right
  lvl({ name: 'MIRAGE', par: 2, hint: 'THE HIGHER ONE IS REAL', bounds: { width: 1260, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1210, y: 330 },
    platforms: [floor(0, 250),
      plat(330, 326, 'fake', 56), plat(330, 292, 'solid', 56),
      plat(500, 300, 'solid', 60),
      plat(670, 326, 'fake', 56), plat(670, 292, 'solid', 56),
      plat(840, 300, 'solid', 60),
      floor(1010, 250)] }),
  // 5 — BOSS (falling, WIDE): a collapsing-platform sprint over a long death pit — no rest
  lvl({ name: 'COLLAPSE', par: 3, hint: 'FLOOR COLLAPSING :: FAST', bounds: { width: 1420, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1370, y: 330 },
    platforms: [floor(0, 200),
      plat(280, 330, 'falling', 60), plat(440, 316, 'falling', 60), plat(600, 330, 'falling', 60),
      plat(760, 316, 'falling', 60), plat(920, 330, 'falling', 60),
      floor(1080, 340)] }),

  // ── CHAPTER 2 (magenta) ── single trick, medium-wide gaps, less forgiving (pits)
  // 6 — SPIKE_SAFE field (WIDE): walk the deadly-LOOKING safe spikes, jump the few real ones
  lvl({ name: 'RED_HERRING', par: 1, hint: 'NOT EVERY SPIKE KILLS', bounds: { width: 1220, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1170, y: 390 },
    platforms: [floor(0, 1220)],
    hazards: [ss(250), ss(274), ss(298), sr(430), ss(560), ss(584), ss(608), sr(740), ss(900), ss(924), ss(948)] }),
  // 7 — SPIKE read + gaps (WIDE): read the real spike among the safe, then platform gaps with more reads
  lvl({ name: 'SHARP_LIES', par: 2, hint: 'WHICH ONE IS REAL?', bounds: { width: 1320, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1270, y: 330 },
    platforms: [floor(0, 300), plat(380, 322, 'solid', 64), plat(560, 300, 'solid', 60), floor(720, 220),
      plat(990, 316, 'solid', 64), floor(1130, 190)],
    hazards: [sr(150, 374), ss(180, 374), sr(210, 374), sr(770, 374), ss(800, 374), sr(830, 374)] }),
  // 8 — SIDE-SCROLL falling (single): time the collapsing platforms across the gap
  lvl({ name: 'TIMING', par: 2, hint: 'FLOOR COLLAPSING :: BE QUICK', bounds: { width: 1120, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1070, y: 390 },
    platforms: [floor(0, 230),
      plat(310, 322, 'falling', 56), plat(470, 312, 'falling', 56), plat(630, 322, 'falling', 56),
      floor(740, 380)] }),
  // 9 — SIDE-SCROLL falling chain (single): longer, no rest
  lvl({ name: 'FREEFALL', par: 3, bounds: { width: 1280, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1230, y: 390 },
    platforms: [floor(0, 200),
      plat(290, 320, 'falling', 54), plat(450, 306, 'falling', 54), plat(610, 320, 'falling', 54), plat(770, 306, 'falling', 54),
      floor(880, 400)] }),
  // 10 — BOSS (ghost gauntlet, WIDE): blind ghost stepping-stones over spike pits, solid rests between
  lvl({ name: 'PHANTOM', par: 3, hint: 'SOMETHING IS IN THE AIR', bounds: { width: 1500, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1450, y: 330 },
    platforms: [floor(0, 240),
      plat(310, 336, 'ghost', 72), plat(470, 300, 'ghost', 66), floor(620, 210),
      plat(890, 330, 'ghost', 66), plat(1050, 300, 'solid', 72), plat(1210, 330, 'ghost', 72),
      floor(1360, 140)],
    hazards: [sr(670, 374), sr(710, 374), sr(750, 374)] }),

  // ── CHAPTER 3 (lime) ── visual lies + gravity
  // 11 — INVERSE: a spiky-LOOKING bar that is actually the safe path over a real spike pit
  lvl({ name: 'INVERSION', par: 1, hint: 'WHAT LOOKS DEADLY IS SAFE', exit: { x: 662, y: 300 },
    platforms: [floor(0, 200), floor(540, 180)],
    hazards: [{ x: 250, y: 330, type: 'inverse', w: 200 }, sr(300, 374), sr(348, 374), sr(396, 374), sr(444, 374)] }),
  // 12 — TEXT_TRAP + FAKE + PORTAL (side-scroll): read the fake steps, cross the gap by the
  // gate (a "SAFE PATH" label floats over the pit as a tempting kill-decoy)
  lvl({ name: 'GASLIGHT', par: 2, hint: 'DO NOT TRUST THE LABEL', bounds: { width: 1120, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1070, y: 390 },
    platforms: [floor(0, 460),
      plat(190, 320, 'fake', 52), plat(310, 296, 'solid', 52), plat(430, 320, 'fake', 52),
      floor(660, 460), plat(850, 300, 'solid', 80)],
    hazards: [{ x: 540, y: 250, type: 'text_trap', message: 'SAFE PATH', w: 120, h: 22 }],
    portals: [{ a: { x: 400, y: 374 }, b: { x: 760, y: 374 } }] }),
  // 13 — GRAVITY_PULSE intro: float up the column, drift right onto the wide ledge
  lvl({ name: 'UPSIDE', par: 2, hint: 'GRAVITY GLITCHED :: ↑ FLOAT', exit: { x: 624, y: 110 },
    platforms: [floor(0, 320), plat(360, 110, 'solid', 320)],
    hazards: [{ x: 470, y: 56, type: 'ceiling_trap', dropDistance: 50, armProximity: 60 }],
    env: [{ type: 'gravity_pulse', zone: { x: 285, y: 60, w: 60, h: 340 }, arrowDir: 'up' }] }),
  // 14 — gravity to a two-tier landing
  lvl({ name: 'FLOAT', par: 2, exit: { x: 650, y: 110 },
    platforms: [floor(0, 300), plat(360, 186, 'solid', 130), plat(520, 110, 'solid', 200)],
    hazards: [{ x: 600, y: 56, type: 'ceiling_trap', dropDistance: 50, armProximity: 60 }],
    env: [{ type: 'gravity_pulse', zone: { x: 270, y: 60, w: 58, h: 340 }, arrowDir: 'up' }] }),
  // 15 — BOSS: invisible scroll wall (jump it) + a ceiling trap further on
  lvl({ name: 'GLITCHWALL', par: 3, exit: { x: 670, y: 390 },
    platforms: [floor()],
    hazards: [{ x: 470, y: 70, type: 'ceiling_trap', dropDistance: 60, armProximity: 60 }],
    env: [{ type: 'scroll_fake', wallX: 300, hint: 'INVALID COORDINATE — JUMP' }] }),

  // ── CHAPTER 4 (amber) ── speed, portals, gauntlets
  // 16 — SHIFTING gauntlet (WIDE): ride moving platforms, a fake/real stack, then a hidden spike near the exit
  lvl({ name: 'SLIDE', par: 3, hint: 'TIMING MATTERS', bounds: { width: 1480, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1430, y: 330 },
    platforms: [floor(0, 280),
      { x: 340, y: 300, w: 96, h: 12, type: 'shifting', pathIndex: 0 },
      floor(600, 210),
      plat(840, 330, 'fake', 58), plat(840, 300, 'solid', 58),
      { x: 1010, y: 300, w: 96, h: 12, type: 'shifting', pathIndex: 1 },
      floor(1280, 200)],
    paths: [{ axis: 'h', from: { x: 340, y: 300 }, to: { x: 470, y: 300 }, speed: 115 },
      { axis: 'h', from: { x: 1010, y: 300 }, to: { x: 1140, y: 300 }, speed: 115 }],
    hazards: [sr(640, 374), sr(680, 374), hidden(1340)] }),
  // 17 — PORTAL intro (SIDE-SCROLL): an unjumpable gap; walk into the portal to cross
  lvl({ name: 'GATEWAY', par: 3, hint: 'THE GATE CARRIES YOU ACROSS', bounds: { width: 1120, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1070, y: 390 },
    platforms: [floor(0, 460),
      plat(180, 330, 'fake', 56), plat(180, 294, 'solid', 56), plat(300, 296, 'solid', 56),
      floor(660, 460), plat(840, 300, 'solid', 80)],
    hazards: [hidden(740)],
    portals: [{ a: { x: 420, y: 374 }, b: { x: 720, y: 374 } }] }),
  // 18 — ESCAPE archetype: a corruption wall sweeps in from the left — RUN, don't stop.
  lvl({ name: 'OUTRUN', par: 4, hint: 'RUN. GRAB BUGS TO SLOW IT.', bounds: { width: 1800, height: 405 },
    spawn: { x: 60, y: 330 }, exit: { x: 1750, y: 390 },
    chase: { speed: 140, rush: 0.55, headStart: 260, delay: 1000 },
    platforms: [floor(0, 380),
      plat(440, 330, 'solid', 70), plat(580, 320, 'falling', 70),
      floor(720, 220),
      plat(1000, 330, 'solid', 70), plat(1140, 318, 'falling', 70),
      floor(1280, 520)],
    hazards: [sr(300, 374), sr(820, 374), sr(880, 374), sr(1340, 374), sr(1400, 374)],
    bugs: [{ x: 500, y: 312 }, { x: 770, y: 366 }, { x: 1040, y: 312 }, { x: 1480, y: 360 }],
    backdoorKeys: [{ x: 580, y: 300 }, { x: 1140, y: 298 }, { x: 1700, y: 364 }] }),
  // 19 — GAUNTLET: gravity float + ghost platforms + a shifting platform up top
  lvl({ name: 'GAUNTLET_2', par: 3, exit: { x: 668, y: 110 },
    platforms: [floor(0, 230), plat(300, 110, 'solid', 110), plat(470, 110, 'ghost', 110),
      { x: 588, y: 110, w: 96, h: 12, type: 'shifting', pathIndex: 0 }],
    paths: [{ axis: 'h', from: { x: 560, y: 110 }, to: { x: 660, y: 110 }, speed: 110 }],
    env: [{ type: 'gravity_pulse', zone: { x: 235, y: 60, w: 58, h: 340 }, arrowDir: 'up' }] }),
  // 20 — BOSS (SIDE-SCROLL): every trick, a portal, a FAKE finish, then the shifting real exit
  lvl({ name: 'KERNEL_PANIC', par: 5, hint: 'KERNEL PANIC :: TRUST NOTHING', bounds: { width: 1400, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1340, y: 250 },
    platforms: [floor(0, 300),
      plat(200, 336, 'fake', 56), plat(200, 300, 'solid', 56), plat(330, 300, 'falling', 56),
      floor(440, 200), floor(820, 580), plat(700, 300, 'ghost', 70),
      plat(1080, 296, 'solid', 80), plat(1210, 252, 'solid', 96)],
    hazards: [hidden(540), { x: 980, y: 70, type: 'ceiling_trap', dropDistance: 60, armProximity: 60 }],
    portals: [{ a: { x: 600, y: 374 }, b: { x: 860, y: 374 } }],
    env: [{ type: 'level_complete_fake', triggerX: 1250 }],
    exitShift: { dir: 'left', tiles: 3, triggerX: 1300 } }),

  // ── CHAPTER 5 (violet) ── advanced combinations
  // 21 — ride a moving platform across the gap; a hidden spike waits on the landing
  lvl({ name: 'DRIFT', par: 3, hint: 'RIDE AND WAIT', exit: { x: 662, y: 390 },
    platforms: [floor(0, 250), { x: 270, y: 315, w: 96, h: 12, type: 'shifting', pathIndex: 0 }, plat(390, 296, 'fake', 60), floor(560, 160)],
    paths: [{ axis: 'h', from: { x: 270, y: 315 }, to: { x: 470, y: 315 }, speed: 120 }],
    hazards: [hidden(610)] }),
  // 22 — ghost stepping-stones, then a portal across an unjumpable gap (side-scroll)
  lvl({ name: 'SPECTER_GATE', par: 3, bounds: { width: 1120, height: 405 }, spawn: { x: 56, y: 330 }, exit: { x: 1070, y: 390 },
    platforms: [floor(0, 200), plat(250, 322, 'ghost', 70), plat(392, 300, 'ghost', 70), plat(524, 322, 'ghost', 70),
      floor(640, 220), floor(1000, 120)],
    hazards: [hidden(720)],
    portals: [{ a: { x: 800, y: 374 }, b: { x: 1040, y: 374 } }] }),
  // 23 — float up the gravity column, drift onto a falling platform → solid before it drops
  lvl({ name: 'PLUNGE', par: 3, hint: 'MIND THE CEILING AS YOU FLOAT', exit: { x: 640, y: 116 },
    platforms: [floor(0, 280), plat(350, 150, 'falling', 90), plat(500, 116, 'solid', 200)],
    hazards: [hidden(200), { x: 360, y: 70, type: 'ceiling_trap', dropDistance: 50, armProximity: 56 }],
    env: [{ type: 'gravity_pulse', zone: { x: 290, y: 60, w: 58, h: 340 }, arrowDir: 'up' }] }),
  // 24 — spiky-LOOKING safe bar over a real pit + a hidden spike + a ceiling trap on the climb
  lvl({ name: 'BARBED', par: 3, hint: 'WHAT YOU SEE IS NOT ALWAYS REAL', exit: { x: 662, y: 390 },
    platforms: [floor(0, 190), floor(540, 180), plat(330, 250, 'solid', 80)],
    hazards: [{ x: 250, y: 330, type: 'inverse', w: 190 }, sr(300, 374), sr(348, 374), sr(396, 374),
      { x: 340, y: 70, type: 'ceiling_trap', dropDistance: 56, armProximity: 56 }, hidden(560)] }),
  // 25 — BOSS: shifting + fake + portal + ceiling, side-scroll gauntlet
  lvl({ name: 'OVERCLOCK', par: 4, bounds: { width: 1300, height: 405 }, spawn: { x: 56, y: 330 }, exit: { x: 1250, y: 390 },
    platforms: [floor(0, 300),
      plat(220, 336, 'fake', 56), plat(220, 300, 'solid', 56),
      { x: 360, y: 300, w: 90, h: 12, type: 'shifting', pathIndex: 0 },
      floor(640, 240), plat(900, 300, 'solid', 80), plat(1030, 268, 'falling', 60), floor(1120, 180)],
    paths: [{ axis: 'h', from: { x: 360, y: 300 }, to: { x: 500, y: 300 }, speed: 120 }],
    hazards: [hidden(700), { x: 940, y: 70, type: 'ceiling_trap', dropDistance: 56, armProximity: 56 }],
    portals: [{ a: { x: 240, y: 374 }, b: { x: 720, y: 374 } }] }),

  // ── CHAPTER 6 (red) ── hardest + finale
  // 26 — two portals + a moving-platform relay (side-scroll)
  lvl({ name: 'RELAY_RUN', par: 3, bounds: { width: 1300, height: 405 }, spawn: { x: 56, y: 330 }, exit: { x: 1250, y: 390 },
    platforms: [floor(0, 360), floor(520, 200), { x: 800, y: 300, w: 90, h: 12, type: 'shifting', pathIndex: 0 }, floor(1080, 220)],
    paths: [{ axis: 'h', from: { x: 800, y: 300 }, to: { x: 940, y: 300 }, speed: 130 }],
    hazards: [hidden(1140)],
    portals: [{ a: { x: 300, y: 374 }, b: { x: 600, y: 374 } }, { a: { x: 660, y: 374 }, b: { x: 1120, y: 374 } }] }),
  // 27 — falling-platform chain over a death pit (side-scroll, no mistakes)
  lvl({ name: 'FREEFALL_2', par: 3, bounds: { width: 1320, height: 405 }, spawn: { x: 56, y: 330 }, exit: { x: 1270, y: 390 },
    platforms: [floor(0, 200),
      plat(280, 318, 'falling', 54), plat(420, 304, 'falling', 54), plat(560, 318, 'falling', 54),
      plat(700, 304, 'falling', 54), plat(840, 318, 'falling', 54), floor(960, 360)],
    hazards: [hidden(1040), { x: 560, y: 70, type: 'ceiling_trap', dropDistance: 50, armProximity: 60 }] }),
  // 28 — gravity up, portal across, a safe/real spike mix on the landing
  lvl({ name: 'ANTIGRAV', par: 4, bounds: { width: 1120, height: 405 }, spawn: { x: 56, y: 330 }, exit: { x: 1070, y: 390 },
    platforms: [floor(0, 300), plat(360, 130, 'solid', 160), floor(640, 200), floor(1000, 120)],
    env: [{ type: 'gravity_pulse', zone: { x: 300, y: 60, w: 56, h: 340 }, arrowDir: 'up' }],
    portals: [{ a: { x: 800, y: 374 }, b: { x: 1040, y: 374 } }],
    hazards: [ss(700, 374), sr(724, 374), ss(748, 374), hidden(680)] }),
  // 29 — precision: fake + vertical shifting + a hidden spike, tight
  lvl({ name: 'NEEDLE', par: 4, exit: { x: 644, y: 250 },
    platforms: [floor(0, 170), plat(220, 336, 'fake', 48), plat(220, 300, 'solid', 48),
      { x: 350, y: 280, w: 80, h: 12, type: 'shifting', pathIndex: 0 }, plat(520, 250, 'solid', 64), plat(600, 250, 'solid', 70)],
    paths: [{ axis: 'v', from: { x: 350, y: 300 }, to: { x: 350, y: 224 }, speed: 90 }],
    hazards: [hidden(150)] }),
  // 30 — FINAL BOSS: long side-scroll, every trick, a portal, a FAKE finish, then the shifting real exit
  lvl({ name: 'SYSTEM_HALT', par: 6, hint: 'SYSTEM HALTING :: TRUST NOTHING', bounds: { width: 1600, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1540, y: 250 },
    platforms: [floor(0, 280),
      plat(200, 336, 'fake', 56), plat(200, 300, 'solid', 56), plat(330, 300, 'falling', 56),
      floor(440, 200), plat(720, 300, 'ghost', 70),
      floor(860, 260), { x: 1140, y: 300, w: 90, h: 12, type: 'shifting', pathIndex: 0 }, floor(1300, 300),
      plat(1460, 252, 'solid', 96)],
    paths: [{ axis: 'h', from: { x: 1140, y: 300 }, to: { x: 1260, y: 300 }, speed: 120 }],
    hazards: [hidden(540), { x: 920, y: 70, type: 'ceiling_trap', dropDistance: 56, armProximity: 56 },
      sr(1340, 374), sr(1364, 374)],
    portals: [{ a: { x: 600, y: 374 }, b: { x: 900, y: 374 } }],
    env: [{ type: 'level_complete_fake', triggerX: 1400 }],
    exitShift: { dir: 'left', tiles: 3, triggerX: 1500 } }),
];
