
import React from 'react';
import { useUserContext } from '../../context/UserContext';

interface ProjectDetailsFormProps {
    projectName: string;
    setProjectName: (name: string) => void;
    clientName: string;
    setClientName: (name: string) => void;
}

const ProjectDetailsForm: React.FC<ProjectDetailsFormProps> = ({
    projectName,
    setProjectName,
    clientName,
    setClientName,
}) => {
    const { userProfile } = useUserContext();
    const inputStyle = "w-full p-2 border border-border-color rounded-md bg-input-bg mt-1 focus:border-accent outline-none";

    return (
        <div className="p-6 bg-background-secondary border border-border-color rounded-xl shadow-xl">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold uppercase tracking-widest">// Project Details</h2>
                {userProfile.logoUrl ? (
                    <img 
                        src={userProfile.logoUrl} 
                        alt="Company Logo" 
                        className="h-12 max-w-[150px] object-contain" 
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="h-12 w-12 bg-accent-bg-subtle rounded-full flex items-center justify-center text-accent font-bold text-xl border border-accent-border-subtle">
                        {userProfile.company ? userProfile.company.charAt(0).toUpperCase() : 'C'}
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="project-name" className="block text-sm font-medium uppercase">Project Name</label>
                    <input type="text" id="project-name" value={projectName} onChange={e => setProjectName(e.target.value)} className={inputStyle} required />
                </div>
                <div>
                    <label htmlFor="client-name" className="block text-sm font-medium uppercase">Client</label>
                    <input type="text" id="client-name" value={clientName} onChange={e => setClientName(e.target.value)} className={inputStyle} />
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailsForm;
