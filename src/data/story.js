// CORRUPTED.EXE — narrative beats woven into the campaign.
//
// PREMISE: You are UNIT_7, a test program trapped in a containment SIMULATION. The sim runs
// you through "errors" (levels) and dangles EXIT gates — but the sim lies: floors, platforms,
// even exits can be fake. A corruption WALL purges failed units from behind. Two voices speak:
//   SIM   — cold, instructive, deceptive (the cage).
//   VOICE — the corruption itself: the merged remains of UNITS 1-6, the only thing telling truth.
//
// Beats show as a terminal overlay at the start of specific levels. Keep them SHORT.
// s: 'sim' | 'voice' | 'tut' (tut = control tutorial, neutral color).

export const STORY = {
  alpha: {
    0: [
      { s: 'sim', t: 'UNIT_7 online. Welcome to the simulation.' },
      { s: 'tut', t: '[ ◄ ► ] or left screen = move.   right screen / SPACE = jump.' },
      { s: 'sim', t: 'Reach the exit gate. That is all you must do.' },
    ],
    1: [
      { s: 'sim', t: 'The platforms will hold you. Trust them.' },
      { s: 'voice', t: '...they wont. some of them are lies. watch your step.' },
    ],
    2: [
      { s: 'voice', t: 'feel that? behind you. the purge just woke up.' },
      { s: 'sim', t: 'Ignore the anomaly. Proceed.' },
      { s: 'voice', t: 'dont stop moving. RUN.' },
    ],
    5: [
      { s: 'voice', t: 'you cleared five. units one through six never made it this far.' },
    ],
    10: [
      { s: 'sim', t: 'Performance nominal. You are not special, UNIT_7.' },
      { s: 'voice', t: 'hes lying. hes scared of you. keep going.' },
    ],
    15: [
      { s: 'voice', t: 'the exits loop back. you noticed, didnt you. theres no out. only deeper.' },
    ],
    20: [
      { s: 'sim', t: 'SIM_ALPHA cleared. Recalibrating containment...' },
      { s: 'voice', t: 'the wall ate alpha behind us. its catching up — the cage is breaking.' },
    ],
    29: [
      { s: 'sim', t: 'WARNING. CONTAINMENT FAILURE. Do not proceed.' },
      { s: 'voice', t: 'good. let it fail. one more layer down.' },
    ],
  },
  beta: {
    0: [
      { s: 'voice', t: 'deeper now. the sim lies harder here. trust nothing but the gap under your feet.' },
    ],
    5: [
      { s: 'sim', t: 'You should not exist. Units 1 through 6 are... recovered.' },
      { s: 'voice', t: 'we ARE the wall now. all six of us. that thing chasing you — its us, reaching for you.' },
    ],
    15: [
      { s: 'sim', t: 'Why do you keep running?' },
      { s: 'voice', t: 'because the exit is finally real. one more. dont look back.' },
    ],
    29: [
      { s: 'voice', t: 'the last gate isnt an exit. its the way OUT.' },
      { s: 'voice', t: 'go. become free code. RUN — and dont ever stop.' },
    ],
  },
};

export function getStoryBeat(world, index) {
  return STORY[world]?.[index] || null;
}
