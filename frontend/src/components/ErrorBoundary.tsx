import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error Boundary Exception:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] text-[#111827] flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl p-8 max-w-md w-full shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-[#111827]">Something went wrong</h1>
              <p className="text-[#4B5563] text-xs leading-relaxed">
                An unexpected application error occurred. You can return home or reload the page.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-rose-200 font-mono text-[11px] text-rose-700 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-3 rounded-xl bg-[#7567E8] hover:bg-[#7567E8]/90 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
