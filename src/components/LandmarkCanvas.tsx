import React, { useRef, useEffect } from 'react';
import type { VisionFrame } from '../types';
import type { ActivitySnapshot } from '../types';
import type { DebugData } from '../hooks/useVisionSystem';

interface LandmarkCanvasProps {
  frame: VisionFrame | null;
  snapshot: ActivitySnapshot | null;
  debug: DebugData | null;
}

const POSE_CONNECTIONS: readonly [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [15, 17], [16, 18], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30],
] as const;

const HAND_CONNECTIONS: readonly [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
] as const;

/** Key landmarks to label with human-readable names. */
const LANDMARK_LABELS: Record<string, Record<number, string>> = {
  face: {
    1: 'Nose',
    33: 'R Eye',
    263: 'L Eye',
    61: 'Mouth',
    152: 'Chin',
  },
  pose: {
    0: 'Nose',
    11: 'L Shoulder',
    12: 'R Shoulder',
    13: 'L Elbow',
    14: 'R Elbow',
    15: 'L Wrist',
    16: 'R Wrist',
    23: 'L Hip',
    24: 'R Hip',
    25: 'L Knee',
    26: 'R Knee',
    27: 'L Ankle',
    28: 'R Ankle',
  },
  hand: {
    0: 'Wrist',
    4: 'Thumb',
    8: 'Index',
    12: 'Middle',
    16: 'Ring',
    20: 'Pinky',
  },
};

function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string
) {
  ctx.font = 'bold 11px system-ui, sans-serif';
  const padding = 3;
  const metrics = ctx.measureText(text);
  const w = metrics.width + padding * 2;
  const h = 14 + padding * 2;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.roundRect(x + 8, y - 10, w, h, 4);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillText(text, x + 8 + padding, y + 2);
}

function getActivityColors(activity: string): {
  pose: string;
  face: string;
  hand: string;
  label: string;
} {
  switch (activity) {
    case 'DOOM_SCROLLING':
      return { pose: '#ff4444', face: '#ff4444', hand: '#ff8800', label: '#ff4444' };
    case 'SLOUCHING':
      return { pose: '#ffaa00', face: '#ffaa00', hand: '#ffaa00', label: '#ffaa00' };
    case 'FATIGUED':
      return { pose: '#aa44ff', face: '#aa44ff', hand: '#aa44ff', label: '#aa44ff' };
    case 'FOCUSED':
      return { pose: '#00ff88', face: '#00ff88', hand: '#00ff88', label: '#00ff88' };
    default:
      return { pose: '#00ff88', face: '#ff66cc', hand: '#66ccff', label: '#ffffff' };
  }
}

export const LandmarkCanvas: React.FC<LandmarkCanvasProps> = ({ frame, snapshot, debug }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          sizeRef.current = { width, height };
        }
      }
    });
    resizeObserver.observe(canvas);

    const draw = () => {
      const { width, height } = sizeRef.current;
      if (width === 0 || height === 0) return;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const activity = snapshot?.activity ?? 'UNKNOWN';
      const colors = getActivityColors(activity);

      // Draw pose landmarks.
      if (frame?.poseResults?.landmarks) {
        ctx.strokeStyle = colors.pose;
        ctx.fillStyle = colors.pose;
        ctx.lineWidth = 2;

        for (const landmarks of frame.poseResults.landmarks) {
          for (const [a, b] of POSE_CONNECTIONS) {
            const p1 = landmarks[a];
            const p2 = landmarks[b];
            if (p1 && p2) {
              ctx.beginPath();
              ctx.moveTo(p1.x * width, p1.y * height);
              ctx.lineTo(p2.x * width, p2.y * height);
              ctx.stroke();
            }
          }
          for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            ctx.beginPath();
            ctx.arc(lm.x * width, lm.y * height, 4, 0, Math.PI * 2);
            ctx.fill();
            const label = LANDMARK_LABELS.pose[i];
            if (label) {
              drawLabel(ctx, lm.x * width, lm.y * height, label, colors.label);
            }
          }
        }
      }

      // Draw face landmarks.
      if (frame?.faceResults?.faceLandmarks) {
        ctx.fillStyle = colors.face;
        for (const landmarks of frame.faceResults.faceLandmarks) {
          for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            ctx.beginPath();
            ctx.arc(lm.x * width, lm.y * height, 1.5, 0, Math.PI * 2);
            ctx.fill();
            const label = LANDMARK_LABELS.face[i];
            if (label) {
              drawLabel(ctx, lm.x * width, lm.y * height, label, colors.label);
            }
          }
        }
      }

      // Draw hand landmarks.
      if (frame?.handResults?.landmarks) {
        ctx.strokeStyle = colors.hand;
        ctx.fillStyle = colors.hand;
        ctx.lineWidth = 2;

        for (const landmarks of frame.handResults.landmarks) {
          for (const [a, b] of HAND_CONNECTIONS) {
            const p1 = landmarks[a];
            const p2 = landmarks[b];
            if (p1 && p2) {
              ctx.beginPath();
              ctx.moveTo(p1.x * width, p1.y * height);
              ctx.lineTo(p2.x * width, p2.y * height);
              ctx.stroke();
            }
          }
          for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            ctx.beginPath();
            ctx.arc(lm.x * width, lm.y * height, 3, 0, Math.PI * 2);
            ctx.fill();
            const label = LANDMARK_LABELS.hand[i];
            if (label) {
              drawLabel(ctx, lm.x * width, lm.y * height, label, colors.label);
            }
          }
        }
      }

      // Draw HUD overlay directly on canvas
      drawHud(ctx, width, height, snapshot, debug, activity);
    };

    draw();

    return () => {
      resizeObserver.disconnect();
    };
  }, [frame, snapshot, debug]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

function drawHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  snapshot: ActivitySnapshot | null,
  debug: DebugData | null,
  activity: string
) {
  ctx.font = '12px system-ui, sans-serif';

  // Top-left: Detection health
  const faceOk = debug?.face != null;
  const poseOk = debug?.pose != null;
  const handOk = (debug?.hand?.handCount ?? 0) > 0;

  const healthItems = [
    { label: 'Face', ok: faceOk },
    { label: 'Pose', ok: poseOk },
    { label: 'Hands', ok: handOk },
  ];

  let y = 20;
  for (const item of healthItems) {
    ctx.fillStyle = item.ok ? 'rgba(0,200,100,0.85)' : 'rgba(200,50,50,0.85)';
    ctx.beginPath();
    ctx.roundRect(10, y - 12, 70, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(`${item.ok ? '✓' : '✗'} ${item.label}`, 16, y);
    y += 24;
  }

  // Top-right: Activity + confidence + expression
  const hasExpression = debug?.expressionSmoothed != null;
  const boxRows = hasExpression ? 3 : 2;
  const boxH = 18 + boxRows * 18;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.roundRect(w - 160, 10, 150, boxH, 8);
  ctx.fill();

  const activityLabel = activity.replace(/_/g, ' ');
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(activityLabel, w - 150, 28);
  ctx.font = '12px system-ui, sans-serif';
  const conf = snapshot ? Math.round(snapshot.confidence * 100) : 0;
  ctx.fillText(`Confidence: ${conf}%`, w - 150, 46);
  if (hasExpression) {
    const expr = debug!.expressionSmoothed!;
    ctx.fillStyle = '#c7d2fe';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(
      `${expr.expression} (${Math.round(expr.confidence * 100)}%)`,
      w - 150,
      64
    );
  }

  // Bottom-left: Key metrics
  const metrics: string[] = [];
  if (debug?.face) {
    metrics.push(`EAR: ${debug.face.avgEAR.toFixed(2)}`);
    metrics.push(`Tilt: ${debug.face.headTiltDeg.toFixed(0)}°`);
  }
  if (debug?.pose) {
    metrics.push(`Neck: ${debug.pose.neckFlexionDeg.toFixed(0)}°`);
  }
  if (debug?.hand) {
    metrics.push(`Hands: ${debug.hand.handCount}`);
  }

  if (metrics.length > 0) {
    const lineH = 18;
    const boxH = metrics.length * lineH + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(10, h - boxH - 10, 130, boxH, 6);
    ctx.fill();

    ctx.fillStyle = '#0ff';
    ctx.font = '11px monospace';
    metrics.forEach((m, i) => {
      ctx.fillText(m, 18, h - boxH + 8 + i * lineH);
    });
  }

  // Center message if nothing detected
  if (!faceOk && !poseOk && !handOk) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 16px system-ui, sans-serif';
    const msg = 'No body detected — step back and face the camera';
    const metrics = ctx.measureText(msg);
    ctx.fillText(msg, (w - metrics.width) / 2, h / 2);
  }
}
