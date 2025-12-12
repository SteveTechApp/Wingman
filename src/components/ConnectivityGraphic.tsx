import React from 'react';
import { useProjectContext } from '../context/ProjectContext';
import { InputIcon, OutputIcon } from './Icons';
import { IOPoint } from '../utils/types';

const ConnectionIcon: React.FC<{ type: string }> = ({ type }) => {
    // A simple component to return a graphical representation of connection type
    return <span className="text-xs font-mono px-2 py-1 bg-background-secondary rounded-full">{type}</span>;
}

const IOColumn: React.FC<{ title: string, points: IOPoint[], icon: React.ReactNode }> = ({ title, points, icon }) => (
    <div className="flex-1">
        <div className="flex items-center gap-2 mb-4">
            {icon}
            <h3 className="font-bold text-lg text-text-primary">{title}</h3>
        </div>
        <div className="space-y-2">
            {points.length > 0 ? points.map(point => (
                <div key={point.id} className="bg-background p-2 rounded-md border border-border-color-subtle flex justify-between items-center">
                    <div>
                        <p className="text-sm font-semibold">{point.name}</p>
                        <p className="text-xs text-text-secondary">Qty: {point.quantity}</p>
                    </div>
                    <ConnectionIcon type={point.connectionType} />
                </div>
            )) : <p className="text-xs text-text-secondary text-center py-4">None</p>}
        </div>
    </div>
);

const ConnectivityGraphic: React.FC = () => {
    const { projectData, activeRoomId } = useProjectContext();
    const room = projectData?.rooms.find(r => r.id === activeRoomId);

    const inputs = room?.ioRequirements.filter(io => io.type === 'input') || [];
    const outputs = room?.ioRequirements.filter(io => io.type === 'output') || [];
    
    return (
        <div className="bg-background-secondary p-4 rounded-lg border border-border-color h-full flex flex-col shadow-lg">
             <h3 className="font-bold text-lg mb-4 text-text-primary text-center">Connectivity Overview</h3>
            <div className="flex-grow flex items-stretch gap-4">
                <IOColumn title="Inputs" points={inputs} icon={<InputIcon className="h-6 w-6 text-accent" />} />
                
                <div className="flex flex-col items-center justify-center w-16">
                    <div className="w-px h-full bg-border-color relative">
                         <svg className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 h-full w-4 text-accent-text-subtle" width="24" height="100" viewBox="0 0 24 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0V100" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
                            <path d="M8 30L16 30" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M8 50L16 50" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M8 70L16 70" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                    </div>
                </div>

                <IOColumn title="Outputs" points={outputs} icon={<OutputIcon className="h-6 w-6 text-accent" />} />
            </div>
        </div>
    );
};

export default ConnectivityGraphic;