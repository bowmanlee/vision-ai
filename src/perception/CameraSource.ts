import type { CameraSettings } from '../types';

/**
 * CameraSource manages the webcam video stream.
 *
 * Responsibilities:
 * - Acquire and release MediaStream tracks.
 * - Attach stream to a video element.
 * - Surface permission errors explicitly (no silent failure).
 */

const DEFAULT_SETTINGS: CameraSettings = {
  width: 1280,
  height: 720,
  facingMode: 'user',
};

export class CameraSource {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private settings: CameraSettings;

  constructor(settings: Partial<CameraSettings> = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  async start(videoEl: HTMLVideoElement): Promise<void> {
    this.videoEl = videoEl;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: this.settings.width },
          height: { ideal: this.settings.height },
          facingMode: this.settings.facingMode,
        },
        audio: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Camera permission denied or unavailable: ${message}`);
    }

    videoEl.srcObject = this.stream;

    return new Promise((resolve, reject) => {
      if (!this.videoEl) {
        reject(new Error('Video element was removed before stream started'));
        return;
      }
      this.videoEl.onloadedmetadata = () => {
        this.videoEl!.play().then(resolve).catch(reject);
      };
      this.videoEl.onerror = () => {
        reject(new Error('Video element encountered an error'));
      };
    });
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoEl;
  }

  isRunning(): boolean {
    return this.stream != null && this.stream.active;
  }
}
