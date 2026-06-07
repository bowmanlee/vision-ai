import type { NormalizedLandmark } from '../types';

/**
 * PoseFeatures extracts semantic metrics from MediaPipe pose landmarks.
 *
 * Key landmarks:
 * - Nose:          0
 * - Left shoulder: 11
 * - Right shoulder:12
 * - Left hip:      23
 * - Right hip:     24
 * - Left ear:      7
 * - Right ear:     8
 */

function angleBetween(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark): number {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const cb = { x: b.x - c.x, y: b.y - c.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  if (magAB === 0 || magCB === 0) return 0;
  const cos = Math.min(Math.max(dot / (magAB * magCB), -1), 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

export interface PoseMetrics {
  /** Neck flexion angle in degrees. Larger = more forward head posture. ~0 = upright. */
  neckFlexionDeg: number;
  /** Shoulder tilt in degrees (difference in Y between shoulders). */
  shoulderTiltDeg: number;
  /** Torso lean angle in degrees from vertical. */
  torsoLeanDeg: number;
  /** Mid-shoulder Y position normalized [0,1]. Lower on screen = larger number. */
  shoulderY: number;
}

export function extractPoseFeatures(
  landmarks: NormalizedLandmark[] | undefined
): PoseMetrics | null {
  if (!landmarks || landmarks.length < 25) return null;

  const nose = landmarks[0];
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lHip = landmarks[23];
  const rHip = landmarks[24];

  if (!nose || !lShoulder || !rShoulder || !lHip || !rHip) return null;

  const shoulderMid = {
    x: (lShoulder.x + rShoulder.x) / 2,
    y: (lShoulder.y + rShoulder.y) / 2,
    z: (lShoulder.z + rShoulder.z) / 2,
  };

  const hipMid = {
    x: (lHip.x + rHip.x) / 2,
    y: (lHip.y + rHip.y) / 2,
    z: (lHip.z + rHip.z) / 2,
  };

  // Neck flexion: angle at shoulder-mid between nose and hip-mid.
  // When head moves forward, this angle shrinks below ~160.
  const neckFlexionDeg = angleBetween(nose, shoulderMid, hipMid);

  // Shoulder tilt: absolute difference in Y.
  const shoulderTiltDeg = Math.abs(lShoulder.y - rShoulder.y) * 90; // rough scale

  // Torso lean: deviation of shoulder-hip line from vertical.
  const dx = shoulderMid.x - hipMid.x;
  const dy = shoulderMid.y - hipMid.y;
  const torsoLeanDeg = Math.abs((Math.atan2(dx, -dy) * 180) / Math.PI);

  return {
    neckFlexionDeg,
    shoulderTiltDeg,
    torsoLeanDeg,
    shoulderY: shoulderMid.y,
  };
}
