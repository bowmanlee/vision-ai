import type { NormalizedLandmark } from '../types';

/**
 * FaceFeatures extracts semantic metrics from MediaPipe face landmarks.
 *
 * Landmark indices (468-point face mesh):
 * - Left eye:  362 (outer), 385 (upper), 387 (upper), 263 (inner), 373 (lower), 380 (lower)
 * - Right eye: 33  (outer), 160 (upper), 158 (upper), 133 (inner), 153 (lower), 144 (lower)
 * - Nose tip:  1
 * - Chin:      152
 * - Forehead:  10
 */

const LEFT_EYE = [362, 385, 387, 263, 373, 380] as const;
const RIGHT_EYE = [33, 160, 158, 133, 153, 144] as const;

function euclidean(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(landmarks: NormalizedLandmark[], indices: readonly number[]): number {
  const [p1, p2, p3, p4, p5, p6] = indices.map((i) => landmarks[i]);
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 1; // open fallback
  const vertical1 = euclidean(p2, p6);
  const vertical2 = euclidean(p3, p5);
  const horizontal = euclidean(p1, p4);
  if (horizontal === 0) return 1;
  return (vertical1 + vertical2) / (2 * horizontal);
}

export interface FaceMetrics {
  /** Left eye aspect ratio (lower = more closed). Typical open ~0.3, closed ~0.1. */
  leftEAR: number;
  /** Right eye aspect ratio. */
  rightEAR: number;
  /** Average EAR across both eyes. */
  avgEAR: number;
  /** Head pitch estimate in degrees (positive = looking down). Rough proxy. */
  headTiltDeg: number;
  /** Nose Y position normalized [0,1] (0=top, 1=bottom). */
  noseY: number;
}

export function extractFaceFeatures(
  landmarks: NormalizedLandmark[] | undefined
): FaceMetrics | null {
  if (!landmarks || landmarks.length < 468) return null;

  const leftEAR = eyeAspectRatio(landmarks, LEFT_EYE);
  const rightEAR = eyeAspectRatio(landmarks, RIGHT_EYE);
  const avgEAR = (leftEAR + rightEAR) / 2;

  const nose = landmarks[1];
  const chin = landmarks[152];

  // Rough head tilt: angle of nose-chin line relative to vertical.
  let headTiltDeg = 0;
  if (nose && chin) {
    const dx = chin.x - nose.x;
    const dy = chin.y - nose.y;
    // atan2(dx, dy) gives deviation from vertical (downward) axis.
    headTiltDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
  }

  return {
    leftEAR,
    rightEAR,
    avgEAR,
    headTiltDeg,
    noseY: nose?.y ?? 0.5,
  };
}
