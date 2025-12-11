import React from 'react';

interface FloatingNavProps {
    children: React.ReactNode;
}

const FloatingNav: React.FC<FloatingNavProps> = ({ children }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background-secondary border border-border-color rounded-full shadow-lg p-2 flex items-center gap-2">
        {children}
    </div>
  );
};

export default FloatingNav;