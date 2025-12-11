import React from 'react';

interface TabConfig {
  id: string;
  label: string;
}

interface WorkspaceTabsProps {
  tabs: TabConfig[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="border-b-2 border-border-color">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${
              activeTab === tab.id
                ? 'border-accent text-accent font-bold'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default WorkspaceTabs;
