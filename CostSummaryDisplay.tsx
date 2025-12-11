import React, { useMemo } from 'react';
import { ProjectData, RoomData, ManuallyAddedEquipment } from '../utils/types';

interface CostSummaryDisplayProps {
    projectData: ProjectData;
    showDetails?: boolean;
    markup?: number; // Percentage markup (e.g., 25 for 25%)
    laborRates?: {
        role: string;
        ratePerHour: number;
        estimatedHours?: number;
    }[];
}

interface CostBreakdown {
    equipmentCost: number;
    laborCost: number;
    ancillaryCosts: number;
    subtotal: number;
    markup: number;
    tax: number;
    total: number;
    roomBreakdown: {
        roomId: string;
        roomName: string;
        equipmentCost: number;
        estimatedLaborHours: number;
        laborCost: number;
    }[];
}

const CostSummaryDisplay: React.FC<CostSummaryDisplayProps> = ({
    projectData,
    showDetails = true,
    markup = 20,
    laborRates = []
}) => {
    const costBreakdown = useMemo<CostBreakdown>(() => {
        let totalEquipmentCost = 0;
        let totalLaborCost = 0;
        const roomBreakdown: CostBreakdown['roomBreakdown'] = [];

        // Calculate costs per room
        projectData.rooms.forEach(room => {
            let roomEquipmentCost = 0;

            // Sum up equipment costs
            room.manuallyAddedEquipment.forEach(equipment => {
                const unitPrice = equipment.msrp || 0;
                roomEquipmentCost += unitPrice * equipment.quantity;
            });

            // Estimate labor hours based on room complexity
            const estimatedLaborHours = estimateLaborHours(room);
            
            // Calculate labor cost
            const averageLaborRate = laborRates.length > 0
                ? laborRates.reduce((sum, rate) => sum + rate.ratePerHour, 0) / laborRates.length
                : 75; // Default $75/hour
            
            const roomLaborCost = estimatedLaborHours * averageLaborRate;

            totalEquipmentCost += roomEquipmentCost;
            totalLaborCost += roomLaborCost;

            roomBreakdown.push({
                roomId: room.id,
                roomName: room.roomName,
                equipmentCost: roomEquipmentCost,
                estimatedLaborHours,
                laborCost: roomLaborCost,
            });
        });

        // Calculate ancillary costs (cabling, conduit, misc materials)
        const ancillaryCosts = totalEquipmentCost * 0.15; // 15% of equipment cost

        const subtotal = totalEquipmentCost + totalLaborCost + ancillaryCosts;
        const markupAmount = subtotal * (markup / 100);
        const taxAmount = (subtotal + markupAmount) * 0.08; // Assuming 8% tax
        const total = subtotal + markupAmount + taxAmount;

        return {
            equipmentCost: totalEquipmentCost,
            laborCost: totalLaborCost,
            ancillaryCosts,
            subtotal,
            markup: markupAmount,
            tax: taxAmount,
            total,
            roomBreakdown,
        };
    }, [projectData, markup, laborRates]);

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const estimateLaborHours = (room: RoomData): number => {
        // Base hours
        let hours = 8; // Minimum for any room

        // Add hours based on equipment count
        hours += room.manuallyAddedEquipment.length * 1.5;

        // Add hours for display installation
        hours += room.displayCount * 2;

        // Add hours for video wall
        if (room.videoWallConfig) {
            const displays = room.videoWallConfig.layout.rows * room.videoWallConfig.layout.cols;
            hours += displays * 3; // Video walls take longer
        }

        // Add hours for audio system
        if (room.audioSystemDetails) {
            hours += 4;
            if (room.audioSystemDetails.ceilingMics > 0) hours += 2;
            if (room.audioSystemDetails.talkbackMics > 0) hours += 2;
        }

        // Add hours for I/O points
        hours += room.ioRequirements.length * 0.5;

        // Tier multiplier (higher tiers take more configuration time)
        const tierMultiplier = {
            Bronze: 1.0,
            Silver: 1.2,
            Gold: 1.4,
        }[room.designTier];

        return Math.ceil(hours * tierMultiplier);
    };

    return (
        <div className="bg-background-secondary rounded-xl border border-border-color overflow-hidden">
            <div className="bg-gradient-to-r from-accent to-accent-dark p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">Project Cost Summary</h2>
                <p className="text-white/80">{projectData.projectName}</p>
            </div>

            <div className="p-6 space-y-6">
                {/* High-level summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-background-secondary-subtle p-4 rounded-lg">
                        <p className="text-xs text-text-secondary uppercase mb-1">Equipment</p>
                        <p className="text-2xl font-bold">{formatCurrency(costBreakdown.equipmentCost)}</p>
                    </div>
                    <div className="bg-background-secondary-subtle p-4 rounded-lg">
                        <p className="text-xs text-text-secondary uppercase mb-1">Labor</p>
                        <p className="text-2xl font-bold">{formatCurrency(costBreakdown.laborCost)}</p>
                    </div>
                    <div className="bg-background-secondary-subtle p-4 rounded-lg">
                        <p className="text-xs text-text-secondary uppercase mb-1">Ancillary</p>
                        <p className="text-2xl font-bold">{formatCurrency(costBreakdown.ancillaryCosts)}</p>
                    </div>
                    <div className="bg-accent-bg-subtle p-4 rounded-lg border-2 border-accent">
                        <p className="text-xs text-accent uppercase mb-1 font-bold">Total</p>
                        <p className="text-2xl font-bold text-accent">{formatCurrency(costBreakdown.total)}</p>
                    </div>
                </div>

                {/* Detailed breakdown */}
                {showDetails && (
                    <>
                        <div className="border-t border-border-color pt-6">
                            <h3 className="font-bold text-lg mb-4">Cost Breakdown</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between py-2">
                                    <span className="text-text-secondary">Equipment Subtotal</span>
                                    <span className="font-medium">{formatCurrency(costBreakdown.equipmentCost)}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-text-secondary">Labor Subtotal</span>
                                    <span className="font-medium">{formatCurrency(costBreakdown.laborCost)}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-text-secondary">Ancillary Costs (cables, materials, etc.)</span>
                                    <span className="font-medium">{formatCurrency(costBreakdown.ancillaryCosts)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-t border-border-color font-medium">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(costBreakdown.subtotal)}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-text-secondary">Markup ({markup}%)</span>
                                    <span className="font-medium">{formatCurrency(costBreakdown.markup)}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-text-secondary">Tax (8%)</span>
                                    <span className="font-medium">{formatCurrency(costBreakdown.tax)}</span>
                                </div>
                                <div className="flex justify-between py-3 border-t-2 border-accent text-lg font-bold text-accent">
                                    <span>Total Project Cost</span>
                                    <span>{formatCurrency(costBreakdown.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Per-room breakdown */}
                        <div className="border-t border-border-color pt-6">
                            <h3 className="font-bold text-lg mb-4">Cost by Room</h3>
                            <div className="space-y-3">
                                {costBreakdown.roomBreakdown.map(room => (
                                    <div
                                        key={room.roomId}
                                        className="bg-background-secondary-subtle p-4 rounded-lg"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium">{room.roomName}</h4>
                                            <span className="font-bold">
                                                {formatCurrency(room.equipmentCost + room.laborCost)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-text-secondary">Equipment: </span>
                                                <span className="font-medium">{formatCurrency(room.equipmentCost)}</span>
                                            </div>
                                            <div>
                                                <span className="text-text-secondary">Labor: </span>
                                                <span className="font-medium">{formatCurrency(room.laborCost)}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-text-secondary">Estimated Hours: </span>
                                                <span className="font-medium">{room.estimatedLaborHours}h</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Notes */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm">
                    <p className="font-semibold mb-2">Cost Estimate Notes:</p>
                    <ul className="list-disc list-inside space-y-1 text-text-secondary">
                        <li>Equipment costs based on MSRP pricing</li>
                        <li>Labor estimates include installation and configuration</li>
                        <li>Ancillary costs include cabling, conduit, and misc materials</li>
                        <li>Final pricing may vary based on actual site conditions</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default CostSummaryDisplay;
