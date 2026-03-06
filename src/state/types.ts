import type { UserProfile } from "@/utils/types/user";

/** Loading-context keys used by the UI */
export type LoadingContext =
  | "default"
  | "projects"
  | "discovery"
  | "design"
  | "catalog"
  | "proposal"
  | "export";

/** Mission Control pipeline stage */
export type Stage = "Discovery" | "Design" | "Specify" | "Quote";

export type StageDone = {
  Discovery: boolean;
  Design: boolean;
  Specify: boolean;
  Quote: boolean;
};

export type WingmanProjectSummary = {
  id: string;
  name: string;
  client?: string;
  site?: string;
  lastSaved: string; // ISO
};

export type ProjectData = {
  projectId: string;
  projectName: string;
  clientName?: string;
  siteName?: string;

  status?: "Draft" | "In progress" | "Quoted" | "Won" | "Lost";
  lastSaved?: string; // ISO

  // Minimal “dashboard numbers” (extend later)
  displays?: number;
  sources?: number;
  rooms?: number;
  longestRunM?: number;

  stage?: Stage;
  stageDone?: StageDone;
};

export type Product = {
  sku: string;
  name?: string;
  brand?: string;
};

export type WingmanState = {
  auth: {
    isAuthed: boolean;
    userId: string | null;
  };

  user: {
    profile: UserProfile;
  };

  projects: {
    list: WingmanProjectSummary[];
    activeId: string | null;
  };

  /** The active project “working set” (what the dashboard reads) */
  projectData: ProjectData | null;

  /** Room selection (optional now, but components expect it exists) */
  activeRoomId: string | null;

  /** UI-only state */
  ui: {
    loadingContext: LoadingContext | null;
  };

  /** Product comparison tray */
  comparison: {
    comparisonList: Product[];
  };
};