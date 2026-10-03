-- ============================================================================
-- Migration 008: Drop dead cleanup functions (cleanup is cron-owned)
-- ============================================================================
-- 001_initial_schema.sql originally created three PL/pgSQL cleanup functions
-- (cleanup_expired_sessions, cleanup_old_audit_events,
-- cleanup_old_telemetry_events) and documented them as an optional manual
-- cron step. Nothing ever scheduled them: the actual cleanup runs as pg_cron
-- jobs with inline SQL defined in 003_competitor_tables_and_pg_cron.sql
-- (expired sessions hourly, audit last 800 daily 03:00 UTC, telemetry last
-- 400 daily 03:05 UTC). The functions are dead schema - kept in databases
-- provisioned from older 001 files, never called, and a misleading signal
-- that cleanup is function-owned. Drop them so the schema matches behavior.
--
-- Idempotent and safe to re-run.

DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP FUNCTION IF EXISTS cleanup_old_audit_events();
DROP FUNCTION IF EXISTS cleanup_old_telemetry_events();

-- ============================================================================
-- Verify
-- ============================================================================
-- SELECT proname FROM pg_proc
--   WHERE proname IN ('cleanup_expired_sessions',
--                     'cleanup_old_audit_events',
--                     'cleanup_old_telemetry_events');
--   -- expect: 0 rows
--
-- The live cron jobs remain untouched:
-- SELECT jobname, schedule, command FROM cron.job
--   WHERE jobname IN ('cleanup-expired-sessions',
--                     'cleanup-old-audit-events',
--                     'cleanup-old-telemetry-events');
--   -- expect: 3 rows, command is inline SQL (not a function call)
