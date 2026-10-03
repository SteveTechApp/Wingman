import type { StoredProject } from "../features/projects/model/projectTypes";

export type ProjectPushPlan =
  | { kind: "snapshot" }
  | { kind: "projects"; projects: Array<StoredProject & { baseRevision: number }> };

function comparableProject(project: StoredProject) {
  const copy = { ...project };
  delete copy.syncRevision;
  delete copy.syncConflict;
  return JSON.stringify(copy);
}

export function buildProjectPushPlan(previous: StoredProject[], next: StoredProject[]): ProjectPushPlan {
  const nextIds = new Set(next.map((project) => project.id));
  if (previous.some((project) => !nextIds.has(project.id))) return { kind: "snapshot" };
  const previousById = new Map(previous.map((project) => [project.id, project]));
  return {
    kind: "projects",
    projects: next
      .filter((project) => {
        const prior = previousById.get(project.id);
        return project.syncRevision === undefined || project.syncConflict !== undefined || !prior || comparableProject(prior) !== comparableProject(project);
      })
      .map((project) => ({ ...project, baseRevision: project.syncRevision ?? 0 })),
  };
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function backendProjectForSync(project: StoredProject) {
  const document = { ...project };
  delete document.syncConflict;
  return {
    ...document,
    customer: project.owner,
    site: "",
    roomName: project.name,
    notes: `Resume workflow: ${project.resumeTo}`,
    baseRevision: project.syncRevision ?? 0,
  };
}

/**
 * The project lanes the sync-response conflict check compares between the
 * document this browser SENT and the merged document the server RETURNED.
 * These are the units the server merge arbitrates (ADR-0001 §1.2b/§1.2i):
 * the project scalars, the six timestamped sub-documents, and the five
 * id-keyed work-product collections. Excluded so an untouched solo sync never
 * looks conflicted: `syncRevision`/`updatedAt`/`updated` (server-maintained),
 * `auditTrail` (the server appends its own rows per sync), and the
 * append-mostly by-id lanes (attachments/comments/shares) whose item shapes
 * the server sanitizer rebuilds - additions there are additive, not
 * conflicting, and surface in the detail views.
 */
export const PROJECT_SYNC_CONFLICT_LANES = [
  "name",
  "stage",
  "status",
  "discoveryBrief",
  "ingest",
  "recommendationEvidence",
  "proposal",
  "workflow",
  "videowall",
  "requirements",
  "compareRuns",
  "proposalVersions",
  "productSelections",
  "visualAssets",
] as const;

/** Human labels for the conflict lanes, shown where the UI reports what a
 *  team member changed. Fallback prettifies the lane key. */
export function projectLaneLabel(lane: string): string {
  const labels: Record<string, string> = {
    name: "Project name",
    stage: "Stage",
    status: "Status",
    discoveryBrief: "Discovery brief",
    ingest: "Uploaded site analysis",
    recommendationEvidence: "Recommendation evidence",
    proposal: "Proposal",
    workflow: "Workflow",
    videowall: "Videowall",
    requirements: "Requirements",
    compareRuns: "Compare runs",
    proposalVersions: "Proposal versions",
    productSelections: "Product selections",
    visualAssets: "Visual assets",
  };
  if (labels[lane]) return labels[lane];
  return lane.replace(/([A-Z])/g, " $1").replace(/^./, (initial) => initial.toUpperCase()).trim();
}

export function syncConflictStatusMessage(conflicts: Array<{ name: string; fields: string[] }>): string {
  if (conflicts.length === 1) {
    const conflict = conflicts[0];
    return `A team member changed ${conflict.fields.map(projectLaneLabel).join(", ")} in "${conflict.name}" since your last sync.`;
  }
  const names = conflicts.slice(0, 2).map(({ name }) => `"${name}"`).join(", ");
  const extra = conflicts.length > 2 ? ` and ${conflicts.length - 2} more` : "";
  return `A team member changed projects since your last sync: ${names}${extra}. See the Changed badges for details.`;
}

/** Total, key-order-independent serialization for lane comparison. Mirrors
 *  JSON.stringify semantics for in-memory docs: object keys whose value is
 *  `undefined` are dropped (they never survive a JSON round trip), and
 *  undefined array elements serialize as null - so an in-memory local doc and
 *  its server round trip compare equal even when normalizers left
 *  present-but-undefined keys behind. */
function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Pure: which of PROJECT_SYNC_CONFLICT_LANES differ between the document this
 * browser SENT and the merged document the server RETURNED. A difference on a
 * lane means the server-accepted content for that lane is not what this copy
 * holds - another team member's accepted changes (or our own edit losing a
 * same-item tie). Lane content is compared canonically (key order ignored) so
 * an unchanged lane round-trips silently.
 */
export function changedProjectLanes(sent: StoredProject | undefined, returned: unknown): string[] {
  if (!sent) return [];
  const returnedRecord = objectRecord(returned);
  if (!returnedRecord) return [];
  const sentRecord = sent as unknown as Record<string, unknown>;
  const changed: string[] = [];
  for (const lane of PROJECT_SYNC_CONFLICT_LANES) {
    if (canonicalJson(sentRecord[lane]) !== canonicalJson(returnedRecord[lane])) {
      changed.push(lane);
    }
  }
  return changed;
}

export function analyzeProjectSyncResponse(sentProjects: readonly StoredProject[], returned: unknown) {
  const revisionById = new Map<string, number>();
  const changedLanesByProjectId = new Map<string, string[]>();
  if (!Array.isArray(returned)) return { revisionById, changedLanesByProjectId };
  for (const project of returned) {
    if (!project || typeof project !== "object") continue;
    const id = (project as { id?: unknown }).id;
    if (typeof id !== "string") continue;
    const revision = Number((project as { syncRevision?: unknown }).syncRevision);
    if (Number.isFinite(revision)) revisionById.set(id, revision);
    changedLanesByProjectId.set(id, changedProjectLanes(sentProjects.find((candidate) => candidate.id === id), project));
  }
  return { revisionById, changedLanesByProjectId };
}
