import type { CameraSettings } from '../types';

/**
 * CameraSource manages the webcam video stream.
 *
 * Responsibilities:
 * - Acquire and release MediaStream tracks.
 * - Attach stream to a video element.
 * - Surface permission errors explicitly (no silent failure).
 * - Handle track-ended events (e.g., user revokes permission via OS UI).
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
  private onTrackEndedHandler: (() => void) | null = null;
  private abortController: AbortController | null = null;

  constructor(settings: Partial<CameraSettings> = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  async start(videoEl: HTMLVideoElement): Promise<void> {
    this.stop();
    this.videoEl = videoEl;
    this.abortController = new AbortController();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
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

    this.stream = stream;

    // If any track ends externally, clean up so the UI layer can react.
    const track = stream.getVideoTracks()[0];
    if (track) {
      this.onTrackEndedHandler = () => {
        this.stop();
      };
      track.addEventListener('ended', this.onTrackEndedHandler);
    }

    videoEl.srcObject = stream;

    return new Promise((resolve, reject) => {
      const el = this.videoEl;
      if (!el || this.abortController?.signal.aborted) {
        reject(new Error('Camera start was aborted before stream could begin'));
        return;
      }

      const onLoaded = () => {
        cleanup();
        if (!this.videoEl) {
          reject(new Error('Camera start was aborted before playback'));
          return;
        }
        this.videoEl.play().then(resolve).catch(reject);
      };
      const onError = () => {
        cleanup();
        reject(new Error('Video element encountered an error'));
      };
      const onAbort = () => {
        cleanup();
        reject(new Error('Camera start was aborted'));
      };

      const cleanup = () => {
        el.removeEventListener('loadedmetadata', onLoaded);
        el.removeEventListener('error', onError);
        this.abortController?.signal.removeEventListener('abort', onAbort);
      };

      el.addEventListener('loadedmetadata', onLoaded, { once: true });
      el.addEventListener('error', onError, { once: true });
      this.abortController?.signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  stop(): void {
    this.abortController?.abort();
    this.abortController = null;

    if (this.stream) {
      const track = this.stream.getVideoTracks()[0];
      if (track && this.onTrackEndedHandler) {
        track.removeEventListener('ended', this.onTrackEndedHandler);
      }
      this.onTrackEndedHandler = null;
      this.stream.getTracks().forEach((t) => t.stop());
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
