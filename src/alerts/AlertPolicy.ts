import type { UserActivity, Severity } from '../types';

/**
 * AlertPolicy defines per-activity alerting rules.
 *
 * Invariant: alerts are never suppressed silently; if a policy does not
 * match, the event is simply not generated.
 */

export interface PolicyRule {
  activity: UserActivity;
  minSeverity: Severity;
  cooldownMs: number;
  message: string;
}

export const DEFAULT_POLICIES: PolicyRule[] = [
  {
    activity: 'DOOM_SCROLLING',
    minSeverity: 'medium',
    cooldownMs: 5000,
    message: 'You have been doom scrolling for a while. Take a break!',
  },
  {
    activity: 'SLOUCHING',
    minSeverity: 'medium',
    cooldownMs: 8000,
    message: 'Your posture is slipping. Sit up straight.',
  },
  {
    activity: 'FATIGUED',
    minSeverity: 'medium',
    cooldownMs: 10000,
    message: 'You look tired. Consider resting your eyes.',
  },
];

export class AlertPolicy {
  private rules: Map<UserActivity, PolicyRule>;

  constructor(rules: PolicyRule[] = DEFAULT_POLICIES) {
    this.rules = new Map(rules.map((r) => [r.activity, r]));
  }

  shouldAlert(activity: UserActivity, severity: Severity): { should: boolean; message: string } {
    const rule = this.rules.get(activity);
    if (!rule) return { should: false, message: '' };

    const severityOrder = ['low', 'medium', 'high'] as const;
    const meetsSeverity = severityOrder.indexOf(severity) >= severityOrder.indexOf(rule.minSeverity);

    return {
      should: meetsSeverity,
      message: rule.message,
    };
  }

  getCooldownMs(activity: UserActivity): number {
    return this.rules.get(activity)?.cooldownMs ?? 0;
  }
}
