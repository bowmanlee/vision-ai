import { BaseDetector } from './BaseDetector';
import type { PoseMetrics } from '../features';

interface PostureMeta {
  neckFlexionDeg: number;
  shoulderTiltDeg: number;
  torsoLeanDeg: number;
}

/** Neck flexion threshold: below this is considered poor posture. */
const NECK_FLEXION_THRESHOLD = 150;

/**
 * Detects poor posture (slouching) via neck flexion and shoulder tilt.
 * Invariant: if landmarks are missing, confidence drops to 0 (no hidden fallback).
 */
export class PostureDetector extends BaseDetector<PostureMeta> {
  private lastPose: PoseMetrics | null = null;

  constructor(config?: Partial<import('../types').DetectorConfig>) {
    super('posture', config);
  }

  updateFeatures(pose: PoseMetrics | null): void {
    this.lastPose = pose;
  }

  protected evaluate(now: number) {
    void now; // base class contract requires timestamp; posture is frame-invariant

    if (!this.lastPose) {
      return {
        rawConfidence: 0,
        severity: 'low' as const,
        metadata: { neckFlexionDeg: 0, shoulderTiltDeg: 0, torsoLeanDeg: 0 },
      };
    }

    const { neckFlexionDeg, shoulderTiltDeg, torsoLeanDeg } = this.lastPose;

    // Neck flexion: smaller angle = more forward head (bad).
    // Upright ~170, slouching < 150.
    const neckScore = neckFlexionDeg < NECK_FLEXION_THRESHOLD
      ? (NECK_FLEXION_THRESHOLD - neckFlexionDeg) / 60
      : 0;

    // Shoulder tilt: > 5 deg is suspicious.
    const tiltScore = Math.min(shoulderTiltDeg / 15, 1);

    // Torso lean: > 10 deg is suspicious.
    const leanScore = Math.min(torsoLeanDeg / 30, 1);

    const rawConfidence = Math.max(neckScore, tiltScore * 0.5, leanScore * 0.5);

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (rawConfidence > 0.85) severity = 'high';
    else if (rawConfidence > 0.65) severity = 'medium';

    return {
      rawConfidence,
      severity,
      metadata: { neckFlexionDeg, shoulderTiltDeg, torsoLeanDeg },
    };
  }
}
