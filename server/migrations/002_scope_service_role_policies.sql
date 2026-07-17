-- ============================================================================
-- Scope the service_role_all RLS policies to the service_role, not PUBLIC
-- ============================================================================
-- 001_initial_schema.sql created every `service_role_all` policy without a
-- `TO service_role` clause, so `USING (true)` applied to every Postgres role,
-- not just the backend's service-role key. This is harmless today because the
-- backend is the only caller and it uses the service-role key (which bypasses
-- RLS entirely), but it means RLS provided no real defense-in-depth - if an
-- anon/publishable Supabase key were ever wired up to call these tables
-- directly, it would have unrestricted read/write access.
--
-- This migration drops and recreates each policy scoped `TO service_role`.
-- Safe to run against a database that already applied 001_initial_schema.sql;
-- a fresh database created from the updated 001 file already has this fix and
-- does not need this migration (the DROP POLICY IF EXISTS / CREATE pair is a
-- no-op difference either way).

DROP POLICY IF EXISTS service_role_all ON wingman_app_state;
CREATE POLICY service_role_all ON wingman_app_state FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON wingman_users;
CREATE POLICY service_role_all ON wingman_users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON wingman_workspaces;
CREATE POLICY service_role_all ON wingman_workspaces FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON wingman_workspace_members;
CREATE POLICY service_role_all ON wingman_workspace_members FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON wingman_workspace_invitations;
CREATE POLICY service_role_all ON wingman_workspace_invitations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON wingman_sessions;
CREATE POLICY service_role_all ON wingman_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON wingman_projects;
CREATE POLICY service_role_all ON wingman_projects FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON wingman_audit_events;
CREATE POLICY service_role_all ON wingman_audit_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all ON wingman_telemetry_events;
CREATE POLICY service_role_all ON wingman_telemetry_events FOR ALL TO service_role USING (true) WITH CHECK (true);
