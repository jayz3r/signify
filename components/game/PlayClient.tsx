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
  // lane keeps moving even if the <audio> element never actually plays.
  useEffect(() => {
    if (phase !== "playing") return;
    let raf: number;
    const tick = () => {
      const current = chart.current[noteIndex];
      if (!current) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const { start, pausedMs, pauseBeganAt } = noteClockRef.current;
      const livePause =
        pauseBeganAt != null ? performance.now() - pauseBeganAt : 0;
      const elapsed = (performance.now() - start - pausedMs - livePause) / 1000;
      const p = Math.min(1, elapsed / config.travelTime);
      setProgress(p);

      if (detectedRef.current === current.shape) {
        advanceNote("hit");
        return;
      }
      if (!config.forgiving && elapsed >= config.travelTime) {
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

  return (
    <div
      className={clsx(
        "min-h-[calc(100vh-73px)]",
        BACKGROUNDS[bg] ?? BACKGROUNDS.void,
      )}
    >
      <div className="mx-auto max-w-4xl px-6 py-8">
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

        {/* Camera + hands status, always mounted so getUserMedia keeps a stable ref */}
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-line bg-panel">
          <video
            ref={videoRef}
            className="h-56 w-full -scale-x-100 object-cover opacity-90 sm:h-72"
            muted
            playsInline
          />
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

// Deterministic pseudo-random sparkle field (no Math.random — keeps SSR and
// client markup identical so hydration doesn't complain).
const SPARKLES = Array.from({ length: 26 }).map((_, i) => {
  const seed = i * 9301 + 49297;
  const rnd = (n: number) => ((seed * (n * 7919 + 1)) % 233280) / 233280;
  return {
    x: rnd(1) * 100,
    y: rnd(2) * 58,
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

  // Perspective interpolation: the note starts tiny near the vanishing
  // point at the top of the corridor and grows as it nears the hit line.
  const t = Math.min(progress, 1);
  const topPct = 8 + t * 76;
  const scale = 0.3 + t * 1.0;
  const opacity = 0.55 + t * 0.45;
  const tierFill = ((combo % 5) / 5) * 100;

  return (
    <div className="mt-6">
      <div
        className="relative h-[26rem] overflow-hidden rounded-[28px] border border-[#3c2c78]/70"
        style={{
          background:
            "radial-gradient(ellipse 120% 70% at 50% 0%, #2a1c63 0%, #170f3c 45%, #0a0620 100%)",
          boxShadow: "0 0 60px -10px rgba(120,60,255,0.45)",
        }}
      >
        {/* ambient sparkle field */}
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

        {/* corridor: rails converging on a vanishing point, plus depth rungs */}
        <svg
          viewBox="0 0 700 420"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <filter
              id="signify-glow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="signify-rail" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4fd8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ff4fd8" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {[0.18, 0.36, 0.56, 0.78].map((f, i) => {
            const halfTop = 18;
            const halfBottom = 330;
            const half = halfTop + (halfBottom - halfTop) * f;
            const y = 46 + f * 290;
            return (
              <line
                key={i}
                x1={350 - half}
                y1={y}
                x2={350 + half}
                y2={y}
                stroke="#7d5cff"
                strokeOpacity={0.18 + f * 0.12}
                strokeWidth="1.5"
              />
            );
          })}

          <line
            x1="350"
            y1="40"
            x2="32"
            y2="368"
            stroke="url(#signify-rail)"
            strokeWidth="2.5"
            filter="url(#signify-glow)"
          />
          <line
            x1="350"
            y1="40"
            x2="668"
            y2="368"
            stroke="url(#signify-rail)"
            strokeWidth="2.5"
            filter="url(#signify-glow)"
          />
          <line
            x1="20"
            y1="368"
            x2="680"
            y2="368"
            stroke="#ffe66d"
            strokeWidth="3"
            filter="url(#signify-glow)"
          />
        </svg>

        <div className="absolute left-1/2 top-[87.6%] -translate-x-1/2 -translate-y-1/2">
          <span className="rounded-full bg-[#0a0620]/80 px-3 py-1 text-[11px] font-mono tracking-[0.2em] text-[#ffe66d]">
            HIT ZONE
          </span>
        </div>

        {/* falling note, scaling up as it approaches */}
        <div
          className="absolute left-1/2"
          style={{
            top: `${topPct}%`,
            transform: `translate(-50%, -50%) scale(${scale})`,
            opacity,
          }}
        >
          <div
            className={clsx(
              "flex h-20 w-20 items-center justify-center rounded-2xl font-display text-2xl font-bold text-void ring-4 transition-transform duration-100",
              shape.color,
              shape.ring,
              lastResult === "hit" && "scale-110",
            )}
            style={{
              boxShadow:
                "0 0 24px 4px rgba(255,79,216,0.55), 0 0 48px 12px rgba(125,92,255,0.35)",
            }}
          >
            {shape.label}
          </div>
        </div>

        {/* judgment popup */}
        {lastResult && (
          <div className="pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2">
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
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-[#0a0620]/75 px-3 py-1.5">
          <span
            className="h-2.5 w-2.5 rotate-45 rounded-[3px]"
            style={{ background: "linear-gradient(135deg, #7d5cff, #ff4fd8)" }}
          />
          <span className="font-mono text-sm font-semibold tracking-wide text-white">
            {score.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-[#a78bfa]">
            {noteIndex + 1}/{totalNotes}
          </span>
        </div>

        {/* HUD: combo + tier bar + pause, top-right */}
        <div className="absolute right-4 top-4 flex flex-col items-end gap-1">
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

        {paused && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0620]/85">
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
                `No handshape reference image found at /audio/handsigns/${shape.label}.png`,
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
