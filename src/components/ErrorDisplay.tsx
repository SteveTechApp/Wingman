import React from 'react';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="bg-destructive-bg border border-destructive-border-subtle rounded-lg p-8 max-w-md">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-destructive mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="mt-4 text-xl font-bold text-destructive">An Error Occurred</h2>
        <p className="mt-2 text-text-secondary">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-6 bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;