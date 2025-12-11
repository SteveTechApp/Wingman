import React from 'react';

interface WallLayoutDisplayProps {
  rows: number;
  cols: number;
}

const WallLayoutDisplay: React.FC<WallLayoutDisplayProps> = ({ rows, cols }) => {
  const safeRows = Math.max(1, Math.min(16, rows || 1));
  const safeCols = Math.max(1, Math.min(16, cols || 1));

  return (
    <div className="bg-background p-2 rounded-md border border-border-color aspect-video flex items-center justify-center">
        <div 
            className="grid gap-1 w-full h-full"
            style={{
                gridTemplateRows: `repeat(${safeRows}, minmax(0, 1fr))`,
                gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))`,
            }}
        >
        {Array.from({ length: safeRows * safeCols }).map((_, index) => (
            <div key={index} className="bg-accent-bg-very-subtle border border-accent-border-subtle rounded-sm flex items-center justify-center">
                <span className="text-accent text-xs font-mono">{index + 1}</span>
            </div>
        ))}
        </div>
    </div>
  );
};

export default WallLayoutDisplay;