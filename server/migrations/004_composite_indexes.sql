-- ============================================================================
-- Migration 004: Composite indexes for common query patterns
-- ============================================================================
-- The existing single-column indexes from 001 cover individual lookups but
-- miss the primary access patterns: "all rows for a workspace, sorted by time"
-- and "all sessions for a user in a workspace". These covering indexes let
-- Postgres satisfy those queries entirely from the index without touching the
-- heap (Index-Only Scan).

-- 1. Projects: workspace listing sorted by most recently updated
--    Covers: readDbFromSupabaseTables → projectsByWorkspace (workspace_id filter)
--    Covers: future "list projects in workspace, newest first" queries
DROP INDEX IF EXISTS idx_wingman_projects_workspace_updated;
CREATE INDEX idx_wingman_projects_workspace_updated
    ON wingman_projects (workspace_id, updated_at DESC);

-- 2. Projects: workspace listing filtered by stage
--    Covers: "show only Discovery projects" or "show only Proposal projects"
DROP INDEX IF EXISTS idx_wingman_projects_workspace_stage;
CREATE INDEX idx_wingman_projects_workspace_stage
    ON wingman_projects (workspace_id, stage);

-- 3. Projects: workspace listing filtered by status
--    Covers: "show only Draft projects" or "show only In Progress projects"
DROP INDEX IF EXISTS idx_wingman_projects_workspace_status;
CREATE INDEX idx_wingman_projects_workspace_status
    ON wingman_projects (workspace_id, status);

-- 4. Projects: workspace listing filtered by owner
--    Covers: "show only my projects" within a workspace
DROP INDEX IF EXISTS idx_wingman_projects_workspace_owner;
CREATE INDEX idx_wingman_projects_workspace_owner
    ON wingman_projects (workspace_id, owner_id);

-- 5. Sessions: user lookup within a workspace (auth context)
--    Covers: getAuthContext → sessions filtered by (workspace_id, user_id)
--    Also covers: session cleanup queries filtering by workspace + expires_at
DROP INDEX IF EXISTS idx_wingman_sessions_workspace_user;
CREATE INDEX idx_wingman_sessions_workspace_user
    ON wingman_sessions (workspace_id, user_id);

-- 6. Sessions: cleanup by expiry (used by pg_cron job)
--    Covers: "DELETE FROM wingman_sessions WHERE expires_at < NOW()"
--    The single-column created_at index doesn't help here; this is the
--    dedicated index for the scheduled cleanup query.
DROP INDEX IF EXISTS idx_wingman_sessions_expires;
CREATE INDEX idx_wingman_sessions_expires
    ON wingman_sessions (expires_at);

-- 7. Audit events: workspace history sorted by recency
--    Covers: readDbFromSupabaseTables → auditEvents (workspace_id filter + created_at sort)
--    The current code sorts in JS, but the DB can do Index-Only Scan with this index.
DROP INDEX IF EXISTS idx_wingman_audit_workspace_created;
CREATE INDEX idx_wingman_audit_workspace_created
    ON wingman_audit_events (workspace_id, created_at DESC);

-- 8. Audit events: project-specific audit trail
--    Covers: "show audit trail for project X"
DROP INDEX IF EXISTS idx_wingman_audit_project_created;
CREATE INDEX idx_wingman_audit_project_created
    ON wingman_audit_events (project_id, created_at DESC);

-- 9. Telemetry events: workspace error history
--    Covers: readDbFromSupabaseTables → telemetryEvents (workspace_id filter + timestamp sort)
DROP INDEX IF EXISTS idx_wingman_telemetry_workspace_timestamp;
CREATE INDEX idx_wingman_telemetry_workspace_timestamp
    ON wingman_telemetry_events (workspace_id, timestamp DESC);

-- 10. Telemetry events: user-specific error history
--     Covers: "show only my runtime errors"
DROP INDEX IF EXISTS idx_wingman_telemetry_user_timestamp;
CREATE INDEX idx_wingman_telemetry_user_timestamp
    ON wingman_telemetry_events (user_id, timestamp DESC);

-- 11. Workspace members: user → workspaces lookup (used in auth context)
--     Covers: getAuthContext → membershipByUser lookup
DROP INDEX IF EXISTS idx_wingman_members_user_workspace;
CREATE INDEX idx_wingman_members_user_workspace
    ON wingman_workspace_members (user_id, workspace_id);

-- ============================================================================
-- ANALYZE to update planner statistics after bulk index creation
-- ============================================================================
ANALYZE wingman_projects;
ANALYZE wingman_sessions;
ANALYZE wingman_audit_events;
ANALYZE wingman_telemetry_events;
ANALYZE wingman_workspace_members;
