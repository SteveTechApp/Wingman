import React from 'react';
import { Link } from 'react-router-dom';

interface ActionButtonProps {
    to: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ to, icon, title, description }) => (
    <Link 
        to={to} 
        className="flex items-start text-left gap-4 p-4 bg-background-secondary rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 hover:border-accent-border-subtle h-full border border-transparent"
    >
        <div className="flex-shrink-0 text-accent mt-1">
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-8 w-8" })}
        </div>
        <div>
            <h3 className="font-bold text-lg text-text-primary">{title}</h3>
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
    </Link>
);

export default ActionButton;