import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
          <div className="max-w-lg w-full rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
            <h2 className="text-base font-semibold text-red-700">Something went wrong</h2>
            <p className="text-sm text-red-600 font-mono break-all">
              {this.state.error?.message ?? "Unknown error"}
            </p>
            {this.state.error?.stack && (
              <details className="mt-2">
                <summary className="text-xs text-red-500 cursor-pointer">Stack trace</summary>
                <pre className="mt-1 text-xs text-red-500 whitespace-pre-wrap break-all">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs text-red-600 underline"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
