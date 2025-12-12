import React from 'react';
import NetworkInfrastructurePanel from './NetworkInfrastructurePanel';

const InfrastructurePanel: React.FC = () => {
    return (
        <div className="bg-background-secondary p-4 rounded-lg border border-border-color h-full flex flex-col shadow-lg">
            <h3 className="font-bold text-lg mb-4 text-text-primary">Project Infrastructure</h3>
            <NetworkInfrastructurePanel />
            {/* Other infrastructure panels could go here */}
        </div>
    );
};

export default InfrastructurePanel;