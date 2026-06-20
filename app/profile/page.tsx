import { Flame, Target, Hand, Award } from "lucide-react";
import clsx from "clsx";
import StatCard from "@/components/StatCard";
import { profile, difficultyColor } from "@/lib/data";

export default function ProfilePage() {
  const xpPct = Math.round((profile.xpInLevel / profile.xpForLevel) * 100);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-shape to-beat font-display text-xl font-bold text-void">
            {profile.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{profile.name}</h1>
            <p className="text-sm text-mute">{profile.handle}</p>
          </div>
        </div>

        <div className="w-full sm:w-56">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink">Level {profile.level}</span>
            <span className="font-mono text-mute">
              {profile.xpInLevel}/{profile.xpForLevel} XP
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel">
            <div className="h-full rounded-full bg-shape" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Flame} label="Day streak" value={`${profile.streakDays}`} accent="text-beat" />
        <StatCard icon={Target} label="Average accuracy" value={`${profile.avgAccuracy}%`} accent="text-shape" />
        <StatCard icon={Hand} label="Signs practiced" value={profile.totalSignsPracticed.toLocaleString()} accent="text-combo" />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-ink">Badges</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {profile.badges.map((badge) => (
            <div
              key={badge.id}
              className={clsx(
                "flex items-center gap-3 rounded-xl border p-4",
                badge.earned ? "border-combo/40 bg-combo/10" : "border-line bg-panel opacity-50"
              )}
            >
              <Award className={clsx("h-5 w-5", badge.earned ? "text-combo" : "text-mute")} />
              <span className="text-sm font-medium text-ink">{badge.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-ink">Recent sessions</h2>
        <div className="mt-4 flex flex-col gap-2">
          {profile.recentSessions.map((session, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-line bg-panel px-4 py-3"
            >
              <div>
                <p className="font-medium text-ink">{session.song}</p>
                <p className="text-xs text-mute">{session.date}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${difficultyColor[session.difficulty]}`}>
                {session.difficulty}
              </span>
              <span className="w-12 text-right font-mono text-sm text-ink">{session.accuracy}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
