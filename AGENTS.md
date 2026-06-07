# AGENTS.md — vision-ai

> Real-time browser-based activity detection using MediaPipe.
> Location: `/Users/findbowman/Documents/github.bowmanlee/vision-ai`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vite + React 18 + TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| CV Engine | MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) |
| Testing | Vitest + jsdom |

---

## Architecture

The project follows a strict layered pipeline:

```
CameraSource (video stream)
    ↓
VisionPipeline (MediaPipe inference: face, pose, hand)
    ↓
Features (FaceFeatures, PoseFeatures, HandFeatures)
    ↓
Detectors (DoomScroll, Posture, Fatigue)
    ↓
ActivityFusionEngine (hysteresis + priority)
    ↓
AlertManager (policies + cooldowns + channels)
    ↓
React UI (CameraFeed, StatusBar, DebugPanel, AlertOverlay)
```

**Invariants:**
- Pure logic (features, detectors, fusion, alerts) must be testable without DOM or MediaPipe.
- React state updates are throttled to ~10fps; detection loop runs at display refresh with frame skipping.
- All layers expose `reset()` for clean teardown.

---

## Key Files

| Path | Responsibility |
|------|---------------|
| `src/perception/CameraSource.ts` | Webcam lifecycle, permission handling, track-ended events |
| `src/perception/VisionPipeline.ts` | MediaPipe init with GPU→CPU fallback, detect, dispose |
| `src/features/*.ts` | Landmark → semantic metric extraction |
| `src/detectors/*.ts` | Hysteresis-based condition detection |
| `src/fusion/ActivityFusionEngine.ts` | Multi-detector fusion with priority + hold time |
| `src/alerts/*.ts` | Policy evaluation, cooldowns, audio/visual channels |
| `src/hooks/useVisionSystem.ts` | Orchestrates the full pipeline; throttles React state |

---

## Development

```bash
npm install
npm run dev          # localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # tsc + vite build
npm run test         # vitest run
npm run test:watch   # vitest
```

---

## Rules

- **No `any` types** — strict mode is enabled.
- **No `console` in production** — `eslint` catches most; keep `warn`/`error` for infrastructure only.
- **All pure logic must have unit tests** — see `src/**/*.test.ts`.
- **Do not call `setState` on every animation frame** — use refs + throttling (see `useVisionSystem.ts`).
- **Always clean up on unmount** — cancel rAF, stop camera, dispose MediaPipe, reset detectors.
- **Camera permission errors must surface to the UI** — never silently fail.

---

## Security Notes

- Camera data never leaves the browser.
- MediaPipe WASM/models load from CDN on first run.
- No secrets or API keys in the client bundle.

---

Last updated: 2026-06-07
