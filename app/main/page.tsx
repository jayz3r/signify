import Link from "next/link";
import { Music2, User, SlidersHorizontal, Flame, Target, Hand, ArrowRight } from "lucide-react";
import NoteLane from "@/components/NoteLane";
import StatCard from "@/components/StatCard";
import { profile } from "@/lib/data";

const navCards = [
  {
    href: "/choose-music",
    icon: Music2,
    title: "Choose music",
    description: "Pick a track, then a mode. Eight songs and counting, from Beginner to Expert.",
    accent: "text-shape",
  },
  {
    href: "/profile",
    icon: User,
    title: "Profile",
    description: "See your streak, accuracy, and every sign you've practiced.",
    accent: "text-beat",
  },
  {
    href: "/settings",
    icon: SlidersHorizontal,
    title: "Settings",
    description: "Camera calibration, captions, background, and accessibility.",
    accent: "text-combo",
  },
];

export default function MainPage() {
  return (
    <div>
      <section className="border-b border-line/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
              Welcome back, {profile.name}.
            </h1>
            <p className="mt-3 max-w-md text-mute">
              Jump back into a song, check your profile, or tune your settings before your next round.
            </p>
            <Link
              href="/choose-music"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-beat px-6 py-3 font-semibold text-void transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Choose music <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="h-56 md:h-64">
            <NoteLane />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="font-display text-2xl font-bold text-ink">Get started</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {navCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col gap-4 rounded-2xl border border-line bg-panel p-6 transition-colors hover:border-shape/50 hover:bg-panel2"
            >
              <card.icon className={`h-7 w-7 ${card.accent}`} />
              <div>
                <p className="font-display text-lg text-ink">{card.title}</p>
                <p className="mt-1 text-sm text-mute">{card.description}</p>
              </div>
              <span className="mt-auto flex items-center gap-1 text-sm font-medium text-ink/80 transition-transform group-hover:translate-x-1">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line/70 bg-panel/30">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold text-ink">Your progress</h2>
            <Link href="/profile" className="text-sm font-medium text-shape hover:underline">
              Full profile
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard icon={Flame} label="Day streak" value={`${profile.streakDays}`} accent="text-beat" />
            <StatCard icon={Target} label="Average accuracy" value={`${profile.avgAccuracy}%`} accent="text-shape" />
            <StatCard icon={Hand} label="Signs practiced" value={profile.totalSignsPracticed.toLocaleString()} accent="text-combo" />
          </div>
        </div>
      </section>
    </div>
  );
}
