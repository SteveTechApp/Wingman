import React, { useState } from 'react';
import WorkspaceHeader from './workspace/WorkspaceHeader';
import RoomSummaryPanel from './workspace/RoomSummaryPanel';
import FunctionalityStatementPanel from './workspace/configurator/FunctionalityStatementPanel';
import AIDesignActionPanel from './workspace/configurator/AIDesignActionPanel';
import ValueEngineeringPanel from './workspace/configurator/ValueEngineeringPanel';
import EquipmentListPanel from './workspace/configurator/EquipmentListPanel';
import IOConfigurationPanel from './io/IOConfigurationPanel';
import IOWizardModal from './io/IOWizardModal';
import SystemDiagram from './SystemDiagram';
import { useProjectContext } from '../context/ProjectContext';

const ProjectWorkspace: React.FC = () => {
    const { projectData, activeRoomId } = useProjectContext();
    const room = projectData?.rooms.find(r => r.id === activeRoomId);

    const [isIOWizardOpen, setIsIOWizardOpen] = useState(false);

    if (!room) {
        return null; // Or a loading/empty state for the room
    }

    return (
        <>
            <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 md:p-6">
                <div className="max-w-[1600px] mx-auto flex flex-col gap-6 animate-fade-in-fast pb-20">
                    <WorkspaceHeader />
                    <RoomSummaryPanel />
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        {/* Left Column: Configuration */}
                        <div className="space-y-6 min-w-0">
                            <FunctionalityStatementPanel />
                            <AIDesignActionPanel />
                            <ValueEngineeringPanel />
                            <EquipmentListPanel />
                            <IOConfigurationPanel onOpenWizard={() => setIsIOWizardOpen(true)} />
                        </div>
                        {/* Right Column: Visualization */}
                        <div className="xl:sticky xl:top-6 min-w-0">
                            <SystemDiagram diagram={room?.systemDiagram} />
                        </div>
                    </div>
                </div>
            </div>
            <IOWizardModal 
                isOpen={isIOWizardOpen}
                onClose={() => setIsIOWizardOpen(false)}
                room={room}
            />
        </>
    );
};

export default ProjectWorkspace;