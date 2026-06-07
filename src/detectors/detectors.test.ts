import { describe, it, expect, beforeEach } from 'vitest';
import { BaseDetector } from './BaseDetector';
import { DoomScrollDetector } from './DoomScrollDetector';
import { PostureDetector } from './PostureDetector';
import { FatigueDetector } from './FatigueDetector';

class TestDetector extends BaseDetector<{ value: number }> {
  public rawConfidence = 0;

  protected evaluate(_now: number) {
    return {
      rawConfidence: this.rawConfidence,
      severity: 'medium' as const,
      metadata: { value: 42 },
    };
  }
}

describe('BaseDetector', () => {
  it('returns detected=false when confidence is below threshold', () => {
    const d = new TestDetector('test', { confidenceThreshold: 0.5 });
    d.rawConfidence = 0.3;
    const result = d.detect(0);
    expect(result.detected).toBe(false);
    expect(result.confidence).toBe(0.3);
  });

  it('enforces activation delay before triggering', () => {
    const d = new TestDetector('test', { confidenceThreshold: 0.5, activationDelayMs: 100 });
    d.rawConfidence = 1.0;

    expect(d.detect(0).detected).toBe(false);
    expect(d.detect(50).detected).toBe(false);
    expect(d.detect(100).detected).toBe(true);
  });

  it('enforces clear delay before clearing', () => {
    const d = new TestDetector('test', { confidenceThreshold: 0.5, activationDelayMs: 0, clearDelayMs: 50 });
    d.rawConfidence = 1.0;
    d.detect(0);   // triggers immediately (activationDelayMs=0)

    d.rawConfidence = 0.0;
    expect(d.detect(0).detected).toBe(true);   // still within clear delay
    expect(d.detect(60).detected).toBe(false); // clear delay elapsed
  });

  it('reset clears all state', () => {
    const d = new TestDetector('test', { confidenceThreshold: 0.5, activationDelayMs: 0 });
    d.rawConfidence = 1.0;
    d.detect(0); // triggers immediately
    expect(d.detect(0).detected).toBe(true);

    d.reset();
    d.rawConfidence = 0.0; // ensure no re-trigger after reset
    expect(d.detect(200).detected).toBe(false);
  });
});

describe('DoomScrollDetector', () => {
  let detector: DoomScrollDetector;

  beforeEach(() => {
    detector = new DoomScrollDetector();
  });

  it('returns low confidence when no features', () => {
    detector.updateFeatures(null, null, null);
    const result = detector.detect(0);
    expect(result.detected).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('detects doom scroll when head is down and hands are low', () => {
    detector.updateFeatures(
      { leftEAR: 0.3, rightEAR: 0.3, avgEAR: 0.3, headTiltDeg: 20, noseY: 0.7, visibilityScore: 1 },
      { neckFlexionDeg: 140, shoulderTiltDeg: 2, torsoLeanDeg: 5, shoulderY: 0.5, visibilityScore: 1 },
      { handCount: 2, avgHandY: 0.7, handsInLowerHalf: true, thumbIndexPinch: 0.1, isPinching: false, visibilityScore: 1 }
    );
    const result = detector.detect(0);
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

describe('PostureDetector', () => {
  let detector: PostureDetector;

  beforeEach(() => {
    detector = new PostureDetector();
  });

  it('returns zero confidence when no pose data', () => {
    detector.updateFeatures(null);
    const result = detector.detect(0);
    expect(result.detected).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('detects slouching with severe neck flexion', () => {
    detector.updateFeatures({
      neckFlexionDeg: 110,
      shoulderTiltDeg: 2,
      torsoLeanDeg: 5,
      shoulderY: 0.5,
      visibilityScore: 1,
    });
    const result = detector.detect(0);
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

describe('FatigueDetector', () => {
  let detector: FatigueDetector;

  beforeEach(() => {
    detector = new FatigueDetector();
  });

  it('returns zero confidence when no face data', () => {
    detector.updateFeatures(null);
    const result = detector.detect(0);
    expect(result.detected).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('escalates confidence as eyes remain closed', () => {
    detector.updateFeatures({
      leftEAR: 0.1,
      rightEAR: 0.1,
      avgEAR: 0.1,
      headTiltDeg: 5,
      noseY: 0.4,
      visibilityScore: 1,
    });
    expect(detector.detect(0).confidence).toBeCloseTo(0, 1);
    expect(detector.detect(1000).confidence).toBeCloseTo(0.5, 1);
    expect(detector.detect(2000).confidence).toBeCloseTo(1, 1);
  });
});
