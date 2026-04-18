export type WorkspaceTone =
  | "dashboard"
  | "reference"
  | "workflow"
  | "proposal"
  | "project"
  | "support";

export type WorkspaceMeta = {
  key: string;
  label: string;
  description: string;
  tone: WorkspaceTone;
};

const FALLBACK_META: WorkspaceMeta = {
  key: "reference",
  label: "Reference Workspace",
  description: "Fast answers, product context, and technical direction.",
  tone: "reference",
};

const ROUTE_META: Array<{
  match: (pathname: string) => boolean;
  meta: WorkspaceMeta;
}> = [
  {
    match: (pathname) => pathname.startsWith("/app/dashboard"),
    meta: {
      key: "dashboard",
      label: "Command Deck",
      description: "Start the job, guide the workflow, and keep momentum visible.",
      tone: "dashboard",
    },
  },
  {
    match: (pathname) => pathname === "/app/tools" || pathname.startsWith("/app/tools/templates"),
    meta: {
      key: "workflow",
      label: "Workflow Matrix",
      description: "Pick the right starting lane without losing the project thread.",
      tone: "workflow",
    },
  },
  {
    match: (pathname) =>
      pathname.startsWith("/app/tools/discovery") ||
      pathname.startsWith("/app/tools/import-intake") ||
      pathname.startsWith("/app/tools/room-wizard") ||
      pathname.startsWith("/app/tools/video-wall"),
    meta: {
      key: "workflow",
      label: "Design Workflow",
      description: "Capture the few decisions that actually change the system.",
      tone: "workflow",
    },
  },
  {
    match: (pathname) => pathname.startsWith("/app/tools/proposal"),
    meta: {
      key: "proposal",
      label: "Proposal Studio",
      description: "Turn the validated design into a tight commercial output pack.",
      tone: "proposal",
    },
  },
  {
    match: (pathname) =>
      pathname.startsWith("/app/projects") || pathname.startsWith("/app/settings/workspace"),
    meta: {
      key: "project",
      label: "Project Workspace",
      description: "Resume the right job quickly and keep handoffs attached to context.",
      tone: "project",
    },
  },
  {
    match: (pathname) =>
      pathname.startsWith("/app/tools/guru") ||
      pathname.startsWith("/app/tools/catalog") ||
      pathname.startsWith("/app/tools/compare") ||
      pathname.startsWith("/app/tools/navigator") ||
      pathname.startsWith("/app/tools/sales"),
    meta: {
      key: "reference",
      label: "Sales Assist",
      description: "Reference tools for live conversations, product fit, and positioning.",
      tone: "reference",
    },
  },
  {
    match: (pathname) =>
      pathname.startsWith("/app/tools/training") ||
      pathname.startsWith("/app/tools/product-intelligence") ||
      pathname.startsWith("/app/tools/competitor-lookup-diagnostics"),
    meta: {
      key: "support",
      label: "Support Console",
      description: "Knowledge, diagnostics, and internal enablement with a tighter operator view.",
      tone: "support",
    },
  },
];

export function getWorkspaceMeta(pathname: string): WorkspaceMeta {
  return ROUTE_META.find((entry) => entry.match(pathname))?.meta ?? FALLBACK_META;
}
