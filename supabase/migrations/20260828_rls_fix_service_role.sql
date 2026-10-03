-- Mirror of server/migrations/006_rls_fix_service_role.sql

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
