# ROADMAP — vision-ai

> Living document of planned features, experiments, and architectural improvements.
> Last updated: 2026-06-07

---

## How to Use This Roadmap

- **Priority order**: Higher = do first.
- **Effort**: S / M / L (small / medium / large).
- **Status**: `planned` | `in-progress` | `done` | `idea`.
- When you resume a session, pick the top `planned` item that matches your current goal.

---

## Core Improvements

| # | Feature | Description | Effort | Status |
|---|---------|-------------|--------|--------|
| 1 | **Session History** | Persist activity + expression + posture metrics over time (localStorage or IndexedDB). Show hourly/daily charts. | M | planned |
| 2 | **Break Reminders** | Detect prolonged focused work → trigger a "take a break" alert. Configurable interval (e.g., 25 min Pomodoro). | S | planned |
| 3 | **Posture Score** | Continuous posture quality score (0-100) based on neck angle + shoulder alignment + slouch duration. Trend over session. | S | planned |
| 4 | **Blink Rate Tracking** | Track blinks per minute from EAR. Alert if too low (dry eyes) or too frequent (fatigue/stress). | S | planned |
| 5 | **Gaze Direction** | Estimate where the user is looking (screen center, left, right, down) from iris landmarks. | M | planned |
| 6 | **Head Gesture Commands** | Detect nod (yes), shake (no), tilt — map to actions (pause, dismiss alert, etc.). | M | planned |

---

## Expression & Emotion

| # | Feature | Description | Effort | Status |
|---|---------|-------------|--------|--------|
| 7 | **Emotion Intensity** | Track emotional arousal/valence over time. Plot stress curve during work sessions. | M | planned |
| 8 | **Engagement Score** | Combine expression + gaze + head pose → engagement metric (0-100) for meeting/presentation analytics. | M | planned |
| 9 | **Custom Expression Triggers** | Let users train their own expression triggers (e.g., "raise eyebrows = mute mic"). | L | idea |

---

## Use-Case Expansions

### A) Personal Wellness / Desk Worker
- [ ] Screen-time posture report (daily email / notification summary)
- [ ] Eye-strain warnings (20-20-20 rule: every 20 min, look 20 ft away for 20 sec)
- [ ] Standing desk reminder (detect if sitting too long via pose height drift)

### B) Meeting / Presentation Analytics
- [ ] Attention heatmap over presentation duration
- [ ] Expression timeline export (CSV/JSON)
- [ ] Speaker engagement score per segment

### C) Accessibility / Hands-Free
- [ ] Head-gesture scroll (tilt head down = scroll down)
- [ ] Blink-to-click (double blink = mouse click at gaze point)
- [ ] Expression-to-action (smile = play/pause, frown = mute)

### D) Gaming / Interactive
- [ ] Pose-controlled minigame (dodge by leaning, jump by raising hands)
- [ ] Expression-reactive avatar (mirror user's face on a character)

### E) Healthcare / Clinical
- [ ] Fatigue trend logging (long-term drowsiness patterns)
- [ ] Pain detection proxy (facial tension from brow/eye blendshapes)
- [ ] Tremor detection (hand landmark jitter analysis)

---

## Technical Debt & Hardening

| # | Task | Description | Effort | Status |
|---|------|-------------|--------|--------|
| 10 | **Service Worker** | Cache MediaPipe WASM/models locally so offline/reloads are instant. | S | planned |
| 11 | **Web Worker** | Move MediaPipe inference off the main thread to prevent UI jank. | M | planned |
| 12 | **Metrics Export** | Export session data as JSON/CSV for analysis in external tools. | S | planned |
| 13 | **Settings Panel** | UI for toggling detectors, adjusting thresholds, enabling/disabling alerts. | M | planned |
| 14 | **E2E Tests** | Add Playwright tests for camera permission flow, detection loop, and alert firing. | L | idea |
| 15 | **Performance Profiling** | Add FPS counter, inference time histogram, memory usage tracking to DebugPanel. | S | planned |

---

## Experiment Ideas (Low Priority)

- [ ] **Background blur** using MediaPipe segmentation
- [ ] **Avatar overlay** — render a 3D avatar that mirrors head pose + expression
- [ ] **ASL finger-spelling** — detect individual letters from hand landmarks
- [ ] **Breathing rate** — estimate from shoulder/chest landmark movement
- [ ] **Micro-expression detection** — sub-second expression spikes (requires higher frame-rate smoothing)

---

## Suggested Next Session

If you want to pick one thing to build next, the highest-value / lowest-effort wins are:

1. **Session History (#1)** — adds real value immediately; users can see trends
2. **Break Reminders (#2)** — practical wellness feature; simple to implement
3. **Posture Score (#3)** — gamifies the existing posture detector

Pick whichever matches your current interest and I can spec it out.

---

*To add an idea: edit this file or tell me and I'll append it.*
