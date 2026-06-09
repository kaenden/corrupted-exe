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
  // ── CHAPTER 1 (cyan) ── basics → first deception
  // 1 — pure: platform → jump → platform → jump → raised exit
  lvl({ name: 'BOOT_SEQUENCE', par: 0, hint: 'TRUST NOTHING', exit: { x: 632, y: 252 },
    platforms: [floor(),
      plat(180, 338, 'solid', 64), plat(320, 298, 'solid', 56), plat(452, 300, 'solid', 56), plat(572, 252, 'solid', 84)] }),
  // 2 — tiered VERTICAL climb: serpentine up the platforms to a high exit (uses the full height)
  lvl({ name: 'WARM_RESET', par: 1, hint: 'YUKARI TIRMAN', exit: { x: 195, y: 124 },
    platforms: [floor(),
      plat(160, 336, 'solid', 64), plat(300, 300, 'solid', 56), plat(440, 264, 'solid', 56),
      plat(560, 228, 'solid', 80),
      plat(430, 192, 'solid', 56), plat(290, 158, 'solid', 56), plat(150, 124, 'solid', 90)] }),
  // 3 — FAKE intro: fake sits in the obvious step (over the safe floor); real path just above
  lvl({ name: 'FALSE_FOOTING', par: 1, hint: 'YALAN ZEMİN :: GÜVENME', exit: { x: 632, y: 256 },
    platforms: [floor(),
      plat(160, 336, 'solid', 52), plat(286, 300, 'fake', 52), plat(286, 262, 'solid', 52),
      plat(412, 290, 'solid', 50), plat(528, 256, 'solid', 56), plat(612, 256, 'solid', 72)] }),
  // 4 — fakes on a VERTICAL climb: aim for the higher (real) tier; a top-right decoy tempts you
  lvl({ name: 'MIRAGE', par: 1, hint: 'YÜKSEK OLAN GERÇEK', exit: { x: 205, y: 148 },
    platforms: [floor(),
      plat(170, 332, 'solid', 58),
      plat(310, 294, 'fake', 52), plat(310, 256, 'solid', 52),
      plat(450, 220, 'solid', 56), plat(310, 184, 'solid', 56),
      plat(450, 156, 'fake', 52), plat(170, 148, 'solid', 80)] }),
  // 5 — BOSS: fake + falling over a spike pit → land on the right ledge
  lvl({ name: 'COLLAPSE', par: 2, exit: { x: 662, y: 300 },
    platforms: [floor(0, 230),
      plat(250, 322, 'solid', 56), plat(372, 300, 'falling', 56), plat(496, 296, 'fake', 56), plat(496, 260, 'solid', 56),
      floor(560, 160)],
    hazards: [sr(300), sr(324), sr(348)] }),

  // ── CHAPTER 2 (magenta) ── deadly-looking-safe spikes, falling/timing, ghosts
  // 6 — SPIKE_SAFE intro: a field that LOOKS lethal but is safe to walk; one real spike to read
  lvl({ name: 'RED_HERRING', par: 1, hint: 'HER DİKEN ÖLDÜRMEZ', exit: { x: 662, y: 390 },
    platforms: [floor()], hazards: [ss(280), ss(304), ss(328), ss(352), sr(470), ss(560), ss(584)] }),
  // 7 — safe/real mix over a pit: pick the safe stepping spikes
  lvl({ name: 'SHARP_LIES', par: 2, exit: { x: 662, y: 320 },
    platforms: [floor(0, 250), plat(300, 326, 'solid', 64), plat(440, 296, 'solid', 56), floor(520, 200)],
    hazards: [sr(266), ss(290), sr(314), ss(452, 280)] }),
  // 8 — SIDE-SCROLL: falling platforms timing across a death gap
  lvl({ name: 'TIMING', par: 2, hint: 'ZEMİN ÇÖKÜYOR :: HIZLI OL', bounds: { width: 1120, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1070, y: 390 },
    platforms: [floor(0, 250),
      plat(310, 326, 'falling', 60), plat(452, 312, 'falling', 60), plat(594, 326, 'falling', 60),
      floor(720, 200), plat(960, 300, 'solid', 80), floor(1010, 110)] }),
  // 9 — SIDE-SCROLL: a longer falling-platform chain
  lvl({ name: 'FREEFALL', par: 2, bounds: { width: 1200, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1150, y: 390 },
    platforms: [floor(0, 220),
      plat(290, 318, 'falling', 56), plat(428, 304, 'falling', 56), plat(566, 316, 'falling', 56), plat(704, 300, 'falling', 56),
      floor(820, 180), plat(1010, 300, 'solid', 90), floor(1090, 110)],
    hazards: [hidden(880)] }),
  // 10 — BOSS: ghost platforms (appear on approach) + a hidden spike on the start floor
  lvl({ name: 'PHANTOM', par: 3, hint: 'HAVADA BİR ŞEY VAR', exit: { x: 668, y: 250 },
    platforms: [floor(0, 210), plat(268, 322, 'ghost', 64), plat(404, 284, 'ghost', 64), plat(540, 250, 'solid', 84)],
    hazards: [hidden(150), sr(566, 374)] }),

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
