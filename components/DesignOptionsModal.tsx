import React from 'react';
import { DesignProposal, ManuallyAddedEquipment } from '../utils/types.ts';
import InfoModal from './InfoModal.tsx';
import TierIcon from './TierIcon.tsx';
import { SparklesIcon } from './Icons.tsx';

interface DesignOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: DesignProposal[];
  onApplyDesign: (proposal: DesignProposal) => void;
}

const calculateTotalMsrp = (equipment: ManuallyAddedEquipment[]): number | null => {
    // If even one item doesn't have an MSRP, we can't calculate a total.
    if (!equipment.every(item => typeof item.msrp === 'number')) {
        return null;
    }
    return equipment.reduce((total, item) => total + (item.msrp! * item.quantity), 0);
};

const DesignTierColumn: React.FC<{ proposal: DesignProposal, onApply: () => void }> = ({ proposal, onApply }) => {
    const totalMsrp = calculateTotalMsrp(proposal.manuallyAddedEquipment);
    
    return (
        <div className="flex flex-col bg-background-secondary p-4 rounded-lg border border-border-color h-full">
            <div className="flex items-center gap-2 mb-2">
                <TierIcon tier={proposal.tier} className="h-6 w-6" />
                <h3 className="text-xl font-bold">{proposal.tier} Design</h3>
            </div>
            {totalMsrp !== null && (
                 <p className="text-2xl font-bold text-accent mb-2">
                    ${totalMsrp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-sm font-normal text-text-secondary ml-1">(MSRP)</span>
                </p>
            )}
            <p className="text-xs text-text-secondary italic mb-4 h-20 overflow-y-auto">{proposal.functionalityStatement}</p>
            
            <div className="flex-grow border-t border-border-color pt-2 overflow-y-auto">
                <h4 className="font-bold text-sm mb-2">Equipment List</h4>
                <ul className="space-y-1 text-sm">
                    {proposal.manuallyAddedEquipment.map(item => (
                        <li key={item.sku} className="flex justify-between items-center text-xs">
                            <span className="truncate pr-2">{item.name}</span>
                            <span className="flex-shrink-0 font-mono bg-background px-1.5 py-0.5 rounded-md text-text-secondary">x{item.quantity}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="mt-4 flex-shrink-0">
                <button onClick={onApply} className="w-full btn btn-primary">
                    Apply this Design
                </button>
            </div>
        </div>
    );
};

const DesignOptionsModal: React.FC<DesignOptionsModalProps> = ({ isOpen, onClose, proposals, onApplyDesign }) => {
    const sortedProposals = proposals.sort((a, b) => {
        const order = { Bronze: 1, Silver: 2, Gold: 3 };
        return order[a.tier] - order[b.tier];
    });

    const footer = <button onClick={onClose} className="btn btn-secondary">Cancel</button>

    return (
        <InfoModal isOpen={isOpen} onClose={onClose} className="max-w-7xl h-[90vh]" title={
            <div className="flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-accent"/>
                AI Design Options
            </div>
        } footer={footer}>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                {sortedProposals.map(proposal => (
                    <DesignTierColumn 
                        key={proposal.tier} 
                        proposal={proposal}
                        onApply={() => onApplyDesign(proposal)}
                    />
                ))}
                {proposals.length === 0 && (
                     <div className="md:col-span-3 text-center text-text-secondary py-16">
                        <p className="font-semibold">No design options were generated.</p>
                        <p className="text-sm mt-1">This might be due to an error or an issue with the AI model. Please try again.</p>
                    </div>
                )}
           </div>
        </InfoModal>
    );
};

export default DesignOptionsModal;