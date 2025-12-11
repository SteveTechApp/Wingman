import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from './Logo';

const DefaultHeader: React.FC = () => {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `py-2 px-3 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-accent font-bold' : 'text-text-primary'}`;

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border-color print:hidden shadow-sm">
      <div className="container mx-auto flex justify-between items-center p-3">
        <Logo />
        <nav className="hidden md:flex items-center gap-2">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <NavLink to="/training" className={navLinkClass}>
            Training
          </NavLink>
          <NavLink to="/quick-question" className={navLinkClass}>
            Quick Question
          </NavLink>
        </nav>
        <div className="flex items-center gap-4">
          <button
            className="btn btn-primary text-sm px-4 py-2"
            onClick={() => window.location.href = '/'}
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
};

export default DefaultHeader;
