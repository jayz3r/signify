import { Song } from "@/lib/data";
import { HandshapeId, RELIABLE_HANDSHAPES } from "@/lib/handshapes";

export type GameMode = "normal" | "hard" | "learning" | "rhythm";

export interface ChartNote {
  id: number;
  time: number; // seconds from song start
  shape: HandshapeId;
}

export interface ModeConfig {
  mode: GameMode;
  label: string;
  group: "Normal/Hard" | "Learning/Rhythm game";
  description: string;
  /** seconds the note is "live" for hold/score around its target time */
  hitWindow: number;
  /** seconds the falling note takes to travel from spawn to hit zone */
  travelTime: number;
  /** show the cue text for each upcoming shape */
  showCues: boolean;
  /** allow misses without ending the run */
  forgiving: boolean;
  /** multiply note spacing — smaller = denser chart */
  density: number;
}

export const MODES: ModeConfig[] = [
  {
    mode: "normal",
    label: "Normal",
    group: "Normal/Hard",
    description: "Standard speed, standard hit window. The full song, no hand-holding.",
    hitWindow: 0.6,
    travelTime: 2.6,
    showCues: false,
    forgiving: false,
    density: 1,
  },
  {
    mode: "hard",
    label: "Hard",
    group: "Normal/Hard",
    description: "Tighter timing window and a denser chart. For players chasing a high streak.",
    hitWindow: 0.4,
    travelTime: 1.9,
    showCues: false,
    forgiving: false,
    density: 0.7,
  },
  {
    mode: "learning",
    label: "Learning",
    group: "Learning/Rhythm game",
    description: "Untimed practice. Each handshape waits for you, with on-screen cues.",
    hitWindow: 999,
    travelTime: 4.5,
    showCues: true,
    forgiving: true,
    density: 1.6,
  },
  {
    mode: "rhythm",
    label: "Rhythm game",
    group: "Learning/Rhythm game",
    description: "The full rhythm-game experience: combo, score, and a results screen.",
    hitWindow: 0.55,
    travelTime: 2.3,
    showCues: true,
    forgiving: false,
    density: 1,
  },
];

export const getModeConfig = (mode: string | null | undefined): ModeConfig =>
  MODES.find((m) => m.mode === mode) ?? MODES[0];

/**
 * Build a chart of notes for a song, spaced to its BPM.
 * Capped to a sane note count so practice rounds stay short.
 *
 * Randomized per call (per Play press) instead of deterministic-by-BPM, so
 * replaying a song doesn't always produce the exact same letter sequence.
 */
export function buildChart(song: Song, config: ModeConfig): ChartNote[] {
  const beatsPerSec = song.bpm / 60;
  const spacingSec = (2 / beatsPerSec) * config.density; // one note every 2 beats, scaled
  const maxNotes = Math.min(24, Math.max(8, Math.round(song.signCount / 4)));

  const notes: ChartNote[] = [];

  // Seed with the current time (+ extra entropy from Math.random) so every
  // playthrough gets a different chart, instead of the old version which
  // seeded purely off song.bpm — since BPMs cluster tightly (80-160) and the
  // old PRNG was a weak LCG, nearly every song produced the same early
  // sequence (W, S, U, O, A, C...) regardless of which song or how many
  // times you replayed it.
  let seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;

  // Scramble the seed hard before first use so similar starting seeds
  // diverge immediately instead of producing correlated early outputs.
  const mix = (x: number) => {
    x = (x ^ 61) ^ (x >>> 16);
    x = (x + (x << 3)) >>> 0;
    x = x ^ (x >>> 4);
    x = Math.imul(x, 0x27d4eb2d) >>> 0;
    x = x ^ (x >>> 15);
    return x >>> 0;
  };
  seed = mix(seed);

  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  // Avoid repeating the same letter twice in a row — re-roll once if we
  // happen to land on the previous note's shape.
  let lastShapeId: HandshapeId | null = null;

  for (let i = 0; i < maxNotes; i++) {
    let shapeIndex = Math.floor(next() * RELIABLE_HANDSHAPES.length);
    let shape = RELIABLE_HANDSHAPES[shapeIndex].id;
    if (shape === lastShapeId && RELIABLE_HANDSHAPES.length > 1) {
      shapeIndex = Math.floor(next() * RELIABLE_HANDSHAPES.length);
      shape = RELIABLE_HANDSHAPES[shapeIndex].id;
    }
    lastShapeId = shape;

    notes.push({
      id: i,
      time: 2 + i * spacingSec,
      shape,
    });
  }
  return notes;
}