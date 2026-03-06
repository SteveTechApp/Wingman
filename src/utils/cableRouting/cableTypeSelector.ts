
import * as React from "react";
import { EquipmentPosition, CableType, TechnologyRequirement } from './types';

/**
 * Determine optimal cable type based on equipment categories and distance
 */
export function determineCableType(
  from: EquipmentPosition,
  to: EquipmentPosition,
  distance: number,
  requirement?: TechnologyRequirement
): CableType {
  const fromCategory = from.equipment.category?.toLowerCase() || '';
  const toCategory = to.equipment.category?.toLowerCase() || '';

  // Audio connections
  if (fromCategory.includes('speaker') || toCategory.includes('speaker')) {
    return distance > 30 ? 'Speaker-14AWG' : 'Speaker-16AWG';
  }

  if (fromCategory.includes('audio') || toCategory.includes('audio')) {
    return 'XLR';
  }

  // Video/Display connections
  if (fromCategory.includes('display') || fromCategory.includes('monitor') ||
      toCategory.includes('display') || toCategory.includes('monitor')) {

    // Long distance requires HDBaseT or Fiber
    if (distance > 15) {
      if (distance > 100) {
        return requirement?.resolution === '8K' ? 'Fiber-OM4' : 'Fiber-OM3';
      }
      return 'HDBaseT';
    }

    // Short distance: choose based on requirements
    if (requirement) {
      if (requirement.resolution === '8K' ||
          (requirement.resolution === '4K' && requirement.refreshRate >= 120) ||
          (requirement.resolution === '4K' && requirement.colorSubsampling === '4:4:4' && requirement.refreshRate === 60)) {
        return 'HDMI-2.1';
      }
    }

    return 'HDMI-2.0';
  }

  // Control/Network connections
  if (fromCategory.includes('matrix') || fromCategory.includes('switcher') ||
      fromCategory.includes('encoder') || fromCategory.includes('decoder')) {
    return distance > 100 ? 'Fiber-OM3' : 'Cat6a';
  }

  // USB connections
  if (fromCategory.includes('camera') && toCategory.includes('codec')) {
    return distance > 5 ? 'Cat6a' : 'USB-3.0';
  }

  // Default to Cat6 for control/network
  return 'Cat6';
}



