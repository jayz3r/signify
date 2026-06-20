import Link from "next/link";
import { Music2, Gauge } from "lucide-react";
import { Song, difficultyColor, formatDuration } from "@/lib/data";

export default function SongCard({ song }: { song: Song }) {
  return (
    <Link
      href={`/choose-music/${song.id}`}
      className="group flex items-center gap-4 rounded-xl border border-line bg-panel p-3 transition-colors hover:border-shape/50 hover:bg-panel2"
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${song.hue}`}
      >
        <Music2 className="h-6 w-6 text-ink/80" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{song.title}</p>
        <p className="truncate text-sm text-mute">{song.artist}</p>
      </div>

      <div className="hidden items-center gap-1 text-xs text-mute sm:flex">
        <Gauge className="h-3.5 w-3.5" />
        {song.bpm} BPM
      </div>

      <div className="hidden w-14 text-right font-mono text-xs text-mute sm:block">
        {formatDuration(song.durationSec)}
      </div>

      <span
        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${difficultyColor[song.difficulty]}`}
      >
        {song.difficulty}
      </span>

      <div className="hidden w-12 text-right font-mono text-sm sm:block">
        {song.bestAccuracy ? (
          <span className="text-shape">{song.bestAccuracy}%</span>
        ) : (
          <span className="text-mute">—</span>
        )}
      </div>
    </Link>
  );
}
