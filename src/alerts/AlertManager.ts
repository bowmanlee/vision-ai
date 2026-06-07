import type { ActivitySnapshot, AlertEvent, AlertChannel } from '../types';
import { AlertPolicy } from './AlertPolicy';

/**
 * AlertManager evaluates activity snapshots against policies and
 * dispatches alerts to registered channels with cooldown enforcement.
 *
 * Invariant: the same activity cannot alert more frequently than its
 * configured cooldown, preventing user fatigue from repeated alerts.
 */

export class AlertManager {
  private policy: AlertPolicy;
  private channels: AlertChannel[] = [];
  private lastAlertTime = new Map<string, number>();

  constructor(policy: AlertPolicy = new AlertPolicy()) {
    this.policy = policy;
  }

  registerChannel(channel: AlertChannel): void {
    this.channels.push(channel);
  }

  evaluate(snapshot: ActivitySnapshot): AlertEvent | null {
    const { activity, severity } = snapshot;
    const { should, message } = this.policy.shouldAlert(activity, severity);

    if (!should) return null;

    const now = snapshot.timestamp;
    const cooldown = this.policy.getCooldownMs(activity);
    const lastTime = this.lastAlertTime.get(activity) ?? 0;

    if (now - lastTime < cooldown) return null;

    const event: AlertEvent = {
      id: `${activity}-${now}`,
      activity,
      severity,
      message,
      timestamp: now,
    };

    this.lastAlertTime.set(activity, now);
    this.dispatch(event);
    return event;
  }

  private dispatch(event: AlertEvent): void {
    for (const channel of this.channels) {
      try {
        channel.dispatch(event);
      } catch (err) {
        console.error(`[AlertManager] Channel "${channel.name}" failed:`, err);
      }
    }
  }

  reset(): void {
    this.lastAlertTime.clear();
  }
}
