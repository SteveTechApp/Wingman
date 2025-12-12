
import React from 'react';

interface DisplayTypeCardProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  isSelected: boolean;
}

const DisplayTypeCard: React.FC<DisplayTypeCardProps> = ({ icon: Icon, label, description, onClick, isSelected }) => {
  return (
    <button
      onClick={onClick}
      className={`p-4 border-2 rounded-lg text-left w-full h-full flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
        isSelected ? 'bg-accent text-white border-accent shadow-lg' : 'bg-gray-100 text-text-primary border-transparent hover:bg-gray-200'
      }`}
    >
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Icon className={`h-8 w-8 ${isSelected ? 'text-white' : 'text-accent'}`} />
          <h3 className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-text-primary'}`}>{label}</h3>
        </div>
        <p className={`text-sm ${isSelected ? 'text-green-100' : 'text-text-secondary'}`}>{description}</p>
      </div>
      {isSelected && <span className="text-xs font-bold text-white mt-4 self-start">SELECTED</span>}
    </button>
  );
};

export default DisplayTypeCard;
