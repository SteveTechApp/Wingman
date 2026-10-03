-- ============================================================================
-- Drop rotten time-based partial indexes, pin invitation tokens
-- ============================================================================
-- Mirrors server/migrations/007_drop_rotten_partial_indexes.sql so the two
-- migration sets stay in parity (see tools/check-wingman-migration-parity.mjs).
--
-- Fixes two correctness/maintenance gaps introduced by
-- 20260828_partial_indexes.sql and one hardening gap from the original schema:
--
-- 1. idx_wingman_sessions_workspace_active used `expires_at >
--    wingman_now_immutable()` in its predicate. wingman_now_immutable() is
--    declared IMMUTABLE but returns NOW() (STABLE) - a misdeclaration that
--    Postgres may constant-fold, and the predicate is only ever evaluated at
--    row-write time, so expired sessions never leave the "active" index. It
--    silently grows into a full-table index and is a latent wrong-result
--    hazard. The composite index idx_wingman_sessions_workspace_user plus
--    idx_wingman_sessions_expires already cover the auth lookups and the
--    hourly cleanup.
--
-- 2. idx_wingman_audit_workspace_recent and
--    idx_wingman_telemetry_workspace_recent used static date boundaries
--    ('2026-05-28', '2026-07-29') that require manual re-runs to stay
--    current. The audit/telemetry tables are bounded by the pg_cron cleanup
--    jobs (last 800/400 rows), so a partial index adds no meaningful speedup
--    over the composite (workspace_id, created_at/timestamp DESC) indexes -
--    and the static predicates grow unboundedly toward full-table size. Both
--    are dropped.
--
-- 3. wingman_workspace_invitations.token_hash has no UNIQUE constraint
--    (wingman_sessions.token_hash does). Invitation acceptance looks up the
--    first row matching a token hash, so a collision would be ambiguous. The
--    server generates 24 random bytes per token, so this is defence in
--    depth, not a live bug - but the constraint is free insurance and also
--    gives the acceptance lookup a dedicated index.
--
-- Idempotent and safe to re-run.

DROP INDEX IF EXISTS idx_wingman_sessions_workspace_active;
DROP INDEX IF EXISTS idx_wingman_audit_workspace_recent;
DROP INDEX IF EXISTS idx_wingman_telemetry_workspace_recent;

DROP FUNCTION IF EXISTS wingman_now_immutable();

CREATE UNIQUE INDEX IF NOT EXISTS idx_wingman_invitations_token_unique
    ON wingman_workspace_invitations (token_hash);
