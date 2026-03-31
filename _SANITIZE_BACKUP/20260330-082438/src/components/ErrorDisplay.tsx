
import * as React from "react";

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => {
  return (
    <div className="wm-error-display">
      <div className="wm-error-display__card">
        <svg xmlns="http://www.w3.org/2000/svg" className="wm-error-display__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="wm-error-display__title">An Error Occurred</h2>
        <p className="wm-error-display__message">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="wm-btn wm-btn-primary wm-error-display__action"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;



