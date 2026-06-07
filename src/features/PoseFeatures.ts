import type { NormalizedLandmark } from '../types';

/**
 * PoseFeatures extracts semantic metrics from MediaPipe pose landmarks.
 *
 * Key landmarks (BlazePose 33-point model):
 * - Nose:           0
 * - Left shoulder:  11
 * - Right shoulder: 12
 * - Left hip:       23
 * - Right hip:      24
 * - Left ear:       7
 * - Right ear:      8
 */

const POSE_LANDMARK_COUNT = 33;

const NOSE = 0;
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;

/** Minimum visibility for a landmark to be considered reliable. */
const MIN_VISIBILITY = 0.5;

function isReliable(lm: NormalizedLandmark | undefined): lm is NormalizedLandmark {
  return lm != null && (lm.visibility == null || lm.visibility >= MIN_VISIBILITY);
}

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
  /** Shoulder tilt in degrees (difference in Y between shoulders, roughly scaled). */
  shoulderTiltDeg: number;
  /** Torso lean angle in degrees from vertical. */
  torsoLeanDeg: number;
  /** Mid-shoulder Y position normalized [0,1]. Lower on screen = larger number. */
  shoulderY: number;
  /** Fraction of required landmarks with good visibility [0,1]. */
  visibilityScore: number;
}

export function extractPoseFeatures(
  landmarks: NormalizedLandmark[] | undefined
): PoseMetrics | null {
  if (!landmarks || landmarks.length < POSE_LANDMARK_COUNT) return null;

  const nose = landmarks[NOSE];
  const lShoulder = landmarks[L_SHOULDER];
  const rShoulder = landmarks[R_SHOULDER];
  const lHip = landmarks[L_HIP];
  const rHip = landmarks[R_HIP];

  const required = [nose, lShoulder, rShoulder, lHip, rHip];
  const visibleCount = required.filter(isReliable).length;
  if (visibleCount < 3) return null; // insufficient data for reliable metrics

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
  const neckFlexionDeg = isReliable(nose)
    ? angleBetween(nose, shoulderMid, hipMid)
    : 170;

  // Shoulder tilt: absolute difference in Y, roughly scaled to degrees.
  // This is an approximate proxy and depends on camera FOV and distance.
  const shoulderTiltDeg = Math.abs(lShoulder.y - rShoulder.y) * 90;

  // Torso lean: deviation of shoulder-hip line from vertical.
  const dx = shoulderMid.x - hipMid.x;
  const dy = shoulderMid.y - hipMid.y;
  const torsoLeanDeg = Math.abs((Math.atan2(dx, -dy) * 180) / Math.PI);

  return {
    neckFlexionDeg,
    shoulderTiltDeg,
    torsoLeanDeg,
    shoulderY: shoulderMid.y,
    visibilityScore: visibleCount / required.length,
  };
}
