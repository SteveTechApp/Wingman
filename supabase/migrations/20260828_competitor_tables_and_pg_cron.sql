-- ============================================================================
-- Competitor governance tables + pg_cron scheduled cleanup
-- ============================================================================
-- Mirror of server/migrations/003_competitor_tables_and_pg_cron.sql
-- Creates the three Supabase-backed tables used by the competitor lookup
-- service and governance ledger, then enables pg_cron for automatic cleanup

-- 1. Competitor Approvals
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

-- 2. Competitor Lookup Runtime Events
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

-- 3. Competitor Match Decisions
CREATE TABLE IF NOT EXISTS competitor_match_decisions (
    id          TEXT PRIMARY KEY,
    payload     JSONB NOT NULL,
    updated_at  TIMESTAMPTZ
);

-- 4. RLS — service_role access only
ALTER TABLE competitor_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_lookup_runtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_match_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all ON competitor_approvals;
CREATE POLICY service_role_all ON competitor_approvals FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON competitor_lookup_runtime_events;
CREATE POLICY service_role_all ON competitor_lookup_runtime_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON competitor_match_decisions;
CREATE POLICY service_role_all ON competitor_match_decisions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 6. Scheduled cleanup jobs
SELECT cron.unschedule('cleanup-expired-sessions');
SELECT cron.schedule('cleanup-expired-sessions', '0 * * * *',
    $$DELETE FROM wingman_sessions WHERE expires_at < NOW()$$);

SELECT cron.unschedule('cleanup-old-audit-events');
SELECT cron.schedule('cleanup-old-audit-events', '0 3 * * *',
    $$DELETE FROM wingman_audit_events WHERE id NOT IN (
        SELECT id FROM wingman_audit_events ORDER BY created_at DESC LIMIT 800
    )$$);

SELECT cron.unschedule('cleanup-old-telemetry-events');
SELECT cron.schedule('cleanup-old-telemetry-events', '5 3 * * *',
    $$DELETE FROM wingman_telemetry_events WHERE id NOT IN (
        SELECT id FROM wingman_telemetry_events ORDER BY timestamp DESC LIMIT 400
    )$$);

SELECT cron.unschedule('cleanup-old-lookup-events');
SELECT cron.schedule('cleanup-old-lookup-events', '0 4 * * *',
    $$DELETE FROM competitor_lookup_runtime_events
      WHERE event_ts < NOW() - INTERVAL '30 days'$$);
