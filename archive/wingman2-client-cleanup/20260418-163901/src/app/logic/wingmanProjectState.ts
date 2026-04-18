import { buildDecision, type WingmanInputs } from "@/app/logic/wingmanDecisionEngine";
import { runWingmanPipeline } from "@/features/discovery/useWingmanPipeline";

export const ACTIVE_PROJECT_STORAGE_KEY = "wingman.activeProject.v1";

export type WingmanActiveProject = {
  name?: string;
  customer?: string;
  application?: string;
  roomType?: string;
  discovery: WingmanInputs;
  updatedAt: string;
};

export type WingmanActiveProjectSnapshot = {
  project: WingmanActiveProject;
  decision: ReturnType<typeof buildDecision>;
  pipeline: ReturnType<typeof runWingmanPipeline>;
};

export function saveActiveProject(input: WingmanActiveProject): WingmanActiveProjectSnapshot {
  const normalized: WingmanActiveProject = {
    ...input,
    discovery: {
      sources: Number(input.discovery.sources ?? 0),
      displays: Number(input.discovery.displays ?? 0),
      distanceM: Number(input.discovery.distanceM ?? 0),
      usbRequired: Boolean(input.discovery.usbRequired),
      wireless: Boolean(input.discovery.wireless),
      videoWall: Boolean(input.discovery.videoWall),
      advancedMultiview: Boolean(input.discovery.advancedMultiview),
      hybridMeeting: Boolean(input.discovery.hybridMeeting),
    },
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(normalized));

  const snapshot = buildActiveProjectSnapshot(normalized);
  if (!snapshot) {
    throw new Error("Failed to build active project snapshot.");
  }
  return snapshot;
}

export function loadActiveProject(): WingmanActiveProject | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WingmanActiveProject;
  } catch {
    return null;
  }
}

export function buildActiveProjectSnapshot(
  project: WingmanActiveProject | null
): WingmanActiveProjectSnapshot | null {
  if (!project) return null;

  const decision = buildDecision(project.discovery);
  const pipeline = runWingmanPipeline(project.discovery);

  return {
    project,
    decision,
    pipeline,
  };
}

export function loadActiveProjectSnapshot(): WingmanActiveProjectSnapshot | null {
  return buildActiveProjectSnapshot(loadActiveProject());
}