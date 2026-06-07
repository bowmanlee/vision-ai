import { describe, it, expect } from 'vitest';
import { compareSeverity, meetsSeverity, SEVERITY_ORDER } from './index';

describe('severity helpers', () => {
  it('SEVERITY_ORDER is low < medium < high', () => {
    expect(SEVERITY_ORDER).toEqual(['low', 'medium', 'high']);
  });

  it('compareSeverity returns correct ordering', () => {
    expect(compareSeverity('low', 'medium')).toBe(-1);
    expect(compareSeverity('medium', 'low')).toBe(1);
    expect(compareSeverity('high', 'high')).toBe(0);
  });

  it('meetsSeverity works for exact and higher severities', () => {
    expect(meetsSeverity('low', 'low')).toBe(true);
    expect(meetsSeverity('medium', 'low')).toBe(true);
    expect(meetsSeverity('high', 'medium')).toBe(true);
    expect(meetsSeverity('low', 'medium')).toBe(false);
    expect(meetsSeverity('medium', 'high')).toBe(false);
  });
});
