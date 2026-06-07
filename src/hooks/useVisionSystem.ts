import { useEffect, useRef, useState, useCallback } from 'react';
import {
  CameraSource,
  VisionPipeline,
} from '../perception';
import type { VisionFrame } from '../types';
import {
  extractFaceFeatures,
  extractPoseFeatures,
  extractHandFeatures,
} from '../features';
import {
  DoomScrollDetector,
  PostureDetector,
  FatigueDetector,
} from '../detectors';
import { ActivityFusionEngine } from '../fusion';
import { AlertManager, AudioAlert } from '../alerts';
import type { ActivitySnapshot, AlertEvent, DetectionResult } from '../types';

export interface DebugData {
  face: ReturnType<typeof extractFaceFeatures>;
  pose: ReturnType<typeof extractPoseFeatures>;
  hand: ReturnType<typeof extractHandFeatures>;
  doomResult: DetectionResult<unknown> | null;
  postureResult: DetectionResult<unknown> | null;
  fatigueResult: DetectionResult<unknown> | null;
}

export interface VisionSystemState {
  isLoading: boolean;
  error: string | null;
  snapshot: ActivitySnapshot | null;
  debug: DebugData | null;
  alert: AlertEvent | null;
  frame: VisionFrame | null;
}

/**
 * Orchestrates the entire perception -> features -> detection -> fusion -> alert pipeline.
 *
 * Responsibilities:
 * - Camera lifecycle.
 * - MediaPipe initialization.
 * - requestAnimationFrame detection loop.
 * - State aggregation for React.
 */
export function useVisionSystem(videoRef: React.RefObject<HTMLVideoElement>) {
  const [state, setState] = useState<VisionSystemState>({
    isLoading: true,
    error: null,
    snapshot: null,
    debug: null,
    alert: null,
    frame: null,
  });

  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissAlert = useCallback(() => {
    setState((prev) => ({ ...prev, alert: null }));
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;

    const camera = new CameraSource();
    const pipeline = new VisionPipeline();
    const fusion = new ActivityFusionEngine();
    const alertManager = new AlertManager();
    alertManager.registerChannel(new AudioAlert());
    alertManager.registerChannel({
      name: 'visual',
      dispatch: (event: AlertEvent) => {
        setState((prev) => ({ ...prev, alert: event }));
        if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = setTimeout(() => {
          setState((prev) => ({ ...prev, alert: null }));
        }, 5000);
      },
    });

    const doomDetector = new DoomScrollDetector();
    const postureDetector = new PostureDetector();
    const fatigueDetector = new FatigueDetector();

    let running = true;
    let rafId = 0;

    async function boot() {
      try {
        await camera.start(videoRef.current!);
        await pipeline.init();
        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setState((prev) => ({ ...prev, isLoading: false, error: msg }));
        return;
      }

      function loop() {
        if (!running) return;
        const video = camera.getVideoElement();
        if (video && video.readyState >= 2) {
          try {
            const frame = pipeline.detect(video);

            const faceLm = frame.faceResults?.faceLandmarks?.[0];
            const poseLm = frame.poseResults?.landmarks?.[0];
            const handLms = frame.handResults?.landmarks;

            const face = extractFaceFeatures(faceLm);
            const pose = extractPoseFeatures(poseLm);
            const hand = extractHandFeatures(
              handLms?.map((lm) => ({ landmarks: lm }))
            );

            doomDetector.updateFeatures(face, pose, hand);
            postureDetector.updateFeatures(pose);
            fatigueDetector.updateFeatures(face);

            const now = performance.now();
            const doomResult = doomDetector.detect(now);
            const postureResult = postureDetector.detect(now);
            const fatigueResult = fatigueDetector.detect(now);

            const snapshot = fusion.fuse(now, {
              doomScroll: doomResult,
              posture: postureResult,
              fatigue: fatigueResult,
            });

            alertManager.evaluate(snapshot);

            setState((prev) => ({
              ...prev,
              snapshot,
              debug: {
                face,
                pose,
                hand,
                doomResult,
                postureResult,
                fatigueResult,
              },
              frame,
            }));
          } catch (err) {
            console.error('[useVisionSystem] Loop error:', err);
          }
        }
        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);
    }

    boot();

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      camera.stop();
      pipeline.dispose();
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, [videoRef]);

  return { ...state, dismissAlert };
}
