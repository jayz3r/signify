const lanes = [
  { color: "bg-shape", delays: ["0s", "1.7s"] },
  { color: "bg-beat", delays: ["0.6s", "2.3s"] },
  { color: "bg-combo", delays: ["1.1s", "2.9s"] },
  { color: "bg-shape", delays: ["0.3s", "2.0s"] },
];

export default function NoteLane() {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border border-line bg-panel/60"
      aria-hidden="true"
    >
      <div className="absolute inset-0 grid grid-cols-4 gap-px bg-line/40">
        {lanes.map((lane, i) => (
          <div key={i} className="relative bg-panel/90">
            {lane.delays.map((delay, j) => (
              <span
                key={j}
                className={`absolute left-1/2 top-0 h-9 w-9 -translate-x-1/2 rounded-md ${lane.color} opacity-80 animate-fall`}
                style={{ animationDelay: delay }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* hit line */}
      <div className="absolute bottom-10 left-0 right-0 h-px bg-ink/30" />
      <div className="absolute bottom-[34px] left-0 right-0 flex justify-center">
        <span className="rounded-full bg-void/80 px-3 py-1 text-[11px] font-mono tracking-wide text-mute">
          HIT ZONE
        </span>
      </div>
    </div>
  );
}
