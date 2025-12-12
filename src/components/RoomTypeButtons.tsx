import React from 'react';

interface RoomType {
  id: string;
  name: string;
  icon: string;
  optionsCount: number;
  category?: 'meeting' | 'education' | 'entertainment' | 'workspace' | 'other';
}

const roomTypes: RoomType[] = [
  { id: 'conference', name: 'Conference Room', icon: '🏢', optionsCount: 8, category: 'meeting' },
  { id: 'boardroom', name: 'Boardroom', icon: '👔', optionsCount: 3, category: 'meeting' },
  { id: 'huddle', name: 'Huddle Space', icon: '💡', optionsCount: 3, category: 'workspace' },
  { id: 'classroom', name: 'Classroom', icon: '📚', optionsCount: 3, category: 'education' },
  { id: 'lecture', name: 'Lecture Hall', icon: '🎓', optionsCount: 3, category: 'education' },
  { id: 'auditorium', name: 'Auditorium', icon: '🎭', optionsCount: 5, category: 'entertainment' },
  { id: 'worship', name: 'House of Worship', icon: '⛪', optionsCount: 1, category: 'other' },
  { id: 'command', name: 'Command Center', icon: '🖥️', optionsCount: 4, category: 'workspace' },
  { id: 'sports', name: 'Sports Bar', icon: '🏈', optionsCount: 0, category: 'entertainment' },
  { id: 'retail', name: 'Retail Space', icon: '🏪', optionsCount: 0, category: 'other' },
  { id: 'venue', name: 'Large Venue', icon: '🏟️', optionsCount: 0, category: 'entertainment' },
  { id: 'other', name: 'Other', icon: '📋', optionsCount: 0, category: 'other' },
  { id: 'lobby', name: 'Lobby', icon: '🚪', optionsCount: 0, category: 'other' },
  { id: 'briefing', name: 'Briefing Room', icon: '📊', optionsCount: 0, category: 'meeting' },
  { id: 'council', name: 'Council Chamber', icon: '⚖️', optionsCount: 0, category: 'meeting' },
];

const RoomTypeButtons: React.FC = () => {
  const [selectedRoom, setSelectedRoom] = React.useState<string | null>(null);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafb 0%, #ffffff 100%)',
      padding: '4rem 2rem',
      fontFamily: '"Cabinet Grotesk", system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3.5rem',
        }}>
          <h1 style={{
            fontSize: '2.75rem',
            fontWeight: '700',
            color: '#0f172a',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
            lineHeight: '1.1',
          }}>
            Browse by Room Type
          </h1>
          <p style={{
            fontSize: '1.125rem',
            color: '#64748b',
            fontWeight: '400',
          }}>
            Select the type of room you are designing
          </p>
        </div>

        {/* Room Type Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}>
          {roomTypes.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              style={{
                position: 'relative',
                background: selectedRoom === room.id 
                  ? 'linear-gradient(135deg, #00833d 0%, #00642f 100%)'
                  : '#ffffff',
                border: selectedRoom === room.id 
                  ? '2px solid #00833d'
                  : '2px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.75rem 1.5rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: selectedRoom === room.id
                  ? '0 10px 30px rgba(0, 131, 61, 0.25), 0 4px 12px rgba(0, 131, 61, 0.15)'
                  : '0 2px 8px rgba(15, 23, 42, 0.04)',
                transform: selectedRoom === room.id ? 'translateY(-4px)' : 'translateY(0)',
              }}
              onMouseEnter={(e) => {
                if (selectedRoom !== room.id) {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRoom !== room.id) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {/* Icon */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                background: selectedRoom === room.id
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                marginBottom: '1rem',
                transition: 'all 0.3s ease',
              }}>
                {room.icon}
              </div>

              {/* Content */}
              <div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: selectedRoom === room.id ? '#ffffff' : '#0f172a',
                  marginBottom: '0.5rem',
                  lineHeight: '1.3',
                }}>
                  {room.name}
                </h3>
                
                {room.optionsCount > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.875rem',
                    color: selectedRoom === room.id 
                      ? 'rgba(255, 255, 255, 0.9)' 
                      : '#64748b',
                    fontWeight: '500',
                  }}>
                    <span style={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: selectedRoom === room.id 
                        ? 'rgba(255, 255, 255, 0.6)' 
                        : '#cbd5e1',
                    }} />
                    {room.optionsCount} {room.optionsCount === 1 ? 'option' : 'options'}
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              {selectedRoom === room.id && (
                <div style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.95)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}>
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
            </button>
          ))}
        </div>

        {/* Selected Room Info */}
        {selectedRoom && (
          <div style={{
            marginTop: '2.5rem',
            padding: '1.5rem 2rem',
            background: 'linear-gradient(135deg, rgba(0, 131, 61, 0.08) 0%, rgba(0, 131, 61, 0.04) 100%)',
            border: '2px solid rgba(0, 131, 61, 0.2)',
            borderRadius: '16px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '1rem',
              color: '#00642f',
              fontWeight: '600',
            }}>
              ✓ {roomTypes.find(r => r.id === selectedRoom)?.name} selected
            </p>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        button {
          all: unset;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
};

export default RoomTypeButtons;
