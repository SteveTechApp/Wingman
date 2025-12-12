import React from 'react';

interface UndoRedoToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  lastCommand?: string;
  className?: string;
}

const UndoRedoToolbar: React.FC<UndoRedoToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  lastCommand,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`p-2 rounded-lg border border-border-color transition-colors ${
          canUndo
            ? 'hover:bg-input-bg text-text-primary'
            : 'text-text-secondary opacity-50 cursor-not-allowed'
        }`}
        title={canUndo ? `Undo: ${lastCommand}` : 'Nothing to undo'}
        aria-label="Undo"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`p-2 rounded-lg border border-border-color transition-colors ${
          canRedo
            ? 'hover:bg-input-bg text-text-primary'
            : 'text-text-secondary opacity-50 cursor-not-allowed'
        }`}
        title={canRedo ? 'Redo' : 'Nothing to redo'}
        aria-label="Redo"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
          />
        </svg>
      </button>

      {lastCommand && canUndo && (
        <span className="text-sm text-text-secondary ml-2">
          {lastCommand}
        </span>
      )}
    </div>
  );
};

export default UndoRedoToolbar;
