import { useEffect, useRef, useState, useCallback } from 'react';
import { CameraSource, VisionPipeline } from '../perception';
import type { VisionFrame } from '../types';
import { extractFaceFeatures, extractPoseFeatures, extractHandFeatures, extractExpressions } from '../features';
import { DoomScrollDetector, PostureDetector, FatigueDetector, ExpressionDetector } from '../detectors';
import { ActivityFusionEngine } from '../fusion';
import { AlertManager, AudioAlert } from '../alerts';
import { withTimeout } from '../lib/timeout';
import type { ActivitySnapshot, AlertEvent, DetectionResult } from '../types';

export interface DebugData {
  face: ReturnType<typeof extractFaceFeatures>;
  pose: ReturnType<typeof extractPoseFeatures>;
  hand: ReturnType<typeof extractHandFeatures>;
  expression: ReturnType<typeof extractExpressions>;
  expressionSmoothed: { expression: string; confidence: number } | null;
  doomResult: DetectionResult<unknown> | null;
  postureResult: DetectionResult<unknown> | null;
  fatigueResult: DetectionResult<unknown> | null;
}

export interface VisionSystemState {
  isLoading: boolean;
  error: string | null;
  initStep: 'camera' | 'models' | 'ready' | null;
  snapshot: ActivitySnapshot | null;
  debug: DebugData | null;
  alert: AlertEvent | null;
  frame: VisionFrame | null;
}

/** Process detection every N animation frames to save CPU/GPU. */
const DETECT_EVERY_N_FRAMES = 3;
/** Throttle React state updates to this interval (ms). */
const UI_UPDATE_INTERVAL_MS = 100;
/** Max time to wait for camera permission + stream start. */
const CAMERA_TIMEOUT_MS = 10000;
/** Max time to wait for MediaPipe WASM + model download. */
const MODEL_TIMEOUT_MS = 60000;

/**
 * Orchestrates the entire perception -> features -> detection -> fusion -> alert pipeline.
 *
 * Responsibilities:
 * - Camera lifecycle.
 * - MediaPipe initialization.
 * - requestAnimationFrame detection loop with frame skipping.
 * - Throttled React state aggregation (prevents 60fps re-renders).
 * - Page-visibility pause/resume.
 * - Clean teardown of all engine instances.
 */
export function useVisionSystem(videoRef: React.RefObject<HTMLVideoElement>) {
  const [state, setState] = useState<VisionSystemState>({
    isLoading: true,
    error: null,
    initStep: 'camera',
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
    console.log('[useVisionSystem] Effect running. videoRef.current:', videoRef.current);
    if (!videoRef.current) {
      console.warn('[useVisionSystem] videoRef.current is null, exiting effect');
      return;
    }

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
    const expressionDetector = new ExpressionDetector();

    let running = true;
    let rafId = 0;
    let frameCounter = 0;
    let lastUiUpdate = 0;

    async function boot() {
      console.log('[useVisionSystem] boot() started');
      try {
        console.log('[useVisionSystem] Starting camera...');
        setState((prev) => ({ ...prev, initStep: 'camera' }));
        await withTimeout(
          camera.start(videoRef.current!),
          CAMERA_TIMEOUT_MS,
          'Camera initialization'
        );
        console.log('[useVisionSystem] Camera started successfully');

        console.log('[useVisionSystem] Starting pipeline init...');
        setState((prev) => ({ ...prev, initStep: 'models' }));
        await withTimeout(
          pipeline.init(),
          MODEL_TIMEOUT_MS,
          'AI model loading'
        );
        console.log('[useVisionSystem] Pipeline init complete');

        if (!running) {
          console.log('[useVisionSystem] Component unmounted during init, aborting');
          return;
        }
        setState((prev) => ({ ...prev, isLoading: false, initStep: 'ready' }));
        console.log('[useVisionSystem] System ready, starting detection loop');
      } catch (err) {
        if (!running) {
          console.log('[useVisionSystem] Component unmounted during init error');
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[useVisionSystem] Init failed:', msg);
        setState((prev) => ({ ...prev, isLoading: false, error: msg, initStep: null }));
        return;
      }

      let hasLoggedFirstDetection = false;

      function loop() {
        if (!running) return;
        if (document.hidden) {
          rafId = requestAnimationFrame(loop);
          return;
        }

        const video = camera.getVideoElement();
        if (video) {
          if (video.readyState >= 2) {
            frameCounter++;
            if (frameCounter % DETECT_EVERY_N_FRAMES === 0) {
              try {
                const frame = pipeline.detect(video);

                const faceLm = frame.faceResults?.faceLandmarks?.[0];
                const poseLm = frame.poseResults?.landmarks?.[0];
                const handLms = frame.handResults?.landmarks;
                const blendshapes = frame.faceResults?.faceBlendshapes;

                const face = extractFaceFeatures(faceLm);
                const pose = extractPoseFeatures(poseLm);
                const hand = extractHandFeatures(
                  handLms?.map((lm) => ({ landmarks: lm }))
                );
                const expressionRaw = extractExpressions(blendshapes);
                const expression = expressionDetector.update(expressionRaw);

                if (!hasLoggedFirstDetection) {
                  hasLoggedFirstDetection = true;
                  console.log('[useVisionSystem] First detection frame:', {
                    faceDetected: face != null,
                    poseDetected: pose != null,
                    handsDetected: hand?.handCount ?? 0,
                  });
                }

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

                const alertEvent = alertManager.evaluate(snapshot);
                if (alertEvent) {
                  alertManager.commit(alertEvent);
                }

                const debug: DebugData = {
                  face,
                  pose,
                  hand,
                  expression: expressionRaw,
                  expressionSmoothed: expression,
                  doomResult,
                  postureResult,
                  fatigueResult,
                };

                // Throttle React state updates to avoid 60fps re-renders.
                if (now - lastUiUpdate >= UI_UPDATE_INTERVAL_MS) {
                  lastUiUpdate = now;
                  setState((prev) => ({
                    ...prev,
                    snapshot,
                    debug,
                    frame,
                  }));
                }
              } catch (err) {
                console.error('[useVisionSystem] Loop error:', err);
              }
            }
          } else if (frameCounter === 0) {
            // Log once if video exists but isn't ready yet
            console.log('[useVisionSystem] Waiting for video readyState >= 2, current:', video.readyState);
          }
        }
        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);
    }

    boot();

    return () => {
      console.log('[useVisionSystem] Cleanup running');
      running = false;
      cancelAnimationFrame(rafId);
      camera.stop();
      pipeline.dispose();
      doomDetector.reset();
      postureDetector.reset();
      fatigueDetector.reset();
      expressionDetector.reset();
      fusion.reset();
      alertManager.reset();
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, [videoRef]);

  return { ...state, dismissAlert };
}
