// Relational row vocabulary for wingman_projects (ADR-0001 §1.2g).
//
// The wingman_projects TABLE row carries CHECK-constrained columns (migration
// 001):
//   stage  IN (Discovery, Design, Proposal, Deployment, Support)
//   status IN (Draft, In Progress, Commercial Ready, Archived)
// while the project DOCUMENT the client owns speaks the UI vocabulary
// (ProjectStage: Discovery | Competitor Compare | Proposal Builder |
// Recommendations | Templates | Support; StatusVariant: recommended | caution
// | alternative).
//
// The constrained columns never surface back into the document: the full
// client document travels inside the row's `payload` JSONB and every read
// rebuilds documents from that payload (wingman-app-store readDbFromSupabase-
// Tables). Canonicalising here is therefore a ONE-WAY enrichment of the
// relational columns - it exists so a real "Proposal Builder" project can be
// committed to real Postgres, not to relabel the document. Before this module
// landed, the sync handler copied the client's stage/status verbatim into the
// constrained columns and every supabase-tables commit of a real project
// failed with a Postgres 23514 CHECK violation (discovered by the first
// attributable supabase-tables load run, ADR-0001 §1.2c).
//
// The mapping must be TOTAL: an unrecognised value falls back to the column
// DEFAULT rather than risking a CHECK violation, because wingman_snapshot_commit
// reconciles the WHOLE workspace in one transaction - one bad row would fail
// every project sync in the workspace.

export const CANONICAL_PROJECT_STAGES = ["Discovery", "Design", "Proposal", "Deployment", "Support"];

export const CANONICAL_PROJECT_STATUSES = ["Draft", "In Progress", "Commercial Ready", "Archived"];

// Canonical stage each client ProjectStage maps to. The canonical list is a
// coarse account lifecycle (Discovery -> Design -> Proposal -> Deployment ->
// Support); the client stages are the workflow routes inside it:
//   - Competitor Compare and Recommendations are design-phase activities
//     (picking the solution), so both bucket under Design;
//   - Proposal Builder and Templates both produce the priced proposal, so both
//     bucket under Proposal;
//   - "Finder" is the pre-rebrand name for Recommendations (the client
//     normaliser maps it to Recommendations) - bucket it with Design too.
// Canonical values are included (lower-cased) so they pass through untouched,
// including values the server itself writes into documents ("Commercial
// Ready", and any canonical stage a future flow may set).
const STAGE_TO_CANONICAL = new Map([
  ["discovery", "Discovery"],
  ["design", "Design"],
  ["deployment", "Deployment"],
  ["proposal", "Proposal"],
  ["support", "Support"],
  ["competitor compare", "Design"],
  ["recommendations", "Design"],
  ["proposal builder", "Proposal"],
  ["templates", "Proposal"],
  ["finder", "Design"],
]);

// Canonical status each client StatusVariant maps to. The client status is a
// recommendation-quality axis (recommended | caution | alternative); the
// canonical status is a commercial lifecycle (Draft -> In Progress ->
// Commercial Ready -> Archived):
//   - recommended  -> Commercial Ready  (the recommendation is ready to ship)
//   - caution      -> In Progress       (flagged, still being worked)
//   - alternative  -> Draft             (not yet the recommended path)
// Canonical values pass through untouched (e.g. "Commercial Ready", which the
// server's own mark-ready gate writes into documents).
const STATUS_TO_CANONICAL = new Map([
  ["draft", "Draft"],
  ["in progress", "In Progress"],
  ["commercial ready", "Commercial Ready"],
  ["archived", "Archived"],
  ["recommended", "Commercial Ready"],
  ["caution", "In Progress"],
  ["alternative", "Draft"],
]);

/**
 * The CHECK-safe wingman_projects.stage value for a project document's stage
 * string. Never returns anything outside CANONICAL_PROJECT_STAGES.
 */
export function canonicalStageForRow(value) {
  return STAGE_TO_CANONICAL.get(String(value ?? "").trim().toLowerCase()) ?? "Discovery";
}

/**
 * The CHECK-safe wingman_projects.status value for a project document's status
 * string. Never returns anything outside CANONICAL_PROJECT_STATUSES.
 */
export function canonicalStatusForRow(value) {
  return STATUS_TO_CANONICAL.get(String(value ?? "").trim().toLowerCase()) ?? "Draft";
}
