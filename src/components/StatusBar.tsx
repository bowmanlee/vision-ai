import React from 'react';
import type { ActivitySnapshot } from '../types';

interface StatusBarProps {
  snapshot: ActivitySnapshot | null;
}

const ACTIVITY_COLORS: Record<string, string> = {
  FOCUSED: 'bg-emerald-500',
  DOOM_SCROLLING: 'bg-rose-500',
  SLOUCHING: 'bg-amber-500',
  FATIGUED: 'bg-violet-500',
  UNKNOWN: 'bg-slate-500',
};

const ACTIVITY_LABELS: Record<string, string> = {
  FOCUSED: 'Focused',
  DOOM_SCROLLING: 'Doom Scrolling',
  SLOUCHING: 'Slouching',
  FATIGUED: 'Fatigued',
  UNKNOWN: 'Unknown',
};

export const StatusBar: React.FC<StatusBarProps> = ({ snapshot }) => {
  const activity = snapshot?.activity ?? 'UNKNOWN';
  const confidence = snapshot ? Math.round(snapshot.confidence * 100) : 0;

  return (
    <div className="flex items-center justify-between w-full max-w-4xl mx-auto mt-4 px-4 py-3 bg-white rounded-xl shadow">
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded-full ${ACTIVITY_COLORS[activity] ?? 'bg-slate-500'}`}
        />
        <span className="font-semibold text-slate-800">
          {ACTIVITY_LABELS[activity] ?? activity}
        </span>
      </div>
      <div className="text-sm text-slate-500">
        Confidence: <span className="font-mono font-medium">{confidence}%</span>
      </div>
    </div>
  );
};
