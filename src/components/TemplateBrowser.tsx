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
            <div className="h-full w-full overflow-y-auto custom-scrollbar">
                <div className="max-w-[1400px] mx-auto animate-fade-in-fast min-h-full flex flex-col">
                    
                    {selectedRoomType ? (
                        // Concept Selection View
                        <div className="p-4 md:p-6">
                            {/* Compact Back Button */}
                            <div className="mb-6">
                                <button
                                    onClick={() => setSelectedRoomType(null)}
                                    className="flex items-center gap-2 text-sm font-medium text-accent hover:underline transition-colors"
                                >
                                    ← Back to All Room Types
                                </button>
                            </div>

                            {/* Header */}
                            <div className="text-center mb-8">
                                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
                                    {selectedRoomType} Concepts
                                </h1>
                                <p className="text-base text-slate-600">
                                    Select a design concept to start your project
                                </p>
                            </div>

                            {/* Compact Concept Grid */}
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                                {groupedConcepts.map(concept => (
                                    <button
                                        key={concept.name}
                                        onClick={() => handleSelectConcept(concept)}
                                        className="flex flex-col items-center text-center gap-1 p-2 rounded-md transition-all duration-200 hover:bg-background border border-transparent hover:border-accent hover:shadow-md hover:-translate-y-0.5"
                                    >
                                        <div className="w-full aspect-video rounded overflow-hidden bg-background-secondary border border-border-color">
                                            <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 w-full h-full flex items-center justify-center">
                                                <div className="w-8 h-8 text-white/30">✨</div>
                                            </div>
                                        </div>
                                        <p className="font-medium text-xs text-text-primary leading-tight line-clamp-2">{concept.name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Room Type Selection View - NEW PROFESSIONAL DESIGN
                        <div className="bg-gradient-to-br from-gray-50 to-white p-6 md:p-8">
                            {/* Header */}
                            <div className="text-center mb-12">
                                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight">
                                    Browse by Room Type
                                </h1>
                                <p className="text-lg text-slate-600">
                                    Select the type of room you are designing
                                </p>
                            </div>

                            {/* Professional Room Type Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-7xl mx-auto">
                                {roomTypeGroups.map(group => {
                                    const Icon = group.icon;
                                    return (
                                        <button
                                            key={group.type}
                                            onClick={() => setSelectedRoomType(group.type)}
                                            className="group relative bg-white border-2 border-slate-200 rounded-2xl p-7 text-left transition-all duration-300 ease-out hover:border-slate-300 hover:shadow-lg hover:-translate-y-1"
                                        >
                                            {/* Icon Container */}
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110">
                                                <Icon className="h-7 w-7 text-accent" />
                                            </div>

                                            {/* Content */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900 mb-2 leading-tight">
                                                    {group.type}
                                                </h3>
                                                
                                                {group.templates.length > 0 && (
                                                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                                                        <span className="w-1 h-1 rounded-full bg-slate-400" />
                                                        {group.templates.length} {group.templates.length === 1 ? 'option' : 'options'}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Hover Effect Overlay */}
                                            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-accent/5 to-accent/0" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
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