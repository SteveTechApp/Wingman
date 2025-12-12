import React, { useState } from 'react';
import InfoModal from './InfoModal';
import { RoomData, DesignTier, Product } from '../utils/types';
import toast from 'react-hot-toast';

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: RoomData[];
  onApplyChanges: (roomIds: string[], changes: Partial<RoomData>) => void;
}

const BulkOperationsModal: React.FC<BulkOperationsModalProps> = ({
  isOpen,
  onClose,
  rooms,
  onApplyChanges,
}) => {
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [operation, setOperation] = useState<'tier' | 'equipment' | 'feature'>('tier');
  const [newTier, setNewTier] = useState<DesignTier>('Silver');

  const toggleRoom = (roomId: string) => {
    setSelectedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedRooms(new Set(rooms.map(r => r.id)));
  };

  const deselectAll = () => {
    setSelectedRooms(new Set());
  };

  const handleApply = () => {
    if (selectedRooms.size === 0) {
      toast.error('Please select at least one room');
      return;
    }

    const changes: Partial<RoomData> = {};

    switch (operation) {
      case 'tier':
        changes.designTier = newTier;
        break;
      // Add more operations here
    }

    onApplyChanges(Array.from(selectedRooms), changes);
    toast.success(`Applied changes to ${selectedRooms.size} room(s)`);
    onClose();
  };

  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Room Operations"
      className="max-w-4xl"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="btn btn-primary"
            disabled={selectedRooms.size === 0}
          >
            Apply to {selectedRooms.size} Room(s)
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Room Selection */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold">Select Rooms</h3>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-sm text-accent hover:underline">
                Select All
              </button>
              <button onClick={deselectAll} className="text-sm text-accent hover:underline">
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-2 border border-border-color rounded-lg">
            {rooms.map(room => (
              <label
                key={room.id}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-background-secondary cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedRooms.has(room.id)}
                  onChange={() => toggleRoom(room.id)}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <p className="font-semibold text-text-primary">{room.roomName}</p>
                  <p className="text-sm text-text-secondary">
                    {room.roomType} • {room.designTier}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Operation Selection */}
        <div>
          <h3 className="text-lg font-bold mb-3">Select Operation</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-md border border-border-color hover:bg-background-secondary cursor-pointer">
              <input
                type="radio"
                name="operation"
                value="tier"
                checked={operation === 'tier'}
                onChange={(e) => setOperation(e.target.value as any)}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <p className="font-semibold">Change Design Tier</p>
                <p className="text-sm text-text-secondary">
                  Update the quality/budget tier for selected rooms
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-md border border-border-color hover:bg-background-secondary cursor-pointer opacity-50">
              <input
                type="radio"
                name="operation"
                value="equipment"
                disabled
                className="h-4 w-4"
              />
              <div className="flex-1">
                <p className="font-semibold">Add Equipment</p>
                <p className="text-sm text-text-secondary">
                  Add the same equipment to multiple rooms (Coming soon)
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-md border border-border-color hover:bg-background-secondary cursor-pointer opacity-50">
              <input
                type="radio"
                name="operation"
                value="feature"
                disabled
                className="h-4 w-4"
              />
              <div className="flex-1">
                <p className="font-semibold">Toggle Features</p>
                <p className="text-sm text-text-secondary">
                  Enable/disable features across rooms (Coming soon)
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Operation Parameters */}
        {operation === 'tier' && (
          <div>
            <h3 className="text-lg font-bold mb-3">New Design Tier</h3>
            <select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value as DesignTier)}
              className="w-full p-3 border border-border-color rounded-lg bg-input-bg"
            >
              <option value="Bronze">Bronze - Budget-friendly</option>
              <option value="Silver">Silver - Mid-range quality</option>
              <option value="Gold">Gold - Premium solution</option>
            </select>
          </div>
        )}

        {/* Preview */}
        {selectedRooms.size > 0 && (
          <div className="p-4 bg-accent-bg-subtle border border-accent rounded-lg">
            <p className="font-semibold text-accent">Preview Changes</p>
            <p className="text-sm text-text-secondary mt-1">
              {selectedRooms.size} room(s) will be updated to{' '}
              <span className="font-semibold">{newTier}</span> tier
            </p>
          </div>
        )}
      </div>
    </InfoModal>
  );
};

export default BulkOperationsModal;
