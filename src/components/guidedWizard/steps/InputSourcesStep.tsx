
import React, { useState, useEffect } from 'react';
import { PlusIcon, CloseIcon, InputIcon } from '../../Icons';
import { SOURCE_DEVICE_TYPES } from '../../../data/wizardOptions';
import { v4 as uuidv4 } from 'uuid';

export interface WizardInput {
    id: string;
    deviceType: string;
    interfaceType: string; // HDMI, USB-C
    transport: string; // HDBT, AVoIP, AOC
    location: string; // Table, IDB, Wall
    distance: number;
    quantity: number;
}

interface Props {
    inputs: WizardInput[];
    setInputs: (inputs: WizardInput[]) => void;
    onNext: () => void;
    onBack: () => void;
    onSave: () => void;
}

const InputSourcesStep: React.FC<Props> = ({ inputs, setInputs, onNext, onBack, onSave }) => {
    const [newInput, setNewInput] = useState<Omit<WizardInput, 'id'>>({
        deviceType: 'Laptop',
        interfaceType: 'HDMI',
        transport: 'Direct / Copper',
        location: 'Table Top',
        distance: 5,
        quantity: 1
    });

    // Smart defaults based on location
    useEffect(() => {
        if (newInput.location.includes('Wall')) {
            setNewInput(prev => ({ ...prev, transport: 'HDBaseT Class B (Standard)' }));
        } else if (newInput.location.includes('Floor')) {
             setNewInput(prev => ({ ...prev, transport: 'HDBaseT Class B (Standard)' }));
        } else if (newInput.location === 'Central Rack') {
            setNewInput(prev => ({ ...prev, transport: 'Direct / Copper', distance: 1 }));
        }
    }, [newInput.location]);

    const handleAdd = () => {
        setInputs([...inputs, { ...newInput, id: uuidv4() }]);
        setNewInput({ ...newInput, quantity: 1 });
    };

    const handleRemove = (id: string) => {
        setInputs(inputs.filter(i => i.id !== id));
    };

    const commonSources = ['Laptop', 'Room PC', 'BYOD Device', 'Teams MTR', 'Document Camera'];
    const interfaceTypes = ['HDMI', 'USB-C', 'DisplayPort'];
    
    const locationOptions = [
        { id: 'Table Top', label: 'Table Top (Surface)', desc: 'Loose cables on table' },
        { id: 'Table Well (IDB)', label: 'Table Well (IDB Retractor)', desc: 'Retractable cables' },
        { id: 'Wall Plate', label: 'Wall Plate', desc: 'Mounted in US/EU/UK box' },
        { id: 'Floor Box', label: 'Floor Box', desc: 'Recessed in floor' },
        { id: 'Lectern', label: 'Lectern / Podium', desc: 'Fixed furniture' },
        { id: 'Central Rack', label: 'Central Rack', desc: 'In equipment closet' }
    ];

    const transportOptions = [
        { id: 'Direct / Copper', label: 'Direct / Short Copper', desc: '< 5m Passive' },
        { id: 'Active Optical Cable (AOC)', label: 'Active Optical Cable (AOC)', desc: '10m - 50m HDMI' },
        { id: 'HDBaseT Class B (Standard)', label: 'HDBaseT Class B (Tx)', desc: '4K30 40m / 1080p 70m' },
        { id: 'HDBaseT Class A (Long Range)', label: 'HDBaseT Class A (Tx)', desc: '4K30 70m / 1080p 100m' },
        { id: 'HDBaseT 3.0 (Premium)', label: 'HDBaseT 3.0 (Tx)', desc: 'Uncompressed 4K60 100m' },
        { id: 'AVoIP 1GbE', label: 'AVoIP 1GbE (NetworkHD)', desc: 'JPEG-XS or H.264' },
        { id: 'AVoIP 10GbE', label: 'AVoIP 10GbE (NetworkHD)', desc: 'Uncompressed SDVoE/Similar' },
        { id: 'Wireless', label: 'Wireless Only', desc: 'No physical cable' }
    ];

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex-grow overflow-y-auto p-4 md:p-6 min-h-0">
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                    <div className="text-center mb-4 flex-shrink-0">
                        <h2 className="text-xl font-extrabold mb-1">Input Sources & Connectivity</h2>
                        <p className="text-text-secondary text-xs">Define the physical location of the source and how it connects to the system.</p>
                    </div>

                    {/* List of Added Inputs */}
                    <div className="flex-grow bg-background rounded-lg border border-border-color mb-4 overflow-hidden flex flex-col min-h-[200px]">
                        <div className="p-2 bg-background-secondary border-b border-border-color font-bold text-xs flex justify-between flex-shrink-0">
                            <span>Configured Sources ({inputs.reduce((acc, i) => acc + i.quantity, 0)})</span>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 space-y-2">
                            {inputs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-50">
                                    <InputIcon className="h-8 w-8 mb-2" />
                                    <p className="text-xs">No inputs added yet.</p>
                                </div>
                            ) : (
                                inputs.map(input => (
                                    <div key={input.id} className="flex items-center justify-between p-3 bg-background border border-border-color-subtle rounded-md shadow-sm text-sm">
                                        <div className="flex items-center gap-4 flex-grow">
                                            <div className="bg-accent-bg-subtle text-accent font-bold px-2 py-1 rounded text-xs flex-shrink-0">
                                                {input.quantity}x
                                            </div>
                                            <div className="flex-grow grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="font-bold">{input.deviceType}</div>
                                                    <div className="text-xs text-text-secondary">via {input.interfaceType}</div>
                                                </div>
                                                <div className="text-xs text-text-secondary">
                                                    <div className="font-semibold">{input.location}</div>
                                                    <div className="text-[10px] uppercase tracking-wider opacity-75 font-medium text-accent">via {input.transport} ({input.distance}m)</div>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemove(input.id)}
                                            className="text-text-secondary hover:text-destructive p-1 transition-colors ml-2"
                                            title="Remove"
                                        >
                                            <CloseIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Add New Input Form */}
                    <div className="bg-background-secondary p-4 rounded-lg border border-border-color flex-shrink-0">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">Add New Source</h3>
                        <div className="grid grid-cols-12 gap-3">
                            {/* Row 1 */}
                            <div className="col-span-5">
                                <label className="block text-[10px] font-bold mb-1 text-text-secondary uppercase">Device Type</label>
                                <select 
                                    value={newInput.deviceType}
                                    onChange={e => setNewInput({...newInput, deviceType: e.target.value})}
                                    className="w-full p-2 text-sm border border-border-color rounded bg-input-bg"
                                >
                                    {commonSources.map(t => <option key={t} value={t}>{t}</option>)}
                                    <optgroup label="Other">
                                        {SOURCE_DEVICE_TYPES.filter(t => !commonSources.includes(t)).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                            <div className="col-span-4">
                                <label className="block text-[10px] font-bold mb-1 text-text-secondary uppercase">Interface</label>
                                <select 
                                    value={newInput.interfaceType}
                                    onChange={e => setNewInput({...newInput, interfaceType: e.target.value})}
                                    className="w-full p-2 text-sm border border-border-color rounded bg-input-bg"
                                >
                                    {interfaceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="col-span-3">
                                <label className="block text-[10px] font-bold mb-1 text-text-secondary uppercase">Qty</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={newInput.quantity}
                                    onChange={e => setNewInput({...newInput, quantity: Math.max(1, parseInt(e.target.value))})}
                                    className="w-full p-2 text-sm border border-border-color rounded bg-input-bg text-center"
                                />
                            </div>

                            {/* Row 2 */}
                            <div className="col-span-4">
                                <label className="block text-[10px] font-bold mb-1 text-text-secondary uppercase">Physical Location</label>
                                <select 
                                    value={newInput.location}
                                    onChange={e => setNewInput({...newInput, location: e.target.value})}
                                    className="w-full p-2 text-sm border border-border-color rounded bg-input-bg"
                                >
                                    {locationOptions.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                </select>
                            </div>
                            <div className="col-span-5">
                                <label className="block text-[10px] font-bold mb-1 text-text-secondary uppercase">Transport (Extension)</label>
                                <select 
                                    value={newInput.transport}
                                    onChange={e => setNewInput({...newInput, transport: e.target.value})}
                                    className="w-full p-2 text-sm border border-border-color rounded bg-input-bg font-medium"
                                >
                                    {transportOptions.map(t => <option key={t.id} value={t.id}>{t.label} ({t.desc})</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold mb-1 text-text-secondary uppercase">Dist (m)</label>
                                <input 
                                    type="number" 
                                    min="0.5"
                                    step="0.5"
                                    value={newInput.distance}
                                    onChange={e => setNewInput({...newInput, distance: Math.max(0.1, parseFloat(e.target.value))})}
                                    className="w-full p-2 text-sm border border-border-color rounded bg-input-bg text-center"
                                />
                            </div>
                            <div className="col-span-1 flex items-end">
                                <button 
                                    onClick={handleAdd}
                                    className="w-full h-[38px] flex items-center justify-center rounded shadow-sm transition-colors hover:opacity-90"
                                    style={{ backgroundColor: '#00833D', color: 'white' }}
                                    title="Add This Source Configuration"
                                >
                                    <PlusIcon className="h-5 w-5" />
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
                    Next: Capabilities &rarr;
                </button>
            </div>
        </div>
    );
};

export default InputSourcesStep;
