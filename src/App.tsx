import { useRef } from 'react';
import { useVisionSystem } from './hooks/useVisionSystem';
import { CameraFeed } from './components/CameraFeed';
import { StatusBar } from './components/StatusBar';
import { DebugPanel } from './components/DebugPanel';
import { AlertOverlay } from './components/AlertOverlay';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isLoading, error, snapshot, debug, alert, dismissAlert, frame } =
    useVisionSystem(videoRef);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <header className="max-w-4xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
          Vision AI
        </h1>
        <p className="text-slate-500 mt-1">
          Real-time activity detection: posture, fatigue, and doom-scroll
          monitoring.
        </p>
      </header>

      <main className="space-y-4">
        {isLoading && (
          <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full mb-3" />
            <p className="text-slate-600">Initializing camera and AI models...</p>
            <p className="text-xs text-slate-400 mt-1">
              First load may take 10–20 seconds while models download.
            </p>
          </div>
        )}

        {error && (
          <div className="max-w-4xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
            <p className="text-xs mt-2 opacity-80">
              Make sure you have granted camera permission and are using a modern
              browser with WebGL support.
            </p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <CameraFeed ref={videoRef} frame={frame} />
            <StatusBar snapshot={snapshot} />
            <DebugPanel data={debug} />
          </>
        )}
      </main>

      {alert && <AlertOverlay event={alert} onDismiss={dismissAlert} />}

      <footer className="max-w-4xl mx-auto mt-8 text-center text-xs text-slate-400">
        All processing happens locally in your browser. No video leaves your device.
      </footer>
    </div>
  );
}

export default App;
