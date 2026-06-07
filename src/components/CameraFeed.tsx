import { forwardRef } from 'react';
import { LandmarkCanvas } from './LandmarkCanvas';
import type { VisionFrame } from '../types';

interface CameraFeedProps {
  frame: VisionFrame | null;
}

export const CameraFeed = forwardRef<HTMLVideoElement, CameraFeedProps>(
  ({ frame }, videoRef) => {
    return (
      <div className="relative w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-lg bg-black aspect-video">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        <LandmarkCanvas frame={frame} />
      </div>
    );
  }
);

CameraFeed.displayName = 'CameraFeed';
