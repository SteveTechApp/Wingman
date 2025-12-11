import React from 'react';
import { ROOM_TYPES, ROOM_TYPE_ICONS, VERTICAL_MARKETS } from '../../../data/constants';
import { SparklesIcon } from '../../Icons';

interface RoomTypeStepProps {
    roomType: string;
    setRoomType: (type: string) => void;
    setVertical: (vertical: string) => void;
    onNext: () => void;
    onBack: () => void;
    onSave: () => void;
}

const RoomTypeStep: React.FC<RoomTypeStepProps> = ({ 
    roomType, 
    setRoomType, 
    setVertical,
    onNext, 
    onBack,
    onSave 
}) => {
    const handleTypeSelect = (type: string) => {
        setRoomType(type);
        // Auto-set vertical based on room type if needed
        const verticalMap: Record<string, string> = {
            'Conference Room': 'corp',
            'Boardroom': 'corp',
            'Huddle Room': 'corp',
            'Training Room': 'edu',
            'Classroom': 'edu',
            'Lecture Hall': 'edu',
            'Auditorium': 'gov',
            'Control Room': 'gov',
        };
        const inferredVertical = verticalMap[type] || 'corp';
        setVertical(inferredVertical);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Compact Content Area */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-3 md:p-4">
                {/* Compact Header */}
                <div className="mb-3">
                    <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-1">Select Room Type</h2>
                    <p className="text-sm text-text-secondary">Choose the type of room you're designing</p>
                </div>

                {/* Compact Grid - More columns, smaller cards, reduced spacing */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {ROOM_TYPES.map(type => {
                        const Icon = ROOM_TYPE_ICONS[type] || SparklesIcon;
                        const isSelected = roomType === type;

                        return (
                            <button
                                key={type}
                                onClick={() => handleTypeSelect(type)}
                                className={`
                                    relative p-2 rounded-md border-2 transition-all duration-200
                                    flex flex-col items-center justify-center text-center gap-1
                                    hover:shadow-md hover:-translate-y-0.5
                                    ${isSelected 
                                        ? 'border-accent bg-accent-bg-subtle shadow-md' 
                                        : 'border-border-color bg-background hover:border-accent/50'
                                    }
                                `}
                            >
                                {/* Icon */}
                                <Icon className={`h-6 w-6 ${isSelected ? 'text-accent' : 'text-text-secondary'}`} />
                                
                                {/* Label */}
                                <span className={`text-xs font-medium leading-tight line-clamp-2 ${isSelected ? 'text-accent font-semibold' : 'text-text-primary'}`}>
                                    {type}
                                </span>

                                {/* Selected Indicator */}
                                {isSelected && (
                                    <div className="absolute top-1 right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Optional: Vertical Market Selection (Compact) */}
                {roomType && (
                    <div className="mt-4 p-3 bg-background rounded-md border border-border-color">
                        <label className="block text-sm font-medium text-text-primary mb-2">Vertical Market (Optional)</label>
                        <select 
                            onChange={(e) => setVertical(e.target.value)}
                            className="w-full p-2 text-sm border border-border-color rounded bg-input-bg"
                        >
                            {VERTICAL_MARKETS.filter(v => v.verticalId !== 'all').map(v => (
                                <option key={v.verticalId} value={v.verticalId}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Compact Action Bar */}
            <div className="flex-shrink-0 p-3 border-t border-border-color bg-background flex items-center justify-between gap-2">
                <button 
                    onClick={onBack}
                    className="btn btn-secondary text-sm px-4 py-2"
                >
                    Back
                </button>

                <div className="flex gap-2">
                    <button 
                        onClick={onSave}
                        className="text-sm text-accent hover:underline font-medium"
                    >
                        Save Progress
                    </button>
                    <button 
                        onClick={onNext}
                        disabled={!roomType}
                        className="btn btn-primary text-sm px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoomTypeStep;
