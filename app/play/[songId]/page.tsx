import { notFound } from "next/navigation";
import { getSong, songs } from "@/lib/data";
import PlayClient from "@/components/game/PlayClient";

export function generateStaticParams() {
  return songs.map((song) => ({ songId: song.id }));
}

export default function PlayPage({
  params,
  searchParams,
}: {
  params: { songId: string };
  searchParams: { mode?: string };
}) {
  const song = getSong(params.songId);
  if (!song) notFound();

  return <PlayClient song={song} mode={searchParams.mode ?? "normal"} />;
}
