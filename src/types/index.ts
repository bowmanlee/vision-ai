/**
 * Core domain contracts for the Vision AI activity detection system.
 *
 * Invariants:
 * - All confidence values are in [0, 1].
 * - All normalized coordinates are in [0, 1] relative to video frame.
 * - Timestamps are in milliseconds (performance.now() or Date.now()).
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** Severity levels for detections and alerts. */
export type Severity = 'low' | 'medium' | 'high';

/** Ordered severity list for comparison. Lower index = lower severity. */
export const SEVERITY_ORDER: readonly Severity[] = ['low', 'medium', 'high'] as const;

/** Compare two severities. Returns >0 if a is more severe, <0 if b is more severe, 0 if equal. */
export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b);
}

/** True if `candidate` meets or exceeds `required` severity. */
export function meetsSeverity(candidate: Severity, required: Severity): boolean {
  return compareSeverity(candidate, required) >= 0;
}

/** Concrete detection emitted by a specialized detector. */
export interface DetectionResult<TMeta = unknown> {
  /** Whether the target condition is presently detected. */
  detected: boolean;
  /** Confidence in [0, 1]. */
  confidence: number;
  /** Severity classification. */
  severity: Severity;
  /** Detector-specific metadata (angles, durations, counts, etc.). */
  metadata: TMeta;
  /** Timestamp when this result was produced. */
  timestamp: number;
}

/** Canonical user activity states produced by the fusion engine. */
export type UserActivity =
  | 'FOCUSED'
  | 'DOOM_SCROLLING'
  | 'SLOUCHING'
  | 'FATIGUED'
  | 'UNKNOWN';

/** Snapshot emitted by the ActivityFusionEngine each frame. */
export interface ActivitySnapshot {
  activity: UserActivity;
  /** Overall confidence in the fused activity classification. */
  confidence: number;
  /** Highest severity among contributing detectors. */
  severity: Severity;
  timestamp: number;
  /** IDs of detectors that contributed to this classification. */
  contributingDetectors: string[];
}

/** Alert event dispatched by the AlertManager. */
export interface AlertEvent {
  id: string;
  activity: UserActivity;
  severity: Severity;
  message: string;
  timestamp: number;
}

/** Alert channel contract. */
export interface AlertChannel {
  name: string;
  dispatch(event: AlertEvent): void;
  dismiss?(eventId: string): void;
}

/** Configuration for detector thresholds and cooldowns. */
export interface DetectorConfig {
  /** Minimum confidence to consider a detection valid. */
  confidenceThreshold: number;
  /** Minimum duration (ms) a condition must persist before triggering. */
  activationDelayMs: number;
  /** Minimum duration (ms) before a triggered detection can clear. */
  clearDelayMs: number;
}

/** Camera constraints and state. */
export interface CameraSettings {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
}

/** Raw vision frame bundle produced by the perception layer. */
export interface VisionFrame {
  video: HTMLVideoElement;
  timestamp: number;
  faceResults?: import('@mediapipe/tasks-vision').FaceLandmarkerResult;
  poseResults?: import('@mediapipe/tasks-vision').PoseLandmarkerResult;
  handResults?: import('@mediapipe/tasks-vision').HandLandmarkerResult;
}
