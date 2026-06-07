import { describe, it, expect, beforeEach } from 'vitest';
import { AlertPolicy, DEFAULT_POLICIES } from './AlertPolicy';
import { AlertManager } from './AlertManager';
import type { ActivitySnapshot, AlertEvent } from '../types';

describe('AlertPolicy', () => {
  it('allows alert when severity meets threshold', () => {
    const policy = new AlertPolicy(DEFAULT_POLICIES);
    const result = policy.shouldAlert('DOOM_SCROLLING', 'medium');
    expect(result.should).toBe(true);
    expect(result.message).toBeTruthy();
  });

  it('blocks alert when severity is below threshold', () => {
    const policy = new AlertPolicy(DEFAULT_POLICIES);
    const result = policy.shouldAlert('DOOM_SCROLLING', 'low');
    expect(result.should).toBe(false);
  });

  it('returns no rule for unknown activities', () => {
    const policy = new AlertPolicy(DEFAULT_POLICIES);
    const result = policy.shouldAlert('FOCUSED', 'high');
    expect(result.should).toBe(false);
  });

  it('returns cooldown from rule', () => {
    const policy = new AlertPolicy(DEFAULT_POLICIES);
    expect(policy.getCooldownMs('DOOM_SCROLLING')).toBe(5000);
    expect(policy.getCooldownMs('FOCUSED')).toBe(0);
  });
});

describe('AlertManager', () => {
  let manager: AlertManager;
  const events: AlertEvent[] = [];

  beforeEach(() => {
    events.length = 0;
    manager = new AlertManager();
    manager.registerChannel({
      name: 'test',
      dispatch: (e) => events.push(e),
    });
  });

  it('evaluate returns null when policy does not match', () => {
    const snapshot: ActivitySnapshot = {
      activity: 'FOCUSED',
      confidence: 0.8,
      severity: 'high',
      timestamp: 0,
      contributingDetectors: [],
    };
    expect(manager.evaluate(snapshot)).toBeNull();
    expect(events.length).toBe(0);
  });

  it('evaluate returns event when policy matches', () => {
    const snapshot: ActivitySnapshot = {
      activity: 'DOOM_SCROLLING',
      confidence: 0.8,
      severity: 'medium',
      timestamp: 0,
      contributingDetectors: [],
    };
    const event = manager.evaluate(snapshot);
    expect(event).not.toBeNull();
    expect(event!.activity).toBe('DOOM_SCROLLING');
    expect(events.length).toBe(0); // not yet committed
  });

  it('commit dispatches to channels and enforces cooldown', () => {
    const snapshot: ActivitySnapshot = {
      activity: 'DOOM_SCROLLING',
      confidence: 0.8,
      severity: 'medium',
      timestamp: 0,
      contributingDetectors: [],
    };
    const event = manager.evaluate(snapshot);
    expect(event).not.toBeNull();
    manager.commit(event!);
    expect(events.length).toBe(1);

    // Same snapshot immediately should be blocked by cooldown
    const second = manager.evaluate(snapshot);
    expect(second).toBeNull();
  });

  it('generates unique ids', () => {
    const snapshot: ActivitySnapshot = {
      activity: 'DOOM_SCROLLING',
      confidence: 0.8,
      severity: 'medium',
      timestamp: 0,
      contributingDetectors: [],
    };
    const e1 = manager.evaluate(snapshot);
    manager.commit(e1!);

    // Advance past cooldown
    const snapshot2 = { ...snapshot, timestamp: 6000 };
    const e2 = manager.evaluate(snapshot2);
    expect(e2).not.toBeNull();
    expect(e2!.id).not.toBe(e1!.id);
  });
});
