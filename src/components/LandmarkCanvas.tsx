import React, { useRef, useEffect } from 'react';
import type { VisionFrame } from '../types';

interface LandmarkCanvasProps {
  frame: VisionFrame | null;
}

const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [15, 17], [16, 18], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30],
];

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
];

export const LandmarkCanvas: React.FC<LandmarkCanvasProps> = ({ frame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas resolution to display size.
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    // Draw pose landmarks.
    if (frame.poseResults?.landmarks) {
      ctx.strokeStyle = '#00ff88';
      ctx.fillStyle = '#00ff88';
      ctx.lineWidth = 2;

      for (const landmarks of frame.poseResults.landmarks) {
        // Connections
        for (const [a, b] of POSE_CONNECTIONS) {
          const p1 = landmarks[a];
          const p2 = landmarks[b];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x * w, p1.y * h);
            ctx.lineTo(p2.x * w, p2.y * h);
            ctx.stroke();
          }
        }
        // Points
        for (const lm of landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw face landmarks.
    if (frame.faceResults?.faceLandmarks) {
      ctx.fillStyle = '#ff66cc';
      for (const landmarks of frame.faceResults.faceLandmarks) {
        for (const lm of landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw hand landmarks.
    if (frame.handResults?.landmarks) {
      ctx.strokeStyle = '#66ccff';
      ctx.fillStyle = '#66ccff';
      ctx.lineWidth = 2;

      for (const landmarks of frame.handResults.landmarks) {
        for (const [a, b] of HAND_CONNECTIONS) {
          const p1 = landmarks[a];
          const p2 = landmarks[b];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x * w, p1.y * h);
            ctx.lineTo(p2.x * w, p2.y * h);
            ctx.stroke();
          }
        }
        for (const lm of landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [frame]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};
