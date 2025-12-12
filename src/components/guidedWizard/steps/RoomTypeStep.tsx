

import React from 'react';
// FIX: The alias was causing an issue with the non-existent export. Import ROOM_TYPE_ICONS directly.
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
            imageUrl: verticalInfo?.imageUrl.replace('w=400&h=300', 'w=600&h=400') || ''
        };
    });

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
             <div className="flex-grow overflow-y-auto p-4 md:p-6 custom-scrollbar">
                <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-extrabold mb-1">What are we designing?</h2>
                        <p className="text-text-secondary mb-0 text-sm">Select the type of room or application.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {roomTypeCards.map(card => (
                            <button
                                key={card.type}
                                onClick={() => handleSelectRoomType(card.type)}
                                className={`relative aspect-[4/3] rounded-lg overflow-hidden group transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background border-4
                                ${roomType === card.type ? 'border-accent shadow-2xl' : 'border-transparent hover:border-accent/50'}`}
                            >
                                <img 
                                    src={card.imageUrl} 
                                    alt={card.type} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-gradient-from-black-90 to-transparent transition-colors" />
                                <div className="absolute bottom-0 left-0 p-3 w-full">
                                    <div className="flex items-center gap-2">
                                        <card.icon className="h-6 w-6 text-white flex-shrink-0" />
                                        <div className="text-left">
                                            <h3 className="font-bold text-sm text-white drop-shadow-md leading-tight">{card.type}</h3>
                                        </div>
                                    </div>
                                </div>
                                {roomType === card.type && (
                                    <div className="absolute top-2 right-2 bg-accent text-white rounded-full p-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-border-color bg-background-secondary flex justify-between flex-shrink-0 items-center mt-auto">
                <button onClick={onBack} className="btn btn-secondary px-4 py-2 text-sm">
                    &larr; Back
                </button>
                 <button onClick={onSave} className="text-xs font-medium text-accent hover:underline">
                    Save Progress
                </button>
                <button onClick={onNext} className="btn btn-primary px-6 py-2 text-base font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                    Next: Define Needs &rarr;
                </button>
            </div>
        </div>
    );
};

export default RoomTypeStep;