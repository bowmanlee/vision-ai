import { forwardRef } from 'react';
import { LandmarkCanvas } from './LandmarkCanvas';
import type { VisionFrame } from '../types';
import type { ActivitySnapshot } from '../types';
import type { DebugData } from '../hooks/useVisionSystem';

interface CameraFeedProps {
  frame: VisionFrame | null;
  snapshot: ActivitySnapshot | null;
  debug: DebugData | null;
}

export const CameraFeed = forwardRef<HTMLVideoElement, CameraFeedProps>(
  ({ frame, snapshot, debug }, ref) => {
    return (
      <div className="relative w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-lg bg-black aspect-video">
        <video
          ref={ref}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        <LandmarkCanvas frame={frame} snapshot={snapshot} debug={debug} />
      </div>
    );
  }
);

CameraFeed.displayName = 'CameraFeed';
