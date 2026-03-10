import * as React from "react";
import ErrorDisplay from "./ErrorDisplay";
import { postDeploymentTelemetry } from "@/app/api/wingmanDeploymentClient";
import { useProjectContext } from "@/context";

interface ErrorBoundaryInternalProps {
  children?: React.ReactNode;
  projectId?: string | null;
  roomId?: string | null;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInternal extends React.Component<ErrorBoundaryInternalProps, State> {
  state: State;

  constructor(props: ErrorBoundaryInternalProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { projectId, roomId } = this.props;
    void postDeploymentTelemetry({
      kind: "error",
      message: error.message,
      stack: `${error.stack ?? ""}\n${errorInfo.componentStack ?? ""}`.trim(),
      timestamp: new Date().toISOString(),
      projectId: projectId || undefined,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      handled: true,
    });
    console.error("Uncaught error:", {
      message: error.message,
      stack: errorInfo.componentStack,
      context: {
        projectId: projectId || "N/A",
        roomId: roomId || "N/A",
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          message={this.state.error?.message || "Something went wrong."}
          onRetry={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { projectData, activeRoomId, activeProjectId } = useProjectContext();

  const resolvedProjectId =
    activeProjectId ??
    (projectData as any)?.activeId ??
    (projectData as any)?.activeProject?.id ??
    null;

  return (
    <ErrorBoundaryInternal projectId={resolvedProjectId} roomId={activeRoomId}>
      {children}
    </ErrorBoundaryInternal>
  );
};

export default ErrorBoundary;
