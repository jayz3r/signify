export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export const difficultyColor: Record<Difficulty, string> = {
  Beginner: "text-shape border-shape/40 bg-shape/10",
  Intermediate: "text-combo border-combo/40 bg-combo/10",
  Advanced: "text-beat border-beat/40 bg-beat/10",
  Expert: "text-ink border-ink/30 bg-ink/10",
};

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  durationSec: number;
  difficulty: Difficulty;
  signCount: number;
  bestAccuracy: number | null; // null = never played
  hue: string; // tailwind gradient classes for cover art placeholder
  audioSrc: string; // path under /public, e.g. "/audio/good-morning.mp3"
}

export const songs: Song[] = [
  {
    id: "viva-la-vida",
    audioSrc: "/audio/viva-la-vida.mp3",
    title: "Viva La Vida",
    artist: "Coldplay",
    bpm: 92,
    durationSec: 244,
    difficulty: "Beginner",
    signCount: 24,
    bestAccuracy: 96,
    hue: "from-shape/70 to-panel",
  },
  {
    id: "coffee-talk",
    audioSrc: "/audio/coffee-talk.mp3",
    title: "Coffee Talk",
    artist: "Mara Lin",
    bpm: 100,
    durationSec: 151,
    difficulty: "Beginner",
    signCount: 31,
    bestAccuracy: 88,
    hue: "from-combo/60 to-panel",
  },
  {
    id: "city-lights",
    audioSrc: "/audio/city-lights.mp3",
    title: "City Lights",
    artist: "Nova Frame",
    bpm: 118,
    durationSec: 164,
    difficulty: "Intermediate",
    signCount: 47,
    bestAccuracy: 79,
    hue: "from-beat/60 to-panel",
  },
  {
    id: "thunder-road",
    audioSrc: "/audio/thunder-road.mp3",
    title: "Thunder Road",
    artist: "Kessler & Vine",
    bpm: 126,
    durationSec: 172,
    difficulty: "Intermediate",
    signCount: 53,
    bestAccuracy: null,
    hue: "from-shape/50 to-panel",
  },
  {
    id: "fast-hands",
    audioSrc: "/audio/fast-hands.mp3",
    title: "Fast Hands",
    artist: "Dialtone",
    bpm: 140,
    durationSec: 158,
    difficulty: "Advanced",
    signCount: 68,
    bestAccuracy: 71,
    hue: "from-combo/50 to-panel",
  },
  {
    id: "storm-signal",
    audioSrc: "/audio/storm-signal.mp3",
    title: "Storm Signal",
    artist: "Ari Quinn",
    bpm: 152,
    durationSec: 181,
    difficulty: "Advanced",
    signCount: 74,
    bestAccuracy: null,
    hue: "from-beat/50 to-panel",
  },
  {
    id: "glasswing",
    audioSrc: "/audio/glasswing.mp3",
    title: "Glasswing",
    artist: "Nova Frame",
    bpm: 168,
    durationSec: 195,
    difficulty: "Expert",
    signCount: 92,
    bestAccuracy: null,
    hue: "from-ink/30 to-panel",
  },
  {
    id: "midnight-relay",
    audioSrc: "/audio/midnight-relay.mp3",
    title: "Midnight Relay",
    artist: "Kessler & Vine",
    bpm: 174,
    durationSec: 203,
    difficulty: "Expert",
    signCount: 101,
    bestAccuracy: null,
    hue: "from-shape/40 to-panel",
  },
];

export const getSong = (id: string) => songs.find((s) => s.id === id);

export const profile = {
  name: "Yrys",
  handle: "@signify_yrys",
  level: 14,
  xpInLevel: 640,
  xpForLevel: 1000,
  streakDays: 9,
  avgAccuracy: 84,
  totalSignsPracticed: 2186,
  badges: [
    { id: "b1", label: "7-Day Streak", earned: true },
    { id: "b2", label: "Beginner Clear", earned: true },
    { id: "b3", label: "Intermediate Clear", earned: true },
    { id: "b4", label: "100 Songs Signed", earned: false },
    { id: "b5", label: "Perfect Round", earned: false },
    { id: "b6", label: "Advanced Clear", earned: false },
  ],
  recentSessions: [
    { song: "Fast Hands", difficulty: "Advanced" as Difficulty, accuracy: 71, date: "Jun 18" },
    { song: "City Lights", difficulty: "Intermediate" as Difficulty, accuracy: 79, date: "Jun 17" },
    { song: "Coffee Talk", difficulty: "Beginner" as Difficulty, accuracy: 88, date: "Jun 16" },
    { song: "Viva La Vida", difficulty: "Beginner" as Difficulty, accuracy: 96, date: "Jun 15" },
  ],
};

export const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};
