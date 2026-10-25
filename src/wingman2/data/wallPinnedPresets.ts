import { useSyncExternalStore } from "react";
import {
  pinnedWallPresetsSnapshot,
  subscribePinnedWallPresets,
} from "../lib/wallPinnedPresets";

const NO_PINNED_WALLS: string[] = [];

/**
 * The walls this browser pinned to the rep's shortlist, shared by the picker
 * and its pin control, so a pin reorders the bands without a reload.
 */
export function usePinnedWallPresets() {
  return useSyncExternalStore(
    subscribePinnedWallPresets,
    pinnedWallPresetsSnapshot,
    () => NO_PINNED_WALLS,
  );
}
