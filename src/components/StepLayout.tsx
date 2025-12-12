import React, { useState } from 'react';
import { Dimensions } from '../../utils/types';

interface StepLayoutProps {
    dimensions: Dimensions;
    setDimensions: (dims: Dimensions) => void;
    maxParticipants: number;
    setMaxParticipants: (count: number) => void;
    onNext: () => void;
    onBack: () => void;
    onSave: () => void;
}

const StepLayout: React.FC<StepLayoutProps> = ({
    dimensions,
    setDimensions,
    maxParticipants,
    setMaxParticipants,
    onNext,
    onBack,
    onSave
}) => {
    const handleDimensionChange = (key: keyof Dimensions, value: number) => {
        setDimensions({ ...dimensions, [key]: value });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Room Layout</h2>
                <p className="text-text-secondary">Configure the physical dimensions and capacity of the room.</p>
            </div>

            <div className="bg-background-secondary p-6 rounded-xl border border-border-color space-y-6">
                <div>
                    <h3 className="font-bold text-lg mb-4">Room Dimensions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Length (m)
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="0.1"
                                value={dimensions.length}
                                onChange={(e) => handleDimensionChange('length', parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border rounded-md bg-input-bg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Width (m)
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="0.1"
                                value={dimensions.width}
                                onChange={(e) => handleDimensionChange('width', parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border rounded-md bg-input-bg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Height (m)
                            </label>
                            <input
                                type="number"
                                min="2"
                                step="0.1"
                                value={dimensions.height}
                                onChange={(e) => handleDimensionChange('height', parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border rounded-md bg-input-bg"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-lg mb-4">Room Capacity</h3>
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Maximum Participants
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={maxParticipants}
                            onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 1)}
                            className="w-full md:w-64 p-2 border rounded-md bg-input-bg"
                        />
                        <p className="text-xs text-text-secondary mt-1">
                            Expected number of people who will use this room simultaneously
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Room Area</h4>
                    <p className="text-2xl font-bold">
                        {(dimensions.length * dimensions.width).toFixed(1)} m²
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                        {((dimensions.length * dimensions.width) / maxParticipants).toFixed(1)} m² per participant
                    </p>
                </div>
            </div>

            <div className="flex justify-between">
                <button onClick={onBack} className="btn btn-secondary">
                    Back
                </button>
                <div className="flex gap-2">
                    <button onClick={onSave} className="btn btn-secondary">
                        Save
                    </button>
                    <button onClick={onNext} className="btn btn-primary">
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StepLayout;
