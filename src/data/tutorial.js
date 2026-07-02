// The ONLY tutorial modal in the game — two cards on Level 1, shown (game paused) before the action.
// Everything after L1 is taught by DESIGN, not text: the L1 "honest lie" teaches fakes, spike telegraphs
// teach bait, the corruption wall teaches itself, and later mechanics (bugs/keys) are taught inline by
// their own level's hint right where they first appear. Keyed by world_index.
export const TUTORIAL = {
  alpha: {
    0: [
      { title: 'THE SIMULATION LIES', body: 'This world is rigged. Some platforms are fake, some spikes are bait, some exits run away.\nWhat looks BROKEN is a TRAP — not a bug. Read it, and outsmart it.' },
      { title: 'CONTROLS', body: 'Move — ◄ ► arrows or A D.   Jump — SPACE / UP.\nReach the green EXIT gate to clear the room.  (Touch: left half moves, right half jumps.)' },
    ],
  },
};

export function getTutorial(world, index) {
  return TUTORIAL[world]?.[index] || null;
}
