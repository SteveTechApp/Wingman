/**
 * Cable Routing Module
 * Handles cable distance calculations, type selection, and cost estimation
 */

// Types
export type {
  EquipmentPosition,
  CableRoute,
  CableType,
  TechnologyRequirement,
  CableSpec
} from './types';

// Cable Specifications
export { CABLE_SPECS, getCableSpecs } from './cableSpecs';

// Distance Calculations
export { calculateCableDistance } from './distanceCalculator';

// Cable Type Selection
export { determineCableType } from './cableTypeSelector';

// Technology Analysis
export { analyzeTechnologyRequirements } from './technologyAnalyzer';

// Room Cable Routing
export { calculateRoomCableRoutes } from './roomCableRouter';

// Cost Calculations
export { compareTechnologyCosts, calculateTotalCableCosts } from './costCalculator';
