
import React from 'react';
import ToggleSwitch from '../../ui/ToggleSwitch';

interface Needs {
    videoConferencing: boolean;
    wirelessPresentation: boolean;
    interactive: boolean;
    voiceLift: boolean;
    roomPc: boolean;
}

interface Props {
    needs: Needs;
    setNeeds: (n: Needs) => void;
    dimensions: { length: number; width: number; height: number };
    setDimensions: (d: { length: number; width: number; height: number }) => void;
    capacity: number;
    setCapacity: (c: number) => void;
    onNext: () => void;
    onBack: () => void;
    onSave: () => void;
}

const NeedsAssessmentStep: React.FC<Props> = ({ 
    needs, setNeeds, dimensions, setDimensions, capacity, setCapacity, onNext, onBack, onSave 
}) => {
    
    const toggle = (key: keyof Needs) => {
        setNeeds({ ...needs, [key]: !needs[key] });
    };

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex-grow overflow-y-auto p-4 md:p-6 min-h-0">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-4">
                        <h2 className="text-2xl font-extrabold mb-1">Room Functionality</h2>
                        <p className="text-text-secondary text-sm">Define the physical space and core capabilities.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                        {/* Physical Specs */}
                        <div className="bg-background p-4 rounded-lg border border-border-color">
                            <h3 className="text-base font-bold mb-3 border-b border-border-color pb-2">Physical Space</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Max Participants</label>
                                    <input 
                                        type="number" 
                                        value={capacity}
                                        onChange={e => setCapacity(Number(e.target.value))}
                                        className="w-full p-2 border border-border-color rounded-md bg-input-bg text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Length (m)</label>
                                        <input
                                            type="number"
                                            value={dimensions.length}
                                            onChange={e => setDimensions({...dimensions, length: Number(e.target.value)})}
                                            className="w-full p-2 border border-border-color rounded-md bg-input-bg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Width (m)</label>
                                        <input
                                            type="number"
                                            value={dimensions.width}
                                            onChange={e => setDimensions({...dimensions, width: Number(e.target.value)})}
                                            className="w-full p-2 border border-border-color rounded-md bg-input-bg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Height (m)</label>
                                        <input
                                            type="number"
                                            value={dimensions.height}
                                            onChange={e => setDimensions({...dimensions, height: Number(e.target.value)})}
                                            className="w-full p-2 border border-border-color rounded-md bg-input-bg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tech Requirements */}
                        <div className="bg-background p-4 rounded-lg border border-border-color">
                            <h3 className="text-base font-bold mb-3 border-b border-border-color pb-2">Capabilities</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-background-secondary rounded-md border border-border-color-subtle">
                                    <div>
                                        <div className="font-bold text-sm">Video Conferencing</div>
                                        <div className="text-[10px] text-text-secondary">Zoom, Teams, Webex calls</div>
                                    </div>
                                    <ToggleSwitch checked={needs.videoConferencing} onChange={() => toggle('videoConferencing')} />
                                </div>
                                <div className="flex items-center justify-between p-2 bg-background-secondary rounded-md border border-border-color-subtle">
                                    <div>
                                        <div className="font-bold text-sm">Wireless Presentation</div>
                                        <div className="text-[10px] text-text-secondary">AirPlay, Miracast, Google Cast, or Dongle</div>
                                    </div>
                                    <ToggleSwitch checked={needs.wirelessPresentation} onChange={() => toggle('wirelessPresentation')} />
                                </div>
                                <div className="flex items-center justify-between p-2 bg-background-secondary rounded-md border border-border-color-subtle">
                                    <div>
                                        <div className="font-bold text-sm">Dedicated Room PC</div>
                                        <div className="text-[10px] text-text-secondary">Permanent in-room PC</div>
                                    </div>
                                    <ToggleSwitch checked={needs.roomPc} onChange={() => toggle('roomPc')} />
                                </div>
                                <div className="flex items-center justify-between p-2 bg-background-secondary rounded-md border border-border-color-subtle">
                                    <div>
                                        <div className="font-bold text-sm">Voice Lift / Reinforcement</div>
                                        <div className="text-[10px] text-text-secondary">For large rooms (Lectures)</div>
                                    </div>
                                    <ToggleSwitch checked={needs.voiceLift} onChange={() => toggle('voiceLift')} />
                                </div>
                                <div className="flex items-center justify-between p-2 bg-background-secondary rounded-md border border-border-color-subtle">
                                    <div>
                                        <div className="font-bold text-sm">Interactive / Touch</div>
                                        <div className="text-[10px] text-text-secondary">Whiteboarding support</div>
                                    </div>
                                    <ToggleSwitch checked={needs.interactive} onChange={() => toggle('interactive')} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-border-color bg-background-secondary flex justify-between flex-shrink-0 items-center">
                <button onClick={onBack} className="btn btn-secondary px-4 py-2 text-sm">
                    &larr; Back
                </button>
                <button onClick={onSave} className="text-xs font-medium text-accent hover:underline">
                    Save Progress
                </button>
                <button onClick={onNext} className="btn btn-primary px-6 py-2 text-base font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all animate-pulse-bright">
                    Generate Options &rarr;
                </button>
            </div>
        </div>
    );
};

export default NeedsAssessmentStep;
