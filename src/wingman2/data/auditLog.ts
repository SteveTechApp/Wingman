/**
 * auditLog — Lightweight audit log for tracking project changes.
 *
 * Records discovery edits, product selection changes, proposal modifications,
 * and other significant actions with who/what/when. Each entry is stored on
 * the project's auditTrail array and synced to the backend via the normal
 * project sync path.
 */

import { readProjectStore, writeProjectStore, type ProjectAuditEntry, type StoredProject } from "./projectStore";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ─── Record an audit event ──────────────────────────────────────────────────

/**
 * Record an audit event on a project. This appends to the project's
 * auditTrail array and triggers a store write + backend sync.
 */
export function recordAuditEvent(
  projectId: string,
  event: {
    action: string;
    detail: string;
    scope?: string;
    severity?: "info" | "warn" | "error";
    actorName?: string;
    actorEmail?: string;
  },
): void {
  const snapshot = readProjectStore();
  const project = snapshot.projects.find((p) => p.id === projectId);
  if (!project) return;

  const entry: ProjectAuditEntry = {
    id: createId("audit"),
    action: event.action,
    detail: event.detail,
    scope: event.scope || "project",
    severity: event.severity || "info",
    actorName: event.actorName || "Wingman user",
    actorEmail: event.actorEmail,
    createdAt: nowIso(),
  };

  const auditTrail = [entry, ...(project.auditTrail ?? [])].slice(0, 50);
  const updatedProject: StoredProject = { ...project, auditTrail };

  const projects = snapshot.projects.map((p) =>
    p.id === projectId ? updatedProject : p,
  );

  writeProjectStore({ ...snapshot, projects });
}

// ─── Scoped recorders ───────────────────────────────────────────────────────

/** Record a discovery edit (question answered, note changed, etc.) */
export function recordDiscoveryEdit(
  projectId: string,
  questionId: string,
  detail: string,
): void {
  recordAuditEvent(projectId, {
    action: "discovery-edit",
    detail: `Discovery question "${questionId}": ${detail}`,
    scope: "discovery",
  });
}

/** Record a product selection change (product added, removed, or quantity changed) */
export function recordProductSelectionChange(
  projectId: string,
  detail: string,
): void {
  recordAuditEvent(projectId, {
    action: "product-selection",
    detail,
    scope: "products",
  });
}

/** Record a proposal modification (section edited, export generated, etc.) */
export function recordProposalEdit(
  projectId: string,
  detail: string,
): void {
  recordAuditEvent(projectId, {
    action: "proposal-edit",
    detail,
    scope: "proposal",
  });
}

/** Record a comparison run */
export function recordComparisonRun(
  projectId: string,
  competitorSku: string,
  wyrestormSku: string,
): void {
  recordAuditEvent(projectId, {
    action: "comparison-run",
    detail: `Compared ${competitorSku} → ${wyrestormSku}`,
    scope: "compare",
  });
}

/** Record a stage transition */
export function recordStageTransition(
  projectId: string,
  fromStage: string,
  toStage: string,
): void {
  recordAuditEvent(projectId, {
    action: "stage-transition",
    detail: `Stage changed from "${fromStage}" to "${toStage}"`,
    scope: "project",
  });
}

/** Record an approval action */
export function recordApprovalAction(
  projectId: string,
  action: "submitted" | "approved" | "rejected" | "recalled",
  detail: string,
): void {
  recordAuditEvent(projectId, {
    action: `approval-${action}`,
    detail,
    scope: "approval",
    severity: action === "rejected" ? "warn" : "info",
  });
}

// ─── Read audit log ─────────────────────────────────────────────────────────

/**
 * Get the audit trail for a project, sorted newest-first.
 */
export function getProjectAuditTrail(projectId: string): ProjectAuditEntry[] {
  const snapshot = readProjectStore();
  const project = snapshot.projects.find((p) => p.id === projectId);
  return project?.auditTrail ?? [];
}
