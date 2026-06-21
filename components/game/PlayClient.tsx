"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Camera,
  Pause,
  Play,
  RotateCcw,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { Song } from "@/lib/data";
import { buildChart, getModeConfig, ChartNote } from "@/lib/chart";
import {
  HANDSHAPES,
  classifyHandshapeWithMotion,
  HandshapeId,
  TrailPoint,
} from "@/lib/handshapes";

declare global {
  interface Window {
    Hands?: any;
  }
}

type Phase =
  | "loading-model"
  | "model-error"
  | "camera-request"
  | "camera-denied"
  | "ready"
  | "playing"
  | "paused"
  | "results";

const BACKGROUNDS: Record<string, string> = {
  void: "bg-void",
  aurora: "bg-gradient-to-br from-[#15101F] via-[#1b2a3a] to-[#15101F]",
  sunset: "bg-gradient-to-br from-[#2b1320] via-[#1f1830] to-[#15101F]",
  forest: "bg-gradient-to-br from-[#10241d] via-[#1a2418] to-[#15101F]",
};

// Motion letters (J, Z) physically take longer to perform than holding a
// static pose — the player has to trace a shape in the air, not just form
// a handshape. Give them extra travel time so the note doesn't time out
// before the trace can even complete.
const MOTION_TIME_BONUS_SEC = 1.4;

function loadScriptOnce(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${src}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      // A previous attempt is still pending or already failed — remove it
      // and start clean rather than hanging on a dead tag forever.
      existing.remove();
    }
    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.body.appendChild(script);
  });
}

// Drives the falling note's travel time. The old implementation derived
// progress from audio.currentTime, so if playback was blocked, stalled, or
// the file failed to load, currentTime never advanced past 0 and the note
// just sat frozen at the top of the lane forever — even though hits/misses
// still worked, since those are driven by hand detection, not the clock.
// This clock runs off performance.now() instead, independent of the audio
// element, and tracks its own paused time so pausing the game pauses travel.
function createNoteClock() {
  return {
    start: performance.now(),
    pausedMs: 0,
    pauseBeganAt: null as number | null,
  };
}

export default function PlayClient({
  song,
  mode,
}: {
  song: Song;
  mode: string;
}) {
  const config = getModeConfig(mode);
  const chart = useRef<ChartNote[]>(buildChart(song, config));

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const handsRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const detectedRef = useRef<HandshapeId | null>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const noteClockRef = useRef(createNoteClock());

  const [phase, setPhase] = useState<Phase>("loading-model");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detected, setDetected] = useState<HandshapeId | null>(null);

  const [noteIndex, setNoteIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 of current note's travel
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [lastResult, setLastResult] = useState<"hit" | "miss" | null>(null);
  const [bg, setBg] = useState("void");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("signify-bg");
      if (saved && BACKGROUNDS[saved]) setBg(saved);
    } catch {
      /* localStorage unavailable, ignore */
    }
  }, []);

  // ---- Load MediaPipe Hands -----------------------------------------
  const loadHandsModel = useCallback(async () => {
    setPhase("loading-model");
    setCameraError(null);
    try {
      await Promise.race([
        loadScriptOnce(
          "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
        ),
        new Promise((_, reject) =>
          window.setTimeout(
            () =>
              reject(new Error("Timed out loading the hand-tracking model.")),
            12000,
          ),
        ),
      ]);
      const HandsCtor = window.Hands;
      if (!HandsCtor) throw new Error("MediaPipe Hands failed to load");
      const hands = new HandsCtor({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      hands.onResults((results: any) => {
        const lm = results?.multiHandLandmarks?.[0];
        if (lm) {
          const now = performance.now();
          trailRef.current.push({ x: lm[8].x, y: lm[8].y, t: now });
          // keep ~1s of trail
          trailRef.current = trailRef.current.filter((p) => now - p.t < 1000);
        } else {
          trailRef.current = [];
        }
        const shape = lm
          ? classifyHandshapeWithMotion(lm, trailRef.current)
          : null;
        detectedRef.current = shape;
        setDetected(shape);
      });
      handsRef.current = hands;
      setPhase("camera-request");
    } catch (err) {
      console.error(err);
      setCameraError(
        "Couldn't load the hand-tracking model. Check your connection and try again.",
      );
      setPhase("model-error");
    }
  }, []);

  useEffect(() => {
    loadHandsModel();
  }, [loadHandsModel]);

  // ---- Camera permission + frame loop --------------------------------
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraError(null);
      setPhase("ready");

      const detectFrame = async () => {
        if (
          videoRef.current &&
          handsRef.current &&
          videoRef.current.readyState >= 2
        ) {
          await handsRef.current.send({ image: videoRef.current });
        }
        rafRef.current = requestAnimationFrame(detectFrame);
      };
      detectFrame();
    } catch (err) {
      console.error(err);
      setCameraError(
        "Camera access was denied or unavailable. Allow camera access and try again.",
      );
      setPhase("camera-denied");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | undefined;
      stream?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
    };
  }, []);

  // ---- Game loop: advance current note, check for hit/timeout --------
  const advanceNote = useCallback(
    (result: "hit" | "miss") => {
      setLastResult(result);
      if (result === "hit") {
        setHits((h) => h + 1);
        setCombo((c) => {
          const next = c + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });
        setScore((s) => s + 100 + Math.floor(combo / 5) * 20);
      } else {
        setMisses((m) => m + 1);
        setCombo(0);
      }

      const nextIndex = noteIndex + 1;
      if (nextIndex >= chart.current.length) {
        audioRef.current?.pause();
        setPhase("results");
        return;
      }
      window.setTimeout(() => {
        setLastResult(null);
        noteClockRef.current = createNoteClock();
        setProgress(0);
        setNoteIndex(nextIndex);
      }, 260);
    },
    [combo, noteIndex],
  );

  // Advances progress every frame off the independent note clock, so the
  // timer keeps moving even if the <audio> element never actually plays.
  useEffect(() => {
    if (phase !== "playing") return;
    let raf: number;
    const tick = () => {
      const current = chart.current[noteIndex];
      if (!current) {
        raf = requestAnimationFrame(tick);
        return;
      }
      // Motion letters (J, Z) need real time in the air to trace their
      // shape, on top of however long the static-pose travel time is. Without
      // this, the note could time out as a miss before the player even
      // finishes drawing the J or Z, since tracing takes noticeably longer
      // than just holding a pose.
      const needsMotion = HANDSHAPES[current.shape]?.needsMotion;
      const effectiveTravelTime = needsMotion
        ? config.travelTime + MOTION_TIME_BONUS_SEC
        : config.travelTime;

      const { start, pausedMs, pauseBeganAt } = noteClockRef.current;
      const livePause =
        pauseBeganAt != null ? performance.now() - pauseBeganAt : 0;
      const elapsed = (performance.now() - start - pausedMs - livePause) / 1000;
      const p = Math.min(1, elapsed / effectiveTravelTime);
      setProgress(p);

      if (detectedRef.current === current.shape) {
        advanceNote("hit");
        return;
      }
      if (!config.forgiving && elapsed >= effectiveTravelTime) {
        advanceNote("miss");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, noteIndex, advanceNote, config.travelTime, config.forgiving]);

  const startRound = () => {
    setNoteIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHits(0);
    setMisses(0);
    setLastResult(null);
    setProgress(0);
    noteClockRef.current = createNoteClock();
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      // Best-effort: the game clock no longer depends on this succeeding.
      audio
        .play()
        .catch((err) =>
          console.warn(
            "Audio playback blocked (game clock keeps running anyway):",
            err,
          ),
        );
    }
    setPhase("playing");
  };

  // Pause/resume the track and the note clock together with the game phase
  useEffect(() => {
    const audio = audioRef.current;
    if (phase === "paused") {
      audio?.pause();
      if (noteClockRef.current.pauseBeganAt == null) {
        noteClockRef.current.pauseBeganAt = performance.now();
      }
    }
    if (phase === "playing") {
      if (audio && audio.paused && audio.currentTime > 0) {
        audio.play().catch(() => {});
      }
      const { pauseBeganAt } = noteClockRef.current;
      if (pauseBeganAt != null) {
        noteClockRef.current.pausedMs += performance.now() - pauseBeganAt;
        noteClockRef.current.pauseBeganAt = null;
      }
    }
  }, [phase]);

  const totalNotes = chart.current.length;
  const currentNote = chart.current[noteIndex];
  const accuracy =
    hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;
  const cameraIsFloating = phase === "playing" || phase === "paused";

  return (
    <div
      className={clsx(
        "min-h-[calc(100vh-73px)]",
        BACKGROUNDS[bg] ?? BACKGROUNDS.void,
      )}
    >
      <div className="relative mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between">
          <Link
            href={`/choose-music/${song.id}/mode`}
            className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Change mode
          </Link>
          <div className="text-right">
            <p className="font-display text-lg text-ink">{song.title}</p>
            <p className="text-xs text-mute">
              {config.label} mode · {song.bpm} BPM
            </p>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={song.audioSrc}
          preload="auto"
          onLoadedData={() => console.log("audio loaded")}
          onError={(e) => console.log("audio error", e)}
        />

        {/* Camera + hands status, always mounted (same DOM node) so getUserMedia
            keeps a stable ref. During gameplay it shrinks and floats over the
            top-left corner of the game stage instead of taking a full block. */}
        <div
          className={clsx(
            "overflow-hidden rounded-2xl border bg-panel/95 backdrop-blur-sm transition-all duration-300",
            cameraIsFloating
              ? "absolute left-6 top-[104px] z-30 w-36 border-[#3c2c78]/70 shadow-[0_0_30px_-6px_rgba(125,92,255,0.55)] sm:w-44"
              : "relative mt-6 border-line",
          )}
        >
          <video
            ref={videoRef}
            className={clsx(
              "w-full -scale-x-100 object-cover opacity-90",
              cameraIsFloating ? "h-24 sm:h-28" : "h-56 sm:h-72",
            )}
            muted
            playsInline
          />
          {cameraIsFloating ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wide text-[#a3e635]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a3e635]" style={{ boxShadow: "0 0 6px 2px rgba(163,230,53,0.7)" }} />
              Connected
            </div>
          ) : (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-void/80 px-3 py-1.5 text-xs font-mono text-mute">
              <Camera className="h-3.5 w-3.5" />
              {detected ? (
                <span className="text-shape">
                  Detected: {HANDSHAPES[detected].label}
                </span>
              ) : (
                <span>No handshape detected</span>
              )}
            </div>
          )}
        </div>

        {(phase === "loading-model" || phase === "camera-request") && (
          <div className="mt-6 rounded-2xl border border-line bg-panel p-8 text-center">
            {phase === "loading-model" ? (
              <p className="text-mute">Loading hand-tracking model…</p>
            ) : (
              <>
                <p className="font-display text-lg text-ink">
                  Allow camera access
                </p>
                <p className="mt-2 text-sm text-mute">
                  Signify needs your webcam to track handshapes. Video is
                  processed locally and never leaves your device.
                </p>
                <button
                  onClick={startCamera}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-beat px-6 py-3 font-semibold text-void transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  <Camera className="h-4 w-4" /> Enable camera
                </button>
              </>
            )}
          </div>
        )}

        {phase === "model-error" && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-beat/40 bg-beat/10 p-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-beat" />
            <div>
              <p className="font-medium text-ink">{cameraError}</p>
              <button
                onClick={loadHandsModel}
                className="mt-3 flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-shape/50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Try again
              </button>
            </div>
          </div>
        )}

        {phase === "camera-denied" && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-beat/40 bg-beat/10 p-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-beat" />
            <div>
              <p className="font-medium text-ink">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-3 flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-shape/50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Try again
              </button>
            </div>
          </div>
        )}

        {phase === "ready" && (
          <div className="mt-6 rounded-2xl border border-line bg-panel p-8 text-center">
            <p className="font-display text-xl text-ink">
              Ready to play {song.title}
            </p>
            <p className="mt-2 text-sm text-mute">
              {totalNotes} handshapes · {config.description}
            </p>
            <button
              onClick={startRound}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-beat px-7 py-3.5 font-display text-lg font-semibold text-void transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <Play className="h-5 w-5" fill="currentColor" /> Play game
            </button>
          </div>
        )}

        {(phase === "playing" || phase === "paused") && currentNote && (
          <GameStage
            note={currentNote}
            progress={progress}
            config={config}
            score={score}
            combo={combo}
            noteIndex={noteIndex}
            totalNotes={totalNotes}
            lastResult={lastResult}
            paused={phase === "paused"}
            onPauseToggle={() =>
              setPhase(phase === "paused" ? "playing" : "paused")
            }
          />
        )}

        {phase === "results" && (
          <ResultsPanel
            song={song}
            score={score}
            accuracy={accuracy}
            maxCombo={maxCombo}
            hits={hits}
            misses={misses}
            onReplay={startRound}
          />
        )}
      </div>
    </div>
  );
}

// Deterministic pseudo-random star field (no Math.random — keeps SSR and
// client markup identical so hydration doesn't complain).
const SPARKLES = Array.from({ length: 30 }).map((_, i) => {
  const seed = i * 9301 + 49297;
  const rnd = (n: number) => ((seed * (n * 7919 + 1)) % 233280) / 233280;
  return {
    x: rnd(1) * 100,
    y: rnd(2) * 56,
    size: 1 + rnd(3) * 2,
    o: 0.2 + rnd(4) * 0.55,
    dur: 1.8 + rnd(5) * 2.4,
    delay: rnd(6) * 3,
  };
});

function GameStage({
  note,
  progress,
  config,
  score,
  combo,
  noteIndex,
  totalNotes,
  lastResult,
  paused,
  onPauseToggle,
}: {
  note: ChartNote;
  progress: number;
  config: ReturnType<typeof getModeConfig>;
  score: number;
  combo: number;
  noteIndex: number;
  totalNotes: number;
  lastResult: "hit" | "miss" | null;
  paused: boolean;
  onPauseToggle: () => void;
}) {
  const shape = HANDSHAPES[note.shape];
  const [clueImgFailed, setClueImgFailed] = useState(false);

  // Reset the fallback flag whenever the sign changes, so a missing image
  // for one letter doesn't permanently suppress the watermark for letters
  // that do have one.
  useEffect(() => {
    setClueImgFailed(false);
  }, [note.shape]);

  // The card itself stays put — only the vertical timer strip drains as
  // time runs out on the current note.
  const t = Math.min(progress, 1);
  const timeLeftPct = Math.max(0, (1 - t) * 100);
  const tierFill = ((combo % 5) / 5) * 100;

  return (
    <div className="mt-6">
      <div
        className="relative h-[26rem] overflow-hidden rounded-[28px] border border-[#3c2c78]/70"
        style={{
          background:
            "linear-gradient(180deg, #07051a 0%, #1b1042 36%, #3c1a58 64%, #170a30 100%)",
        }}
      >
        {/* stars */}
        <div className="pointer-events-none absolute inset-0">
          {SPARKLES.map((s, i) => (
            <span
              key={i}
              className="absolute block rounded-full bg-white"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                opacity: s.o,
                animation: `signify-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* drifting aurora bands */}
        <svg
          viewBox="0 0 700 420"
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="signify-aurora-blur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <linearGradient id="signify-aurora-1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff4fd8" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#9d6bff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#27e0ff" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <g filter="url(#signify-aurora-blur)" style={{ animation: "signify-drift 10s ease-in-out infinite" }}>
            <path d="M -60 95 Q 90 45 240 100 T 540 90 T 840 105" stroke="url(#signify-aurora-1)" strokeWidth="24" fill="none" opacity="0.55" />
            <path d="M -60 135 Q 110 178 290 135 T 590 150 T 890 128" stroke="url(#signify-aurora-1)" strokeWidth="16" fill="none" opacity="0.4" />
          </g>
        </svg>

        {/* giant hand watermark — uses your real clue silhouette for this
            letter when it exists, falling back to a generic outline if not */}
        {!clueImgFailed ? (
          <img
            key={shape.label}
            src={`/clues/${shape.label}.png`}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[16%] h-[80%] -translate-x-1/2 object-contain opacity-[0.12]"
            onError={() => setClueImgFailed(true)}
          />
        ) : (
          <svg
            viewBox="0 0 400 420"
            className="pointer-events-none absolute left-1/2 top-[16%] h-[80%] -translate-x-1/2 opacity-[0.07]"
          >
            <g fill="none" stroke="#ffffff" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
              <rect x="118" y="195" width="164" height="195" rx="52" />
              <rect x="92" y="85" width="40" height="155" rx="19" />
              <rect x="150" y="42" width="40" height="195" rx="19" />
              <rect x="208" y="42" width="40" height="195" rx="19" />
              <rect x="264" y="72" width="40" height="165" rx="19" />
            </g>
          </svg>
        )}

        {/* skyline: mountains + a palm silhouette */}
        <svg
          viewBox="0 0 700 420"
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <polygon points="0,330 90,250 160,310 230,228 320,330" fill="#190f30" opacity="0.9" />
          <polygon points="430,330 500,242 560,302 615,255 700,330" fill="#140926" opacity="0.95" />
          <g stroke="#0a0520" strokeWidth="6" fill="none" strokeLinecap="round">
            <path d="M64 330 C 62 292 70 262 76 236" />
            <path d="M76 236 C 46 226 26 236 12 251" />
            <path d="M76 236 C 56 211 41 200 26 195" />
            <path d="M76 236 C 92 206 108 196 124 196" />
            <path d="M76 236 C 96 221 117 223 137 233" />
          </g>
        </svg>

        {/* perspective grid floor */}
        <svg
          viewBox="0 0 700 420"
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="signify-grid-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <line x1="0" y1="330" x2="700" y2="330" stroke="#ff4fd8" strokeWidth="2" opacity="0.85" filter="url(#signify-grid-glow)" />
          {Array.from({ length: 9 }).map((_, i) => {
            const f = i / 8 - 0.5;
            const x = 350 + f * 900;
            return (
              <line key={i} x1={350} y1={330} x2={x} y2={420} stroke="#7d5cff" strokeOpacity="0.4" strokeWidth="1.4" />
            );
          })}
          {[0.16, 0.36, 0.62, 1].map((f, i) => (
            <line
              key={i}
              x1={350 - f * 350}
              y1={330 + f * 90}
              x2={350 + f * 350}
              y2={330 + f * 90}
              stroke="#ff4fd8"
              strokeOpacity={0.5 - f * 0.3}
              strokeWidth="1.4"
            />
          ))}
        </svg>

        {/* judgment popup */}
        {lastResult && (
          <div className="pointer-events-none absolute left-1/2 top-[20%] -translate-x-1/2 -translate-y-1/2">
            <span
              key={`${lastResult}-${noteIndex}`}
              className={clsx(
                "block font-display text-3xl font-extrabold tracking-wide",
                lastResult === "hit" ? "text-[#ffe66d]" : "text-[#ff4f6d]",
              )}
              style={{
                textShadow:
                  lastResult === "hit"
                    ? "0 0 14px rgba(255,230,109,0.9), 0 0 30px rgba(255,230,109,0.5)"
                    : "0 0 14px rgba(255,79,109,0.9)",
                animation: "signify-pop 0.5s ease-out",
              }}
            >
              {lastResult === "hit" ? "PERFECT!" : "MISS"}
            </span>
          </div>
        )}

        {/* HUD: score, top-left */}
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-[#0a0620]/75 px-3 py-1.5">
          <span
            className="h-2.5 w-2.5 rotate-45 rounded-[3px]"
            style={{ background: "linear-gradient(135deg, #27e0ff, #ff4fd8)" }}
          />
          <span className="font-mono text-sm font-semibold tracking-wide text-white">
            {score.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-[#a78bfa]">
            {noteIndex + 1}/{totalNotes}
          </span>
        </div>

        {/* HUD: combo + tier bar + pause, below score */}
        <div className="absolute right-4 top-14 z-10 flex flex-col items-end gap-1">
          <div className="flex items-baseline gap-1.5 rounded-full bg-[#0a0620]/75 px-3 py-1.5">
            <span
              className={clsx(
                "font-display text-lg font-extrabold",
                combo > 0 ? "text-[#ff4fd8]" : "text-[#6b6088]",
              )}
              style={
                combo > 0
                  ? { textShadow: "0 0 10px rgba(255,79,216,0.75)" }
                  : undefined
              }
            >
              {combo}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#a78bfa]">
              combo
            </span>
            <button
              onClick={onPauseToggle}
              className="ml-1 rounded-full p-1 text-[#a78bfa] hover:text-white"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#241a4d]">
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{
                width: `${tierFill}%`,
                background: "linear-gradient(90deg, #7d5cff, #ff4fd8)",
              }}
            />
          </div>
        </div>

        {/* SIGN THIS card */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-[46%] text-center">
          <p
            className="font-mono text-xs font-bold tracking-[0.35em] text-[#27e0ff]"
            style={{ textShadow: "0 0 10px rgba(39,224,255,0.8)" }}
          >
            SIGN THIS:
          </p>
          <div
            className={clsx(
              "relative mt-3 flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-2 transition-transform duration-100",
              lastResult === "hit" && "scale-110",
            )}
            style={{
              borderColor: "#ff4fd8",
              background: "rgba(10,6,32,0.55)",
              boxShadow:
                "0 0 22px 2px rgba(255,79,216,0.55), inset 0 0 22px rgba(255,79,216,0.15)",
            }}
          >
            <div
              className="absolute bottom-0 left-0 w-1.5"
              style={{
                height: `${timeLeftPct}%`,
                background: "#27e0ff",
                boxShadow: "0 0 10px 2px rgba(39,224,255,0.8)",
                transition: "height 80ms linear",
              }}
            />
            <span className="font-display text-4xl font-extrabold text-white">{shape.label}</span>
          </div>
          {shape.needsMotion && (
            <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#27e0ff]/80">
              Trace it in the air
            </p>
          )}
        </div>

        {paused && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0620]/85">
            <button
              onClick={onPauseToggle}
              className="flex items-center gap-2 rounded-full bg-beat px-6 py-3 font-semibold text-void"
            >
              <Play className="h-4 w-4" fill="currentColor" /> Resume
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-xl border border-line bg-panel p-4">
        {config.showCues && (
          <img
            src={`/handsigns/${shape.label}.png`}
            alt={`Reference photo of the ${shape.label} handshape`}
            className={clsx(
              "h-20 w-20 flex-shrink-0 rounded-lg border-2 object-cover",
              shape.ring,
            )}
            onError={(e) => {
              console.warn(
                `No handshape reference image found at /handsigns/${shape.label}.png`,
              );
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div>
          <p className="font-medium text-ink">
            Sign &ldquo;{shape.label}&rdquo; &mdash; {shape.gloss}
          </p>
          {config.showCues && (
            <p className="mt-1 text-sm text-mute">{shape.cue}</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes signify-twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
        @keyframes signify-pop {
          0% { opacity: 0; transform: scale(0.6); }
          25% { opacity: 1; transform: scale(1.15); }
          70% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05); }
        }
        @keyframes signify-drift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(18px); }
        }
      `}</style>
    </div>
  );
}

function ResultsPanel({
  song,
  score,
  accuracy,
  maxCombo,
  hits,
  misses,
  onReplay,
}: {
  song: Song;
  score: number;
  accuracy: number;
  maxCombo: number;
  hits: number;
  misses: number;
  onReplay: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-line bg-panel p-8 text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-mute">
        Round complete
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold text-ink">
        {accuracy}% accuracy
      </h2>
      <p className="mt-1 text-mute">on {song.title}</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-line bg-panel2 p-4">
          <p className="font-mono text-xl text-ink">{score}</p>
          <p className="text-xs text-mute">Score</p>
        </div>
        <div className="rounded-xl border border-line bg-panel2 p-4">
          <p className="font-mono text-xl text-combo">{maxCombo}</p>
          <p className="text-xs text-mute">Best combo</p>
        </div>
        <div className="rounded-xl border border-line bg-panel2 p-4">
          <p className="font-mono text-xl text-ink">
            {hits}/{hits + misses}
          </p>
          <p className="text-xs text-mute">Hits</p>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          onClick={onReplay}
          className="inline-flex items-center gap-2 rounded-full bg-beat px-6 py-3 font-semibold text-void transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" /> Play again
        </button>
        <Link
          href={`/choose-music/${song.id}/mode`}
          className="rounded-full border border-line px-6 py-3 font-semibold text-ink hover:border-shape/50"
        >
          Change mode
        </Link>
        <Link
          href="/main"
          className="rounded-full border border-line px-6 py-3 font-semibold text-ink hover:border-shape/50"
        >
          Main page
        </Link>
      </div>
    </div>
  );
}