import React from 'react';

interface InfoTooltipProps {
  text?: string;
  content?: React.ReactNode;
  children: React.ReactNode;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, content, children }) => {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-background text-text-primary text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-border-color">
        {content || text}
      </div>
    </div>
  );
};

export default InfoTooltip;