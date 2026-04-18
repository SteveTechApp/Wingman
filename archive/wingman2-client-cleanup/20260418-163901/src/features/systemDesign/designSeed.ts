import type { DiscoverySeed, VideoWallSeed } from "@/features/systemDesign/designTypes";
import { readTemplateSeed } from "@/features/templates/templateCatalog";

export const DISCOVERY_STORAGE_KEY = "wm_discovery_seed";
export const VIDEO_WALL_STORAGE_KEY = "wm_video_wall_seed";

export function readDiscoverySeed(): DiscoverySeed {
  try {
    const raw = localStorage.getItem(DISCOVERY_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DiscoverySeed;
  } catch {
    return {};
  }
}

export function readVideoWallSeed(): VideoWallSeed | null {
  try {
    const raw = localStorage.getItem(VIDEO_WALL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as VideoWallSeed;
  } catch {
    return null;
  }
}

export function readDesignSeeds() {
  return {
    discovery: readDiscoverySeed(),
    template: readTemplateSeed(),
    videoWall: readVideoWallSeed(),
  };
}