import React, { useMemo, useState, useEffect } from 'react';
import { useProjectContext } from '../../../context/ProjectContext';
import { useGenerationContext } from '../../../context/GenerationContext';
import WizardToggleOption from '../../roomWizard/common/WizardToggleOption';
import { toggleArrayItem } from '../../../utils/utils';
import { ValueEngineeringSuggestion } from '../../../utils/types';
import toast from 'react-hot-toast';
import { SparklesIcon } from '../../Icons';

const ENGINEERABLE_FEATURES = [
    { id: 'NO_WIRELESS_CASTING', label: 'Wireless Presentation', tags: ['Casting', 'Wireless'] },
    { id: 'NO_USB_KVM', label: 'USB KVM Extension', tags: ['USB', 'KVM', 'USB2.0', 'USB3.0', 'BYOM'] },
    { id: 'DOWNGRADE_4K', label: '4K60 4:4:4 Video', tags: ['4K60', '4:4:4'] },
    { id: 'DOWNGRADE_HDBT', label: 'HDBaseT 3.0', tags: ['HDBT3.0'] },
];

const ValueEngineeringPanel: React.FC = () => {
    const { projectData, activeRoomId } = useProjectContext();
    const { handleValueEngineerRoom } = useGenerationContext();
    const room = projectData?.rooms.find(r => r.id === activeRoomId);

    const [constraints, setConstraints] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<ValueEngineeringSuggestion[]>([]);
    const [originalSku, setOriginalSku] = useState('');
    const [suggestedSku, setSuggestedSku] = useState('');

    useEffect(() => {
        if (room) {
            setConstraints(room.valueEngineeringConstraints || []);
            setSuggestions(room.valueEngineeringSuggestions || []);
            setOriginalSku('');
            setSuggestedSku('');
        }
    }, [room]);

    const availableFeatures = useMemo(() => {
        if (!room || room.manuallyAddedEquipment.length === 0) return [];
        const allTags = new Set(room.manuallyAddedEquipment.flatMap(e => e.tags));
        return ENGINEERABLE_FEATURES.filter(feat => feat.tags.some(tag => allTags.has(tag)));
    }, [room]);

    if (!room || room.manuallyAddedEquipment.length === 0) {
        return null;
    }

    const handleToggleConstraint = (constraintId: string) => {
        setConstraints(prev => toggleArrayItem(prev, constraintId));
    };

    const handleAddSuggestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!originalSku || !suggestedSku.trim()) {
            toast.error("Please select a product to replace and provide a suggested SKU.");
            return;
        }
        if (suggestions.some(s => s.originalSku === originalSku)) {
            toast.error("A suggestion for this product already exists.");
            return;
        }
        setSuggestions(prev => [...prev, { originalSku, suggestedSku: suggestedSku.trim() }]);
        setOriginalSku('');
        setSuggestedSku('');
    };

    const handleRemoveSuggestion = (originalSkuToRemove: string) => {
        setSuggestions(prev => prev.filter(s => s.originalSku !== originalSkuToRemove));
    };

    const handleRedesign = () => {
        if (activeRoomId) {
            handleValueEngineerRoom(activeRoomId, constraints, suggestions);
        }
    };

    return (
        <div className="bg-background-secondary p-6 rounded-xl shadow-xl border border-border-color">
            <h3 className="font-bold text-lg mb-2">Value Engineering</h3>
            <p className="text-xs text-text-secondary mb-4">
                Apply constraints or suggest product substitutions, then click "Re-Design with AI" to generate a more cost-effective solution.
            </p>
            
            {availableFeatures.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-bold text-md mb-2">Feature Constraints</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableFeatures.map(feature => (
                            <WizardToggleOption
                                key={feature.id}
                                label={feature.label}
                                description={`Disable to allow cheaper alternatives.`}
                                checked={!constraints.includes(feature.id)}
                                onChange={() => handleToggleConstraint(feature.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-6 border-t border-border-color">
                <h4 className="font-bold text-md mb-2">Product Substitution Suggestions</h4>
                <div className="space-y-2 mb-4">
                    {suggestions.map(s => (
                        <div key={s.originalSku} className="flex justify-between items-center bg-background p-2 rounded-md border border-border-color-subtle text-sm">
                            <span>Replace <strong>{s.originalSku}</strong> with <strong>{s.suggestedSku}</strong></span>
                            <button onClick={() => handleRemoveSuggestion(s.originalSku)} className="text-destructive hover:underline text-xs font-semibold">Remove</button>
                        </div>
                    ))}
                     {suggestions.length === 0 && <p className="text-xs text-text-secondary text-center py-2">No substitutions suggested.</p>}
                </div>
                <form onSubmit={handleAddSuggestion} className="flex items-end gap-2">
                    <div className="flex-grow">
                        <label htmlFor="original-sku" className="text-xs font-medium text-text-secondary">Replace Product</label>
                        <select id="original-sku" value={originalSku} onChange={e => setOriginalSku(e.target.value)} className="w-full p-2 border rounded-md bg-input-bg mt-1 text-sm">
                            <option value="">-- Select Product --</option>
                            {room.manuallyAddedEquipment.map(item => (
                                <option key={item.sku} value={item.sku} disabled={suggestions.some(s => s.originalSku === item.sku)}>{item.name} ({item.sku})</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-grow">
                        <label htmlFor="suggested-sku" className="text-xs font-medium text-text-secondary">With SKU</label>
                        <input type="text" id="suggested-sku" value={suggestedSku} onChange={e => setSuggestedSku(e.target.value)} placeholder="e.g., EX-70-G2" className="w-full p-2 border rounded-md bg-input-bg mt-1 text-sm" />
                    </div>
                    <button type="submit" className="btn btn-secondary px-4 py-2 text-sm">Add</button>
                </form>
            </div>
            
            <div className="mt-6 pt-6 border-t border-border-color">
                <button onClick={handleRedesign} className="w-full btn btn-primary flex items-center justify-center gap-2 text-base">
                    <SparklesIcon className="h-5 w-5" />
                    Re-Design with AI
                </button>
            </div>
        </div>
    );
};

export default ValueEngineeringPanel;