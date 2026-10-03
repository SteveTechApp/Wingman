-- ============================================================================
-- Migration 003: Competitor governance tables + pg_cron scheduled cleanup
-- ============================================================================
-- Creates the three Supabase-backed tables used by the competitor lookup
-- service and governance ledger, then enables pg_cron for automatic cleanup
-- of expired sessions, old audit events, and old telemetry events.
--
-- Prerequisites:
--   - 001_initial_schema.sql already applied
--   - pg_cron extension enabled in Supabase (Dashboard > Database > Extensions)
--
-- Run via: Supabase SQL Editor, or `supabase db push`, or psql.
-- ============================================================================

-- ============================================================================
-- 1. Competitor Approvals Table
-- ============================================================================
-- Stores approved competitor product records for the lookup service.
-- Written by POST /api/competitor-approvals, read by the matcher.

CREATE TABLE IF NOT EXISTS competitor_approvals (
    id          TEXT PRIMARY KEY,
    cache_key   TEXT,
    brand       TEXT NOT NULL,
    sku         TEXT NOT NULL,
    name        TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'unknown',
    source_url  TEXT,
    approved_by TEXT NOT NULL DEFAULT 'wingman-user',
    notes       TEXT,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_approvals_brand ON competitor_approvals(brand);
CREATE INDEX IF NOT EXISTS idx_competitor_approvals_sku ON competitor_approvals(sku);
CREATE INDEX IF NOT EXISTS idx_competitor_approvals_cache_key ON competitor_approvals(cache_key);

-- ============================================================================
-- 2. Competitor Lookup Runtime Events Table
-- ============================================================================
-- Stores diagnostic events from the live lookup pipeline (query traces,
-- enrichment results, rate-limit trips, errors). Pruned automatically
-- by the application (LOOKUP_RUNTIME_EVENT_RETENTION_DAYS, default 30).

CREATE TABLE IF NOT EXISTS competitor_lookup_runtime_events (
    id          TEXT PRIMARY KEY,
    event_ts    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scope       TEXT NOT NULL DEFAULT 'lookup',
    severity    TEXT NOT NULL DEFAULT 'info',
    mode        TEXT NOT NULL DEFAULT 'unknown',
    message     TEXT NOT NULL DEFAULT 'Runtime diagnostic event',
    query       TEXT,
    brand       TEXT,
    sku         TEXT,
    warnings    JSONB NOT NULL DEFAULT '[]'::jsonb,
    trace       JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lookup_runtime_events_ts ON competitor_lookup_runtime_events(event_ts DESC);
CREATE INDEX IF NOT EXISTS idx_lookup_runtime_events_scope ON competitor_lookup_runtime_events(scope);
CREATE INDEX IF NOT EXISTS idx_lookup_runtime_events_severity ON competitor_lookup_runtime_events(severity);

-- ============================================================================
-- 3. Competitor Match Decisions Table
-- ============================================================================
-- Stores governance decisions from the decision ledger (approve/reject
-- competitor matches). Mirrored from the committed JSON ledger by the
-- sync-competitor-decisions tool.

CREATE TABLE IF NOT EXISTS competitor_match_decisions (
    id          TEXT PRIMARY KEY,
    payload     JSONB NOT NULL,
    updated_at  TIMESTAMPTZ
);

-- ============================================================================
-- 4. Row Level Security for Competitor Tables
-- ============================================================================
-- Same pattern as wingman tables: RLS enabled, policies scoped to service_role.

ALTER TABLE competitor_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_lookup_runtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_match_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all ON competitor_approvals;
CREATE POLICY service_role_all ON competitor_approvals FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON competitor_lookup_runtime_events;
CREATE POLICY service_role_all ON competitor_lookup_runtime_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON competitor_match_decisions;
CREATE POLICY service_role_all ON competitor_match_decisions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. Enable pg_cron Extension
-- ============================================================================
-- Required for the scheduled cleanup jobs below.
-- On Supabase free tier, pg_cron is available but jobs only run while the
-- project is not paused.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 6. Scheduled Cleanup Jobs
-- ============================================================================

-- 6a. Clean up expired sessions every hour
SELECT cron.unschedule('cleanup-expired-sessions');
SELECT cron.schedule(
    'cleanup-expired-sessions',
    '0 * * * *',
    $$DELETE FROM wingman_sessions WHERE expires_at < NOW()$$
);

-- 6b. Prune old audit events (keep last 800) once per day at 03:00 UTC
SELECT cron.unschedule('cleanup-old-audit-events');
SELECT cron.schedule(
    'cleanup-old-audit-events',
    '0 3 * * *',
    $$DELETE FROM wingman_audit_events
      WHERE id NOT IN (
        SELECT id FROM wingman_audit_events
        ORDER BY created_at DESC
        LIMIT 800
      )$$
);

-- 6c. Prune old telemetry events (keep last 400) daily at 03:05 UTC
SELECT cron.unschedule('cleanup-old-telemetry-events');
SELECT cron.schedule(
    'cleanup-old-telemetry-events',
    '5 3 * * *',
    $$DELETE FROM wingman_telemetry_events
      WHERE id NOT IN (
        SELECT id FROM wingman_telemetry_events
        ORDER BY timestamp DESC
        LIMIT 400
      )$$
);

-- 6d. Prune old competitor lookup runtime events (older than 30 days) daily at 04:00 UTC
SELECT cron.unschedule('cleanup-old-lookup-events');
SELECT cron.schedule(
    'cleanup-old-lookup-events',
    '0 4 * * *',
    $$DELETE FROM competitor_lookup_runtime_events
      WHERE event_ts < NOW() - INTERVAL '30 days'$$
);

-- ============================================================================
-- Migration complete
-- ============================================================================
