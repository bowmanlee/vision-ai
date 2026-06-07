import { describe, it, expect } from 'vitest';
import { extractFaceFeatures, extractPoseFeatures, extractHandFeatures } from './index';
import type { NormalizedLandmark } from '../types';

function makeLm(x: number, y: number, z = 0, visibility = 1): NormalizedLandmark {
  return { x, y, z, visibility };
}

describe('extractFaceFeatures', () => {
  it('returns null for undefined landmarks', () => {
    expect(extractFaceFeatures(undefined)).toBeNull();
  });

  it('returns null for insufficient landmarks', () => {
    expect(extractFaceFeatures(Array(10).fill(makeLm(0, 0)))).toBeNull();
  });

  it('computes EAR and head tilt for neutral face', () => {
    const landmarks = Array(468).fill(makeLm(0, 0));
    // Set up a simple neutral face geometry
    landmarks[1] = makeLm(0.5, 0.5); // nose
    landmarks[152] = makeLm(0.5, 0.7); // chin
    landmarks[33] = makeLm(0.3, 0.4);
    landmarks[160] = makeLm(0.3, 0.38);
    landmarks[158] = makeLm(0.3, 0.38);
    landmarks[133] = makeLm(0.4, 0.4);
    landmarks[153] = makeLm(0.3, 0.42);
    landmarks[144] = makeLm(0.3, 0.42);
    landmarks[362] = makeLm(0.6, 0.4);
    landmarks[385] = makeLm(0.6, 0.38);
    landmarks[387] = makeLm(0.6, 0.38);
    landmarks[263] = makeLm(0.7, 0.4);
    landmarks[373] = makeLm(0.6, 0.42);
    landmarks[380] = makeLm(0.6, 0.42);

    const result = extractFaceFeatures(landmarks);
    expect(result).not.toBeNull();
    expect(result!.avgEAR).toBeGreaterThan(0);
    expect(result!.headTiltDeg).toBeCloseTo(0, 1);
    expect(result!.visibilityScore).toBe(1);
  });

  it('drops visibility score when landmarks are occluded', () => {
    const landmarks = Array(468).fill(makeLm(0, 0, 0, 0.1));
    const result = extractFaceFeatures(landmarks);
    expect(result).not.toBeNull();
    expect(result!.visibilityScore).toBeLessThan(0.5);
  });
});

describe('extractPoseFeatures', () => {
  it('returns null for undefined landmarks', () => {
    expect(extractPoseFeatures(undefined)).toBeNull();
  });

  it('returns null when insufficient required landmarks are visible', () => {
    const landmarks = Array(33).fill(makeLm(0, 0, 0, 0.1));
    expect(extractPoseFeatures(landmarks)).toBeNull();
  });

  it('computes metrics for upright posture', () => {
    const landmarks = Array(33).fill(makeLm(0, 0));
    landmarks[0] = makeLm(0.5, 0.3); // nose
    landmarks[11] = makeLm(0.4, 0.5); // L shoulder
    landmarks[12] = makeLm(0.6, 0.5); // R shoulder
    landmarks[23] = makeLm(0.4, 0.8); // L hip
    landmarks[24] = makeLm(0.6, 0.8); // R hip

    const result = extractPoseFeatures(landmarks);
    expect(result).not.toBeNull();
    expect(result!.neckFlexionDeg).toBeGreaterThan(0);
    expect(result!.shoulderTiltDeg).toBeCloseTo(0, 1);
    expect(result!.torsoLeanDeg).toBeCloseTo(0, 1);
    expect(result!.visibilityScore).toBe(1);
  });
});

describe('extractHandFeatures', () => {
  it('returns default metrics when no hands detected', () => {
    const result = extractHandFeatures(undefined);
    expect(result.handCount).toBe(0);
    expect(result.isPinching).toBe(false);
  });

  it('detects pinch when thumb and index are close', () => {
    const hands = [
      {
        landmarks: Array(21).fill(makeLm(0, 0)).map((_, i) => {
          if (i === 4) return makeLm(0.5, 0.5); // thumb tip
          if (i === 8) return makeLm(0.501, 0.501); // index tip
          return makeLm(0, 0);
        }),
      },
    ];
    const result = extractHandFeatures(hands);
    expect(result.handCount).toBe(1);
    expect(result.isPinching).toBe(true);
    expect(result.thumbIndexPinch).toBeLessThan(0.05);
  });
});
