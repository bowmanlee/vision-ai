import { BaseDetector } from './BaseDetector';
import type { FaceMetrics } from '../features';

interface FatigueMeta {
  avgEAR: number;
  eyesClosedDurationMs: number;
  headDroopConfidence: number;
}

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
    const eyesClosed = avgEAR < 0.18;
    if (eyesClosed) {
      if (this.eyesClosedStart == null) this.eyesClosedStart = now;
    } else {
      this.eyesClosedStart = null;
    }
    const eyesClosedDurationMs = this.eyesClosedStart != null ? now - this.eyesClosedStart : 0;
    const eyeScore = Math.min(eyesClosedDurationMs / 2000, 1); // full score after 2s

    // Head droop: head tilted down AND nose lower than neutral.
    const droopScore = headTiltDeg > 15 && noseY > 0.5 ? 0.7 : 0;

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
