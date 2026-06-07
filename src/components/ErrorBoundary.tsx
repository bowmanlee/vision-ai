import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
              <h2 className="text-xl font-bold text-rose-600 mb-2">Something went wrong</h2>
              <p className="text-slate-600 text-sm mb-4">
                The vision system encountered an unexpected error. Try refreshing the page.
              </p>
              {this.state.error && (
                <pre className="text-left text-xs bg-slate-50 p-3 rounded text-slate-500 overflow-auto">
                  {this.state.error.message}
                </pre>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
