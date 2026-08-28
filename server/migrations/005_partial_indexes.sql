-- ============================================================================
-- Migration 005: Partial indexes for hot-path queries
-- ============================================================================
-- Partial indexes include only rows matching a WHERE clause, making them
-- smaller and faster than full-table indexes. They're ideal for queries that
-- consistently filter for a subset of rows (e.g. "only active sessions",
-- "only non-archived projects"). Postgres uses them automatically when the
-- query's WHERE clause matches the index's predicate.
--
-- NOTE: Index predicates require IMMUTABLE functions. NOW() is STABLE,
-- so we create a wrapper function wingman_now_immutable() first.

-- 0. Immutable NOW() wrapper for index predicates
CREATE OR REPLACE FUNCTION wingman_now_immutable()
RETURNS timestamptz
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT NOW()
$$;

-- 1. Active sessions by workspace (auth context)
--    The auth context loads sessions for a workspace and user. Most sessions
--    are active (not expired); the pg_cron job deletes expired ones hourly.
--    This index covers: getAuthContext → sessions WHERE workspace_id = X
--    The expires_at filter lets Postgres skip expired rows entirely.
DROP INDEX IF EXISTS idx_wingman_sessions_workspace_active;
CREATE INDEX idx_wingman_sessions_workspace_active
    ON wingman_sessions (workspace_id, user_id)
    WHERE expires_at > wingman_now_immutable();

-- 2. Active sessions for cleanup (pg_cron)
--    The hourly cleanup: DELETE FROM wingman_sessions WHERE expires_at < NOW()
--    This index is the INVERSE — it helps the cleanup find expired rows fast.
--    Postgres can use a backward index scan on expires_at for the DELETE.
--    Note: idx_wingman_sessions_expires (from 004) already covers this;
--    this partial index is a smaller, faster alternative for the hot path.
--    Kept as documentation; the full expires_at index is sufficient.

-- 3. Non-archived projects by workspace (project listing)
--    The primary project listing shows all projects except Archived ones.
--    Archived projects are rarely queried but accumulate over time.
--    Covers: readDbFromSupabaseTables → projectsByWorkspace (workspace filter)
--    Covers: future "list active projects in workspace" queries
DROP INDEX IF EXISTS idx_wingman_projects_workspace_active;
CREATE INDEX idx_wingman_projects_workspace_active
    ON wingman_projects (workspace_id, updated_at DESC)
    WHERE status != 'Archived';

-- 4. Active users (user lookup during auth)
--    User lookups during authentication and workspace member resolution
--    only care about active users. Inactive/suspended users are excluded.
--    Covers: readDbFromSupabaseTables → users (status filter)
--    Covers: getAuthContext → user lookup
DROP INDEX IF EXISTS idx_wingman_users_active;
CREATE INDEX idx_wingman_users_active
    ON wingman_users (id)
    WHERE status = 'active';

-- 5. Pending invitations by workspace (invitation checks)
--    When a user logs in, the system checks for pending invitations.
--    Accepted/expired invitations are rarely queried after resolution.
--    Covers: invitation status checks during auth and workspace setup
DROP INDEX IF EXISTS idx_wingman_invitations_workspace_pending;
CREATE INDEX idx_wingman_invitations_workspace_pending
    ON wingman_workspace_invitations (workspace_id, email)
    WHERE status = 'pending';

-- 6. Active audit events by workspace (activity feed)
--    The activity feed shows recent audit events. The pg_cron job keeps
--    only the last 800 events, so "recent" events are the hot path.
--    Covers: readDbFromSupabaseTables → auditEvents sorted by created_at DESC
DROP INDEX IF EXISTS idx_wingman_audit_workspace_recent;
CREATE INDEX idx_wingman_audit_workspace_recent
    ON wingman_audit_events (workspace_id, created_at DESC)
    WHERE created_at > wingman_now_immutable() - INTERVAL '90 days';

-- 7. Active telemetry events by workspace (error history)
--    Error dashboards show recent telemetry. Old events are cleaned up
--    by pg_cron. Recent events (< 30 days) are the hot path.
--    Covers: readDbFromSupabaseTables → telemetryEvents sorted by timestamp DESC
DROP INDEX IF EXISTS idx_wingman_telemetry_workspace_recent;
CREATE INDEX idx_wingman_telemetry_workspace_recent
    ON wingman_telemetry_events (workspace_id, timestamp DESC)
    WHERE timestamp > wingman_now_immutable() - INTERVAL '30 days';

-- ============================================================================
-- ANALYZE to update planner statistics
-- ============================================================================
ANALYZE wingman_sessions;
ANALYZE wingman_projects;
ANALYZE wingman_users;
ANALYZE wingman_workspace_invitations;
ANALYZE wingman_audit_events;
ANALYZE wingman_telemetry_events;
