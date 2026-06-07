import { describe, it, expect, beforeEach } from 'vitest';
import { ActivityFusionEngine } from './ActivityFusionEngine';
import type { DetectionResult } from '../types';

function makeResult(detected: boolean, confidence: number, severity: import('../types').Severity = 'medium'): DetectionResult {
  return { detected, confidence, severity, metadata: {}, timestamp: 0 };
}

describe('ActivityFusionEngine', () => {
  let engine: ActivityFusionEngine;

  beforeEach(() => {
    engine = new ActivityFusionEngine(100);
  });

  it('returns UNKNOWN when no inputs', () => {
    const snapshot = engine.fuse(0, { doomScroll: null, posture: null, fatigue: null });
    expect(snapshot.activity).toBe('UNKNOWN');
    expect(snapshot.confidence).toBe(0);
  });

  it('returns FOCUSED when face is visible but no detections', () => {
    const snapshot = engine.fuse(0, {
      doomScroll: makeResult(false, 0),
      posture: makeResult(false, 0),
      fatigue: makeResult(false, 0.5),
    });
    expect(snapshot.activity).toBe('FOCUSED');
  });

  it('picks highest priority detected activity', () => {
    const snapshot = engine.fuse(0, {
      doomScroll: makeResult(true, 0.8),
      posture: makeResult(true, 0.9),
      fatigue: makeResult(false, 0),
    });
    // FATIGUED > DOOM_SCROLLING > SLOUCHING > FOCUSED
    // Since fatigue is not detected, doom scrolling wins over slouching
    expect(snapshot.activity).toBe('DOOM_SCROLLING');
  });

  it('respects hysteresis when activity changes quickly', () => {
    engine.fuse(0, { doomScroll: makeResult(true, 0.8), posture: null, fatigue: null });
    const second = engine.fuse(50, { doomScroll: null, posture: makeResult(true, 0.9), fatigue: null });
    // Within 100ms hold time, should stick to previous
    expect(second.activity).toBe('DOOM_SCROLLING');
  });

  it('allows transition after hold time', () => {
    engine.fuse(0, { doomScroll: makeResult(true, 0.8), posture: null, fatigue: null });
    const second = engine.fuse(150, { doomScroll: null, posture: makeResult(true, 0.9), fatigue: null });
    expect(second.activity).toBe('SLOUCHING');
  });

  it('propagates max severity from contributing detectors', () => {
    const snapshot = engine.fuse(0, {
      doomScroll: null,
      posture: { ...makeResult(true, 0.8, 'low'), metadata: {} },
      fatigue: null,
    });
    expect(snapshot.severity).toBe('low');
  });
});
