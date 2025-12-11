import React from 'react';
import { RoomData } from '../../utils/types';
import TierIcon from '../TierIcon';

interface ConfiguredRoomCardProps {
  room: RoomData;
  onEdit: (room: RoomData) => void;
  onRemove: (roomId: string) => void;
}

const ConfiguredRoomCard: React.FC<ConfiguredRoomCardProps> = ({ room, onEdit, onRemove }) => {
  return (
    <div className="p-4 border border-border-color bg-background rounded-md flex justify-between items-center">
      <div className="flex items-center gap-3">
        <TierIcon tier={room.designTier} className="h-6 w-6" />
        <div>
          <h3 className="font-bold">{room.roomName}</h3>
          <p className="text-sm text-text-secondary">{room.roomType}</p>
        </div>
      </div>
      <div className="flex gap-4">
        <button type="button" onClick={() => onEdit(room)} className="text-sm font-medium text-accent hover:underline">Edit</button>
        <button type="button" onClick={() => onRemove(room.id)} className="text-sm text-destructive hover:underline">Remove</button>
      </div>
    </div>
  );
};

export default ConfiguredRoomCard;