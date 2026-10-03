-- ============================================================================
-- Enable RLS and service-role policies on every Wingman table
-- ============================================================================
-- The three 20260310_* migrations in this directory create the same nine
-- tables as server/migrations/001_initial_schema.sql, but they never enabled
-- row level security and never defined a policy. A Supabase project
-- provisioned from THIS directory therefore had all nine application tables
-- readable and writable by anyone holding the anon key, which ships publicly
-- in the browser bundle. server/migrations/ has always been safe; only this
-- set was exposed.
--
-- This migration closes that gap and brings the two sets to the same RLS
-- surface: RLS on, plus one `service_role`-scoped FOR ALL policy per table,
-- matching server/migrations/002_scope_service_role_policies.sql.
--
-- The backend connects with the service-role key (which bypasses RLS), so
-- enabling RLS does not change backend behaviour. What it does is stop an
-- anon/publishable key from reading the tables directly - defense in depth,
-- exactly as intended by the 002 migration on the server side.
--
-- Idempotent and safe to re-run: ENABLE ROW LEVEL SECURITY is a no-op when
-- already enabled, and each policy is dropped before being recreated.
-- Postgres has no CREATE POLICY IF NOT EXISTS, hence the DROP/CREATE pair.
--
-- Guarded by tools/check-wingman-migration-parity.mjs, which fails the verify
-- pipeline if the two migration sets ever diverge on tables or RLS again.

alter table public.wingman_app_state enable row level security;
drop policy if exists service_role_all on public.wingman_app_state;
create policy service_role_all on public.wingman_app_state
  for all to service_role using (true) with check (true);

alter table public.wingman_users enable row level security;
drop policy if exists service_role_all on public.wingman_users;
create policy service_role_all on public.wingman_users
  for all to service_role using (true) with check (true);

alter table public.wingman_workspaces enable row level security;
drop policy if exists service_role_all on public.wingman_workspaces;
create policy service_role_all on public.wingman_workspaces
  for all to service_role using (true) with check (true);

alter table public.wingman_workspace_members enable row level security;
drop policy if exists service_role_all on public.wingman_workspace_members;
create policy service_role_all on public.wingman_workspace_members
  for all to service_role using (true) with check (true);

alter table public.wingman_workspace_invitations enable row level security;
drop policy if exists service_role_all on public.wingman_workspace_invitations;
create policy service_role_all on public.wingman_workspace_invitations
  for all to service_role using (true) with check (true);

alter table public.wingman_sessions enable row level security;
drop policy if exists service_role_all on public.wingman_sessions;
create policy service_role_all on public.wingman_sessions
  for all to service_role using (true) with check (true);

alter table public.wingman_projects enable row level security;
drop policy if exists service_role_all on public.wingman_projects;
create policy service_role_all on public.wingman_projects
  for all to service_role using (true) with check (true);

alter table public.wingman_audit_events enable row level security;
drop policy if exists service_role_all on public.wingman_audit_events;
create policy service_role_all on public.wingman_audit_events
  for all to service_role using (true) with check (true);

alter table public.wingman_telemetry_events enable row level security;
drop policy if exists service_role_all on public.wingman_telemetry_events;
create policy service_role_all on public.wingman_telemetry_events
  for all to service_role using (true) with check (true);
