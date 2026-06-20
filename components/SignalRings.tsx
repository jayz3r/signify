export default function SignalRings() {
  return (
    <div className="pointer-events-none relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <span className="absolute h-40 w-40 rounded-full border border-shape/40 animate-pulse_ring [animation-delay:0s]" />
      <span className="absolute h-40 w-40 rounded-full border border-beat/40 animate-pulse_ring [animation-delay:0.9s]" />
      <span className="absolute h-40 w-40 rounded-full border border-combo/40 animate-pulse_ring [animation-delay:1.8s]" />

      <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-panel ring-1 ring-line">
        {/* simple open-palm handshape glyph */}
        <svg viewBox="0 0 64 64" className="h-14 w-14 text-ink">
          <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 34V14a3.4 3.4 0 1 1 6.8 0v16" />
            <path d="M28.8 30V10.5a3.4 3.4 0 1 1 6.8 0V30" />
            <path d="M35.6 30V13a3.4 3.4 0 1 1 6.8 0v19" />
            <path d="M42.4 32v-9a3.2 3.2 0 1 1 6.4 0v18c0 8.5-6 15-14.5 15h-3c-5 0-8-1.8-11-5.6l-9-11.4c-1.6-2-1.2-4.6.8-5.9 2-1.3 4.4-.7 6 1.1l4 4.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}
