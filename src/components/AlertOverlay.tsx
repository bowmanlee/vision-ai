import React from 'react';
import type { AlertEvent } from '../types';

interface AlertOverlayProps {
  event: AlertEvent;
  onDismiss: () => void;
}

const SEVERITY_STYLES = {
  low: 'border-l-4 border-amber-400 bg-amber-50 text-amber-900',
  medium: 'border-l-4 border-orange-500 bg-orange-50 text-orange-900',
  high: 'border-l-4 border-rose-600 bg-rose-50 text-rose-900',
};

export const AlertOverlay: React.FC<AlertOverlayProps> = ({ event, onDismiss }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`max-w-md w-full rounded-xl shadow-2xl p-6 animate-[fadeIn_0.2s_ease-out] ${SEVERITY_STYLES[event.severity]}`}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold">Alert</h2>
          <button
            onClick={onDismiss}
            className="text-sm text-slate-500 hover:text-slate-800"
            aria-label="Dismiss alert"
          >
            Dismiss
          </button>
        </div>
        <p className="mt-2 text-base">{event.message}</p>
        <div className="mt-4 text-xs opacity-70">
          Activity: {event.activity} · Severity: {event.severity}
        </div>
      </div>
    </div>
  );
};
