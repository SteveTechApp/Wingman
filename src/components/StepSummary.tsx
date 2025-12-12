import React from 'react';
import { RoomData, DisplayGroup } from '../../utils/types';

interface StepSummaryProps {
    roomData: Partial<RoomData>;
    displayGroups?: DisplayGroup[];
    onBack: () => void;
    onComplete: () => void;
}

const StepSummary: React.FC<StepSummaryProps> = ({ roomData, displayGroups, onBack, onComplete }) => {
    const SummarySection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div className="mb-6">
            <h3 className="font-bold text-lg mb-3 text-accent">{title}</h3>
            <div className="bg-background-secondary p-4 rounded-lg border border-border-color">
                {children}
            </div>
        </div>
    );

    const SummaryRow: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
        <div className="flex justify-between py-2 border-b border-border-color last:border-b-0">
            <span className="text-text-secondary">{label}:</span>
            <span className="font-medium">{value || 'Not specified'}</span>
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Summary</h2>
                <p className="text-text-secondary">Review your room configuration before finalizing.</p>
            </div>

            <div className="max-h-[600px] overflow-y-auto pr-2">
                <SummarySection title="Basic Information">
                    <SummaryRow label="Room Name" value={roomData.roomName} />
                    <SummaryRow label="Room Type" value={roomData.roomType} />
                    <SummaryRow label="Design Tier" value={roomData.designTier} />
                    <SummaryRow label="Max Participants" value={roomData.maxParticipants} />
                </SummarySection>

                <SummarySection title="Dimensions">
                    <SummaryRow 
                        label="Size" 
                        value={roomData.dimensions 
                            ? `${roomData.dimensions.length}m × ${roomData.dimensions.width}m × ${roomData.dimensions.height}m` 
                            : undefined
                        } 
                    />
                    <SummaryRow 
                        label="Area" 
                        value={roomData.dimensions 
                            ? `${(roomData.dimensions.length * roomData.dimensions.width).toFixed(1)} m²` 
                            : undefined
                        } 
                    />
                </SummarySection>

                {displayGroups && displayGroups.length > 0 && (
                    <SummarySection title="Display Configuration">
                        {displayGroups.map((group, index) => (
                            <div key={group.id} className="py-2 border-b border-border-color last:border-b-0">
                                <div className="font-medium">{group.name}</div>
                                <div className="text-sm text-text-secondary mt-1">
                                    <div>Type: {group.type.replace(/_/g, ' ')}</div>
                                    <div>Quantity: {group.quantity}</div>
                                    <div>Transport: {group.transport}</div>
                                    {group.videoWallConfig && (
                                        <div>Layout: {group.videoWallConfig.rows}×{group.videoWallConfig.cols}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </SummarySection>
                )}

                {roomData.features && roomData.features.length > 0 && (
                    <SummarySection title="Features">
                        {roomData.features.map((feature, index) => (
                            <div key={index} className="py-2 border-b border-border-color last:border-b-0">
                                <div className="flex justify-between">
                                    <span className="font-medium">{feature.name}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                        feature.priority === 'must-have' 
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    }`}>
                                        {feature.priority}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </SummarySection>
                )}

                {roomData.ioRequirements && roomData.ioRequirements.length > 0 && (
                    <SummarySection title="I/O Requirements">
                        <div className="space-y-2">
                            <div>
                                <span className="text-text-secondary">Inputs: </span>
                                <span className="font-medium">
                                    {roomData.ioRequirements.filter(io => io.category === 'input').length}
                                </span>
                            </div>
                            <div>
                                <span className="text-text-secondary">Outputs: </span>
                                <span className="font-medium">
                                    {roomData.ioRequirements.filter(io => io.category === 'output').length}
                                </span>
                            </div>
                        </div>
                    </SummarySection>
                )}

                {roomData.functionalityStatement && (
                    <SummarySection title="Functionality Statement">
                        <p className="text-sm leading-relaxed">{roomData.functionalityStatement}</p>
                    </SummarySection>
                )}

                {roomData.technicalDetails && (
                    <SummarySection title="Technical Details">
                        {roomData.technicalDetails.controlSystem && (
                            <SummaryRow label="Control System" value={roomData.technicalDetails.controlSystem} />
                        )}
                        {roomData.technicalDetails.avoipSystem && (
                            <SummaryRow label="AVoIP System" value={roomData.technicalDetails.avoipSystem} />
                        )}
                        {roomData.technicalDetails.wirelessPresentation !== undefined && (
                            <SummaryRow 
                                label="Wireless Presentation" 
                                value={roomData.technicalDetails.wirelessPresentation ? 'Yes' : 'No'} 
                            />
                        )}
                    </SummarySection>
                )}
            </div>

            <div className="flex justify-between pt-4 border-t border-border-color">
                <button onClick={onBack} className="btn btn-secondary">
                    Back
                </button>
                <button onClick={onComplete} className="btn btn-primary">
                    Complete Setup
                </button>
            </div>
        </div>
    );
};

export default StepSummary;
