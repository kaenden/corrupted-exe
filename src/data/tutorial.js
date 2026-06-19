// Bite-size tutorial pop-ups shown (game paused) at the start of early levels, BEFORE the action —
// each introduces one mechanic right as it first appears. Keyed by world_index.
export const TUTORIAL = {
  alpha: {
    0: [
      { title: 'MOVE', body: 'Arrow keys / A D to move.\nOn touch: hold the LEFT half of the screen.' },
      { title: 'JUMP', body: 'SPACE / UP, or tap the RIGHT half of the screen.\nReach the green EXIT gate to clear the room.' },
    ],
    1: [
      { title: 'CLIMB', body: 'Hop platform to platform to reach a high exit.\nRead the route before you leap.' },
    ],
    2: [
      { title: 'THE LIE', body: 'Not every platform is real.\nFAKE ones vanish the instant you land. The real step is usually just above.' },
      { title: 'THE WALL', body: 'The corruption now hunts from the left.\nNever stop moving — it speeds up the closer you get to the exit.' },
    ],
    3: [
      { title: 'BUG FRAGMENT', body: 'Grab cyan BUG fragments to SLOW the corruption for a few seconds.\nSave them for the hard stretches.' },
    ],
    4: [
      { title: 'BACKDOOR KEY', body: 'Collect gold KEYS, then finish the room WITHOUT dying to bank them.\nSpend keys in ESCAPE › BACKDOOR on permanent upgrades.' },
    ],
  },
};

export function getTutorial(world, index) {
  return TUTORIAL[world]?.[index] || null;
}
