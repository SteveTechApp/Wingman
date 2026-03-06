
import * as React from "react";
import { CableRoute, CableType, TechnologyRequirement } from './types';
import { CABLE_SPECS } from './cableSpecs';

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



