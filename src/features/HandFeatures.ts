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

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIN_LANDMARKS = 21;

/** Minimum visibility for a landmark to be considered reliable. */
const MIN_VISIBILITY = 0.5;

function isReliable(lm: NormalizedLandmark | undefined): lm is NormalizedLandmark {
  return lm != null && (lm.visibility == null || lm.visibility >= MIN_VISIBILITY);
}

function euclidean(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

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
  /** Fraction of landmarks with good visibility across all hands [0,1]. */
  visibilityScore: number;
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
      visibilityScore: 0,
    };
  }

  let totalY = 0;
  let totalPoints = 0;
  let minPinch = 1;
  let pinching = false;
  let totalVisible = 0;
  let totalLandmarks = 0;

  for (const hand of hands) {
    const lm = hand.landmarks;
    if (!lm || lm.length < MIN_LANDMARKS) continue;

    const visibleLm = lm.filter(isReliable);
    totalVisible += visibleLm.length;
    totalLandmarks += lm.length;

    totalY += lm.reduce((s, p) => s + p.y, 0);
    totalPoints += lm.length;

    const pinch = euclidean(lm[THUMB_TIP], lm[INDEX_TIP]);
    if (pinch < minPinch) minPinch = pinch;
    if (pinch < 0.05) pinching = true;
  }

  const avgY = totalPoints > 0 ? totalY / totalPoints : 0.5;
  const visibilityScore = totalLandmarks > 0 ? totalVisible / totalLandmarks : 0;

  return {
    handCount: hands.length,
    avgHandY: avgY,
    handsInLowerHalf: avgY > 0.5,
    thumbIndexPinch: minPinch,
    isPinching: pinching,
    visibilityScore,
  };
}
