import React from 'react';
import { useProjectContext } from '../../context/ProjectContext';

interface TabConfig {
  id: string;
  component: React.ComponentType<any>;
}

interface WorkspaceContentProps {
  tabs: TabConfig[];
  activeTab: string;
}

const WorkspaceContent: React.FC<WorkspaceContentProps> = ({ tabs, activeTab }) => {
    const { projectData, activeRoomId } = useProjectContext();
    const room = projectData?.rooms.find(r => r.id === activeRoomId);

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

    if (!ActiveComponent) {
        return <div>Select a tab</div>;
    }

    // Handle special case for SystemDiagram which needs a prop
    if (activeTab === 'diagram') {
        return <ActiveComponent diagram={room?.systemDiagram} />;
    }

    return <ActiveComponent />;
};

export default WorkspaceContent;