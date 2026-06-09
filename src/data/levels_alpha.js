// SIM_ALPHA — 20-level teaching arc (GDD §8.3) with DELIBERATE beat composition + dynamic
// elements (side-scroll, moving platforms, teleport portals, varied terrain). No screen-wrap.
// Physics: jump ≈105px up / ≈190px across → keep gaps ≤170, height steps ≤90. Tuned via playtest.
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
    parDeaths: o.par ?? 0, safeZones: SZ, name: o.name, hint: o.hint || null,
  };
};

export const LEVELS_ALPHA = [
  // ── CHAPTER 1 (cyan) ── single trick, gaps near the jump limit (~170px); forgiving floors
  // 1 — pure: real ~175px jumps; the full floor catches misses
  lvl({ name: 'BOOT_SEQUENCE', par: 0, hint: 'TRUST NOTHING', exit: { x: 660, y: 256 },
    platforms: [floor(),
      plat(200, 338, 'solid', 54), plat(378, 300, 'solid', 50), plat(556, 300, 'solid', 50), plat(626, 256, 'solid', 70)] }),
  // 2 — VERTICAL climb: alternate long-flat and steep-up jumps to a high exit
  lvl({ name: 'WARM_RESET', par: 1, hint: 'YUKARI TIRMAN', exit: { x: 335, y: 130 },
    platforms: [floor(),
      plat(170, 338, 'solid', 56), plat(345, 302, 'solid', 50), plat(440, 246, 'solid', 48),
      plat(575, 212, 'solid', 60), plat(455, 162, 'solid', 48), plat(300, 130, 'solid', 70)] }),
  // 3 — FAKE (single): the obvious low step is fake; the real sits just above, then a long jump
  lvl({ name: 'FALSE_FOOTING', par: 1, hint: 'YALAN ZEMİN :: GÜVENME', exit: { x: 660, y: 258 },
    platforms: [floor(),
      plat(180, 336, 'solid', 52), plat(340, 326, 'fake', 50), plat(340, 290, 'solid', 50),
      plat(505, 290, 'solid', 50), plat(625, 258, 'solid', 64)] }),
  // 4 — FAKE on a climb: fake decoy vs real at each tier — pick correctly while climbing
  lvl({ name: 'MIRAGE', par: 2, hint: 'YÜKSEK OLAN GERÇEK', exit: { x: 355, y: 134 },
    platforms: [floor(),
      plat(175, 336, 'solid', 56), plat(345, 300, 'solid', 50),
      plat(220, 250, 'fake', 48), plat(440, 250, 'solid', 50),
      plat(330, 200, 'solid', 50),
      plat(180, 162, 'fake', 48), plat(470, 162, 'solid', 50),
      plat(330, 134, 'solid', 64)] }),
  // 5 — BOSS (single = falling): a collapsing-platform sprint over a death pit
  lvl({ name: 'COLLAPSE', par: 3, hint: 'ZEMİN ÇÖKÜYOR :: HIZLI', exit: { x: 662, y: 390 },
    platforms: [floor(0, 180),
      plat(250, 330, 'falling', 54), plat(410, 314, 'falling', 54), plat(560, 296, 'falling', 54), floor(640, 80)] }),

  // ── CHAPTER 2 (magenta) ── single trick, medium-wide gaps, less forgiving (pits)
  // 6 — SPIKE_SAFE (single): a deadly-LOOKING field that's safe; one real spike to read
  lvl({ name: 'RED_HERRING', par: 1, hint: 'HER DİKEN ÖLDÜRMEZ', exit: { x: 662, y: 390 },
    platforms: [floor()], hazards: [ss(250), ss(274), ss(298), ss(322), sr(470), ss(560), ss(584), ss(608)] }),
  // 7 — SPIKE mix (single): read the safe stepping spikes, then long jumps over a pit
  lvl({ name: 'SHARP_LIES', par: 2, hint: 'HANGİSİ GERÇEK?', exit: { x: 662, y: 390 },
    platforms: [floor(0, 230), plat(320, 322, 'solid', 60), plat(480, 296, 'solid', 56), floor(560, 160)],
    hazards: [sr(120, 374), ss(144, 374), sr(168, 374), ss(192, 374)] }),
  // 8 — SIDE-SCROLL falling (single): time the collapsing platforms across the gap
  lvl({ name: 'TIMING', par: 2, hint: 'ZEMİN ÇÖKÜYOR :: HIZLI OL', bounds: { width: 1120, height: 405 },
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
  // 10 — BOSS (single = ghost): ghost stepping-stones with wide gaps over a pit
  lvl({ name: 'PHANTOM', par: 3, hint: 'HAVADA BİR ŞEY VAR', exit: { x: 660, y: 258 },
    platforms: [floor(0, 200), plat(290, 326, 'ghost', 58), plat(455, 300, 'ghost', 56), plat(600, 258, 'solid', 80)] }),

  // ── CHAPTER 3 (lime) ── visual lies + gravity
  // 11 — INVERSE: a spiky-LOOKING bar that is actually the safe path over a real spike pit
  lvl({ name: 'INVERSION', par: 1, hint: 'TEHLİKELİ GÖRÜNEN GÜVENLİ', exit: { x: 662, y: 300 },
    platforms: [floor(0, 200), floor(540, 180)],
    hazards: [{ x: 250, y: 330, type: 'inverse', w: 200 }, sr(300, 374), sr(348, 374), sr(396, 374), sr(444, 374)] }),
  // 12 — TEXT_TRAP + vertical tiers: serpentine climb; a reassuring label floats as a tempting
  // mid-air "ledge" that kills if you step on it
  lvl({ name: 'GASLIGHT', par: 1, hint: 'ETİKETE GÜVENME', exit: { x: 590, y: 130 },
    platforms: [floor(),
      plat(170, 330, 'solid', 60), plat(310, 292, 'solid', 56),
      plat(180, 252, 'solid', 56), plat(330, 214, 'solid', 56),
      plat(470, 176, 'solid', 60), plat(560, 134, 'solid', 90)],
    hazards: [{ x: 430, y: 250, type: 'text_trap', message: 'GÜVENLİ BÖLGE', w: 130, h: 22 }] }),
  // 13 — GRAVITY_PULSE intro: float up the column, drift right onto the wide ledge
  lvl({ name: 'UPSIDE', par: 2, hint: 'YÖN BOZULDU :: ↑ SÜZÜL', exit: { x: 624, y: 110 },
    platforms: [floor(0, 320), plat(360, 110, 'solid', 320)],
    env: [{ type: 'gravity_pulse', zone: { x: 285, y: 60, w: 60, h: 340 }, arrowDir: 'up' }] }),
  // 14 — gravity to a two-tier landing
  lvl({ name: 'FLOAT', par: 2, exit: { x: 650, y: 110 },
    platforms: [floor(0, 300), plat(360, 186, 'solid', 130), plat(520, 110, 'solid', 200)],
    env: [{ type: 'gravity_pulse', zone: { x: 270, y: 60, w: 58, h: 340 }, arrowDir: 'up' }] }),
  // 15 — BOSS: invisible scroll wall (jump it) + a ceiling trap further on
  lvl({ name: 'GLITCHWALL', par: 3, exit: { x: 670, y: 390 },
    platforms: [floor()],
    hazards: [{ x: 470, y: 70, type: 'ceiling_trap', dropDistance: 60, armProximity: 60 }],
    env: [{ type: 'scroll_fake', wallX: 300, hint: 'GEÇERSİZ KOORDİNAT — ATLA' }] }),

  // ── CHAPTER 4 (amber) ── speed, portals, gauntlets
  // 16 — SHIFTING: ride a moving platform; a hidden spike + real spike to read
  lvl({ name: 'SLIDE', par: 2, exit: { x: 670, y: 250 },
    platforms: [floor(0, 200), { x: 260, y: 300, w: 96, h: 12, type: 'shifting', pathIndex: 0 }, plat(540, 250, 'solid', 96)],
    paths: [{ axis: 'h', from: { x: 260, y: 300 }, to: { x: 440, y: 300 }, speed: 120 }],
    hazards: [hidden(360), sr(420, 374)] }),
  // 17 — PORTAL intro (SIDE-SCROLL): an unjumpable gap; walk into the portal to cross
  lvl({ name: 'GATEWAY', par: 2, hint: 'KAPI SENİ DİĞER TARAFA TAŞIR', bounds: { width: 1120, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1070, y: 390 },
    platforms: [floor(0, 460),
      plat(180, 330, 'solid', 56), plat(300, 296, 'solid', 56),
      floor(660, 460), plat(840, 300, 'solid', 80)],
    portals: [{ a: { x: 420, y: 374 }, b: { x: 720, y: 374 } }] }),
  // 18 — GAUNTLET (SIDE-SCROLL showcase): varied terrain + moving platform + portal over a gap
  lvl({ name: 'GAUNTLET_1', par: 3, hint: 'YOL DAİMA İLERİ DEĞİL', bounds: { width: 1440, height: 405 },
    spawn: { x: 60, y: 330 }, exit: { x: 1390, y: 390 },
    platforms: [floor(0, 680),
      plat(220, 320, 'solid', 60), plat(360, 286, 'fake', 56), plat(360, 248, 'solid', 56),
      { x: 480, y: 300, w: 96, h: 12, type: 'shifting', pathIndex: 0 },
      floor(900, 540), plat(1040, 320, 'solid', 80), plat(1170, 284, 'falling', 60), plat(1280, 300, 'solid', 160)],
    paths: [{ axis: 'h', from: { x: 480, y: 300 }, to: { x: 600, y: 300 }, speed: 120 }],
    hazards: [sr(300, 374), hidden(1060)],
    portals: [{ a: { x: 640, y: 374 }, b: { x: 940, y: 374 } }] }),
  // 19 — GAUNTLET: gravity float + ghost platforms + a shifting platform up top
  lvl({ name: 'GAUNTLET_2', par: 3, exit: { x: 668, y: 110 },
    platforms: [floor(0, 230), plat(300, 110, 'solid', 110), plat(470, 110, 'ghost', 110),
      { x: 588, y: 110, w: 96, h: 12, type: 'shifting', pathIndex: 0 }],
    paths: [{ axis: 'h', from: { x: 560, y: 110 }, to: { x: 660, y: 110 }, speed: 110 }],
    env: [{ type: 'gravity_pulse', zone: { x: 235, y: 60, w: 58, h: 340 }, arrowDir: 'up' }] }),
  // 20 — BOSS (SIDE-SCROLL): every trick, a portal, a FAKE finish, then the shifting real exit
  lvl({ name: 'KERNEL_PANIC', par: 5, hint: 'ÇEKİRDEK PANİĞİ :: HİÇBİR ŞEYE GÜVENME', bounds: { width: 1400, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1340, y: 250 },
    platforms: [floor(0, 300),
      plat(200, 320, 'fake', 56), plat(200, 284, 'solid', 56), plat(330, 300, 'falling', 56),
      floor(440, 200), floor(820, 580), plat(700, 300, 'ghost', 70),
      plat(1080, 296, 'solid', 80), plat(1210, 252, 'solid', 96)],
    hazards: [hidden(540), { x: 980, y: 70, type: 'ceiling_trap', dropDistance: 60, armProximity: 60 }],
    portals: [{ a: { x: 600, y: 374 }, b: { x: 860, y: 374 } }],
    env: [{ type: 'level_complete_fake', triggerX: 1250 }],
    exitShift: { dir: 'left', tiles: 3, triggerX: 1300 } }),

  // ── CHAPTER 5 (violet) ── advanced combinations
  // 21 — ride a moving platform across the gap; a hidden spike waits on the landing
  lvl({ name: 'DRIFT', par: 2, hint: 'BİN VE BEKLE', exit: { x: 662, y: 390 },
    platforms: [floor(0, 250), { x: 270, y: 315, w: 96, h: 12, type: 'shifting', pathIndex: 0 }, floor(560, 160)],
    paths: [{ axis: 'h', from: { x: 270, y: 315 }, to: { x: 470, y: 315 }, speed: 120 }],
    hazards: [hidden(610)] }),
  // 22 — ghost stepping-stones, then a portal across an unjumpable gap (side-scroll)
  lvl({ name: 'SPECTER_GATE', par: 3, bounds: { width: 1120, height: 405 }, spawn: { x: 56, y: 330 }, exit: { x: 1070, y: 390 },
    platforms: [floor(0, 200), plat(250, 322, 'ghost', 70), plat(392, 300, 'ghost', 70), plat(524, 322, 'ghost', 70),
      floor(640, 220), floor(1000, 120)],
    portals: [{ a: { x: 800, y: 374 }, b: { x: 1040, y: 374 } }] }),
  // 23 — float up the gravity column, drift onto a falling platform → solid before it drops
  lvl({ name: 'PLUNGE', par: 3, hint: 'ZEMİN ÇÖKMEDEN GEÇ', exit: { x: 640, y: 116 },
    platforms: [floor(0, 280), plat(350, 150, 'falling', 90), plat(500, 116, 'solid', 200)],
    env: [{ type: 'gravity_pulse', zone: { x: 290, y: 60, w: 58, h: 340 }, arrowDir: 'up' }] }),
  // 24 — spiky-LOOKING safe bar over a real pit + a hidden spike + a ceiling trap on the climb
  lvl({ name: 'BARBED', par: 3, hint: 'GÖRÜNEN HER ZAMAN GERÇEK DEĞİL', exit: { x: 662, y: 390 },
    platforms: [floor(0, 190), floor(540, 180), plat(330, 250, 'solid', 80)],
    hazards: [{ x: 250, y: 330, type: 'inverse', w: 190 }, sr(300, 374), sr(348, 374), sr(396, 374),
      { x: 340, y: 70, type: 'ceiling_trap', dropDistance: 56, armProximity: 56 }, hidden(560)] }),
  // 25 — BOSS: shifting + fake + portal + ceiling, side-scroll gauntlet
  lvl({ name: 'OVERCLOCK', par: 4, bounds: { width: 1300, height: 405 }, spawn: { x: 56, y: 330 }, exit: { x: 1250, y: 390 },
    platforms: [floor(0, 300),
      plat(220, 320, 'fake', 56), plat(220, 284, 'solid', 56),
      { x: 360, y: 300, w: 90, h: 12, type: 'shifting', pathIndex: 0 },
      floor(640, 240), plat(900, 300, 'solid', 80), plat(1030, 268, 'falling', 60), floor(1120, 180)],
    paths: [{ axis: 'h', from: { x: 360, y: 300 }, to: { x: 500, y: 300 }, speed: 120 }],
    hazards: [sr(320, 374), hidden(700), { x: 940, y: 70, type: 'ceiling_trap', dropDistance: 56, armProximity: 56 }],
    portals: [{ a: { x: 600, y: 374 }, b: { x: 840, y: 374 } }] }),

  // ── CHAPTER 6 (red) ── hardest + finale
  // 26 — two portals + a moving-platform relay (side-scroll)
  lvl({ name: 'RELAY_RUN', par: 3, bounds: { width: 1300, height: 405 }, spawn: { x: 56, y: 330 }, exit: { x: 1250, y: 390 },
    platforms: [floor(0, 360), floor(520, 200), { x: 800, y: 300, w: 90, h: 12, type: 'shifting', pathIndex: 0 }, floor(1080, 220)],
    paths: [{ axis: 'h', from: { x: 800, y: 300 }, to: { x: 940, y: 300 }, speed: 130 }],
    portals: [{ a: { x: 300, y: 374 }, b: { x: 600, y: 374 } }, { a: { x: 660, y: 374 }, b: { x: 1120, y: 374 } }] }),
  // 27 — falling-platform chain over a death pit (side-scroll, no mistakes)
  lvl({ name: 'FREEFALL_2', par: 3, bounds: { width: 1320, height: 405 }, spawn: { x: 56, y: 330 }, exit: { x: 1270, y: 390 },
    platforms: [floor(0, 200),
      plat(280, 318, 'falling', 54), plat(420, 304, 'falling', 54), plat(560, 318, 'falling', 54),
      plat(700, 304, 'falling', 54), plat(840, 318, 'falling', 54), floor(960, 360)],
    hazards: [hidden(1040)] }),
  // 28 — gravity up, portal across, a safe/real spike mix on the landing
  lvl({ name: 'ANTIGRAV', par: 4, bounds: { width: 1120, height: 405 }, spawn: { x: 56, y: 330 }, exit: { x: 1070, y: 390 },
    platforms: [floor(0, 300), plat(360, 130, 'solid', 160), floor(640, 200), floor(1000, 120)],
    env: [{ type: 'gravity_pulse', zone: { x: 300, y: 60, w: 56, h: 340 }, arrowDir: 'up' }],
    portals: [{ a: { x: 800, y: 374 }, b: { x: 1040, y: 374 } }],
    hazards: [ss(700, 374), sr(724, 374), ss(748, 374)] }),
  // 29 — precision: fake + vertical shifting + a hidden spike, tight
  lvl({ name: 'NEEDLE', par: 4, exit: { x: 644, y: 250 },
    platforms: [floor(0, 170), plat(220, 320, 'fake', 48), plat(220, 284, 'solid', 48),
      { x: 350, y: 280, w: 80, h: 12, type: 'shifting', pathIndex: 0 }, plat(520, 250, 'solid', 64), plat(600, 250, 'solid', 70)],
    paths: [{ axis: 'v', from: { x: 350, y: 300 }, to: { x: 350, y: 224 }, speed: 90 }],
    hazards: [hidden(150)] }),
  // 30 — FINAL BOSS: long side-scroll, every trick, a portal, a FAKE finish, then the shifting real exit
  lvl({ name: 'SYSTEM_HALT', par: 6, hint: 'SİSTEM ÇÖKÜYOR :: HİÇBİR ŞEYE GÜVENME', bounds: { width: 1600, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1540, y: 250 },
    platforms: [floor(0, 280),
      plat(200, 320, 'fake', 56), plat(200, 284, 'solid', 56), plat(330, 300, 'falling', 56),
      floor(440, 200), plat(720, 300, 'ghost', 70),
      floor(860, 260), { x: 1140, y: 300, w: 90, h: 12, type: 'shifting', pathIndex: 0 }, floor(1300, 300),
      plat(1460, 252, 'solid', 96)],
    paths: [{ axis: 'h', from: { x: 1140, y: 300 }, to: { x: 1260, y: 300 }, speed: 120 }],
    hazards: [sr(360, 374), hidden(540), { x: 920, y: 70, type: 'ceiling_trap', dropDistance: 56, armProximity: 56 },
      sr(1340, 374), sr(1364, 374)],
    portals: [{ a: { x: 600, y: 374 }, b: { x: 900, y: 374 } }],
    env: [{ type: 'level_complete_fake', triggerX: 1400 }],
    exitShift: { dir: 'left', tiles: 3, triggerX: 1500 } }),
];
