-- Mirror of server/migrations/008_drop_dead_cleanup_functions.sql
--
-- The server set's 001_initial_schema.sql once created three PL/pgSQL cleanup
-- functions (cleanup_expired_sessions, cleanup_old_audit_events,
-- cleanup_old_telemetry_events) that nothing ever scheduled. Real cleanup
-- runs as pg_cron jobs with inline SQL (see 20260828_competitor_tables_and_pg_cron.sql).
-- The supabase set never defined these functions, but a database migrated
-- from the server set could still carry them; dropping here keeps both sets
-- converging on the same schema. Idempotent.

DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP FUNCTION IF EXISTS cleanup_old_audit_events();
DROP FUNCTION IF EXISTS cleanup_old_telemetry_events();
