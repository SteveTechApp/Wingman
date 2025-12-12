
import React, { useState } from 'react';
import { AudioIcon, PlusIcon, CloseIcon } from '../../Icons';
import { AudioSystemDetails, AudioZone } from '../../../utils/types';
import { v4 as uuidv4 } from 'uuid';
import WizardToggleOption from '../../roomWizard/common/WizardToggleOption';

interface Props {
    audioDetails: AudioSystemDetails;
    setAudioDetails: (a: AudioSystemDetails) => void;
    onNext: () => void;
    onBack: () => void;
    onSave: () => void;
}

const AudioDesignStep: React.FC<Props> = ({ audioDetails, setAudioDetails, onNext, onBack, onSave }) => {
    const [newZoneName, setNewZoneName] = useState('');

    // Ensure zones array exists
    const zones = audioDetails.zones || [];

    const addZone = () => {
        if (!newZoneName.trim()) return;
        const newZone: AudioZone = {
            id: uuidv4(),
            name: newZoneName,
            speakerType: 'ceiling',
            quantity: 4
        };
        setAudioDetails({ ...audioDetails, zones: [...zones, newZone] });
        setNewZoneName('');
    };

    const removeZone = (id: string) => {
        setAudioDetails({ ...audioDetails, zones: zones.filter(z => z.id !== id) });
    };

    const updateZone = (id: string, updates: Partial<AudioZone>) => {
        setAudioDetails({
            ...audioDetails,
            zones: zones.map(z => z.id === id ? { ...z, ...updates } : z)
        });
    };

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex-grow overflow-y-auto p-4 md:p-6 min-h-0">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-4">
                        <h2 className="text-xl font-extrabold mb-1">Audio Design</h2>
                        <p className="text-text-secondary text-xs">Configure audio zones, distribution, and reinforcement.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Distribution Strategy */}
                        <div className="bg-background p-4 rounded-lg border border-border-color">
                            <h3 className="text-sm font-bold mb-3 border-b border-border-color pb-2 flex items-center gap-2">
                                <AudioIcon className="h-4 w-4 text-accent" />
                                System Strategy
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-text-secondary">Distribution Type</label>
                                    <select 
                                        value={audioDetails.systemType}
                                        onChange={(e) => setAudioDetails({...audioDetails, systemType: e.target.value as any})}
                                        className="w-full p-2 border border-border-color rounded bg-input-bg text-sm"
                                    >
                                        <option value="low_impedance">Low Impedance (Stereo/Performance)</option>
                                        <option value="high_impedance">70V/100V (Distributed/Background)</option>
                                        <option value="dante">Networked Audio (Dante/AES67)</option>
                                    </select>
                                </div>
                                
                                <div className="space-y-2 pt-2">
                                    <WizardToggleOption
                                        label="Microphone Reinforcement"
                                        description="Voice lift for presenters."
                                        checked={audioDetails.useCases.includes('speech_reinforcement')}
                                        onChange={(c) => {
                                            const newCases = c 
                                                ? [...audioDetails.useCases, 'speech_reinforcement']
                                                : audioDetails.useCases.filter(u => u !== 'speech_reinforcement');
                                            setAudioDetails({...audioDetails, useCases: newCases as any});
                                        }}
                                    />
                                     <WizardToggleOption
                                        label="Program Audio"
                                        description="High quality playback for video/music."
                                        checked={audioDetails.useCases.includes('program_audio')}
                                        onChange={(c) => {
                                            const newCases = c 
                                                ? [...audioDetails.useCases, 'program_audio']
                                                : audioDetails.useCases.filter(u => u !== 'program_audio');
                                            setAudioDetails({...audioDetails, useCases: newCases as any});
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Zoning */}
                        <div className="bg-background p-4 rounded-lg border border-border-color flex flex-col">
                            <h3 className="text-sm font-bold mb-3 border-b border-border-color pb-2">Audio Zones</h3>
                            
                            <div className="flex-grow space-y-2 mb-4 overflow-y-auto max-h-40">
                                {zones.length === 0 && (
                                    <p className="text-xs text-text-secondary text-center py-4">No specific zones defined (Single Zone).</p>
                                )}
                                {zones.map(zone => (
                                    <div key={zone.id} className="bg-background-secondary p-2 rounded border border-border-color-subtle text-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold">{zone.name}</span>
                                            <button onClick={() => removeZone(zone.id)} className="text-destructive hover:bg-destructive-bg p-1 rounded"><CloseIcon className="h-3 w-3"/></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select 
                                                value={zone.speakerType}
                                                onChange={(e) => updateZone(zone.id, { speakerType: e.target.value as any })}
                                                className="p-1 text-xs border rounded"
                                            >
                                                <option value="ceiling">In-Ceiling</option>
                                                <option value="pendant">Pendant</option>
                                                <option value="surface">Surface</option>
                                                <option value="soundbar">Soundbar</option>
                                            </select>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-text-secondary">Qty:</span>
                                                <input 
                                                    type="number" 
                                                    value={zone.quantity}
                                                    onChange={(e) => updateZone(zone.id, { quantity: parseInt(e.target.value) })}
                                                    className="w-12 p-1 text-xs border rounded text-center"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 mt-auto pt-2 border-t border-border-color-subtle">
                                <input 
                                    type="text" 
                                    placeholder="New Zone Name (e.g. Bar)" 
                                    className="flex-grow p-2 text-sm border border-border-color rounded bg-input-bg"
                                    value={newZoneName}
                                    onChange={(e) => setNewZoneName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addZone()}
                                />
                                <button onClick={addZone} className="btn btn-secondary px-3">
                                    <PlusIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-3 border-t border-border-color bg-background-secondary flex justify-between flex-shrink-0 items-center">
                <button onClick={onBack} className="btn btn-secondary px-4 py-1.5 text-sm">
                    &larr; Back
                </button>
                <button onClick={onSave} className="text-xs font-medium text-accent hover:underline">
                    Save Progress
                </button>
                <button onClick={onNext} className="btn btn-primary px-6 py-1.5 text-sm font-bold shadow-md">
                    Next: Review & Select &rarr;
                </button>
            </div>
        </div>
    );
};

export default AudioDesignStep;
