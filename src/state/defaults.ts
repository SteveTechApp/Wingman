import type { WingmanState, StageDone, WingmanProjectSummary, LoadingContext } from "./types";
import type { UserProfile } from "@/utils/types/user";

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "",
  email: "",
  company: "",
  logoUrl: "",
  language: "en",
  unitSystem: "metric",
  showBackground: true,
  zoomLevel: 1,
  customProductDatabase: [],
};

const DEFAULT_STAGE_DONE: StageDone = {
  Discovery: false,
  Design: false,
  Specify: false,
  Quote: false,
};

export const DEFAULT_WINGMAN_STATE: WingmanState = {
  auth: {
    isAuthed: false,
    userId: null,
  },
  user: {
    profile: DEFAULT_USER_PROFILE,
  },
  projects: {
    list: [],
    activeId: null,
  },
  projectData: null,
  activeRoomId: null,
  ui: {
    loadingContext: null,
  },
  comparison: {
    comparisonList: [],
  },
};

export const LOADING_MESSAGES: Record<LoadingContext | "default", string> = {
  default: "Loadingâ€¦",
  projects: "Loading projectsâ€¦",
  discovery: "Preparing discoveryâ€¦",
  design: "Preparing design workspaceâ€¦",
  catalog: "Loading catalogâ€¦",
  proposal: "Preparing proposalâ€¦",
  export: "Preparing exportâ€¦",
};

// Re-export types people tried to import from defaults.ts
export type { LoadingContext, WingmanProjectSummary };
export { DEFAULT_STAGE_DONE };