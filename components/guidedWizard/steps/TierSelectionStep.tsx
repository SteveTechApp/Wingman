
import React from 'react';
import { RoomData, DesignTier } from '../../../utils/types';
import TierIcon from '../../TierIcon';

interface Props {
    options: Record<DesignTier, RoomData>;
    onSelect: (tier: DesignTier) => void;
    onBack: () => void;
}

const TierSelectionStep: React.FC<Props> = ({ options, onSelect, onBack }) => {
    const tiers: DesignTier[] = ['Bronze', 'Silver', 'Gold'];

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
             <div className="flex-grow overflow-y-auto p-6 md:p-8 min-h-0">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-extrabold mb-2">Choose Your Design</h2>
                    <p className="text-text-secondary">Our AI has generated three complete solutions based on your requirements.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
                    {tiers.map(tier => {
                        const room = options[tier];
                        if (!room) return null;
                        
                        return (
                            <div key={tier} className="flex flex-col bg-background rounded-xl border-2 border-border-color shadow-lg hover:shadow-2xl hover:border-accent transition-all duration-300 relative overflow-hidden group">
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${tier === 'Bronze' ? 'bg-orange-700' : tier === 'Silver' ? 'bg-gray-400' : 'bg-yellow-400'}`} />
                                
                                <div className="p-5 flex-grow">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TierIcon tier={tier} className="h-8 w-8" />
                                        <h3 className="text-2xl font-bold">{tier}</h3>
                                    </div>
                                    <p className="text-sm text-text-secondary italic mb-4 min-h-[3rem]">"{room.functionalityStatement.substring(0, 120)}..."</p>
                                    
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Key Equipment</h4>
                                        <ul className="space-y-2">
                                            {room.manuallyAddedEquipment.slice(0, 5).map((item, i) => (
                                                <li key={i} className="text-xs flex items-start gap-2 bg-background-secondary p-2 rounded">
                                                    <span className="font-mono text-accent font-bold">{item.quantity}x</span>
                                                    <span className="line-clamp-2">{item.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {room.manuallyAddedEquipment.length > 5 && (
                                            <p className="text-xs text-center text-text-secondary italic">+ {room.manuallyAddedEquipment.length - 5} more items</p>
                                        )}
                                    </div>
                                </div>

                                <div className="p-5 pt-0 mt-auto">
                                    <button 
                                        onClick={() => onSelect(tier)} 
                                        className="w-full py-3 rounded-lg font-bold text-white shadow-md transform group-hover:-translate-y-0.5 transition-all bg-accent hover:bg-accent-hover"
                                    >
                                        Select {tier}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="p-6 border-t border-border-color bg-background-secondary flex justify-start flex-shrink-0">
                <button onClick={onBack} className="btn btn-secondary px-6 py-3">
                    &larr; Back to Requirements
                </button>
            </div>
        </div>
    );
};

export default TierSelectionStep;
