# Signify

Signify turns ASL practice into a rhythm game: handshapes fall down the
screen and you sign them back at your webcam. Built with Next.js 14 (App
Router) + Tailwind, with real-time hand tracking via MediaPipe Hands.

## Architecture (matches the product flowchart)

```
/                         Start game splash
/main                     Main page (hub: Choose music / Profile / Settings)
/choose-music             Song list
/choose-music/[songId]    Song detail
/choose-music/[songId]/mode   Choose mode (Normal/Hard vs Learning/Rhythm game)
/play/[songId]?mode=...   Play game (webcam + handshape detection)
/profile                  Streak, accuracy, badges, recent sessions
/settings                 Account, camera, captions, accessibility
/settings/background      Change background (used on the Play screen)
```

## Gameplay

- `lib/handshapes.ts` defines 8 reliably-distinguishable static ASL
  handshapes (5, A, 1, V, W, Y, L, I) and a heuristic classifier that turns
  21 MediaPipe hand landmarks into one of those labels.
- `lib/chart.ts` turns a song + mode into a deterministic sequence of
  handshape "notes" and the timing/forgiveness rules for each mode.
- `components/game/PlayClient.tsx` loads MediaPipe Hands from a CDN,
  requests webcam access, runs the detection loop, and drives the
  falling-note game loop, scoring, combo, and results screen.

### Modes

| Mode | Group | Behavior |
|---|---|---|
| Normal | Normal/Hard | Standard speed and hit window |
| Hard | Normal/Hard | Faster notes, tighter timing |
| Learning | Learning/Rhythm game | Untimed, shows cue text, waits for a match |
| Rhythm game | Learning/Rhythm game | Full scored experience with combo + results |

Camera video is processed entirely client-side (MediaPipe runs in the
browser); no video frames are uploaded anywhere.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the Play screen needs a webcam and will ask
for camera permission the first time you reach it.

## Notes / next steps

- The handshape set is intentionally a small recognizable subset, not the
  full ASL alphabet — expanding it means adding more cases to
  `classifyHandshape` (or swapping in a trained classifier).
- Chart generation in `lib/chart.ts` is deterministic per song but not tied
  to actual song audio yet — hook in real audio playback and timestamp the
  chart against it for full sync.
- "Change background" is saved to `localStorage` and only currently affects
  the Play screen backdrop.
