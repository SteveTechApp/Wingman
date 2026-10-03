-- ============================================================================
-- Migration 006: Fix RLS policies to target service_role (not PUBLIC)
-- ============================================================================
-- The original RLS policies were created with roles = {public} instead of
-- roles = {service_role}. This meant the anon/publishable key could read
-- and write all data. This migration drops and recreates all policies
-- targeting the correct role.
--
-- Idempotent and safe to re-run.

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'wingman_app_state', 'wingman_users', 'wingman_workspaces',
      'wingman_workspace_members', 'wingman_workspace_invitations',
      'wingman_sessions', 'wingman_projects',
      'wingman_audit_events', 'wingman_telemetry_events',
      'competitor_approvals', 'competitor_lookup_runtime_events',
      'competitor_match_decisions'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_role_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY service_role_all ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- Verify: every table should show roles = {service_role}
-- SELECT tablename, policyname, roles FROM pg_policies
-- WHERE schemaname = 'public' AND policyname = 'service_role_all'
-- ORDER BY tablename;
