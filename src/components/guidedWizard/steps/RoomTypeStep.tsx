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
                <div className="max-w-7xl mx-auto p-6 md:p-8">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                            What are we designing?
                        </h2>
                        <p className="text-lg text-slate-600">
                            Select the type of room or application
                        </p>
                    </div>

                    {/* Professional Room Type Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {roomTypeCards.map(card => {
                            const Icon = card.icon;
                            const isSelected = roomType === card.type;
                            
                            return (
                                <button
                                    key={card.type}
                                    onClick={() => handleSelectRoomType(card.type)}
                                    className="group relative bg-white border-2 rounded-2xl p-7 text-left transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                                    style={{
                                        borderColor: isSelected ? '#00833d' : '#e2e8f0',
                                        background: isSelected 
                                            ? 'linear-gradient(135deg, #00833d 0%, #00642f 100%)'
                                            : '#ffffff',
                                        boxShadow: isSelected
                                            ? '0 10px 30px rgba(0, 131, 61, 0.25), 0 4px 12px rgba(0, 131, 61, 0.15)'
                                            : '0 2px 8px rgba(15, 23, 42, 0.04)',
                                        transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
                                    }}
                                >
                                    {/* Icon Container */}
                                    <div 
                                        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                                        style={{
                                            background: isSelected
                                                ? 'rgba(255, 255, 255, 0.2)'
                                                : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                                        }}
                                    >
                                        <Icon 
                                            className="h-7 w-7 transition-colors duration-300"
                                            style={{
                                                color: isSelected ? '#ffffff' : '#00833d'
                                            }}
                                        />
                                    </div>

                                    {/* Content */}
                                    <div>
                                        <h3 
                                            className="text-lg font-semibold mb-2 leading-tight"
                                            style={{
                                                color: isSelected ? '#ffffff' : '#0f172a',
                                            }}
                                        >
                                            {card.type}
                                        </h3>
                                    </div>

                                    {/* Selection Indicator */}
                                    {isSelected && (
                                        <div className="absolute top-5 right-5 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow-md">
                                            <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
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

                                    {/* Hover Effect Overlay */}
                                    {!isSelected && (
                                        <div 
                                            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(0, 131, 61, 0.03) 0%, rgba(0, 131, 61, 0.01) 100%)',
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
            <div className="px-4 py-3 border-t border-border-color bg-background-secondary flex justify-between flex-shrink-0 items-center mt-auto gap-4 min-h-[60px]">
                <button onClick={onBack} className="btn btn-secondary px-4 py-2 text-sm">
                    ← Back
                </button>
                <button onClick={onSave} className="text-xs font-medium text-accent hover:underline">
                    Save Progress
                </button>
                <button 
                    onClick={onNext} 
                    disabled={!roomType}
                    className="btn btn-primary px-6 py-2 text-base font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next: Define Needs →
                </button>
            </div>

            <style>{`
                button:not(:disabled):hover {
                    border-color: #cbd5e1 !important;
                    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08) !important;
                    transform: translateY(-2px) !important;
                }
            `}</style>
        </div>
    );
};

export default RoomTypeStep;
