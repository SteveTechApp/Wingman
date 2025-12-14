import { EquipmentPosition, CableRoute, TechnologyRequirement } from './types';
import { calculateCableDistance } from './distanceCalculator';
import { determineCableType } from './cableTypeSelector';
import { analyzeTechnologyRequirements } from './technologyAnalyzer';
import { CABLE_SPECS } from './cableSpecs';

/**
 * Calculate complete cable routing for a room
 */
export function calculateRoomCableRoutes(
  equipmentPositions: EquipmentPosition[],
  roomType: string,
  contentType: 'presentation' | 'video-conference' | 'digital-signage' | 'broadcast' | 'training'
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
    routeSourcesToSwitchers(sources, switchers, roomType, contentType, routes);
    routeSwitchersToDisplays(switchers, displays, roomType, contentType, routes);
  } else {
    routeSourcesDirectlyToDisplays(sources, displays, roomType, contentType, routes);
  }

  // Route speakers
  routeSpeakers(speakers, switchers, sources, routes);

  return routes;
}

function routeSourcesToSwitchers(
  sources: EquipmentPosition[],
  switchers: EquipmentPosition[],
  roomType: string,
  contentType: TechnologyRequirement['notes'] extends string ? 'presentation' | 'video-conference' | 'digital-signage' | 'broadcast' | 'training' : string,
  routes: CableRoute[]
): void {
  sources.forEach(source => {
    const nearestSwitcher = switchers[0];
    const distance = calculateCableDistance(source, nearestSwitcher, 'wall');

    const requirement = analyzeTechnologyRequirements(roomType, 75, 4, contentType as any);
    const cableType = determineCableType(source, nearestSwitcher, distance, requirement);
    const spec = CABLE_SPECS[cableType];

    routes.push({
      from: source,
      to: nearestSwitcher,
      distance,
      cableType,
      estimatedCost: distance * spec.costPerMeter + 25,
      routing: 'wall'
    });
  });
}

function routeSwitchersToDisplays(
  switchers: EquipmentPosition[],
  displays: EquipmentPosition[],
  roomType: string,
  contentType: 'presentation' | 'video-conference' | 'digital-signage' | 'broadcast' | 'training',
  routes: CableRoute[]
): void {
  switchers.forEach(switcher => {
    displays.forEach(display => {
      const distance = calculateCableDistance(switcher, display, 'ceiling');
      const requirement = analyzeTechnologyRequirements(roomType, 75, 4, contentType);
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
}

function routeSourcesDirectlyToDisplays(
  sources: EquipmentPosition[],
  displays: EquipmentPosition[],
  roomType: string,
  contentType: 'presentation' | 'video-conference' | 'digital-signage' | 'broadcast' | 'training',
  routes: CableRoute[]
): void {
  sources.forEach(source => {
    displays.forEach(display => {
      const distance = calculateCableDistance(source, display, 'wall');
      const requirement = analyzeTechnologyRequirements(roomType, 75, 4, contentType);
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

function routeSpeakers(
  speakers: EquipmentPosition[],
  switchers: EquipmentPosition[],
  sources: EquipmentPosition[],
  routes: CableRoute[]
): void {
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
        estimatedCost: distance * spec.costPerMeter + 15,
        routing: 'ceiling'
      });
    });
  }
}
