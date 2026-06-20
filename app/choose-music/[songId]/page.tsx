import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gauge, Clock, Hand, Trophy, Play } from "lucide-react";
import { getSong, songs, difficultyColor, formatDuration } from "@/lib/data";

export function generateStaticParams() {
  return songs.map((song) => ({ songId: song.id }));
}

export default function SongDetailPage({ params }: { params: { songId: string } }) {
  const song = getSong(params.songId);
  if (!song) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/choose-music" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to song list
      </Link>

      <div className={`mt-6 flex h-40 items-end rounded-2xl bg-gradient-to-br ${song.hue} p-6`}>
        <div>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${difficultyColor[song.difficulty]}`}>
            {song.difficulty}
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">{song.title}</h1>
          <p className="text-mute">{song.artist}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel p-4">
          <Gauge className="h-5 w-5 text-shape" />
          <p className="mt-3 font-mono text-xl text-ink">{song.bpm} BPM</p>
          <p className="text-sm text-mute">Tempo</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <Clock className="h-5 w-5 text-combo" />
          <p className="mt-3 font-mono text-xl text-ink">{formatDuration(song.durationSec)}</p>
          <p className="text-sm text-mute">Length</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <Hand className="h-5 w-5 text-beat" />
          <p className="mt-3 font-mono text-xl text-ink">{song.signCount}</p>
          <p className="text-sm text-mute">Handshapes</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-line bg-panel p-5">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-combo" />
          <div>
            <p className="font-medium text-ink">Your best</p>
            <p className="text-sm text-mute">
              {song.bestAccuracy ? `${song.bestAccuracy}% accuracy` : "Not played yet"}
            </p>
          </div>
        </div>
      </div>

      <Link
        href={`/choose-music/${song.id}/mode`}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-beat py-4 font-display text-lg font-semibold text-void transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        <Play className="h-5 w-5" fill="currentColor" /> Choose mode &amp; play
      </Link>
      <p className="mt-3 text-center text-xs text-mute">
        Gameplay needs camera access for handshape tracking. You'll be asked to allow it.
      </p>
    </div>
  );
}
