import React, { Component, type ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SlopeSense Uncaught UI Exception:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
          <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl text-center space-y-5">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertOctagon className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Interface Encountered an Issue</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                SlopeSense early warning sensors are active. The user interface experienced an unexpected rendering event.
              </p>
            </div>
            {this.state.error && (
              <div className="rounded-xl bg-slate-950 p-3 text-left font-mono text-[11px] text-rose-300 overflow-x-auto border border-slate-800">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-md"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Application
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="flex items-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2.5 text-xs font-bold text-slate-200 transition-all"
              >
                <Home className="h-4 w-4" />
                Home Portal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
