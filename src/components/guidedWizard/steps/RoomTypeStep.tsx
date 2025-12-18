import React from 'react';
import { ROOM_TYPES, VERTICAL_MARKETS, ROOM_TYPE_ICONS } from '../../../data/constants';
import { roomTypeToVerticalMap } from '../../../data/mappings';
import { SparklesIcon } from '../../Icons';

interface Props {
    roomType: string;
    setRoomType: (t: string) => void;
    setVertical: (v: string) => void;
    onNext: () => void;
    onBack: () => void;
    onSave: () => void;
}

const RoomTypeStep: React.FC<Props> = ({ roomType, setRoomType, setVertical, onNext, onBack, onSave }) => {

    const handleSelectRoomType = (type: string) => {
        setRoomType(type);
        const verticalId = roomTypeToVerticalMap[type] || 'corp';
        setVertical(verticalId);
    };

    const roomTypeCards = ROOM_TYPES.map(type => {
        const verticalId = roomTypeToVerticalMap[type] || 'corp';
        const verticalInfo = VERTICAL_MARKETS.find(v => v.verticalId === verticalId);
        const Icon = ROOM_TYPE_ICONS[type] || SparklesIcon;
        return {
            type,
            icon: Icon,
            imageUrl: verticalInfo?.imageUrl || ''
        };
    });

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex-grow overflow-y-auto custom-scrollbar bg-gradient-to-br from-gray-50 to-white">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    {/* Compact Header */}
                    <div className="text-center mb-5">
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">
                            What are we designing?
                        </h2>
                        <p className="text-sm text-slate-600">
                            Select the type of room or application
                        </p>
                    </div>

                    {/* Compact Room Type Grid - 6 columns on xl screens */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {roomTypeCards.map(card => {
                            const Icon = card.icon;
                            const isSelected = roomType === card.type;
                            
                            return (
                                <button
                                    key={card.type}
                                    onClick={() => handleSelectRoomType(card.type)}
                                    className="group relative bg-white border rounded-lg p-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
                                    style={{
                                        borderColor: isSelected ? '#00833d' : '#e2e8f0',
                                        borderWidth: isSelected ? '2px' : '1px',
                                        background: isSelected 
                                            ? 'linear-gradient(135deg, #00833d 0%, #00642f 100%)'
                                            : '#ffffff',
                                        boxShadow: isSelected
                                            ? '0 4px 12px rgba(0, 131, 61, 0.2)'
                                            : '0 1px 3px rgba(15, 23, 42, 0.04)',
                                    }}
                                >
                                    {/* Compact Icon */}
                                    <div 
                                        className="w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-105"
                                        style={{
                                            background: isSelected
                                                ? 'rgba(255, 255, 255, 0.2)'
                                                : '#f1f5f9',
                                        }}
                                    >
                                        <Icon 
                                            className="h-5 w-5"
                                            style={{
                                                color: isSelected ? '#ffffff' : '#00833d'
                                            }}
                                        />
                                    </div>

                                    {/* Label */}
                                    <h3 
                                        className="text-sm font-medium leading-tight"
                                        style={{
                                            color: isSelected ? '#ffffff' : '#0f172a',
                                        }}
                                    >
                                        {card.type}
                                    </h3>

                                    {/* Selection Checkmark */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                                            <svg width="10" height="8" viewBox="0 0 14 11" fill="none">
                                                <path 
                                                    d="M1 5.5L5 9.5L13 1.5" 
                                                    stroke="#00833d" 
                                                    strokeWidth="2.5" 
                                                    strokeLinecap="round" 
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </div>
                                    )}

                                    {/* Hover Effect */}
                                    {!isSelected && (
                                        <div 
                                            className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                                            style={{
                                                background: 'rgba(0, 131, 61, 0.03)',
                                                borderColor: '#cbd5e1',
                                            }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="px-4 py-2.5 border-t border-border-color bg-background-secondary flex justify-between items-center gap-4">
                <button onClick={onBack} className="btn btn-secondary px-3 py-1.5 text-sm">
                    ← Back
                </button>
                <button onClick={onSave} className="text-xs font-medium text-accent hover:underline">
                    Save Progress
                </button>
                <button 
                    onClick={onNext} 
                    disabled={!roomType}
                    className="btn btn-primary px-5 py-1.5 text-sm font-semibold shadow hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next: Define Needs →
                </button>
            </div>

            <style>{`
                button:not(:disabled):not([class*="btn"]):hover {
                    border-color: #cbd5e1 !important;
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06) !important;
                    transform: translateY(-1px) !important;
                }
            `}</style>
        </div>
    );
};

export default RoomTypeStep;
