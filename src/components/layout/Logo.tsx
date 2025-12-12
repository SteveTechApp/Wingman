import React from 'react';
import { Link } from 'react-router-dom';

const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Link to="/" className={`flex items-center gap-3 ${className || ''}`}>
      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
        {/* WyreStorm 'W' Icon */}
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-text-primary">
          <path d="M2 3L8.33333 13L12 21L15.6667 13L22 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 13L2 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 13L22 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="hidden sm:flex flex-col items-start -space-y-1">
        <span className="text-sm font-medium tracking-wide text-text-primary">AI Wingman</span>
      </div>
    </Link>
  );
};

export default Logo;