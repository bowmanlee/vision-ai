# Vision AI

Real-time browser-based activity detection using MediaPipe and TensorFlow.js.

## What it does

- **Face tracking** — detects eye closure, head tilt, and gaze direction.
- **Pose tracking** — measures neck flexion, shoulder tilt, and torso lean.
- **Hand tracking** — identifies hand position and pinch gestures.
- **Activity classification** — fuses signals into canonical states:
  - `FOCUSED`
  - `DOOM_SCROLLING`
  - `SLOUCHING`
  - `FATIGUED`
- **Alerting** — visual and audio alerts when unhealthy states persist.

## Architecture

```
Perception (Camera + MediaPipe)
  → Feature Extraction (Face / Pose / Hand metrics)
    → Detectors (DoomScroll, Posture, Fatigue)
      → Fusion Engine (ActivitySnapshot)
        → Alert Manager (Policies + Channels)
```

All layers are contract-driven and extensible:
- New detectors extend `BaseDetector`.
- New alert channels implement the `AlertChannel` interface.
- Policies are configurable per-activity.

## Getting started

```bash
cd vision-ai
npm install
npm run dev
```

Open `http://localhost:3000` and grant camera access.

> **Note:** First run downloads MediaPipe WASM binaries and model files (~20 MB). The app works entirely offline after caching.

## Browser requirements

- Modern Chrome, Edge, Firefox, or Safari.
- WebGL 2.0 enabled (for GPU-accelerated inference).
- Webcam access.

## Project structure

```
src/
  types/          # Domain contracts and invariants
  perception/     # CameraSource + VisionPipeline
  features/       # Landmark → semantic metrics
  detectors/      # Activity detectors with hysteresis
  fusion/         # Multi-signal activity fusion
  alerts/         # Policy-driven alert dispatch
  hooks/          # React integration
  components/     # UI (camera feed, debug panel, alerts)
```

## License

MIT
