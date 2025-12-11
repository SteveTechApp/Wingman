import React, { useMemo } from 'react';
import { useUserTemplates } from '../hooks/useUserTemplates';
import { UserTemplate } from '../utils/types';
import TemplateCard from './TemplateCard';
import { ArrowUturnLeftIcon } from './Icons';

interface TemplateBrowserProps {
  onConceptSelect: (concept: { name: string; templates: UserTemplate[] }) => void;
  activeVertical: string;
  onBack: () => void;
}

const TemplateBrowser: React.FC<TemplateBrowserProps> = ({ onConceptSelect, activeVertical, onBack }) => {
    const { userTemplates, handleDeleteTemplate } = useUserTemplates();

    const concepts = useMemo(() => {
        const grouped = new Map<string, { name: string; imageUrl: string; templates: UserTemplate[] }>();
        userTemplates
            .filter(t => t.vertical === activeVertical)
            .forEach(template => {
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
    }, [userTemplates, activeVertical]);

    return (
        <div>
            <div className="mb-6">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                >
                    <ArrowUturnLeftIcon className="h-4 w-4" />
                    Back to All Verticals
                </button>
            </div>

            {concepts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {concepts.map(concept => {
                        // Use the first template for display, but override name with concept name
                        const displayTemplate = { ...concept.templates[0], templateName: concept.name, templateId: concept.name };
                        return (
                            <TemplateCard
                                key={concept.name}
                                template={displayTemplate}
                                onSelect={() => onConceptSelect(concept)}
                                // onDelete can be re-implemented if we want to delete whole concepts
                            />
                        )
                    })}
                </div>
            ) : (
                <div className="text-center text-text-secondary py-16">
                    <p className="font-semibold">No templates found.</p>
                    <p className="text-sm mt-1">No templates available for this vertical market.</p>
                </div>
            )}
        </div>
    );
};

export default TemplateBrowser;