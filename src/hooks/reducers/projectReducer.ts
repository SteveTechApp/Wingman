import { ProjectData, RoomData, Proposal, ProjectInfrastructure, ManuallyAddedEquipment, DesignProposal } from '../../utils/types';

export type ProjectAction =
  | { type: 'SET_PROJECT'; payload: ProjectData }
  | { type: 'UPDATE_PROJECT_DETAILS'; payload: { projectName: string; clientName: string } }
  | { type: 'ADD_ROOM'; payload: RoomData }
  | { type: 'UPDATE_ROOM'; payload: RoomData }
  | { type: 'REMOVE_ROOM'; payload: string } // by roomId
  | { type: 'ADD_PROPOSAL'; payload: Proposal }
  | { type: 'UPDATE_PROPOSAL'; payload: Proposal }
  | { type: 'UPDATE_NOTES'; payload: string }
  | { type: 'UPDATE_INFRASTRUCTURE', payload: ProjectInfrastructure }
  | { type: 'ADD_EQUIPMENT_TO_ROOM', payload: { roomId: string; equipment: ManuallyAddedEquipment } }
  | { type: 'REMOVE_EQUIPMENT_FROM_ROOM', payload: { roomId: string; sku: string } }
  | { type: 'UPDATE_EQUIPMENT_QUANTITY', payload: { roomId: string; sku: string; quantity: number } }
  | { type: 'SET_AI_DESIGN_PROPOSALS', payload: { roomId: string; proposals: DesignProposal[] } };

export const projectReducer = (state: ProjectData | null, action: ProjectAction): ProjectData | null => {
  if (action.type === 'SET_PROJECT') {
    return action.payload;
  }
  
  if (!state) return null;

  switch (action.type) {
    case 'UPDATE_PROJECT_DETAILS':
      return { ...state, ...action.payload, lastSaved: new Date().toISOString() };

    case 'ADD_ROOM':
      return { ...state, rooms: [...state.rooms, action.payload], lastSaved: new Date().toISOString() };

    case 'UPDATE_ROOM':
      return {
        ...state,
        rooms: state.rooms.map(room => (room.id === action.payload.id ? { ...action.payload, aiDesignProposals: undefined } : room)),
        lastSaved: new Date().toISOString(),
      };

    case 'REMOVE_ROOM':
        return { ...state, rooms: state.rooms.filter(room => room.id !== action.payload), lastSaved: new Date().toISOString() };

    case 'ADD_PROPOSAL':
      return { ...state, proposals: [...state.proposals, action.payload], lastSaved: new Date().toISOString() };
    
    case 'UPDATE_PROPOSAL':
        return {
            ...state,
            proposals: state.proposals.map(p => p.proposalId === action.payload.proposalId ? action.payload : p),
            lastSaved: new Date().toISOString(),
        };

    case 'UPDATE_NOTES':
        return { ...state, notes: action.payload, lastSaved: new Date().toISOString() };
    
    case 'UPDATE_INFRASTRUCTURE':
        return { ...state, infrastructure: action.payload, lastSaved: new Date().toISOString() };
    
    case 'ADD_EQUIPMENT_TO_ROOM': {
        const { roomId, equipment } = action.payload;
        return {
            ...state,
            rooms: state.rooms.map(room => {
                if (room.id === roomId) {
                    const existing = room.manuallyAddedEquipment.find(e => e.sku === equipment.sku);
                    if (existing) {
                        return {...room, manuallyAddedEquipment: room.manuallyAddedEquipment.map(e => e.sku === equipment.sku ? {...e, quantity: e.quantity + equipment.quantity} : e)}
                    }
                    return {...room, manuallyAddedEquipment: [...room.manuallyAddedEquipment, equipment]};
                }
                return room;
            }),
            lastSaved: new Date().toISOString(),
        };
    }

    case 'REMOVE_EQUIPMENT_FROM_ROOM': {
        const { roomId, sku } = action.payload;
        return {
            ...state,
            rooms: state.rooms.map(room => {
                if (room.id === roomId) {
                    return {...room, manuallyAddedEquipment: room.manuallyAddedEquipment.filter(e => e.sku !== sku)};
                }
                return room;
            }),
            lastSaved: new Date().toISOString(),
        };
    }

    case 'UPDATE_EQUIPMENT_QUANTITY': {
        const { roomId, sku, quantity } = action.payload;
        return {
            ...state,
            rooms: state.rooms.map(room => {
                if (room.id === roomId) {
                    return {...room, manuallyAddedEquipment: room.manuallyAddedEquipment.map(e => e.sku === sku ? {...e, quantity} : e)};
                }
                return room;
            }),
            lastSaved: new Date().toISOString(),
        };
    }

    case 'SET_AI_DESIGN_PROPOSALS': {
        const { roomId, proposals } = action.payload;
        return {
            ...state,
            rooms: state.rooms.map(room => {
                if (room.id === roomId) {
                    return {...room, aiDesignProposals: proposals};
                }
                return room;
            }),
            lastSaved: new Date().toISOString(),
        };
    }

    default:
      console.warn('Unknown project reducer action type:', (action as any).type);
      return state;
  }
};