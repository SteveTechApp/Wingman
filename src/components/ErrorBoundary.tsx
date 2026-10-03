import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { reportRuntimeEvent } from "../wingman2/lib/runtimeTelemetry";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Uncaught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

    // console.error alone goes nowhere in a production browser. Send the crash
    // to the backend telemetry endpoint so a failure in front of a customer
    // leaves a trace someone can actually find.
    reportRuntimeEvent({
      kind: "error",
      message: error.message || "Uncaught render error",
      stack: error.stack,
      source: errorInfo.componentStack?.trim().split("\n")[0]?.trim(),
      handled: true,
    });

    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#071828] to-[#040d18] p-6">
          <div className="w-full max-w-lg rounded-3xl border border-[#29465e] bg-[#0a1826]/95 p-8 shadow-2xl">
            <div className="mb-6 flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-400">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Something went wrong
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  An unexpected error occurred in the application
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-950/30 p-4">
                <p className="font-mono text-sm text-rose-300">
                  {error.message || "Unknown error"}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#29465e] bg-[#0d2133] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#3a5a78] hover:bg-[#102a40]"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-5 py-3 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400/60 hover:bg-cyan-500/25"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </button>
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
