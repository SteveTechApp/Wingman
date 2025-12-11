import React from 'react';

interface VerticalMarket {
    verticalId: string;
    name: string;
    icon: React.FC<{ className?: string }>;
    imageUrl: string;
}

interface VerticalMarketCardProps {
  vertical: VerticalMarket;
  onClick: () => void;
}

const VerticalMarketCard: React.FC<VerticalMarketCardProps> = ({ vertical, onClick }) => {
  const Icon = vertical.icon;

  return (
    <button
      onClick={onClick}
      className="relative aspect-[4/3] rounded-lg overflow-hidden group transition-all duration-300 transform hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
      aria-label={`View templates for ${vertical.name}`}
    >
      <img 
        src={vertical.imageUrl} 
        alt={vertical.name} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gradient-from-black-80 to-transparent group-hover:from-gradient-from-black-90 transition-colors" />
      <div className="absolute bottom-0 left-0 p-4 w-full">
        <div className="flex items-center gap-3">
            <Icon className="h-8 w-8 text-white flex-shrink-0" />
            <h3 className="font-bold text-xl text-white drop-shadow-md text-left">{vertical.name}</h3>
        </div>
      </div>
    </button>
  );
};

export default VerticalMarketCard;