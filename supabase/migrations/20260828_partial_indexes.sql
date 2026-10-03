-- ============================================================================
-- Partial indexes for hot-path queries
-- ============================================================================
-- Mirror of server/migrations/005_partial_indexes.sql
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
-- NOTE: Deployed indexes use static date boundaries (below) because Supabase
-- SQL Editor had a session-caching bug that refused IMMUTABLE function lookups.

-- 1. Active sessions by workspace (auth context)
DROP INDEX IF EXISTS idx_wingman_sessions_workspace_active;
CREATE INDEX idx_wingman_sessions_workspace_active
    ON wingman_sessions (workspace_id, user_id)
    WHERE expires_at > wingman_now_immutable();

-- 2. Non-archived projects by workspace (project listing)
DROP INDEX IF EXISTS idx_wingman_projects_workspace_active;
CREATE INDEX idx_wingman_projects_workspace_active
    ON wingman_projects (workspace_id, updated_at DESC)
    WHERE status != 'Archived';

-- 3. Active users (user lookup during auth)
DROP INDEX IF EXISTS idx_wingman_users_active;
CREATE INDEX idx_wingman_users_active
    ON wingman_users (id)
    WHERE status = 'active';

-- 4. Pending invitations by workspace (invitation checks)
DROP INDEX IF EXISTS idx_wingman_invitations_workspace_pending;
CREATE INDEX idx_wingman_invitations_workspace_pending
    ON wingman_workspace_invitations (workspace_id, email)
    WHERE status = 'pending';

-- 5. Active audit events by workspace (activity feed)
DROP INDEX IF EXISTS idx_wingman_audit_workspace_recent;
CREATE INDEX idx_wingman_audit_workspace_recent
    ON wingman_audit_events (workspace_id, created_at DESC)
    WHERE created_at > '2026-05-28T00:00:00Z'::timestamptz;

-- 6. Active telemetry events by workspace (error history)
DROP INDEX IF EXISTS idx_wingman_telemetry_workspace_recent;
CREATE INDEX idx_wingman_telemetry_workspace_recent
    ON wingman_telemetry_events (workspace_id, timestamp DESC)
    WHERE timestamp > '2026-07-29T00:00:00Z'::timestamptz;

-- ANALYZE
ANALYZE wingman_sessions;
ANALYZE wingman_projects;
ANALYZE wingman_users;
ANALYZE wingman_workspace_invitations;
ANALYZE wingman_audit_events;
ANALYZE wingman_telemetry_events;
