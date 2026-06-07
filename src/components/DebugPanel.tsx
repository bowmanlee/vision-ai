import React from 'react';
import type { DebugData } from '../hooks/useVisionSystem';

interface DebugPanelProps {
  data: DebugData | null;
}

function fmt(n: number | undefined | null): string {
  if (n == null) return '—';
  return n.toFixed(2);
}

function DetectionCard({
  title,
  detected,
  confidence,
  severity,
  children,
}: {
  title: string;
  detected: boolean;
  confidence: number;
  severity: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-700">{title}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium ${
            detected ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {detected ? 'DETECTED' : 'CLEAR'}
        </span>
      </div>
      <div className="text-xs text-slate-500 mb-1">
        Confidence: {fmt(confidence)} | Severity: {severity}
      </div>
      {children && <div className="text-xs text-slate-600 mt-1">{children}</div>}
    </div>
  );
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-4 text-sm text-slate-400">
        Waiting for camera and models...
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="bg-white rounded-lg shadow p-3">
        <h3 className="font-semibold text-slate-700 mb-2">Face</h3>
        <div className="text-xs text-slate-600 space-y-1">
          <div>Left EAR: {fmt(data.face?.leftEAR)}</div>
          <div>Right EAR: {fmt(data.face?.rightEAR)}</div>
          <div>Avg EAR: {fmt(data.face?.avgEAR)}</div>
          <div>Head tilt: {fmt(data.face?.headTiltDeg)}°</div>
          <div>Nose Y: {fmt(data.face?.noseY)}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-3">
        <h3 className="font-semibold text-slate-700 mb-2">Pose</h3>
        <div className="text-xs text-slate-600 space-y-1">
          <div>Neck flexion: {fmt(data.pose?.neckFlexionDeg)}°</div>
          <div>Shoulder tilt: {fmt(data.pose?.shoulderTiltDeg)}°</div>
          <div>Torso lean: {fmt(data.pose?.torsoLeanDeg)}°</div>
          <div>Shoulder Y: {fmt(data.pose?.shoulderY)}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-3">
        <h3 className="font-semibold text-slate-700 mb-2">Hands</h3>
        <div className="text-xs text-slate-600 space-y-1">
          <div>Count: {data.hand?.handCount ?? '—'}</div>
          <div>Avg Y: {fmt(data.hand?.avgHandY)}</div>
          <div>Lower half: {data.hand?.handsInLowerHalf ? 'Yes' : 'No'}</div>
          <div>Pinch: {fmt(data.hand?.thumbIndexPinch)}</div>
        </div>
      </div>

      <DetectionCard
        title="Doom Scroll"
        detected={data.doomResult?.detected ?? false}
        confidence={data.doomResult?.confidence ?? 0}
        severity={data.doomResult?.severity ?? 'low'}
      >
        Duration: {fmt((data.doomResult?.metadata as { durationMs?: number })?.durationMs)}ms
      </DetectionCard>

      <DetectionCard
        title="Posture"
        detected={data.postureResult?.detected ?? false}
        confidence={data.postureResult?.confidence ?? 0}
        severity={data.postureResult?.severity ?? 'low'}
      />

      <DetectionCard
        title="Fatigue"
        detected={data.fatigueResult?.detected ?? false}
        confidence={data.fatigueResult?.confidence ?? 0}
        severity={data.fatigueResult?.severity ?? 'low'}
      />
    </div>
  );
};
