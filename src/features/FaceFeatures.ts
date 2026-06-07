import type { NormalizedLandmark } from '../types';

/**
 * FaceFeatures extracts semantic metrics from MediaPipe face landmarks.
 *
 * Landmark indices (468-point face mesh):
 * - Left eye:  362 (outer), 385 (upper), 387 (upper), 263 (inner), 373 (lower), 380 (lower)
 * - Right eye: 33  (outer), 160 (upper), 158 (upper), 133 (inner), 153 (lower), 144 (lower)
 * - Nose tip:  1
 * - Chin:      152
 */

const FACE_LANDMARK_COUNT = 468;

const LEFT_EYE = [362, 385, 387, 263, 373, 380] as const;
const RIGHT_EYE = [33, 160, 158, 133, 153, 144] as const;
const NOSE_INDEX = 1;
const CHIN_INDEX = 152;

/** Minimum visibility for a landmark to be considered reliable. */
const MIN_VISIBILITY = 0.5;

function isReliable(lm: NormalizedLandmark | undefined): lm is NormalizedLandmark {
  return lm != null && (lm.visibility == null || lm.visibility >= MIN_VISIBILITY);
}

function euclidean(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(landmarks: NormalizedLandmark[], indices: readonly number[]): number {
  const points = indices.map((i) => landmarks[i]).filter(isReliable);
  if (points.length < 6) return 1; // open fallback when landmarks occluded
  const [p1, p2, p3, p4, p5, p6] = points;
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
  /** Head pitch estimate in degrees (positive = looking down). Rough proxy from nose-chin line. */
  headTiltDeg: number;
  /** Nose Y position normalized [0,1] (0=top, 1=bottom). */
  noseY: number;
  /** Fraction of face landmarks with good visibility [0,1]. */
  visibilityScore: number;
}

export function extractFaceFeatures(
  landmarks: NormalizedLandmark[] | undefined
): FaceMetrics | null {
  if (!landmarks || landmarks.length < FACE_LANDMARK_COUNT) return null;

  const visibleCount = landmarks.filter(isReliable).length;
  const visibilityScore = visibleCount / landmarks.length;

  const leftEAR = eyeAspectRatio(landmarks, LEFT_EYE);
  const rightEAR = eyeAspectRatio(landmarks, RIGHT_EYE);
  const avgEAR = (leftEAR + rightEAR) / 2;

  const nose = landmarks[NOSE_INDEX];
  const chin = landmarks[CHIN_INDEX];

  // Rough head tilt: angle of nose-chin line relative to vertical.
  let headTiltDeg = 0;
  if (isReliable(nose) && isReliable(chin)) {
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
    visibilityScore,
  };
}

/** Canonical expressions detectable from MediaPipe blendshapes. */
export type Expression =
  | 'NEUTRAL'
  | 'SMILING'
  | 'FROWNING'
  | 'SURPRISED'
  | 'ANGRY'
  | 'SQUINTING';

export interface ExpressionMetrics {
  expression: Expression;
  confidence: number;
  /** Raw blendshape scores for debugging. */
  rawScores: Record<string, number>;
}

/** Blendshape names from MediaPipe Face Landmarker (52 shapes). */
const BLENDSHAPE_NAMES = [
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'jawForward',
  'jawLeft',
  'jawOpen',
  'jawRight',
  'mouthClose',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthFunnel',
  'mouthLeft',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthPucker',
  'mouthRight',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthShrugLower',
  'mouthShrugUpper',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'noseSneerLeft',
  'noseSneerRight',
] as const;

type BlendshapeName = (typeof BLENDSHAPE_NAMES)[number];

function getBlendshapeScores(
  categories: { categoryName: string; score: number }[] | undefined
): Record<BlendshapeName, number> {
  const scores = Object.fromEntries(BLENDSHAPE_NAMES.map((n) => [n, 0])) as Record<BlendshapeName, number>;
  if (!categories) return scores;
  for (const cat of categories) {
    if (cat.categoryName in scores) {
      scores[cat.categoryName as BlendshapeName] = cat.score;
    }
  }
  return scores;
}

export function extractExpressions(
  blendshapes: { categories: { categoryName: string; score: number }[] }[] | undefined
): ExpressionMetrics | null {
  if (!blendshapes || blendshapes.length === 0) return null;

  const s = getBlendshapeScores(blendshapes[0].categories);

  // Smile: both mouth corners pulled up
  const smileScore = (s.mouthSmileLeft + s.mouthSmileRight) / 2;

  // Frown: mouth corners pulled down
  const frownScore = (s.mouthFrownLeft + s.mouthFrownRight) / 2;

  // Surprise: brows up + jaw open + eyes wide
  const surpriseScore = (s.browInnerUp + s.jawOpen + s.eyeWideLeft + s.eyeWideRight) / 4;

  // Anger: brows down + jaw forward/tense + possible nose sneer
  const angerScore = (s.browDownLeft + s.browDownRight + s.jawForward + s.noseSneerLeft + s.noseSneerRight) / 5;

  // Squinting: eyes squinted
  const squintScore = (s.eyeSquintLeft + s.eyeSquintRight) / 2;

  const expressions: { expr: Expression; score: number }[] = [
    { expr: 'SMILING', score: smileScore },
    { expr: 'FROWNING', score: frownScore },
    { expr: 'SURPRISED', score: surpriseScore },
    { expr: 'ANGRY', score: angerScore },
    { expr: 'SQUINTING', score: squintScore },
  ];

  expressions.sort((a, b) => b.score - a.score);
  const best = expressions[0];

  // Neutral wins if no expression is strong enough
  const NEUTRAL_THRESHOLD = 0.25;
  const expression: Expression = best.score >= NEUTRAL_THRESHOLD ? best.expr : 'NEUTRAL';
  const confidence = best.score >= NEUTRAL_THRESHOLD ? best.score : 1 - best.score;

  return {
    expression,
    confidence,
    rawScores: s,
  };
}
