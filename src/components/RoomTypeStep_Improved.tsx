import React from 'react';
import { 
  Users, 
  Briefcase, 
  MessageSquare, 
  GraduationCap, 
  Theater, 
  Music, 
  Church, 
  Shield,
  Utensils,
  Store,
  Building2,
  Layers,
  Home,
  UserSquare2,
  Scale
} from 'lucide-react';

interface RoomTypeOption {
  type: string;
  icon: React.ElementType;
  count: number;
  gradient: string;
}

export function RoomTypeStep() {
  const roomTypes: RoomTypeOption[] = [
    { type: 'Conference Room', icon: Users, count: 8, gradient: 'from-blue-500 to-blue-700' },
    { type: 'Boardroom', icon: Briefcase, count: 3, gradient: 'from-indigo-500 to-indigo-700' },
    { type: 'Huddle Space', icon: MessageSquare, count: 3, gradient: 'from-purple-500 to-purple-700' },
    { type: 'Classroom', icon: GraduationCap, count: 3, gradient: 'from-green-500 to-green-700' },
    { type: 'Lecture Hall', icon: Theater, count: 3, gradient: 'from-teal-500 to-teal-700' },
    { type: 'Auditorium', icon: Music, count: 5, gradient: 'from-cyan-500 to-cyan-700' },
    { type: 'House of Worship', icon: Church, count: 1, gradient: 'from-violet-500 to-violet-700' },
    { type: 'Command Center', icon: Shield, count: 4, gradient: 'from-red-500 to-red-700' },
    { type: 'Sports Bar', icon: Utensils, count: 4, gradient: 'from-orange-500 to-orange-700' },
    { type: 'Retail Space', icon: Store, count: 3, gradient: 'from-amber-500 to-amber-700' },
    { type: 'Large Venue', icon: Building2, count: 3, gradient: 'from-yellow-500 to-yellow-700' },
    { type: 'Other', icon: Layers, count: 7, gradient: 'from-gray-500 to-gray-700' },
    { type: 'Lobby', icon: Home, count: 3, gradient: 'from-pink-500 to-pink-700' },
    { type: 'Briefing Room', icon: UserSquare2, count: 1, gradient: 'from-rose-500 to-rose-700' },
    { type: 'Council Chamber', icon: Scale, count: 3, gradient: 'from-fuchsia-500 to-fuchsia-700' },
  ];

  const [selectedType, setSelectedType] = React.useState<string | null>(null);

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Select the type of room you are designing
        </h2>
        <p className="text-gray-600">Choose from our collection of professionally designed spaces</p>
      </div>

      {/* Room Type Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {roomTypes.map((room) => {
          const Icon = room.icon;
          const isSelected = selectedType === room.type;
          
          return (
            <button
              key={room.type}
              onClick={() => setSelectedType(room.type)}
              className={`
                group relative overflow-hidden rounded-xl transition-all duration-300
                ${isSelected 
                  ? 'ring-4 ring-blue-500 ring-offset-2 shadow-2xl scale-105' 
                  : 'hover:scale-105 hover:shadow-xl'
                }
              `}
            >
              {/* Gradient Background */}
              <div className={`
                absolute inset-0 bg-gradient-to-br ${room.gradient}
                transition-opacity duration-300
                ${isSelected ? 'opacity-100' : 'opacity-90 group-hover:opacity-100'}
              `} />
              
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Content */}
              <div className="relative flex flex-col items-center justify-center p-6 min-h-[140px]">
                {/* Icon */}
                <div className={`
                  mb-3 transition-transform duration-300
                  ${isSelected ? 'scale-110' : 'group-hover:scale-110'}
                `}>
                  <Icon className="w-10 h-10 text-white drop-shadow-lg" strokeWidth={2} />
                </div>
                
                {/* Room Type Name */}
                <h3 className="text-white font-bold text-center text-sm leading-tight mb-2 drop-shadow-md">
                  {room.type}
                </h3>
                
                {/* Options Count Badge */}
                <div className="bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-white text-xs font-semibold">
                    {room.count} {room.count === 1 ? 'option' : 'options'}
                  </span>
                </div>
              </div>
              
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="bg-white rounded-full p-1 shadow-lg">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Type Display */}
      {selectedType && (
        <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl animate-fadeIn">
          <p className="text-center text-blue-900 font-semibold">
            Selected: <span className="text-blue-600">{selectedType}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// Add this to your global CSS or tailwind config
const styles = `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
`;
