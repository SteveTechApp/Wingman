// src/utils/cableRouting/types.ts
// Cable routing type definitions

import { ManuallyAddedEquipment } from '../../components/types';

export interface EquipmentPosition {
  equipment: ManuallyAddedEquipment;
  x: number;
  y: number;
  z: number;
  mountType: 'floor' | 'wall' | 'ceiling' | 'rack' | 'table';
}

export interface CableRoute {
  from: EquipmentPosition;
  to: EquipmentPosition;
  distance: number;
  cableType: CableType;
  estimatedCost: number;
  routing: 'direct' | 'wall' | 'ceiling' | 'floor' | 'conduit';
}

export type CableType =
  | 'HDMI-2.0'
  | 'HDMI-2.1'
  | 'HDBaseT'
  | 'Cat6'
  | 'Cat6a'
  | 'Fiber-OM3'
  | 'Fiber-OM4'
  | 'Speaker-16AWG'
  | 'Speaker-14AWG'
  | 'XLR'
  | 'USB-3.0'
  | 'DisplayPort-1.4';

export interface TechnologyRequirement {
  resolution: '1080p' | '4K' | '8K';
  refreshRate: 30 | 60 | 120;
  colorSubsampling: '4:2:0' | '4:2:2' | '4:4:4';
  hdr: boolean;
  maxDistance: number;
  recommendedCables: CableType[];
  notes: string;
}

export interface CableSpec {
  maxDistance: number;
  costPerMeter: number;
  bandwidth: string;
  notes: string;
}
