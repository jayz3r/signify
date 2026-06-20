import Link from "next/link";
import { User, Camera, Eye, Accessibility, Bell, RotateCcw, Palette, ArrowRight } from "lucide-react";
import Toggle from "@/components/Toggle";
import { profile } from "@/lib/data";

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof User;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line/70 py-8 first:pt-0 last:border-0">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 text-shape" />
        <div>
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <p className="text-sm text-mute">{description}</p>
        </div>
      </div>
      <div className="mt-2 divide-y divide-line/60">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-ink">Settings</h1>
      <p className="mt-2 text-mute">Camera, captions, and accessibility, all in one place.</p>

      <div className="mt-8">
        <Section icon={User} title="Account" description="Your public profile information.">
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-mute">Display name</span>
              <input
                type="text"
                defaultValue={profile.name}
                className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink focus-visible:border-shape"
              />
            </label>
            <label className="text-sm">
              <span className="text-mute">Handle</span>
              <input
                type="text"
                defaultValue={profile.handle}
                className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink focus-visible:border-shape"
              />
            </label>
          </div>
        </Section>

        <Section icon={Camera} title="Camera & hand tracking" description="Needed to score your handshapes during a round.">
          <Toggle label="Enable camera" description="Signify only processes video locally, on-device." defaultChecked />
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-ink">Calibration</p>
              <p className="text-sm text-mute">Re-run this if tracking feels off.</p>
            </div>
            <button className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-shape/50">
              <RotateCcw className="h-3.5 w-3.5" /> Recalibrate
            </button>
          </div>
        </Section>

        <Section icon={Eye} title="Captions & visual cues" description="Replace audio cues with on-screen signals.">
          <Toggle label="Captions" description="Show lyrics and cues as text during a round." defaultChecked />
          <Toggle label="Screen flash on beat" description="Brief screen pulse on every downbeat." defaultChecked />
          <Toggle label="Desk vibration cues" description="Requires a connected vibration pad." />
        </Section>

        <Section icon={Palette} title="Background" description="Set the backdrop you play against.">
          <Link
            href="/settings/background"
            className="group flex items-center justify-between py-4"
          >
            <div>
              <p className="font-medium text-ink">Change background</p>
              <p className="text-sm text-mute">Pick the look of your gameplay screen.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-mute transition-transform group-hover:translate-x-1" />
          </Link>
        </Section>

        <Section icon={Accessibility} title="Accessibility" description="Adjust how Signify looks and moves.">
          <Toggle label="Reduce motion" description="Minimize falling-note animation and screen flash." />
          <Toggle label="High contrast mode" description="Increase contrast between lanes and background." />
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-ink">Sign speed sensitivity</p>
              <p className="text-sm text-mute">How forgiving timing detection is.</p>
            </div>
            <select
              defaultValue="medium"
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus-visible:border-shape"
            >
              <option value="low">Strict</option>
              <option value="medium">Medium</option>
              <option value="high">Forgiving</option>
            </select>
          </div>
        </Section>

        <Section icon={Bell} title="Notifications" description="What Signify reminds you about.">
          <Toggle label="Daily streak reminder" description="One nudge a day if you haven't played yet." defaultChecked />
          <Toggle label="New song alerts" description="Tell me when new tracks are added." />
        </Section>
      </div>
    </div>
  );
}
