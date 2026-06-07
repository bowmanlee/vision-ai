# AGENTS.md — vision-ai

> Real-time browser-based activity detection using MediaPipe.
> Location: `/Users/findbowman/Documents/github.bowmanlee/vision-ai`
> GitHub: `https://github.com/bowmanlee/vision-ai`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vite + React 18 + TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| CV Engine | MediaPipe Tasks Vision (`@mediapipe/tasks-vision@0.10.9`) |
| Testing | Vitest + jsdom |
| Dev Server | `localhost:3000` |
| Diagnostic | `localhost:3000/diag.html` (standalone MediaPipe test) |

---

## Architecture

The project follows a strict layered pipeline:

```
CameraSource (video stream)
    ↓
VisionPipeline (MediaPipe inference: face, pose, hand + blendshapes)
    ↓
Features (FaceFeatures, PoseFeatures, HandFeatures, Expressions)
    ↓
Detectors (DoomScroll, Posture, Fatigue, Expression)
    ↓
ActivityFusionEngine (hysteresis + priority)
    ↓
AlertManager (policies + cooldowns + channels)
    ↓
React UI (CameraFeed, StatusBar, LandmarkCanvas, DebugPanel, AlertOverlay)
```

**Invariants:**
- Pure logic (features, detectors, fusion, alerts) must be testable without DOM or MediaPipe.
- React state updates are throttled to ~10fps; detection loop runs at display refresh with frame skipping (every 3rd frame).
- All layers expose `reset()` for clean teardown.
- Detection uses `Math.round(performance.now())` integer timestamps for `detectForVideo`.

---

## Current Capabilities

### Detection
- **Face**: 468 landmarks, 52 blendshapes, EAR (Eye Aspect Ratio), head tilt, visibility
- **Pose**: 33 landmarks, neck flexion angle, shoulder alignment
- **Hands**: 21 landmarks per hand, hand count
- **Expressions**: NEUTRAL, SMILING, FROWNING, SURPRISED, ANGRY, SQUINTING (5-frame smoothed)

### Activities
- `FOCUSED` — upright posture, active face, no fatigue
- `DOOM_SCROLLING` — head down, minimal movement, sustained
- `SLOUCHING` — forward-leaning posture, neck flexion
- `FATIGUED` — low EAR (drowsy eyes), still posture
- `UNKNOWN` — no detections

### UI
- **CameraFeed**: Always rendered (fixes init hang), loading overlay during init
- **LandmarkCanvas**: Skeleton overlay + labels (Nose, Shoulder, Wrist, etc.) + HUD:
  - Detection health badges (Face ✓/✗, Pose ✓/✗, Hands ✓/✗)
  - Activity + confidence (top-right)
  - Expression + confidence (top-right, below activity)
  - Metrics overlay (EAR, neck angle, hand count)
  - "No body detected" center message when nothing found
- **StatusBar**: Activity indicator + expression sub-label + confidence
- **DebugPanel**: Raw blendshape scores, smoothed expression, detector states, fusion metrics
- **AlertOverlay**: Visual alerts for detected conditions

---

## Key Files

| Path | Responsibility |
|------|---------------|
| `src/perception/CameraSource.ts` | Webcam lifecycle, permission handling, abort/timeout, track-ended events |
| `src/perception/VisionPipeline.ts` | MediaPipe init with GPU→CPU fallback, detect, dispose |
| `src/features/FaceFeatures.ts` | EAR, head tilt, visibility, `extractExpressions()` from blendshapes |
| `src/features/PoseFeatures.ts` | Neck flexion, shoulder alignment |
| `src/features/HandFeatures.ts` | Hand count, gesture hints |
| `src/detectors/ExpressionDetector.ts` | 5-frame rolling buffer for expression smoothing |
| `src/detectors/*.ts` | Hysteresis-based condition detection |
| `src/fusion/ActivityFusionEngine.ts` | Multi-detector fusion with priority + hold time |
| `src/alerts/*.ts` | Policy evaluation, cooldowns, audio/visual channels |
| `src/hooks/useVisionSystem.ts` | Orchestrates the full pipeline; throttles React state; exposes `DebugData` |
| `src/components/LandmarkCanvas.tsx` | Canvas overlay: skeleton, labels, HUD |

---

## Development

```bash
npm install
npm run dev          # localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # tsc + vite build
npm run test         # vitest run  (36 tests passing)
npm run test:watch   # vitest
```

---

## How to Resume

1. `cd /Users/findbowman/Documents/github.bowmanlee/vision-ai`
2. `npm run dev` — opens at `localhost:3000`
3. If detection hangs, check `localhost:3000/diag.html` for standalone MediaPipe diagnostics
4. For troubleshooting, open browser DevTools → Console for init step logs

**Common issues:**
- **Stuck at "Initializing..."**: Check camera permission in browser settings. MediaPipe needs camera + WebGL.
- **Always UNKNOWN**: Step back to arm's length, face the camera directly. MediaPipe needs visible face + upper body.
- **No expression**: Ensure sufficient lighting on the face. Blendshapes need clear facial features.

---

## Rules

- **No `any` types** — strict mode is enabled.
- **No `console` in production** — keep `warn`/`error` for infrastructure only.
- **All pure logic must have unit tests** — see `src/**/*.test.ts`.
- **Do not call `setState` on every animation frame** — use refs + throttling (see `useVisionSystem.ts`).
- **Always clean up on unmount** — cancel rAF, stop camera, dispose MediaPipe, reset detectors.
- **Camera permission errors must surface to the UI** — never silently fail.
- **Never commit secrets, `.env`, or `node_modules`** — `.gitignore` is configured.

---

## Security Notes

- Camera data never leaves the browser.
- MediaPipe WASM/models load from jsdelivr CDN on first run.
- No secrets or API keys in the client bundle.

---

## Next Steps / Roadmap

See `ROADMAP.md` for planned features and future directions.

---

Last updated: 2026-06-07
