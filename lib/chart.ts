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
 * Build a deterministic chart of notes for a song, spaced to its BPM.
 * Capped to a sane note count so practice rounds stay short.
 */
export function buildChart(song: Song, config: ModeConfig): ChartNote[] {
  const beatsPerSec = song.bpm / 60;
  const spacingSec = (2 / beatsPerSec) * config.density; // one note every 2 beats, scaled
  const maxNotes = Math.min(24, Math.max(8, Math.round(song.signCount / 4)));

  const notes: ChartNote[] = [];
  let seed = song.bpm; // simple deterministic PRNG seed
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < maxNotes; i++) {
    const shapeIndex = Math.floor(next() * RELIABLE_HANDSHAPES.length);
    notes.push({
      id: i,
      time: 2 + i * spacingSec,
      shape: RELIABLE_HANDSHAPES[shapeIndex].id,
    });
  }
  return notes;
}
