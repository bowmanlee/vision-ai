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

/** WasmFileset is not exported by @mediapipe/tasks-vision, so we derive it. */
type WasmFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

/**
 * VisionPipeline initializes and runs MediaPipe vision tasks.
 *
 * Responsibilities:
 * - Lazy-load model assets and WASM runtime from CDN.
 * - Run inference on a video frame for face, pose, and hand.
 * - Package results into a VisionFrame.
 * - Gracefully degrade to CPU delegate if GPU is unavailable.
 *
 * Invariant: detect() must not be called before init() resolves.
 */

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm';

const MODEL_URLS = {
  face: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  pose: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  hand: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
};

async function createFaceLandmarker(vision: WasmFileset): Promise<FaceLandmarker> {
  const opts = {
    outputFaceBlendshapes: true,
    runningMode: 'VIDEO' as const,
    numFaces: 1,
  };
  try {
    console.log('[VisionPipeline] Creating FaceLandmarker with GPU delegate...');
    return await FaceLandmarker.createFromOptions(vision, {
      ...opts,
      baseOptions: { modelAssetPath: MODEL_URLS.face, delegate: 'GPU' },
    });
  } catch (gpuErr) {
    console.warn('[VisionPipeline] Face GPU delegate failed, falling back to CPU:', gpuErr);
    return await FaceLandmarker.createFromOptions(vision, {
      ...opts,
      baseOptions: { modelAssetPath: MODEL_URLS.face, delegate: 'CPU' },
    });
  }
}

async function createPoseLandmarker(vision: WasmFileset): Promise<PoseLandmarker> {
  const opts = {
    runningMode: 'VIDEO' as const,
    numPoses: 1,
  };
  try {
    console.log('[VisionPipeline] Creating PoseLandmarker with GPU delegate...');
    return await PoseLandmarker.createFromOptions(vision, {
      ...opts,
      baseOptions: { modelAssetPath: MODEL_URLS.pose, delegate: 'GPU' },
    });
  } catch (gpuErr) {
    console.warn('[VisionPipeline] Pose GPU delegate failed, falling back to CPU:', gpuErr);
    return await PoseLandmarker.createFromOptions(vision, {
      ...opts,
      baseOptions: { modelAssetPath: MODEL_URLS.pose, delegate: 'CPU' },
    });
  }
}

async function createHandLandmarker(vision: WasmFileset): Promise<HandLandmarker> {
  const opts = {
    runningMode: 'VIDEO' as const,
    numHands: 2,
  };
  try {
    console.log('[VisionPipeline] Creating HandLandmarker with GPU delegate...');
    return await HandLandmarker.createFromOptions(vision, {
      ...opts,
      baseOptions: { modelAssetPath: MODEL_URLS.hand, delegate: 'GPU' },
    });
  } catch (gpuErr) {
    console.warn('[VisionPipeline] Hand GPU delegate failed, falling back to CPU:', gpuErr);
    return await HandLandmarker.createFromOptions(vision, {
      ...opts,
      baseOptions: { modelAssetPath: MODEL_URLS.hand, delegate: 'CPU' },
    });
  }
}

export class VisionPipeline {
  private faceLandmarker: FaceLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private initialized = false;
  private disposed = false;

  async init(): Promise<void> {
    console.log('[VisionPipeline] init() started');
    if (this.initialized || this.disposed) {
      console.log('[VisionPipeline] Already initialized or disposed, skipping');
      return;
    }

    let vision: WasmFileset;
    try {
      console.log('[VisionPipeline] Loading WASM from:', WASM_CDN);
      vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      console.log('[VisionPipeline] WASM loaded successfully');
    } catch (err) {
      console.error('[VisionPipeline] WASM loading failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to load MediaPipe WASM runtime: ${msg}`);
    }

    if (this.disposed) {
      console.log('[VisionPipeline] Disposed during init, aborting');
      throw new Error('VisionPipeline was disposed during initialization');
    }

    console.log('[VisionPipeline] Creating landmarks...');
    const [face, pose, hand] = await Promise.all([
      createFaceLandmarker(vision).catch((err) => {
        console.error('[VisionPipeline] FaceLandmarker init failed:', err);
        throw new Error(`FaceLandmarker init failed: ${err?.message ?? err}`);
      }),
      createPoseLandmarker(vision).catch((err) => {
        console.error('[VisionPipeline] PoseLandmarker init failed:', err);
        throw new Error(`PoseLandmarker init failed: ${err?.message ?? err}`);
      }),
      createHandLandmarker(vision).catch((err) => {
        console.error('[VisionPipeline] HandLandmarker init failed:', err);
        throw new Error(`HandLandmarker init failed: ${err?.message ?? err}`);
      }),
    ]);
    console.log('[VisionPipeline] All landmarks created');

    if (this.disposed) {
      console.log('[VisionPipeline] Disposed after landmark creation, cleaning up');
      face.close();
      pose.close();
      hand.close();
      throw new Error('VisionPipeline was disposed during initialization');
    }

    this.faceLandmarker = face;
    this.poseLandmarker = pose;
    this.handLandmarker = hand;
    this.initialized = true;
    console.log('[VisionPipeline] init() complete');
  }

  detect(video: HTMLVideoElement): VisionFrame {
    if (!this.initialized) {
      throw new Error('VisionPipeline.detect() called before init()');
    }
    if (this.disposed) {
      throw new Error('VisionPipeline.detect() called after dispose()');
    }

    // MediaPipe expects integer timestamps for VIDEO mode.
    const timestamp = Math.round(performance.now());
    let faceResults: FaceLandmarkerResult | undefined;
    let poseResults: PoseLandmarkerResult | undefined;
    let handResults: HandLandmarkerResult | undefined;

    if (this.faceLandmarker && video.readyState >= 2) {
      try {
        faceResults = this.faceLandmarker.detectForVideo(video, timestamp);
      } catch (err) {
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

    const faces = faceResults?.faceLandmarks?.length ?? 0;
    const poses = poseResults?.landmarks?.length ?? 0;
    const hands = handResults?.landmarks?.length ?? 0;
    if (faces > 0 || poses > 0 || hands > 0) {
      console.log(`[VisionPipeline] Detected: ${faces} face(s), ${poses} pose(s), ${hands} hand(s)`);
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
    console.log('[VisionPipeline] dispose() called');
    this.disposed = true;
    this.faceLandmarker?.close();
    this.poseLandmarker?.close();
    this.handLandmarker?.close();
    this.faceLandmarker = null;
    this.poseLandmarker = null;
    this.handLandmarker = null;
    this.initialized = false;
  }
}
