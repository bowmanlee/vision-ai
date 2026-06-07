import { BaseDetector } from './BaseDetector';
import type { FaceMetrics } from '../features';

interface FatigueMeta {
  avgEAR: number;
  eyesClosedDurationMs: number;
  headDroopConfidence: number;
}

/** EAR threshold below which eyes are considered closed. */
const EAR_CLOSED_THRESHOLD = 0.18;
/** Duration (ms) at which eye-closure score reaches maximum. */
const EAR_FULL_SCORE_MS = 2000;
/** Head tilt (deg) considered drooping. */
const HEAD_DROOP_TILT = 15;
/** Nose Y position threshold for droop (lower half of frame). */
const HEAD_DROOP_NOSE_Y = 0.5;
/** Droop contribution to raw confidence when both conditions met. */
const HEAD_DROOP_SCORE = 0.7;

/**
 * Detects fatigue via eye aspect ratio (EAR) and head droop.
 * EAR threshold: < 0.18 for sustained period = drowsy.
 */
export class FatigueDetector extends BaseDetector<FatigueMeta> {
  private lastFace: FaceMetrics | null = null;
  private eyesClosedStart: number | null = null;

  constructor(config?: Partial<import('../types').DetectorConfig>) {
    super('fatigue', config);
  }

  updateFeatures(face: FaceMetrics | null): void {
    this.lastFace = face;
  }

  protected evaluate(now: number) {
    if (!this.lastFace) {
      return {
        rawConfidence: 0,
        severity: 'low' as const,
        metadata: { avgEAR: 1, eyesClosedDurationMs: 0, headDroopConfidence: 0 },
      };
    }

    const { avgEAR, headTiltDeg, noseY } = this.lastFace;

    // Eye closure score
    const eyesClosed = avgEAR < EAR_CLOSED_THRESHOLD;
    if (eyesClosed) {
      if (this.eyesClosedStart == null) this.eyesClosedStart = now;
    } else {
      this.eyesClosedStart = null;
    }
    const eyesClosedDurationMs = this.eyesClosedStart != null ? now - this.eyesClosedStart : 0;
    const eyeScore = Math.min(eyesClosedDurationMs / EAR_FULL_SCORE_MS, 1);

    // Head droop: head tilted down AND nose lower than neutral.
    const droopScore = headTiltDeg > HEAD_DROOP_TILT && noseY > HEAD_DROOP_NOSE_Y ? HEAD_DROOP_SCORE : 0;

    const rawConfidence = Math.max(eyeScore, droopScore);

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (rawConfidence > 0.85) severity = 'high';
    else if (rawConfidence > 0.6) severity = 'medium';

    return {
      rawConfidence,
      severity,
      metadata: {
        avgEAR,
        eyesClosedDurationMs,
        headDroopConfidence: droopScore,
      },
    };
  }

  override reset(): void {
    super.reset();
    this.eyesClosedStart = null;
  }
}
