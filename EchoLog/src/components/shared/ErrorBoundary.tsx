import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[EchoLog] Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-8 transition-colors">
          <div className="max-w-lg w-full rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-8 space-y-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/50">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-red-800 dark:text-red-300">Something went wrong</h2>
            </div>
            <p className="text-sm text-red-700 dark:text-red-400 font-mono break-all bg-red-100 dark:bg-red-950 rounded-lg p-3 border border-red-200 dark:border-red-900">
              {this.state.error?.message ?? "Unknown error"}
            </p>
            {this.state.error?.stack && (
              <details className="text-xs">
                <summary className="text-red-500 dark:text-red-400 cursor-pointer font-medium">
                  Stack trace
                </summary>
                <pre className="mt-2 text-xs text-red-500 dark:text-red-400 whitespace-pre-wrap break-all bg-red-100 dark:bg-red-950 rounded-lg p-3 max-h-48 overflow-auto border border-red-200 dark:border-red-900">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Try Again
              </button>
              <button
                onClick={() => { window.location.href = "/"; }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-950 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                <Home className="w-3.5 h-3.5" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
