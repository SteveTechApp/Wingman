
import React, { useState } from 'react';
import { DisplayIcon, ProjectorIcon, VideoWallIcon, SparklesIcon, GridIcon, InteractiveDisplayIcon, PlusIcon, CloseIcon } from '../../Icons';
import { v4 as uuidv4 } from 'uuid';

export interface DisplayGroup {
    id: string;
    name: string;
    type: 'flat_panel' | 'projector' | 'lcd_wall' | 'led_wall' | 'interactive_lfd';
    quantity: number;
    transport: string;
    videoWallConfig?: { rows: number, cols: number };
}

interface Props {
    displayGroups: DisplayGroup[];
    setDisplayGroups: (groups: DisplayGroup[]) => void;
    onNext: () => void;
    onBack: () => void;
    onSave: () => void;
}

const DisplayOutputsStep: React.FC<Props> = ({ displayGroups, setDisplayGroups, onNext, onBack, onSave }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newGroup, setNewGroup] = useState<Omit<DisplayGroup, 'id'>>({
        name: 'Main Display',
        type: 'flat_panel',
        quantity: 1,
        transport: 'Direct / Copper',
        videoWallConfig: { rows: 2, cols: 2 }
    });

    const addGroup = () => {
        setDisplayGroups([...displayGroups, { ...newGroup, id: uuidv4() }]);
        setIsAdding(false);
        // Reset for next add
        setNewGroup({
            name: 'Secondary Display',
            type: 'flat_panel',
            quantity: 1,
            transport: 'Direct / Copper',
            videoWallConfig: { rows: 2, cols: 2 }
        });
    };

    const removeGroup = (id: string) => {
        setDisplayGroups(displayGroups.filter(g => g.id !== id));
    };

    const displayTypes = [
        { id: 'flat_panel', label: 'Flat Panel Display', icon: DisplayIcon },
        { id: 'interactive_lfd', label: 'Interactive Display', icon: InteractiveDisplayIcon },
        { id: 'projector', label: 'Projector', icon: ProjectorIcon },
        { id: 'lcd_wall', label: 'LCD Video Wall', icon: GridIcon },
        { id: 'led_wall', label: 'Direct View LED', icon: SparklesIcon },
    ];

    const transportOptions = [
        { id: 'Direct / Copper', label: 'Direct / Short Copper', desc: '< 10m HDMI to Switcher/Source' },
        { id: 'Active Optical Cable (AOC)', label: 'Active Optical HDMI', desc: '10m - 50m Direct Run' },
        { id: 'HDBaseT Class B (Standard)', label: 'HDBaseT Class B (Rx)', desc: '4K30 40m / 1080p 70m' },
        { id: 'HDBaseT Class A (Long Range)', label: 'HDBaseT Class A (Rx)', desc: '4K30 70m / 1080p 100m' },
        { id: 'HDBaseT 3.0 (Premium)', label: 'HDBaseT 3.0 (Rx)', desc: 'Uncompressed 4K60 100m' },
        { id: 'AVoIP 1GbE', label: 'AVoIP 1GbE (NetworkHD)', desc: 'JPEG-XS or H.264' },
        { id: 'AVoIP 10GbE', label: 'AVoIP 10GbE (NetworkHD)', desc: 'Uncompressed SDVoE/Similar' },
        { id: 'Fiber Extender', label: 'Fiber Optic Receiver', desc: 'Ultra Long Distance (>100m)' },
    ];

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex-grow overflow-y-auto p-4 md:p-6 min-h-0">
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                    <div className="text-center mb-6 flex-shrink-0">
                        <h2 className="text-xl font-extrabold mb-1">Display Configuration</h2>
                        <p className="text-text-secondary text-xs">Define outputs and how the signal reaches them.</p>
                    </div>

                    {/* Configured Groups List */}
                    <div className="space-y-3 mb-6">
                        {displayGroups.length === 0 && !isAdding && (
                            <div className="text-center p-8 border-2 border-dashed border-border-color rounded-lg bg-background-secondary/50">
                                <p className="text-sm text-text-secondary mb-4">No displays configured.</p>
                                <button onClick={() => setIsAdding(true)} className="btn btn-primary">Add Main Display</button>
                            </div>
                        )}

                        {displayGroups.map((group, index) => (
                            <div key={group.id} className="bg-background border border-border-color rounded-lg p-4 shadow-sm flex justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-accent-bg-subtle p-2 rounded-full">
                                        {React.createElement(displayTypes.find(t => t.id === group.type)?.icon || DisplayIcon, { className: "h-6 w-6 text-accent" })}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{group.name} <span className="text-text-secondary font-normal">x{group.quantity}</span></h4>
                                        <div className="flex gap-3 text-xs text-text-secondary mt-1">
                                            <span className="bg-background-secondary px-2 py-0.5 rounded border border-border-color-subtle">{displayTypes.find(t => t.id === group.type)?.label}</span>
                                            <span className="bg-background-secondary px-2 py-0.5 rounded border border-border-color-subtle flex items-center gap-1 font-medium text-accent">
                                                via {group.transport}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => removeGroup(group.id)} className="text-text-secondary hover:text-destructive p-2">
                                    <CloseIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Group Form */}
                    {isAdding && (
                        <div className="bg-background-secondary border border-border-color rounded-lg p-4 shadow-md animate-fade-in-fast mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Name</label>
                                    <input 
                                        type="text" 
                                        value={newGroup.name}
                                        onChange={e => setNewGroup({...newGroup, name: e.target.value})}
                                        className="w-full p-2 border border-border-color rounded bg-input-bg text-sm"
                                        placeholder="e.g. Main Projection"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Display Type</label>
                                    <select 
                                        value={newGroup.type}
                                        onChange={e => setNewGroup({...newGroup, type: e.target.value as any})}
                                        className="w-full p-2 border border-border-color rounded bg-input-bg text-sm"
                                    >
                                        {displayTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Quantity</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={newGroup.quantity}
                                        onChange={e => setNewGroup({...newGroup, quantity: parseInt(e.target.value)})}
                                        className="w-full p-2 border border-border-color rounded bg-input-bg text-sm"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Signal Transport (To Display)</label>
                                    <select 
                                        value={newGroup.transport}
                                        onChange={e => setNewGroup({...newGroup, transport: e.target.value})}
                                        className="w-full p-2 border border-border-color rounded bg-input-bg text-sm font-medium"
                                    >
                                        {transportOptions.map(t => <option key={t.id} value={t.id}>{t.label} ({t.desc})</option>)}
                                    </select>
                                    <p className="text-[10px] text-text-secondary mt-1">
                                        How does the signal get to this display? (e.g., via a Receiver behind the TV, or Direct cable)
                                    </p>
                                </div>
                            </div>
                            
                            {newGroup.type === 'lcd_wall' && (
                                 <div className="flex gap-4 mb-4 p-3 bg-background rounded border border-border-color-subtle">
                                     <div>
                                         <label className="block text-xs font-bold mb-1">Rows</label>
                                         <input type="number" min="1" value={newGroup.videoWallConfig?.rows} onChange={e => setNewGroup({...newGroup, videoWallConfig: {...newGroup.videoWallConfig!, rows: parseInt(e.target.value)}})} className="w-20 p-1 border rounded text-sm"/>
                                     </div>
                                     <div>
                                         <label className="block text-xs font-bold mb-1">Cols</label>
                                         <input type="number" min="1" value={newGroup.videoWallConfig?.cols} onChange={e => setNewGroup({...newGroup, videoWallConfig: {...newGroup.videoWallConfig!, cols: parseInt(e.target.value)}})} className="w-20 p-1 border rounded text-sm"/>
                                     </div>
                                 </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsAdding(false)} className="btn btn-secondary px-4 py-1.5 text-sm">Cancel</button>
                                <button onClick={addGroup} className="btn btn-accent px-6 py-1.5 text-sm font-bold">Add Group</button>
                            </div>
                        </div>
                    )}

                    {!isAdding && (
                        <button 
                            onClick={() => setIsAdding(true)} 
                            className="w-full py-3 border-2 border-dashed border-border-color rounded-lg text-text-secondary font-bold hover:border-accent hover:text-accent hover:bg-accent-bg-subtle transition-all flex items-center justify-center gap-2"
                        >
                            <PlusIcon className="h-5 w-5" /> Add Another Display Group
                        </button>
                    )}
                </div>
            </div>

            <div className="p-3 border-t border-border-color bg-background-secondary flex justify-between flex-shrink-0 items-center z-10 shadow-md">
                <button onClick={onBack} className="btn btn-secondary px-4 py-2 text-sm">
                    &larr; Back
                </button>
                <button onClick={onSave} className="text-xs font-medium text-accent hover:underline">
                    Save Progress
                </button>
                <button 
                    onClick={onNext} 
                    disabled={displayGroups.length === 0}
                    className="btn btn-primary px-6 py-2 text-sm font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next: Input Sources &rarr;
                </button>
            </div>
        </div>
    );
};

export default DisplayOutputsStep;
