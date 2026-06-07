import { useRef } from 'react';
import { useVisionSystem } from './hooks/useVisionSystem';
import { CameraFeed } from './components/CameraFeed';
import { StatusBar } from './components/StatusBar';
import { DebugPanel } from './components/DebugPanel';
import { AlertOverlay } from './components/AlertOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isLoading, error, initStep, snapshot, debug, alert, dismissAlert, frame } =
    useVisionSystem(videoRef);

  const stepMessage =
    initStep === 'camera'
      ? 'Requesting camera access...'
      : initStep === 'models'
      ? 'Downloading AI models (10–20s on first load)...'
      : 'Initializing...';

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
        {/* Camera feed is ALWAYS rendered so the videoRef attaches immediately */}
        <div className="relative">
          <CameraFeed ref={videoRef} frame={frame} snapshot={snapshot} debug={debug} />

          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl z-10">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full mb-3" />
              <p className="text-white font-medium">{stepMessage}</p>
              <p className="text-white/70 text-xs mt-1 text-center px-4">
                Make sure you have granted camera permission.<br />
                First model download may take 10–20 seconds.
              </p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl z-10 p-6">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-800 max-w-md w-full">
                <p className="font-semibold">Error</p>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-xs mt-2 opacity-80">
                  Make sure you have granted camera permission and are using a modern
                  browser with WebGL support.
                </p>
              </div>
            </div>
          )}
        </div>

        {!isLoading && !error && (
          <>
            <StatusBar snapshot={snapshot} debug={debug} />
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

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
