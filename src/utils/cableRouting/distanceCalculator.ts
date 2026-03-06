
import * as React from "react";
import { EquipmentPosition, CableRoute } from './types';

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



