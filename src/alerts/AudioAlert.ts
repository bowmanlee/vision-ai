import type { AlertChannel, AlertEvent } from '../types';

/**
 * AudioAlert produces a short beep using the Web Audio API.
 * Gracefully degrades if AudioContext is unavailable.
 * Handles browser autoplay policy by resuming suspended contexts.
 */

export class AudioAlert implements AlertChannel {
  readonly name = 'audio';
  private ctx: AudioContext | null = null;

  async dispatch(_event: AlertEvent): Promise<void> {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
      }

      // Browsers suspend AudioContext until a user gesture.
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (err) {
      // Audio is best-effort; surface failure in console but do not crash.
      console.warn('[AudioAlert] Failed to play alert sound:', err);
    }
  }
}
