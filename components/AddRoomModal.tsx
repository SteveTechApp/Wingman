
import React, { useState } from 'react';
import { RoomData, DesignTier } from '../utils/types';
import { createNewRoom } from '../utils/utils';
import { v4 as uuidv4 } from 'uuid';
import { ROOM_TYPES, DESIGN_TIER_OPTIONS } from '../data/constants';
import TierIcon from './TierIcon';
import InfoModal from './InfoModal';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRoom: (newRoom: RoomData) => void;
}

const AddRoomModal: React.FC<AddRoomModalProps> = ({ isOpen, onClose, onAddRoom }) => {
  const [roomName, setRoomName] = useState('New Room');
  const [roomType, setRoomType] = useState('Conference Room');
  const [designTier, setDesignTier] = useState<DesignTier>('Silver');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRoomBase = createNewRoom();
    const newRoom: RoomData = {
      ...newRoomBase,
      id: uuidv4(),
      roomName,
      roomType,
      designTier,
    };
    onAddRoom(newRoom);
    onClose();
  };
  
  const footer = (
    <>
      <button type="button" onClick={onClose} className="bg-background hover:bg-border-color text-text-primary font-medium py-2 px-4 rounded-md">Cancel</button>
      <button type="submit" form="add-room-form" className="bg-accent hover:bg-accent-hover text-text-on-accent font-bold py-2 px-4 rounded-md">Add Room</button>
    </>
  );

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} className="max-w-lg" title="Add New Room" footer={footer}>
      <form onSubmit={handleSubmit} id="add-room-form" className="space-y-4">
          <div>
            <label htmlFor="add-room-name" className="block text-sm font-medium">Room Name</label>
            <input
              id="add-room-name"
              type="text"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              required
              className="w-full p-2 border rounded-md bg-input-bg mt-1"
            />
          </div>
          <div>
            <label htmlFor="add-room-type" className="block text-sm font-medium">Room Type</label>
            <select
              id="add-room-type"
              value={roomType}
              onChange={e => setRoomType(e.target.value)}
              className="w-full p-2 border rounded-md bg-input-bg mt-1"
            >
              {ROOM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Design Tier</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {DESIGN_TIER_OPTIONS.map(tier => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setDesignTier(tier)}
                  style={{ backgroundColor: designTier === tier ? 'var(--accent)' : undefined }}
                  className={`p-3 border rounded-md text-left transition-all duration-200 ${designTier === tier ? 'border-accent !bg-accent text-white shadow-md ring-1 ring-accent' : 'border-border-color hover:border-accent-border-subtle'}`}
                >
                  <div className="flex items-center gap-2">
                      <TierIcon tier={tier} className={`h-5 w-5 ${designTier === tier ? '!text-white' : ''}`} />
                      <span className="font-bold">{tier}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
      </form>
    </InfoModal>
  );
};

export default AddRoomModal;