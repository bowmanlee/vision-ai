import {
  FaceLandmarker,
  PoseLandmarker,
  HandLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type PoseLandmarkerResult,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { VisionFrame } from '../types';

/**
 * VisionPipeline initializes and runs MediaPipe vision tasks.
 *
 * Responsibilities:
 * - Lazy-load model assets and WASM runtime from CDN.
 * - Run inference on a video frame for face, pose, and hand.
 * - Package results into a VisionFrame.
 *
 * Invariant: detect() must not be called before init() resolves.
 */

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm';

export class VisionPipeline {
  private faceLandmarker: FaceLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    let vision;
    try {
      vision = await FilesetResolver.forVisionTasks(WASM_CDN);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to load MediaPipe WASM runtime: ${msg}`);
    }

    const [face, pose, hand] = await Promise.all([
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
      }).catch((err) => {
        throw new Error(`FaceLandmarker init failed: ${err?.message ?? err}`);
      }),
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      }).catch((err) => {
        throw new Error(`PoseLandmarker init failed: ${err?.message ?? err}`);
      }),
      HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      }).catch((err) => {
        throw new Error(`HandLandmarker init failed: ${err?.message ?? err}`);
      }),
    ]);

    this.faceLandmarker = face;
    this.poseLandmarker = pose;
    this.handLandmarker = hand;
    this.initialized = true;
  }

  detect(video: HTMLVideoElement): VisionFrame {
    if (!this.initialized) {
      throw new Error('VisionPipeline.detect() called before init()');
    }

    const timestamp = performance.now();
    let faceResults: FaceLandmarkerResult | undefined;
    let poseResults: PoseLandmarkerResult | undefined;
    let handResults: HandLandmarkerResult | undefined;

    if (this.faceLandmarker && video.readyState >= 2) {
      try {
        faceResults = this.faceLandmarker.detectForVideo(video, timestamp);
      } catch (err) {
        // Surface failure without crashing the pipeline.
        console.error('[VisionPipeline] Face detection error:', err);
      }
    }

    if (this.poseLandmarker && video.readyState >= 2) {
      try {
        poseResults = this.poseLandmarker.detectForVideo(video, timestamp);
      } catch (err) {
        console.error('[VisionPipeline] Pose detection error:', err);
      }
    }

    if (this.handLandmarker && video.readyState >= 2) {
      try {
        handResults = this.handLandmarker.detectForVideo(video, timestamp);
      } catch (err) {
        console.error('[VisionPipeline] Hand detection error:', err);
      }
    }

    return {
      video,
      timestamp,
      faceResults,
      poseResults,
      handResults,
    };
  }

  dispose(): void {
    this.faceLandmarker?.close();
    this.poseLandmarker?.close();
    this.handLandmarker?.close();
    this.faceLandmarker = null;
    this.poseLandmarker = null;
    this.handLandmarker = null;
    this.initialized = false;
  }
}
