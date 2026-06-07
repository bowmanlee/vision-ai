import type { ActivitySnapshot, AlertEvent, AlertChannel } from '../types';
import { AlertPolicy } from './AlertPolicy';

/**
 * AlertManager evaluates activity snapshots against policies and
 * dispatches alerts to registered channels with cooldown enforcement.
 *
 * Invariant: the same activity cannot alert more frequently than its
 * configured cooldown, preventing user fatigue from repeated alerts.
 */

let globalAlertCounter = 0;

function generateAlertId(activity: string, timestamp: number): string {
  globalAlertCounter = (globalAlertCounter + 1) % 1_000_000;
  return `${activity}-${timestamp}-${globalAlertCounter}`;
}

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

  /**
   * Pure evaluation: decides whether an alert should fire based on the
   * current snapshot and cooldown state. Does NOT dispatch.
   */
  evaluate(snapshot: ActivitySnapshot): AlertEvent | null {
    const { activity, severity } = snapshot;
    const { should, message } = this.policy.shouldAlert(activity, severity);

    if (!should) return null;

    const now = snapshot.timestamp;
    const cooldown = this.policy.getCooldownMs(activity);
    const lastTime = this.lastAlertTime.get(activity);

    if (lastTime != null && now - lastTime < cooldown) return null;

    const event: AlertEvent = {
      id: generateAlertId(activity, now),
      activity,
      severity,
      message,
      timestamp: now,
    };

    return event;
  }

  /** Records the alert as fired and dispatches it to all channels. */
  commit(event: AlertEvent): void {
    this.lastAlertTime.set(event.activity, event.timestamp);
    this.dispatch(event);
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
