import { BaseDetector } from './BaseDetector';
import type { FaceMetrics, PoseMetrics, HandMetrics } from '../features';

interface DoomScrollMeta {
  headDownConfidence: number;
  handsHoldingConfidence: number;
  /** Duration in ms that the condition has been continuously active (post-trigger). */
  activeDurationMs: number;
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
  private triggerTime: number | null = null;

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

    // Track how long we've been actively detected for severity escalation.
    if (this.lastDetected) {
      if (this.triggerTime == null) this.triggerTime = now;
    } else {
      this.triggerTime = null;
    }
    const activeDurationMs = this.triggerTime != null ? now - this.triggerTime : 0;

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (activeDurationMs > 10000) severity = 'high';
    else if (activeDurationMs > 5000) severity = 'medium';

    return {
      rawConfidence,
      severity,
      metadata: {
        headDownConfidence,
        handsHoldingConfidence,
        activeDurationMs,
      },
    };
  }

  override reset(): void {
    super.reset();
    this.triggerTime = null;
  }
}
