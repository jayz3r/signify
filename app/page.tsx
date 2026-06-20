import Link from "next/link";
import { Play } from "lucide-react";
import SignalRings from "@/components/SignalRings";

export default function StartGamePage() {
  return (
    <div className="dot-grid flex min-h-[calc(100vh-73px)] items-center justify-center px-6">
      <div className="grid max-w-4xl items-center gap-12 md:grid-cols-2">
        <div className="text-center md:text-left">
          <span className="inline-block rounded-full border border-line bg-panel px-3 py-1 font-mono text-xs uppercase tracking-wider text-mute">
            ASL rhythm game
          </span>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] text-ink md:text-6xl">
            Sign<span className="text-beat">ify </span>
          </h1>
          <p className="mt-5 max-w-md text-balance text-lg text-mute md:mx-0 mx-auto">
            Handshapes fall, you sign them back. Feel the beat, build your streak, and learn ASL
            one round at a time.
          </p>
          <div className="mt-9 flex justify-center md:justify-start">
            <Link
              href="/main"
              className="group inline-flex items-center gap-3 rounded-full bg-beat px-8 py-4 font-display text-lg font-semibold text-void transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <Play className="h-5 w-5 transition-transform group-hover:translate-x-0.5" fill="currentColor" />
              Start game
            </Link>
          </div>
          <p className="mt-4 text-xs text-mute">Needs a webcam for handshape tracking.</p>
        </div>

        <div className="relative mx-auto h-64 w-64 md:h-80 md:w-80">
          <SignalRings />
        </div>
      </div>
    </div>
  );
}
