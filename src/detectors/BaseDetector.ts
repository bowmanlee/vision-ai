import type { DetectionResult, DetectorConfig } from '../types';

/**
 * BaseDetector provides hysteresis and threshold logic for all concrete detectors.
 *
 * Invariant: A detection only flips to `detected: true` after the condition
 * persists for `activationDelayMs`. It only clears after `clearDelayMs`.
 * This prevents flickering from noisy single-frame fluctuations.
 */

export const DEFAULT_CONFIG: DetectorConfig = {
  confidenceThreshold: 0.6,
  activationDelayMs: 1500,
  clearDelayMs: 1000,
};

export abstract class BaseDetector<TMeta = unknown> {
  readonly id: string;
  protected config: DetectorConfig;
  protected lastDetected = false;
  protected stateEnterTime: number | null = null;
  protected stateExitTime: number | null = null;

  constructor(id: string, config: Partial<DetectorConfig> = {}) {
    this.id = id;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Concrete detectors implement this to evaluate raw features.
   * Must return a confidence in [0, 1] and any metadata.
   */
  protected abstract evaluate(now: number): {
    rawConfidence: number;
    severity: 'low' | 'medium' | 'high';
    metadata: TMeta;
  };

  detect(now: number): DetectionResult<TMeta> {
    const { rawConfidence, severity, metadata } = this.evaluate(now);
    const conditionActive = rawConfidence >= this.config.confidenceThreshold;

    if (conditionActive && !this.lastDetected) {
      // Potential entry
      if (this.stateEnterTime == null) {
        this.stateEnterTime = now;
      }
      if (now - this.stateEnterTime >= this.config.activationDelayMs) {
        this.lastDetected = true;
        this.stateExitTime = null;
      }
    } else if (!conditionActive && this.lastDetected) {
      // Potential exit
      if (this.stateExitTime == null) {
        this.stateExitTime = now;
      }
      if (now - this.stateExitTime >= this.config.clearDelayMs) {
        this.lastDetected = false;
        this.stateEnterTime = null;
      }
    } else if (conditionActive && this.lastDetected) {
      // Sustained
      this.stateExitTime = null;
    } else {
      // Sustained off
      this.stateEnterTime = null;
    }

    // Output confidence reflects hysteresis state: if triggered, use max of
    // threshold and raw; if not triggered but condition is present, ramp up.
    let confidence = rawConfidence;
    if (this.lastDetected) {
      confidence = Math.max(this.config.confidenceThreshold, rawConfidence);
    }

    return {
      detected: this.lastDetected,
      confidence,
      severity,
      metadata,
      timestamp: now,
    };
  }

  reset(): void {
    this.lastDetected = false;
    this.stateEnterTime = null;
    this.stateExitTime = null;
  }
}
