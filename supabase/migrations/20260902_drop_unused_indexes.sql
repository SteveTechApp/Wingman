-- ============================================================================
-- Migration 010: Drop dead / misleading indexes that no longer match runtime
-- ============================================================================
-- The normalized-tables storage mode reads every wingman table as a full,
-- id-ordered, range-paged scan (readAllSupabaseRows) and filters in JS; the
-- atomic snapshot commit (009) touches only primary/unique keys; and the only
-- server-side column filters in the entire codebase are the pg_cron cleanup
-- jobs (expires_at, created_at, timestamp) and the lookup-diagnostics reads
-- (event_ts). Against that query surface, 33 index definitions across
-- migrations 001/003/004/005 are either duplicates of constraint indexes or
-- on columns nothing ever filters server-side:
--
--   1. REDUNDANT with UNIQUE-constraint btrees (identical lookup power):
--        users(email), sessions(token_hash), invitations(token_hash),
--        members(workspace_id)  [unique(workspace_id, user_id) covers it]
--
--   2. 004's composite set claimed Index-Only Scan coverage for
--      readDbFromSupabaseTables "workspace listing / auth context" queries
--      that do not exist (reads are full scans ordered by id, filtering in
--      JS) - the composites are never matched by any SQL.
--
--   3. 005's remaining partials use predicates ('active', 'pending',
--      '!= Archived') that 007 already condemned for the batch it dropped:
--      no WHERE clause in the runtime carries those predicates, so the
--      partials silently grow toward full-table size as the rows always
--      match, exactly the failure 007 documented.
--
--   4. Non-FK single-column indexes on status/slug/kind/static columns -
--      invitation email/status and audit/telemetry project_id are plain
--      values (no REFERENCES on project_id), resolved entirely in JS.
--
--   5. Competitor tables: approvals brand/sku/cache_key and lookup-events
--      scope/severity are read via full scans (order id / order event_ts).
--
-- KEPT: PKs, UNIQUE constraints, the indexes the cron jobs and diagnostics
-- reads actually use (idx_wingman_sessions_expires, idx_wingman_audit_created,
-- idx_wingman_telemetry_timestamp, idx_lookup_runtime_events_ts), and the
-- FK-referencing single-column indexes that back the transactional DML in
-- wingman_snapshot_commit (009).
--
-- Idempotent and safe to re-run.

-- Redundant with UNIQUE constraints (001)
DROP INDEX IF EXISTS idx_wingman_users_email;
DROP INDEX IF EXISTS idx_wingman_sessions_token;
DROP INDEX IF EXISTS idx_wingman_invitations_token;
DROP INDEX IF EXISTS idx_wingman_members_workspace;

-- Non-FK, never-filtered columns (001)
DROP INDEX IF EXISTS idx_wingman_users_status;
DROP INDEX IF EXISTS idx_wingman_workspaces_slug;
DROP INDEX IF EXISTS idx_wingman_invitations_email;
DROP INDEX IF EXISTS idx_wingman_invitations_status;
DROP INDEX IF EXISTS idx_wingman_projects_stage;
DROP INDEX IF EXISTS idx_wingman_projects_status;
DROP INDEX IF EXISTS idx_wingman_projects_updated;
DROP INDEX IF EXISTS idx_wingman_audit_project;
DROP INDEX IF EXISTS idx_wingman_audit_scope;
DROP INDEX IF EXISTS idx_wingman_telemetry_project;
DROP INDEX IF EXISTS idx_wingman_telemetry_kind;

-- Composite indexes (004) for query patterns that do not exist server-side
DROP INDEX IF EXISTS idx_wingman_projects_workspace_updated;
DROP INDEX IF EXISTS idx_wingman_projects_workspace_stage;
DROP INDEX IF EXISTS idx_wingman_projects_workspace_status;
DROP INDEX IF EXISTS idx_wingman_projects_workspace_owner;
DROP INDEX IF EXISTS idx_wingman_sessions_workspace_user;
DROP INDEX IF EXISTS idx_wingman_audit_workspace_created;
DROP INDEX IF EXISTS idx_wingman_audit_project_created;
DROP INDEX IF EXISTS idx_wingman_telemetry_workspace_timestamp;
DROP INDEX IF EXISTS idx_wingman_telemetry_user_timestamp;
DROP INDEX IF EXISTS idx_wingman_members_user_workspace;

-- Remaining partial indexes (005) whose predicates no WHERE clause carries
DROP INDEX IF EXISTS idx_wingman_projects_workspace_active;
DROP INDEX IF EXISTS idx_wingman_users_active;
DROP INDEX IF EXISTS idx_wingman_invitations_workspace_pending;

-- Competitor tables (003)
DROP INDEX IF EXISTS idx_competitor_approvals_brand;
DROP INDEX IF EXISTS idx_competitor_approvals_sku;
DROP INDEX IF EXISTS idx_competitor_approvals_cache_key;
DROP INDEX IF EXISTS idx_lookup_runtime_events_scope;
DROP INDEX IF EXISTS idx_lookup_runtime_events_severity;

-- ============================================================================
-- Verify (expect: 0 rows - every dropped index is really gone)
-- ============================================================================
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
--   AND indexname IN (
--     'idx_wingman_users_email', 'idx_wingman_users_status',
--     'idx_wingman_workspaces_slug', 'idx_wingman_members_workspace',
--     'idx_wingman_invitations_email', 'idx_wingman_invitations_status',
--     'idx_wingman_invitations_token', 'idx_wingman_sessions_token',
--     'idx_wingman_sessions_workspace_user', 'idx_wingman_projects_stage',
--     'idx_wingman_projects_status', 'idx_wingman_projects_updated',
--     'idx_wingman_projects_workspace_updated', 'idx_wingman_projects_workspace_stage',
--     'idx_wingman_projects_workspace_status', 'idx_wingman_projects_workspace_owner',
--     'idx_wingman_projects_workspace_active', 'idx_wingman_users_active',
--     'idx_wingman_invitations_workspace_pending', 'idx_wingman_audit_project',
--     'idx_wingman_audit_scope', 'idx_wingman_audit_workspace_created',
--     'idx_wingman_audit_project_created', 'idx_wingman_telemetry_project',
--     'idx_wingman_telemetry_kind', 'idx_wingman_telemetry_workspace_timestamp',
--     'idx_wingman_telemetry_user_timestamp', 'idx_wingman_members_user_workspace',
--     'idx_competitor_approvals_brand', 'idx_competitor_approvals_sku',
--     'idx_competitor_approvals_cache_key', 'idx_lookup_runtime_events_scope',
--     'idx_lookup_runtime_events_severity'
--   );
--   -- expect: 0 rows