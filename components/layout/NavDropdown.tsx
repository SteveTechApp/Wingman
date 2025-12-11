import React, { useState, useRef, useEffect, ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDownIcon } from '../Icons';

// FIX: Define NavLinkItem locally as it was missing from the import and its structure is specific to this component.
interface NavLinkItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface NavDropdownProps {
  label: string;
  children: NavLinkItem[];
}

const NavDropdown: React.FC<NavDropdownProps> = ({ label, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="py-2 px-3 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
      >
        <span>{label}</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-72 bg-background-secondary border border-border-color rounded-lg shadow-lg p-2 z-40 animate-fade-in-fast">
          {children.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => 
                `flex items-start gap-3 p-3 rounded-md hover:bg-background transition-colors ${isActive ? 'text-accent' : 'text-text-primary'}`
              }
            >
              <div className="flex-shrink-0 mt-0.5 text-accent">
                {React.cloneElement(item.icon as ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
              </div>
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-xs text-text-secondary">{item.description}</p>
              </div>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

export default NavDropdown;