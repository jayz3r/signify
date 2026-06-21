// Full ASL fingerspelling alphabet (A-Z) as static handshapes, plus a
// heuristic classifier that turns MediaPipe Hands landmarks into a letter.
//
// HONEST LIMITATION: a 2D front-facing webcam with no depth and no reliable
// orientation signal cannot fully separate every ASL letter — several pairs
// are the *same* landmark geometry, just rotated:
//   G / Q   - same hand shape, G points sideways, Q points down
//   H / U   - same hand shape, H is rotated 90° from U
//   K / P   - same hand shape, P just points downward
//   M / N   - thumb sits one knuckle deeper for N than M (subtle, depth-ish)
// J and Z aren't static poses at all — they're drawn in the air, so they
// need motion, not just a single frame.
//
// Rather than fake confidence we don't have, each entry below carries a
// `reliable` flag. Unreliable ones still get a real definition (useful for
// a "learn the alphabet" reference/Learning-mode flashcard), but
// `lib/chart.ts` should only pull from reliable letters when building a
// scored chart, or a player will get marked wrong for something the camera
// genuinely cannot tell apart.

export type HandshapeId =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l"
  | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x"
  | "y" | "z";

export interface Handshape {
  id: HandshapeId;
  /** Letter shown on the falling note + prompt card */
  label: string;
  /** ASL description shown under the label */
  gloss: string;
  /** Cue text for Learning mode */
  cue: string;
  /** Tailwind color classes for this letter's note color */
  color: string;
  ring: string;
  /** Can this be told apart from everything else with a single 2D frame? */
  reliable: boolean;
  /** Needs hand motion over time, not just a static pose (J, Z) */
  needsMotion?: boolean;
}

const palette = [
  { color: "bg-shape", ring: "ring-shape/60" },
  { color: "bg-beat", ring: "ring-beat/60" },
  { color: "bg-combo", ring: "ring-combo/60" },
];
const c = (i: number) => palette[i % palette.length];

export const HANDSHAPES: Record<HandshapeId, Handshape> = {
  a: { id: "a", label: "A", gloss: "Closed fist, thumb beside fingers", cue: "Make a fist with your thumb resting against the side of your index finger.", ...c(0), reliable: true },
  b: { id: "b", label: "B", gloss: "Flat hand, thumb folded across palm", cue: "Hold all four fingers straight up together, thumb tucked flat across your palm.", ...c(1), reliable: true },
  c: { id: "c", label: "C", gloss: "Curved hand like a C", cue: "Curve your fingers and thumb into a loose C, like holding a small cup.", ...c(2), reliable: true },
  d: { id: "d", label: "D", gloss: "Index up, thumb touches middle finger", cue: "Point your index finger up, touch your thumb to your middle fingertip, curl ring and pinky.", ...c(0), reliable: true },
  e: { id: "e", label: "E", gloss: "Fingertips curled to thumb", cue: "Curl all four fingertips down to touch your thumb, like a claw closing.", ...c(1), reliable: true },
  f: { id: "f", label: "F", gloss: "Thumb + index circle, others up", cue: "Touch thumb and index fingertip together, keep middle, ring, and pinky straight up.", ...c(2), reliable: true },
  g: { id: "g", label: "G", gloss: "Index + thumb pointing sideways", cue: "Point index finger and thumb out sideways, parallel to each other, palm facing your body.", ...c(0), reliable: false },
  h: { id: "h", label: "H", gloss: "Index + middle pointing sideways", cue: "Index and middle finger out together pointing sideways, thumb tucked.", ...c(1), reliable: false },
  i: { id: "i", label: "I", gloss: "Pinky only, fist otherwise", cue: "Only your pinky is up, everything else curled into a fist.", ...c(2), reliable: true },
  j: { id: "j", label: "J", gloss: "I-shape, traced like a J", cue: "Hold the I handshape (pinky up) and draw a small J in the air.", ...c(0), reliable: true, needsMotion: true },
  k: { id: "k", label: "K", gloss: "Index + middle up, thumb between", cue: "Index and middle finger up in a V, thumb touches the middle finger's base.", ...c(1), reliable: true },
  l: { id: "l", label: "L", gloss: "Thumb + index forming an L", cue: "Index finger up, thumb out to the side — make an L shape.", ...c(2), reliable: true },
  m: { id: "m", label: "M", gloss: "Fist, thumb under three fingers", cue: "Curl index, middle, and ring over your tucked thumb.", ...c(0), reliable: false },
  n: { id: "n", label: "N", gloss: "Fist, thumb under two fingers", cue: "Curl index and middle over your tucked thumb.", ...c(1), reliable: false },
  o: { id: "o", label: "O", gloss: "Fingertips meet thumb in a circle", cue: "Curl every fingertip to touch your thumb tip, forming a round O.", ...c(2), reliable: true },
  p: { id: "p", label: "P", gloss: "K-shape pointing down", cue: "Same as K, but the hand points downward.", ...c(0), reliable: false },
  q: { id: "q", label: "Q", gloss: "G-shape pointing down", cue: "Same as G, but the hand points downward.", ...c(1), reliable: false },
  r: { id: "r", label: "R", gloss: "Index + middle crossed", cue: "Cross your index and middle fingers, thumb and other fingers tucked.", ...c(2), reliable: true },
  s: { id: "s", label: "S", gloss: "Fist, thumb crosses in front", cue: "Make a fist with your thumb crossed in front of your fingers.", ...c(0), reliable: true },
  t: { id: "t", label: "T", gloss: "Fist, thumb between index/middle", cue: "Make a fist with your thumb tucked between your index and middle finger.", ...c(1), reliable: true },
  u: { id: "u", label: "U", gloss: "Index + middle up together", cue: "Index and middle finger straight up, held close together, thumb tucked.", ...c(2), reliable: true },
  v: { id: "v", label: "V", gloss: "Index + middle in a V", cue: "Index and middle finger up, spread apart in a V, thumb relaxed.", ...c(0), reliable: true },
  w: { id: "w", label: "W", gloss: "Index + middle + ring up", cue: "Index, middle, and ring finger up and spread, thumb and pinky tucked.", ...c(1), reliable: true },
  x: { id: "x", label: "X", gloss: "Index hooked like a hook", cue: "Curl your index finger into a hook, other fingers curled into a fist.", ...c(2), reliable: true },
  y: { id: "y", label: "Y", gloss: "Thumb + pinky out", cue: "Thumb and pinky stick out, the three middle fingers curl down.", ...c(0), reliable: true },
  z: { id: "z", label: "Z", gloss: "Index traces a Z in the air", cue: "Point your index finger and draw a Z shape in the air.", ...c(1), reliable: true, needsMotion: true },
};

export const HANDSHAPE_LIST = Object.values(HANDSHAPES);
export const RELIABLE_HANDSHAPES = HANDSHAPE_LIST.filter((h) => h.reliable);

// ---- Landmark classification --------------------------------------------

// MediaPipe Hands returns 21 normalized landmarks per hand:
// 0 wrist, 1-4 thumb, 5-8 index, 9-12 middle, 13-16 ring, 17-20 pinky.
export type Landmark = { x: number; y: number; z: number };
export type TrailPoint = { x: number; y: number; t: number };

type Curl = "extended" | "hook" | "curled";

function dist(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function fingerCurl(lm: Landmark[], tip: number, pip: number, mcp: number, wrist: Landmark): Curl {
  const tipD = dist(lm[tip], wrist);
  const pipD = dist(lm[pip], wrist);
  const mcpD = dist(lm[mcp], wrist);
  // "extended" needs real separation from the pip distance, not just a hair
  // more — a relaxed half-open hand was sneaking into "hook" instead of
  // "extended", which then let it through C's allHook check below.
  if (tipD > pipD * 1.05 && tipD > mcpD * 1.15) return "extended";
  if (tipD < pipD * 0.92) return "curled";
  return "hook"; // bent at one joint but tip hasn't folded past the pip — claw/hook shapes
}

interface HandFeatures {
  thumb: Curl | "tucked"; // thumb doesn't curl the same way; tracked separately below
  index: Curl;
  middle: Curl;
  ring: Curl;
  pinky: Curl;
  thumbTouches: "index" | "middle" | "none";
  thumbAcrossPalm: boolean; // S: thumb crosses in front of curled fingers
  thumbBetweenIndexMiddle: boolean; // T
  thumbBesideHand: boolean; // A: thumb rests beside, not crossing or touching
  indexMiddleClose: boolean; // U vs V spacing
  indexMiddleCrossed: boolean; // R
  palmWidth: number;
}

function getFeatures(lm: Landmark[]): HandFeatures {
  const wrist = lm[0];
  const index = fingerCurl(lm, 8, 6, 5, wrist);
  const middle = fingerCurl(lm, 12, 10, 9, wrist);
  const ring = fingerCurl(lm, 16, 14, 13, wrist);
  const pinky = fingerCurl(lm, 20, 18, 17, wrist);

  const palmWidth = dist(lm[5], lm[17]) || 0.001;
  const thumbTip = lm[4];
  const thumbExtendedOut = dist(thumbTip, lm[5]) / palmWidth > 0.75 && dist(thumbTip, wrist) > dist(lm[2], wrist);
  const thumb: Curl | "tucked" = thumbExtendedOut ? "extended" : "tucked";

  // Generous touch threshold — real hands rarely get thumb and fingertip
  // pixel-perfect together, especially for O, which is the whole point of
  // this check. Too tight a threshold here was letting valid O poses fall
  // through to "none" and get caught by the looser C check below instead.
  const touchThresh = palmWidth * 0.48;
  let thumbTouches: HandFeatures["thumbTouches"] = "none";
  if (dist(thumbTip, lm[8]) < touchThresh) thumbTouches = "index";
  else if (dist(thumbTip, lm[12]) < touchThresh) thumbTouches = "middle";

  const indexPipMid = lm[6];
  const middlePipMid = lm[10];
  const betweenMidpoint: Landmark = {
    x: (indexPipMid.x + middlePipMid.x) / 2,
    y: (indexPipMid.y + middlePipMid.y) / 2,
    z: 0,
  };
  const thumbBetweenIndexMiddle = dist(thumbTip, betweenMidpoint) < palmWidth * 0.3;

  // S: thumb tip sits in front of (covering) the curled index/middle fingertips
  const thumbAcrossPalm = dist(thumbTip, lm[10]) < palmWidth * 0.45 && !thumbBetweenIndexMiddle;

  // A: thumb rests against the side of the curled index finger, not crossing
  const thumbBesideHand = dist(thumbTip, lm[5]) < palmWidth * 0.55 && !thumbAcrossPalm && !thumbBetweenIndexMiddle;

  const indexMiddleClose = dist(lm[8], lm[12]) < palmWidth * 0.35;
  const indexMiddleCrossed = (lm[8].x - lm[5].x) * (lm[12].x - lm[9].x) < 0 && index !== "curled" && middle !== "curled";

  return {
    thumb,
    index,
    middle,
    ring,
    pinky,
    thumbTouches,
    thumbAcrossPalm,
    thumbBetweenIndexMiddle,
    thumbBesideHand,
    indexMiddleClose,
    indexMiddleCrossed,
    palmWidth,
  };
}

/**
 * Classify a single hand's landmarks into one of the 24 static ASL letters
 * (everything except the motion letters J and Z — use
 * `classifyHandshapeWithMotion` if you also have a recent finger trail).
 * Returns null if the pose doesn't clearly match anything we track.
 */
export function classifyHandshape(lm: Landmark[]): HandshapeId | null {
  if (!lm || lm.length < 21) return null;
  const f = getFeatures(lm);
  const ext = (x: Curl) => x === "extended";
  const curled = (x: Curl) => x === "curled";
  const curledOrHook = (x: Curl) => x === "curled" || x === "hook";

  // --- thumb-touch letters (most specific, check first) ---
  if (f.thumbTouches === "index" && !ext(f.index) && ext(f.middle) && ext(f.ring) && ext(f.pinky)) return "f";

  // O: thumb tip touches index fingertip and all four fingers are rounded
  // (curled OR hook is fine — real hands rarely curl O all the way past the
  // strict "curled" threshold, so requiring full curl here was misreading a
  // good O as a hooked C). The thumb-touch is what actually distinguishes O
  // from C — C leaves a visible gap between thumb and fingers.
  if (
    f.thumbTouches === "index" &&
    curledOrHook(f.index) &&
    curledOrHook(f.middle) &&
    curledOrHook(f.ring) &&
    curledOrHook(f.pinky)
  ) {
    return "o";
  }

  if (f.thumbTouches === "middle" && ext(f.index) && !ext(f.middle) && curled(f.ring) && curled(f.pinky)) return "d";

  // C: all four fingers rounded (curled OR hook — a real C often curls
  // tighter than the old "hook"-only check expected, which made the
  // classifier miss it entirely once finger-curl detection got stricter).
  // Distinguish from the A/S/T fist shapes by thumb position: in C the
  // thumb curves out to the side. It must not be touching a fingertip
  // (that's O's job) and not doing S's "across palm" or T's "between
  // index/middle" things. We DON'T exclude "thumbBesideHand" here anymore —
  // a real C's thumb often still falls within that distance threshold from
  // the index MCP, so excluding it was sending real C poses straight past
  // this check and into the A fist-shape branch instead.
  // To keep this from also swallowing A (a tight closed fist), require at
  // least one finger to be "hook" rather than fully "curled" — A's fingers
  // are all the way curled into the palm, C's are looser.
  const fingersRoundedForC =
    curledOrHook(f.index) && curledOrHook(f.middle) && curledOrHook(f.ring) && curledOrHook(f.pinky);
  const atLeastOneHookForC =
    f.index === "hook" || f.middle === "hook" || f.ring === "hook" || f.pinky === "hook";
  if (
    fingersRoundedForC &&
    atLeastOneHookForC &&
    f.thumbTouches === "none" &&
    !f.thumbAcrossPalm &&
    !f.thumbBetweenIndexMiddle
  ) {
    return "c";
  }

  // --- crossed / hooked fingers ---
  if (f.indexMiddleCrossed && !ext(f.ring) && !ext(f.pinky)) return "r";
  if (f.index === "hook" && curled(f.middle) && curled(f.ring) && curled(f.pinky)) return "x";

  // --- four-finger groups ---
  const fourUp = ext(f.index) && ext(f.middle) && ext(f.ring) && ext(f.pinky);
  if (fourUp && f.thumb === "tucked") return "b";
  if (ext(f.index) && ext(f.middle) && ext(f.ring) && !ext(f.pinky)) return "w";

  // --- two-finger groups (index + middle), thumb position disambiguates ---
  if (ext(f.index) && ext(f.middle) && !ext(f.ring) && !ext(f.pinky)) {
    if (f.indexMiddleClose) return "u"; // also covers H (orientation-ambiguous)
    if (f.thumbBetweenIndexMiddle || dist(lm[4], lm[10]) < f.palmWidth * 0.45) return "k"; // also covers P
    return "v";
  }

  // --- single finger groups ---
  if (ext(f.pinky) && !ext(f.index) && !ext(f.middle) && !ext(f.ring)) {
    return f.thumb === "extended" ? "y" : "i";
  }
  if (ext(f.index) && !ext(f.middle) && !ext(f.ring) && !ext(f.pinky)) {
    return f.thumb === "extended" ? "l" : "g"; // plain point with thumb tucked ~ G/Q (orientation-ambiguous)
  }

  // --- fully curled fist variants: A / S / E / M / N / T ---
  const fistClosed = curled(f.index) && curled(f.middle) && curled(f.ring) && curled(f.pinky);
  if (fistClosed) {
    if (f.thumbBetweenIndexMiddle) return "t";
    if (f.thumbAcrossPalm) return "s";
    if (f.thumbBesideHand) return "a";
    // thumb tucked low/under fingertips and not matching the above = E or M/N,
    // distinguished only by how deep the thumb tucks — not reliably separable
    // in 2D, so we default to the more common letter of the pair.
    if (dist(lm[4], lm[8]) < f.palmWidth * 0.4) return "e";
    return "m";
  }

  return null;
}

/**
 * J and Z are motion letters — same-frame landmarks aren't enough. Pass a
 * short trail of a fingertip's recent positions (e.g. the index tip, ~0.6-1s
 * of samples) alongside the current static classification, and this will
 * upgrade "i" -> "j" or "g"/point -> "z" if the trail looks like the
 * corresponding traced shape. Best-effort heuristic, not a trained gesture
 * recognizer.
 */
export function classifyHandshapeWithMotion(
  lm: Landmark[],
  trail: TrailPoint[] | undefined
): HandshapeId | null {
  const staticShape = classifyHandshape(lm);
  if (!trail || trail.length < 5) return staticShape;

  // Only look at a recent, reasonably-spaced window so a long stale trail
  // (e.g. left over from holding still) doesn't drown out the actual motion.
  const now = trail[trail.length - 1].t;
  const recent = trail.filter((p) => now - p.t < 700);
  if (recent.length < 5) return staticShape;

  const xs = recent.map((p) => p.x);
  const ys = recent.map((p) => p.y);
  const xRange = Math.max(...xs) - Math.min(...xs);
  const yRange = Math.max(...ys) - Math.min(...ys);
  const totalRange = Math.max(xRange, yRange);

  // Need at least a small amount of real movement — otherwise a twitchy
  // static hold could get misread as a trace.
  if (totalRange < 0.03) return staticShape;

  // Smooth out single-frame jitter before measuring direction reversals:
  // average each point with its neighbor so tiny tracking noise doesn't
  // register as a fake direction change.
  const smoothX: number[] = xs.map((x, i) => {
    const prev = xs[Math.max(0, i - 1)];
    const next = xs[Math.min(xs.length - 1, i + 1)];
    return (prev + x + next) / 3;
  });

  let xReversals = 0;
  for (let i = 2; i < smoothX.length; i++) {
    const prevDelta = smoothX[i - 1] - smoothX[i - 2];
    const delta = smoothX[i] - smoothX[i - 1];
    if (Math.abs(prevDelta) > 0.004 && Math.abs(delta) > 0.004 && Math.sign(prevDelta) !== Math.sign(delta)) {
      xReversals++;
    }
  }

  // Z: held as a "g"-like point (index out, thumb tucked), traced mostly
  // sideways with at least one back-and-forth in x. Loosened from requiring
  // a strict horizontal-dominant ratio — diagonal strokes of a real Z still
  // count, as long as there's clearly more horizontal travel than a static
  // hold and at least one reversal.
  if (staticShape === "g" && xRange > 0.04 && xRange >= yRange * 0.7 && xReversals >= 1) {
    return "z";
  }

  // J: held as an I (pinky up), path dips down then hooks sideways. Loosened
  // to just check there's a clear vertical component followed by a
  // horizontal component, rather than requiring a strict first-half/second-
  // half split which was easy to miss with uneven sampling.
  if (staticShape === "i") {
    const firstThird = recent[Math.floor(recent.length / 3)];
    const lastPoint = recent[recent.length - 1];
    const dy = lastPoint.y - recent[0].y;
    const dxAfterDip = lastPoint.x - firstThird.x;
    if (dy > 0.025 && Math.abs(dxAfterDip) > 0.02) {
      return "j";
    }
  }

  return staticShape;
}