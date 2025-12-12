import React from 'react';
import { Link } from 'react-router-dom';

const ActionButtons: React.FC = () => {
    return (
        <div className="flex justify-center gap-4">
            <Link 
                to="/setup" 
                className="bg-accent hover:bg-accent-hover text-text-on-accent font-bold py-3 px-8 rounded-lg text-lg"
            >
                Create New Project
            </Link>
            <Link 
                to="/agent" 
                className="bg-background hover:bg-border-color text-text-primary font-bold py-3 px-8 rounded-lg text-lg border border-border-color"
            >
                Analyze Client Brief
            </Link>
        </div>
    );
};

export default ActionButtons;