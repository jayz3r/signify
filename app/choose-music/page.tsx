"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";
import SongCard from "@/components/SongCard";
import { Difficulty, songs } from "@/lib/data";

const filters: ("All" | Difficulty)[] = ["All", "Beginner", "Intermediate", "Advanced", "Expert"];

export default function ChooseMusicPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const visible = useMemo(() => {
    return songs.filter((song) => {
      const matchesFilter = filter === "All" || song.difficulty === filter;
      const matchesQuery =
        query.trim() === "" ||
        song.title.toLowerCase().includes(query.toLowerCase()) ||
        song.artist.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [query, filter]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-ink">Choose music</h1>
      <p className="mt-2 text-mute">
        Eight tracks across four difficulties. Pick one to see its handshape preview before you play.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs or artists"
            className="w-full rounded-full border border-line bg-panel py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-mute focus-visible:border-shape"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f
                ? "border-shape bg-shape/10 text-shape"
                : "border-line text-mute hover:text-ink"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-line bg-panel p-6 text-center text-mute">
            No songs match “{query}”. Try a different search or filter.
          </p>
        ) : (
          visible.map((song) => <SongCard key={song.id} song={song} />)
        )}
      </div>
    </div>
  );
}
