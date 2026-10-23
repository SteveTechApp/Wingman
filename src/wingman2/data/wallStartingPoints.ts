import { useSyncExternalStore } from "react";
import type { WallStartPreset } from "../lib/videowallDecision";
import {
  subscribeWallStartingPoints,
  wallStartingPointsSnapshot,
} from "../lib/wallStartingPoints";

const NO_STARTING_POINTS: WallStartPreset[] = [];

/**
 * The rep's saved walls, shared by the picker and the save action, so a wall
 * saved on the result appears beside the shipped presets without a reload.
 */
export function useWallStartingPoints() {
  return useSyncExternalStore(
    subscribeWallStartingPoints,
    wallStartingPointsSnapshot,
    () => NO_STARTING_POINTS,
  );
}
