import { ManuallyAddedEquipment } from './types';

export interface EquipmentPosition {
  equipment: ManuallyAddedEquipment;
  x: number;  // meters
  y: number;  // meters (height)
  z: number;  // meters
  mountType: 'floor' | 'wall' | 'ceiling' | 'rack' | 'table';
}

export interface CableRoute {
  from: EquipmentPosition;
  to: EquipmentPosition;
  distance: number;  // meters
  cableType: CableType;
  estimatedCost: number;  // USD
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
  maxDistance: number;  // meters
  recommendedCables: CableType[];
  notes: string;
}

// Cable specifications and costs per meter
const CABLE_SPECS: Record<CableType, {
  maxDistance: number;  // meters
  costPerMeter: number;  // USD
  bandwidth: string;
  notes: string;
}> = {
  'HDMI-2.0': {
    maxDistance: 15,
    costPerMeter: 2.5,
    bandwidth: '18 Gbps',
    notes: 'Supports 4K@60Hz 4:2:0 or 4K@30Hz 4:4:4'
  },
  'HDMI-2.1': {
    maxDistance: 10,
    costPerMeter: 8.5,
    bandwidth: '48 Gbps',
    notes: 'Supports 4K@120Hz, 8K@60Hz, 4:4:4'
  },
  'HDBaseT': {
    maxDistance: 100,
    costPerMeter: 1.2,
    bandwidth: '10.2 Gbps',
    notes: 'Extends HDMI over Cat6a, includes power and control'
  },
  'Cat6': {
    maxDistance: 100,
    costPerMeter: 0.5,
    bandwidth: '1 Gbps',
    notes: 'Standard network cable'
  },
  'Cat6a': {
    maxDistance: 100,
    costPerMeter: 0.8,
    bandwidth: '10 Gbps',
    notes: 'Required for HDBaseT'
  },
  'Fiber-OM3': {
    maxDistance: 300,
    costPerMeter: 3.0,
    bandwidth: '10 Gbps',
    notes: 'Multi-mode fiber, long distance'
  },
  'Fiber-OM4': {
    maxDistance: 550,
    costPerMeter: 4.5,
    bandwidth: '40 Gbps',
    notes: 'High-performance fiber'
  },
  'Speaker-16AWG': {
    maxDistance: 30,
    costPerMeter: 0.6,
    bandwidth: 'N/A',
    notes: 'Standard speaker wire'
  },
  'Speaker-14AWG': {
    maxDistance: 60,
    costPerMeter: 0.9,
    bandwidth: 'N/A',
    notes: 'Lower resistance for longer runs'
  },
  'XLR': {
    maxDistance: 100,
    costPerMeter: 1.8,
    bandwidth: 'Analog Audio',
    notes: 'Balanced audio, professional'
  },
  'USB-3.0': {
    maxDistance: 5,
    costPerMeter: 2.0,
    bandwidth: '5 Gbps',
    notes: 'Very short runs only'
  },
  'DisplayPort-1.4': {
    maxDistance: 15,
    costPerMeter: 3.5,
    bandwidth: '32.4 Gbps',
    notes: 'Supports 4K@120Hz, 8K@60Hz'
  }
};

/**
 * Calculate 3D Euclidean distance between two points
 */
function calculateDirectDistance(
  pos1: { x: number; y: number; z: number },
  pos2: { x: number; y: number; z: number }
): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate realistic cable routing distance with slack allowance
 * Takes into account wall/ceiling routing and industry-standard slack
 */
export function calculateCableDistance(
  from: EquipmentPosition,
  to: EquipmentPosition,
  routing: CableRoute['routing'] = 'wall'
): number {
  const directDistance = calculateDirectDistance(from, to);

  // Routing multipliers based on installation method
  const routingMultipliers = {
    direct: 1.15,      // 15% slack for direct runs
    wall: 1.25,        // 25% extra for wall routing
    ceiling: 1.30,     // 30% extra for ceiling routing with drops
    floor: 1.25,       // 25% extra for floor conduit
    conduit: 1.35      // 35% extra for conduit routing (corners, etc.)
  };

  // Add vertical routing consideration
  const heightDifference = Math.abs(to.y - from.y);
  const horizontalDistance = Math.sqrt(
    Math.pow(to.x - from.x, 2) + Math.pow(to.z - from.z, 2)
  );

  // If using wall/ceiling routing, cable typically goes up/down then across
  let routedDistance: number;
  if (routing === 'ceiling' || routing === 'wall') {
    // Manhattan-style routing: up, across, down
    routedDistance = horizontalDistance + heightDifference;
  } else {
    routedDistance = directDistance;
  }

  // Apply routing multiplier for slack and corners
  const finalDistance = routedDistance * routingMultipliers[routing];

  return Math.ceil(finalDistance * 10) / 10; // Round to 0.1m
}

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

/**
 * Analyze technology requirements based on use case and determine optimal specs
 */
export function analyzeTechnologyRequirements(
  roomType: string,
  displaySize: number,  // inches
  viewingDistance: number,  // meters
  contentType: 'presentation' | 'video-conference' | 'digital-signage' | 'broadcast' | 'training'
): TechnologyRequirement {
  // Start with baseline requirements
  let resolution: TechnologyRequirement['resolution'] = '4K';
  let refreshRate: TechnologyRequirement['refreshRate'] = 30;
  let colorSubsampling: TechnologyRequirement['colorSubsampling'] = '4:2:0';
  let hdr = false;

  // Adjust based on content type
  switch (contentType) {
    case 'presentation':
      // Presentations need good color accuracy for charts/graphs
      colorSubsampling = '4:4:4';  // Sharp text
      refreshRate = 30;  // No motion, save cost
      hdr = false;
      break;

    case 'video-conference':
      // Video conferencing is typically 1080p or 4K at 30fps
      resolution = displaySize > 65 ? '4K' : '1080p';
      colorSubsampling = '4:2:0';  // Motion video is fine with this
      refreshRate = 30;
      hdr = false;
      break;

    case 'digital-signage':
      // Signage needs vibrant colors but not high refresh
      resolution = '4K';
      colorSubsampling = '4:2:2';  // Good color
      refreshRate = 30;
      hdr = true;  // HDR makes signage pop
      break;

    case 'broadcast':
      // Broadcast quality needs everything
      resolution = '4K';
      colorSubsampling = '4:4:4';
      refreshRate = 60;
      hdr = true;
      break;

    case 'training':
      // Training rooms need clear text but can save on other specs
      resolution = '4K';
      colorSubsampling = '4:4:4';
      refreshRate = 30;
      hdr = false;
      break;
  }

  // Calculate recommended cables
  const recommendedCables: CableType[] = [];
  if (resolution === '8K') {
    recommendedCables.push('HDMI-2.1', 'Fiber-OM4');
  } else if (resolution === '4K' && refreshRate === 60 && colorSubsampling === '4:4:4') {
    recommendedCables.push('HDMI-2.1', 'HDBaseT', 'DisplayPort-1.4');
  } else if (resolution === '4K' && refreshRate === 30 && colorSubsampling === '4:4:4') {
    recommendedCables.push('HDMI-2.0', 'HDBaseT');
  } else {
    recommendedCables.push('HDMI-2.0', 'HDBaseT');
  }

  // Determine max distance based on cable type
  const maxDistance = Math.max(...recommendedCables.map(cable => CABLE_SPECS[cable].maxDistance));

  // Generate notes
  const notes = `For ${contentType} in a ${roomType}, ${resolution} at ${refreshRate}Hz with ${colorSubsampling} color provides optimal quality-to-cost ratio. ${
    colorSubsampling === '4:4:4' ? 'Full chroma sampling ensures sharp text and graphics.' :
    colorSubsampling === '4:2:2' ? 'Good color reproduction for video content.' :
    'Efficient compression suitable for motion video.'
  }`;

  return {
    resolution,
    refreshRate,
    colorSubsampling,
    hdr,
    maxDistance,
    recommendedCables,
    notes
  };
}

/**
 * Calculate complete cable routing for a room
 */
export function calculateRoomCableRoutes(
  equipmentPositions: EquipmentPosition[],
  roomType: string,
  contentType: TechnologyRequirement['notes'] extends string ? 'presentation' | 'video-conference' | 'digital-signage' | 'broadcast' | 'training' : string
): CableRoute[] {
  const routes: CableRoute[] = [];

  // Identify source devices, displays, and infrastructure
  const sources = equipmentPositions.filter(eq =>
    eq.equipment.category?.toLowerCase().includes('source') ||
    eq.equipment.category?.toLowerCase().includes('camera') ||
    eq.equipment.category?.toLowerCase().includes('player')
  );

  const displays = equipmentPositions.filter(eq =>
    eq.equipment.category?.toLowerCase().includes('display') ||
    eq.equipment.category?.toLowerCase().includes('monitor') ||
    eq.equipment.category?.toLowerCase().includes('projector')
  );

  const switchers = equipmentPositions.filter(eq =>
    eq.equipment.category?.toLowerCase().includes('matrix') ||
    eq.equipment.category?.toLowerCase().includes('switcher')
  );

  const speakers = equipmentPositions.filter(eq =>
    eq.equipment.category?.toLowerCase().includes('speaker') ||
    eq.equipment.category?.toLowerCase().includes('audio')
  );

  // Route sources to switchers (or directly to displays if no switcher)
  if (switchers.length > 0) {
    sources.forEach(source => {
      // Route to nearest switcher
      const nearestSwitcher = switchers[0];  // TODO: Find actual nearest
      const distance = calculateCableDistance(source, nearestSwitcher, 'wall');

      // Analyze requirements for this connection
      const requirement = analyzeTechnologyRequirements(
        roomType,
        75,  // average display size
        4,   // average viewing distance
        contentType as any
      );

      const cableType = determineCableType(source, nearestSwitcher, distance, requirement);
      const spec = CABLE_SPECS[cableType];

      routes.push({
        from: source,
        to: nearestSwitcher,
        distance,
        cableType,
        estimatedCost: distance * spec.costPerMeter + 25,  // +$25 for termination/connectors
        routing: 'wall'
      });
    });

    // Route switchers to displays
    switchers.forEach(switcher => {
      displays.forEach(display => {
        const distance = calculateCableDistance(switcher, display, 'ceiling');

        const requirement = analyzeTechnologyRequirements(
          roomType,
          75,
          4,
          contentType as any
        );

        const cableType = determineCableType(switcher, display, distance, requirement);
        const spec = CABLE_SPECS[cableType];

        routes.push({
          from: switcher,
          to: display,
          distance,
          cableType,
          estimatedCost: distance * spec.costPerMeter + 25,
          routing: 'ceiling'
        });
      });
    });
  } else {
    // Direct source to display routing
    sources.forEach(source => {
      displays.forEach(display => {
        const distance = calculateCableDistance(source, display, 'wall');

        const requirement = analyzeTechnologyRequirements(
          roomType,
          75,
          4,
          contentType as any
        );

        const cableType = determineCableType(source, display, distance, requirement);
        const spec = CABLE_SPECS[cableType];

        routes.push({
          from: source,
          to: display,
          distance,
          cableType,
          estimatedCost: distance * spec.costPerMeter + 25,
          routing: 'wall'
        });
      });
    });
  }

  // Route speakers (typically from amplifier/processor)
  if (speakers.length > 0 && (switchers.length > 0 || sources.length > 0)) {
    const audioSource = switchers[0] || sources[0];
    speakers.forEach(speaker => {
      const distance = calculateCableDistance(audioSource, speaker, 'ceiling');
      const cableType = determineCableType(audioSource, speaker, distance);
      const spec = CABLE_SPECS[cableType];

      routes.push({
        from: audioSource,
        to: speaker,
        distance,
        cableType,
        estimatedCost: distance * spec.costPerMeter + 15,  // Cheaper termination
        routing: 'ceiling'
      });
    });
  }

  return routes;
}

/**
 * Compare cost implications of different technology choices
 */
export function compareTechnologyCosts(
  distance: number,
  scenarios: Array<{
    name: string;
    requirement: TechnologyRequirement;
  }>
): Array<{
  name: string;
  cableType: CableType;
  cableCost: number;
  additionalHardwareCost: number;
  totalCost: number;
  notes: string;
}> {
  return scenarios.map(scenario => {
    const cableType = scenario.requirement.recommendedCables[0];
    const spec = CABLE_SPECS[cableType];

    // Check if distance exceeds cable capability
    let actualCableType = cableType;
    let additionalHardwareCost = 0;

    if (distance > spec.maxDistance) {
      // Need extender or different cable
      if (cableType.includes('HDMI')) {
        actualCableType = 'HDBaseT';
        additionalHardwareCost = 250;  // HDBaseT transmitter + receiver
      } else if (distance > 100) {
        actualCableType = 'Fiber-OM3';
        additionalHardwareCost = 600;  // Fiber extenders
      }
    }

    const actualSpec = CABLE_SPECS[actualCableType];
    const cableCost = distance * actualSpec.costPerMeter + 25;

    return {
      name: scenario.name,
      cableType: actualCableType,
      cableCost,
      additionalHardwareCost,
      totalCost: cableCost + additionalHardwareCost,
      notes: `${actualSpec.notes}${additionalHardwareCost > 0 ? ` | Requires extender ($${additionalHardwareCost})` : ''}`
    };
  });
}

/**
 * Get cable specification details
 */
export function getCableSpecs(cableType: CableType) {
  return CABLE_SPECS[cableType];
}

/**
 * Calculate total cable costs for entire room
 */
export function calculateTotalCableCosts(routes: CableRoute[]): {
  totalDistance: number;
  totalCost: number;
  breakdown: Record<CableType, { distance: number; cost: number; count: number }>;
} {
  const breakdown: Record<string, { distance: number; cost: number; count: number }> = {};
  let totalDistance = 0;
  let totalCost = 0;

  routes.forEach(route => {
    if (!breakdown[route.cableType]) {
      breakdown[route.cableType] = { distance: 0, cost: 0, count: 0 };
    }

    breakdown[route.cableType].distance += route.distance;
    breakdown[route.cableType].cost += route.estimatedCost;
    breakdown[route.cableType].count += 1;

    totalDistance += route.distance;
    totalCost += route.estimatedCost;
  });

  return {
    totalDistance: Math.ceil(totalDistance * 10) / 10,
    totalCost: Math.ceil(totalCost),
    breakdown: breakdown as Record<CableType, { distance: number; cost: number; count: number }>
  };
}
