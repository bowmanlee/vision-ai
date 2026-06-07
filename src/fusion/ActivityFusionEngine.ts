import type { DetectionResult, UserActivity, ActivitySnapshot } from '../types';
import { compareSeverity } from '../types';

/**
 * ActivityFusionEngine combines multiple detector outputs into a single
 * canonical UserActivity with hysteresis to prevent flickering.
 *
 * Priority order (highest wins if confidence is sufficient):
 *   FATIGUED > DOOM_SCROLLING > SLOUCHING > FOCUSED
 *
 * Invariant: the output activity must remain stable for at least
 * `minHoldMs` before transitioning to a different state.
 */

const ACTIVITY_PRIORITY: UserActivity[] = [
  'FATIGUED',
  'DOOM_SCROLLING',
  'SLOUCHING',
  'FOCUSED',
];

interface DetectorMapping {
  doomScroll: DetectionResult<unknown> | null;
  posture: DetectionResult<unknown> | null;
  fatigue: DetectionResult<unknown> | null;
}

function maxSeverity(results: DetectionResult<unknown>[]): import('../types').Severity {
  let best: import('../types').Severity = 'low';
  for (const r of results) {
    if (compareSeverity(r.severity, best) > 0) {
      best = r.severity;
    }
  }
  return best;
}

export class ActivityFusionEngine {
  private minHoldMs: number;
  private currentActivity: UserActivity = 'UNKNOWN';
  private currentConfidence = 0;
  private activityStartTime = 0;
  private lastSnapshot: ActivitySnapshot | null = null;

  constructor(minHoldMs = 800) {
    this.minHoldMs = minHoldMs;
  }

  fuse(now: number, inputs: DetectorMapping): ActivitySnapshot {
    const candidates: { activity: UserActivity; confidence: number; detectors: string[]; results: DetectionResult<unknown>[] }[] = [];

    if (inputs.fatigue && inputs.fatigue.detected) {
      candidates.push({ activity: 'FATIGUED', confidence: inputs.fatigue.confidence, detectors: ['fatigue'], results: [inputs.fatigue] });
    }
    if (inputs.doomScroll && inputs.doomScroll.detected) {
      candidates.push({ activity: 'DOOM_SCROLLING', confidence: inputs.doomScroll.confidence, detectors: ['doomScroll'], results: [inputs.doomScroll] });
    }
    if (inputs.posture && inputs.posture.detected) {
      candidates.push({ activity: 'SLOUCHING', confidence: inputs.posture.confidence, detectors: ['posture'], results: [inputs.posture] });
    }

    // Default to FOCUSED if face is visible and no negative signals.
    const faceVisible = inputs.fatigue != null && inputs.fatigue.confidence > 0;
    if (candidates.length === 0 && faceVisible) {
      candidates.push({ activity: 'FOCUSED', confidence: 0.7, detectors: ['default'], results: [] });
    }

    // If nothing, unknown.
    if (candidates.length === 0) {
      const snapshot: ActivitySnapshot = {
        activity: 'UNKNOWN',
        confidence: 0,
        severity: 'low',
        timestamp: now,
        contributingDetectors: [],
      };
      this.lastSnapshot = snapshot;
      return snapshot;
    }

    // Pick highest priority candidate.
    let best = candidates[0];
    for (const candidate of candidates) {
      const currentPriority = ACTIVITY_PRIORITY.indexOf(candidate.activity);
      const bestPriority = ACTIVITY_PRIORITY.indexOf(best.activity);
      if (currentPriority < bestPriority) {
        best = candidate;
      }
    }

    // Hysteresis: if activity changed, enforce min hold time.
    if (best.activity !== this.currentActivity) {
      const elapsed = now - this.activityStartTime;
      if (elapsed < this.minHoldMs && this.currentActivity !== 'UNKNOWN') {
        // Stick with current activity but decay confidence slightly.
        best = {
          activity: this.currentActivity,
          confidence: this.currentConfidence * 0.95,
          detectors: this.lastSnapshot?.contributingDetectors ?? [],
          results: [],
        };
      } else {
        this.currentActivity = best.activity;
        this.activityStartTime = now;
      }
    }

    this.currentConfidence = best.confidence;

    const severity = best.results.length > 0
      ? maxSeverity(best.results)
      : 'low';

    const snapshot: ActivitySnapshot = {
      activity: best.activity,
      confidence: best.confidence,
      severity,
      timestamp: now,
      contributingDetectors: best.detectors,
    };

    this.lastSnapshot = snapshot;
    return snapshot;
  }

  reset(): void {
    this.currentActivity = 'UNKNOWN';
    this.currentConfidence = 0;
    this.activityStartTime = 0;
    this.lastSnapshot = null;
  }
}
