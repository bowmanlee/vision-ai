import type { NormalizedLandmark } from '../types';

/**
 * HandFeatures extracts semantic metrics from MediaPipe hand landmarks.
 *
 * Key landmarks per hand (21 points):
 * - 0: wrist
 * - 4: thumb tip
 * - 8: index tip
 * - 12: middle tip
 * - 16: ring tip
 * - 20: pinky tip
 */

export interface HandMetrics {
  /** Number of hands detected [0, 2]. */
  handCount: number;
  /** Average Y position of all hand landmarks (0=top, 1=bottom). */
  avgHandY: number;
  /** Are hands in the lower half of the frame? (typical for phone holding). */
  handsInLowerHalf: boolean;
  /** Distance between thumb tip and index tip (normalized). Small = pinch. */
  thumbIndexPinch: number;
  /** True if a pinch gesture is detected. */
  isPinching: boolean;
}

function euclidean(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function extractHandFeatures(
  hands: { landmarks: NormalizedLandmark[] }[] | undefined
): HandMetrics {
  if (!hands || hands.length === 0) {
    return {
      handCount: 0,
      avgHandY: 0.5,
      handsInLowerHalf: false,
      thumbIndexPinch: 1,
      isPinching: false,
    };
  }

  let totalY = 0;
  let totalPoints = 0;
  let minPinch = 1;
  let pinching = false;

  for (const hand of hands) {
    const lm = hand.landmarks;
    if (!lm || lm.length < 21) continue;

    totalY += lm.reduce((s, p) => s + p.y, 0);
    totalPoints += lm.length;

    const pinch = euclidean(lm[4], lm[8]);
    if (pinch < minPinch) minPinch = pinch;
    if (pinch < 0.05) pinching = true;
  }

  const avgY = totalPoints > 0 ? totalY / totalPoints : 0.5;

  return {
    handCount: hands.length,
    avgHandY: avgY,
    handsInLowerHalf: avgY > 0.5,
    thumbIndexPinch: minPinch,
    isPinching: pinching,
  };
}
