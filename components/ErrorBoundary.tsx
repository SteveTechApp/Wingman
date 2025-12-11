import React from 'react';
import ErrorDisplay from './ErrorDisplay';
import { useProjectContext } from '../context/ProjectContext';

// --- Internal Class Component for Error Handling Logic ---

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
  public readonly props: ErrorBoundaryInternalProps & { children?: React.ReactNode };

  constructor(props: ErrorBoundaryInternalProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { projectId, roomId } = this.props;
    console.error("Uncaught error:", {
        message: error.message,
        stack: errorInfo.componentStack,
        context: {
            projectId: projectId || 'N/A',
            roomId: roomId || 'N/A',
        }
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorDisplay message={this.state.error?.message || 'Something went wrong.'} onRetry={() => window.location.reload()} />;
    }

    return this.props.children;
  }
}


// --- Functional Wrapper to Inject Context ---

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { projectData, activeRoomId } = useProjectContext();

  return (
    <ErrorBoundaryInternal 
      projectId={projectData?.projectId} 
      roomId={activeRoomId}
    >
      {children}
    </ErrorBoundaryInternal>
  );
};

export default ErrorBoundary;