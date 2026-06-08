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
  // 2 — pure: varied widths, a small step-down, raised exit
  lvl({ name: 'WARM_RESET', par: 0, exit: { x: 652, y: 250 },
    platforms: [floor(),
      plat(150, 340, 'solid', 56), plat(272, 300, 'solid', 44), plat(388, 332, 'solid', 56),
      plat(508, 288, 'solid', 44), plat(606, 250, 'solid', 84)] }),
  // 3 — FAKE intro: fake sits in the obvious step (over the safe floor); real path just above
  lvl({ name: 'FALSE_FOOTING', par: 1, hint: 'YALAN ZEMİN :: GÜVENME', exit: { x: 632, y: 256 },
    platforms: [floor(),
      plat(160, 336, 'solid', 52), plat(286, 300, 'fake', 52), plat(286, 262, 'solid', 52),
      plat(412, 290, 'solid', 50), plat(528, 256, 'solid', 56), plat(612, 256, 'solid', 72)] }),
  // 4 — two fakes among reals: read which step holds
  lvl({ name: 'MIRAGE', par: 1, exit: { x: 650, y: 246 },
    platforms: [floor(),
      plat(150, 336, 'solid', 52), plat(270, 300, 'fake', 50), plat(388, 300, 'solid', 50),
      plat(508, 282, 'fake', 50), plat(508, 246, 'solid', 50), plat(606, 246, 'solid', 80)] }),
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
  // 12 — TEXT_TRAP: a reassuring label that kills if touched; platform around it
  lvl({ name: 'GASLIGHT', par: 1, exit: { x: 662, y: 256 },
    platforms: [floor(), plat(190, 326, 'solid', 60), plat(360, 286, 'solid', 56), plat(520, 252, 'solid', 70)],
    hazards: [{ x: 320, y: 196, type: 'text_trap', message: 'SAFE ZONE DETECTED', w: 150, h: 24 }] }),
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
  // 20 — FINAL BOSS (SIDE-SCROLL): every trick, a portal, a FAKE finish, then the shifting real exit
  lvl({ name: 'KERNEL_PANIC', par: 5, hint: 'SON SINAV :: HİÇBİR ŞEYE GÜVENME', bounds: { width: 1400, height: 405 },
    spawn: { x: 56, y: 330 }, exit: { x: 1340, y: 250 },
    platforms: [floor(0, 300),
      plat(200, 320, 'fake', 56), plat(200, 284, 'solid', 56), plat(330, 300, 'falling', 56),
      floor(440, 200), plat(900, 300, 'ghost', 80), floor(820, 580),
      plat(1080, 296, 'solid', 80), plat(1210, 252, 'solid', 96)],
    hazards: [sr(360, 374), hidden(540), { x: 980, y: 70, type: 'ceiling_trap', dropDistance: 60, armProximity: 60 }],
    portals: [{ a: { x: 600, y: 374 }, b: { x: 860, y: 374 } }],
    env: [{ type: 'level_complete_fake', triggerX: 1250 }],
    exitShift: { dir: 'left', tiles: 3, triggerX: 1300 } }),
];
