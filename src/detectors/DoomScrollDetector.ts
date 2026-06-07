import { BaseDetector } from './BaseDetector';
import type { FaceMetrics, PoseMetrics, HandMetrics } from '../features';

interface DoomScrollMeta {
  headDownConfidence: number;
  handsHoldingConfidence: number;
  durationMs: number;
}

/**
 * Detects doom scrolling by combining:
 * - Head tilted down (nose low, head tilt positive).
 * - Hands visible in lower half (holding phone).
 * - Sustained posture over time.
 */
export class DoomScrollDetector extends BaseDetector<DoomScrollMeta> {
  private lastFace: FaceMetrics | null = null;
  private lastPose: PoseMetrics | null = null;
  private lastHand: HandMetrics | null = null;
  private startTime: number | null = null;

  constructor(config?: Partial<import('../types').DetectorConfig>) {
    super('doom-scroll', config);
  }

  updateFeatures(face: FaceMetrics | null, pose: PoseMetrics | null, hand: HandMetrics | null): void {
    this.lastFace = face;
    this.lastPose = pose;
    this.lastHand = hand;
  }

  protected evaluate(now: number) {
    let headDownConfidence = 0;
    let handsHoldingConfidence = 0;

    if (this.lastFace) {
      // Nose below shoulder level and head tilted down.
      const shoulderY = this.lastPose?.shoulderY ?? 0.5;
      const noseLow = this.lastFace.noseY > shoulderY - 0.05 ? 1 : 0;
      const tiltDown = this.lastFace.headTiltDeg > 10 ? 1 : 0;
      headDownConfidence = (noseLow + tiltDown) / 2;
    }

    if (this.lastHand) {
      const handsPresent = this.lastHand.handCount > 0 ? 1 : 0;
      const handsLow = this.lastHand.handsInLowerHalf ? 1 : 0;
      handsHoldingConfidence = (handsPresent + handsLow) / 2;
    }

    const rawConfidence = (headDownConfidence + handsHoldingConfidence) / 2;

    if (rawConfidence >= this.config.confidenceThreshold) {
      if (this.startTime == null) this.startTime = now;
    } else {
      this.startTime = null;
    }

    const durationMs = this.startTime != null ? now - this.startTime : 0;

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (durationMs > 10000) severity = 'high';
    else if (durationMs > 5000) severity = 'medium';

    return {
      rawConfidence,
      severity,
      metadata: {
        headDownConfidence,
        handsHoldingConfidence,
        durationMs,
      },
    };
  }

  override reset(): void {
    super.reset();
    this.startTime = null;
  }
}
