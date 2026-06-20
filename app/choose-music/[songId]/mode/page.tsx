import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Zap, Flame, GraduationCap, Music2 } from "lucide-react";
import { getSong, songs, difficultyColor } from "@/lib/data";
import { MODES } from "@/lib/chart";

export function generateStaticParams() {
  return songs.map((song) => ({ songId: song.id }));
}

const icons: Record<string, typeof Zap> = {
  normal: Zap,
  hard: Flame,
  learning: GraduationCap,
  rhythm: Music2,
};

export default function ChooseModePage({ params }: { params: { songId: string } }) {
  const song = getSong(params.songId);
  if (!song) notFound();

  const groupA = MODES.filter((m) => m.group === "Normal/Hard");
  const groupB = MODES.filter((m) => m.group === "Learning/Rhythm game");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/choose-music/${song.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {song.title}
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <h1 className="font-display text-3xl font-bold text-ink">Choose mode</h1>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${difficultyColor[song.difficulty]}`}>
          {song.difficulty}
        </span>
      </div>
      <p className="mt-2 text-mute">
        Two paths down from here: play it straight, or learn it first. Either way, you end up in the
        same place &mdash; signing along to {song.title}.
      </p>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <ModeGroup title="Normal / Hard" subtitle="Jump straight into the full song." modes={groupA} songId={song.id} />
        <ModeGroup title="Learning / Rhythm game" subtitle="Practice first, or go for score." modes={groupB} songId={song.id} />
      </div>
    </div>
  );
}

function ModeGroup({
  title,
  subtitle,
  modes,
  songId,
}: {
  title: string;
  subtitle: string;
  modes: typeof MODES;
  songId: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel/60 p-5">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-1 text-sm text-mute">{subtitle}</p>
      <div className="mt-5 flex flex-col gap-3">
        {modes.map((m) => {
          const Icon = icons[m.mode] ?? Zap;
          return (
            <Link
              key={m.mode}
              href={`/play/${songId}?mode=${m.mode}`}
              className="group flex items-start gap-3 rounded-xl border border-line bg-panel p-4 transition-colors hover:border-shape/50 hover:bg-panel2"
            >
              <Icon className="mt-0.5 h-5 w-5 text-shape" />
              <div className="flex-1">
                <p className="font-medium text-ink">{m.label}</p>
                <p className="mt-0.5 text-sm text-mute">{m.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
