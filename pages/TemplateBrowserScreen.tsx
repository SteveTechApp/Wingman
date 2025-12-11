import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGenerationContext } from '../context/GenerationContext';
import { UserTemplate } from '../utils/types';
import { ROOM_TYPES, ROOM_TYPE_ICONS } from '../data/constants';
import { SparklesIcon } from '../components/Icons';
import TemplateDetailModal from '../components/TemplateTierSelectorModal';
import { useUserTemplates } from '../hooks/useUserTemplates';

interface Concept {
    name: string;
    templates: UserTemplate[];
}

const TemplateBrowserScreen: React.FC = () => {
    const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);
    const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
    const { handleStartFromTemplate } = useGenerationContext();
    const navigate = useNavigate();
    const { userTemplates } = useUserTemplates();

    const handleSelectConcept = (concept: Concept) => {
        setSelectedConcept(concept);
    };
    
    const handleStartProject = (template: UserTemplate) => {
        handleStartFromTemplate(template, navigate);
    };

    // Group templates by Room Type
    const roomTypeGroups = useMemo(() => {
        const groups: Record<string, UserTemplate[]> = {};
        
        ROOM_TYPES.forEach(type => groups[type] = []);

        userTemplates.forEach(template => {
            const type = template.roomData.roomType;
            if (!groups[type]) groups[type] = [];
            groups[type].push(template);
        });

        return Object.entries(groups)
            .filter(([_, templates]) => templates.length > 0)
            .map(([type, templates]) => ({
                type,
                templates,
                icon: ROOM_TYPE_ICONS[type] || SparklesIcon,
                imageUrl: templates[0]?.imageUrl
            }));
    }, [userTemplates]);

    const activeTemplates = useMemo(() => {
        if (!selectedRoomType) return [];
        return userTemplates.filter(t => t.roomData.roomType === selectedRoomType);
    }, [selectedRoomType, userTemplates]);

    const groupedConcepts = useMemo(() => {
        if (!selectedRoomType) return [];
        const grouped = new Map<string, { name: string; imageUrl: string; templates: UserTemplate[] }>();
        activeTemplates.forEach(template => {
            const conceptId = template.conceptId || template.templateId;
            if (!grouped.has(conceptId)) {
                grouped.set(conceptId, {
                    name: template.conceptName || template.templateName,
                    imageUrl: template.imageUrl,
                    templates: [],
                });
            }
            grouped.get(conceptId)!.templates.push(template);
        });
        return Array.from(grouped.values());
    }, [activeTemplates, selectedRoomType]);

    return (
        <>
            <div className="h-full w-full overflow-y-auto custom-scrollbar p-2 md:p-4">
                <div className="max-w-[1800px] mx-auto animate-fade-in-fast bg-background-secondary p-3 md:p-5 rounded-lg shadow-lg min-h-full flex flex-col">
                    {/* Compact Header */}
                    <div className="text-center mb-4 flex-shrink-0">
                        <h1 className="text-2xl md:text-3xl font-bold text-accent mb-1 uppercase tracking-wide">
                            {selectedRoomType ? `${selectedRoomType} Concepts` : 'Browse by Room Type'}
                        </h1>
                        <p className="text-sm text-text-secondary">
                            {selectedRoomType ? 'Select a design concept to start your project.' : 'Select the type of room you are designing.'}
                        </p>
                    </div>
                    
                    <div className="flex-grow">
                        {selectedRoomType ? (
                            <div>
                                {/* Compact Back Button */}
                                <div className="mb-3">
                                    <button 
                                        onClick={() => setSelectedRoomType(null)}
                                        className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                                    >
                                        &larr; Back to All Room Types
                                    </button>
                                </div>
                                {/* Compact Concept Grid - More columns, smaller cards */}
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                                    {groupedConcepts.map(concept => (
                                        <button
                                            key={concept.name}
                                            onClick={() => handleSelectConcept(concept)}
                                            className="flex flex-col items-center text-center gap-1 p-2 rounded-md transition-all duration-200 hover:bg-background border border-transparent hover:border-accent hover:shadow-md hover:-translate-y-0.5"
                                        >
                                            <div className="w-full aspect-video rounded overflow-hidden bg-background-secondary border border-border-color">
                                                <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 w-full h-full flex items-center justify-center">
                                                    <div className="w-8 h-8 text-white/30">●</div>
                                                </div>
                                            </div>
                                            <p className="font-medium text-xs text-text-primary leading-tight line-clamp-2">{concept.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Compact Room Type Grid - More columns, smaller cards */
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                                {roomTypeGroups.map(group => (
                                    <button
                                        key={group.type}
                                        onClick={() => setSelectedRoomType(group.type)}
                                        className="relative aspect-[4/3] rounded-md overflow-hidden group transition-all duration-200 transform hover:scale-105 hover:shadow-lg border border-transparent hover:border-accent"
                                    >
                                        <img 
                                            src={group.imageUrl} 
                                            alt={group.type} 
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <div className="absolute bottom-0 left-0 p-2 w-full">
                                            <div className="flex items-center gap-1">
                                                <group.icon className="h-4 w-4 text-white flex-shrink-0" />
                                                <div className="text-left">
                                                    <h3 className="font-bold text-xs text-white leading-tight line-clamp-2">{group.type}</h3>
                                                    <span className="text-[10px] text-gray-300">{group.templates.length} opts</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {selectedConcept && (
                <TemplateDetailModal
                    isOpen={!!selectedConcept}
                    onClose={() => setSelectedConcept(null)}
                    conceptName={selectedConcept.name}
                    templates={selectedConcept.templates}
                    onStartProject={handleStartProject}
                />
            )}
        </>
    );
};

export default TemplateBrowserScreen;
