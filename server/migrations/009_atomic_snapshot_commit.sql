-- ============================================================================
-- Atomic Snapshot Commit for the normalized-tables storage mode
-- Version: 9.0.0
--
-- wingman-app-store.mjs previously wrote the whole application snapshot to the
-- normalized tables as SIXTEEN separate PostgREST calls (8 upserts + 8
-- snapshot-deletes). Each call was its own auto-committed transaction, so:
--
--   1. A failure midway left the tables torn (some upserted, none deleted) -
--      the caller saw an error but a partially-applied write stayed behind.
--   2. Two instances writing concurrently could interleave: writer A's
--      snapshot-delete ran between writer B's upsert and B's delete, removing
--      B's freshly written rows as "stale" - silent cross-instance data loss.
--
-- This function performs the ENTIRE snapshot reconciliation (delete rows not
-- present + upsert the incoming rows, for all eight tables) inside ONE
-- transaction, so a commit either lands completely or not at all. Interleaved
-- writers now serialize on the table locks and each complete commit is atomic.
--
-- The application calls it via a single PostgREST RPC:
--   select * from wingman_snapshot_commit('{ "users": [...], ... }'::jsonb)
--
-- Payload shape: one array per table, objects with the SNAKE_CASE columns of
-- the matching table (identical to the rows the app previously upserted
-- directly). A section that is OMITTED or JSON null leaves that table
-- untouched (no delete, no insert) - the delete phase only reconciles
-- sections the caller provided as arrays. An explicit [] still means "the
-- snapshot has no rows here": it deletes every row and inserts nothing.
--
-- Only service_role may execute it - regular/anon roles must not be able to
-- replace the whole application snapshot.
-- ============================================================================

create or replace function public.wingman_snapshot_commit(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_users      int := 0;
  v_workspaces int := 0;
  v_members    int := 0;
  v_invites    int := 0;
  v_sessions   int := 0;
  v_projects   int := 0;
  v_audit      int := 0;
  v_telemetry  int := 0;
begin
  if jsonb_typeof(payload) <> 'object' then
    raise exception 'wingman_snapshot_commit payload must be a JSON object, got %', coalesce(jsonb_typeof(payload), 'null');
  end if;

  -- ------------------------------------------------------------------------
  -- Oversized-payload circuit breaker (413 semantics, mirroring the API's body
  -- cap): a snapshot blob larger than this cannot be posted through PostgREST
  -- reliably and would only fail far from the cause. The store pre-flights the
  -- SAME 8388608-byte default (WINGMAN_SNAPSHOT_COMMIT_MAX_BYTES) before
  -- calling this RPC; this raise is the backstop for direct callers.
  -- ------------------------------------------------------------------------
  if octet_length(payload::text) > 8388608 then
    raise exception
      'wingman_snapshot_commit payload too large (413): % bytes exceeds the 8388608-byte commit limit; shrink the snapshot or write in smaller batches',
      octet_length(payload::text);
  end if;

  -- ------------------------------------------------------------------------
  -- Phase 1: delete rows no longer in the snapshot, children first so the
  -- foreign keys (RESTRICT on users, CASCADE/SET NULL elsewhere) can never
  -- block a legitimate removal. Same order the app used for its deletes.
  -- ------------------------------------------------------------------------

  -- Deletes only reconcile sections the caller actually provided as arrays:
  -- an omitted or JSON-null section must leave that table untouched (the
  -- documented payload contract), never wipe it. An explicit [] still means
  -- "the snapshot has no rows here", so the delete runs and empties the table.
  delete from wingman_telemetry_events t
  where jsonb_typeof(payload -> 'telemetryEvents') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(payload -> 'telemetryEvents') e(x)
      where e.x ->> 'id' = t.id
    );

  delete from wingman_audit_events a
  where jsonb_typeof(payload -> 'auditEvents') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(payload -> 'auditEvents') e(x)
      where e.x ->> 'id' = a.id
    );

  delete from wingman_projects p
  where jsonb_typeof(payload -> 'projects') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(payload -> 'projects') e(x)
      where e.x ->> 'id' = p.id
    );

  delete from wingman_sessions s
  where jsonb_typeof(payload -> 'sessions') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(payload -> 'sessions') e(x)
      where e.x ->> 'id' = s.id
    );

  delete from wingman_workspace_invitations i
  where jsonb_typeof(payload -> 'invitations') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(payload -> 'invitations') e(x)
      where e.x ->> 'id' = i.id
    );

  delete from wingman_workspace_members m
  where jsonb_typeof(payload -> 'memberships') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(payload -> 'memberships') e(x)
      where e.x ->> 'id' = m.id
    );

  delete from wingman_workspaces w
  where jsonb_typeof(payload -> 'workspaces') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(payload -> 'workspaces') e(x)
      where e.x ->> 'id' = w.id
    );

  delete from wingman_users u
  where jsonb_typeof(payload -> 'users') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(payload -> 'users') e(x)
      where e.x ->> 'id' = u.id
    );

  -- ------------------------------------------------------------------------
  -- Phase 2: upsert the incoming rows, parents first (workspaces reference
  -- users, everything else references workspaces).
  -- ------------------------------------------------------------------------

  insert into wingman_users (
    id, name, email, company, role, password_salt, password_hash, status, created_at, last_login_at
  )
  select
    e.x ->> 'id',
    e.x ->> 'name',
    e.x ->> 'email',
    e.x ->> 'company',
    coalesce(nullif(e.x ->> 'role', ''), 'sales'),
    e.x ->> 'password_salt',
    e.x ->> 'password_hash',
    coalesce(nullif(e.x ->> 'status', ''), 'active'),
    coalesce(nullif(e.x ->> 'created_at', '')::timestamptz, now()),
    nullif(e.x ->> 'last_login_at', '')::timestamptz
  from jsonb_array_elements(case when jsonb_typeof(payload -> 'users') = 'array' then payload -> 'users' else '[]'::jsonb end) e(x)
  on conflict (id) do update set
    name           = excluded.name,
    email          = excluded.email,
    company        = excluded.company,
    role           = excluded.role,
    password_salt  = excluded.password_salt,
    password_hash  = excluded.password_hash,
    status         = excluded.status,
    created_at     = excluded.created_at,
    last_login_at  = excluded.last_login_at;
  get diagnostics v_users = row_count;

  insert into wingman_workspaces (
    id, name, slug, tier, owner_user_id, active_project_id, created_at
  )
  select
    e.x ->> 'id',
    e.x ->> 'name',
    e.x ->> 'slug',
    coalesce(nullif(e.x ->> 'tier', ''), 'pilot'),
    e.x ->> 'owner_user_id',
    nullif(e.x ->> 'active_project_id', ''),
    coalesce(nullif(e.x ->> 'created_at', '')::timestamptz, now())
  from jsonb_array_elements(case when jsonb_typeof(payload -> 'workspaces') = 'array' then payload -> 'workspaces' else '[]'::jsonb end) e(x)
  on conflict (id) do update set
    name              = excluded.name,
    slug              = excluded.slug,
    tier              = excluded.tier,
    owner_user_id     = excluded.owner_user_id,
    active_project_id = excluded.active_project_id,
    created_at        = excluded.created_at;
  get diagnostics v_workspaces = row_count;

  insert into wingman_workspace_members (
    id, workspace_id, user_id, role, created_at
  )
  select
    e.x ->> 'id',
    e.x ->> 'workspace_id',
    e.x ->> 'user_id',
    coalesce(nullif(e.x ->> 'role', ''), 'sales'),
    coalesce(nullif(e.x ->> 'created_at', '')::timestamptz, now())
  from jsonb_array_elements(case when jsonb_typeof(payload -> 'memberships') = 'array' then payload -> 'memberships' else '[]'::jsonb end) e(x)
  on conflict (id) do update set
    workspace_id = excluded.workspace_id,
    user_id      = excluded.user_id,
    role         = excluded.role,
    created_at   = excluded.created_at;
  get diagnostics v_members = row_count;

  insert into wingman_workspace_invitations (
    id, workspace_id, email, role, status, invited_by_user_id, invited_by_name,
    invited_by_email, token_hash, created_at, accepted_at
  )
  select
    e.x ->> 'id',
    e.x ->> 'workspace_id',
    e.x ->> 'email',
    coalesce(nullif(e.x ->> 'role', ''), 'customer'),
    coalesce(nullif(e.x ->> 'status', ''), 'pending'),
    nullif(e.x ->> 'invited_by_user_id', ''),
    coalesce(nullif(e.x ->> 'invited_by_name', ''), 'Wingman'),
    nullif(e.x ->> 'invited_by_email', ''),
    e.x ->> 'token_hash',
    coalesce(nullif(e.x ->> 'created_at', '')::timestamptz, now()),
    nullif(e.x ->> 'accepted_at', '')::timestamptz
  from jsonb_array_elements(case when jsonb_typeof(payload -> 'invitations') = 'array' then payload -> 'invitations' else '[]'::jsonb end) e(x)
  on conflict (id) do update set
    workspace_id       = excluded.workspace_id,
    email              = excluded.email,
    role               = excluded.role,
    status             = excluded.status,
    invited_by_user_id = excluded.invited_by_user_id,
    invited_by_name    = excluded.invited_by_name,
    invited_by_email   = excluded.invited_by_email,
    token_hash         = excluded.token_hash,
    created_at         = excluded.created_at,
    accepted_at        = excluded.accepted_at;
  get diagnostics v_invites = row_count;

  insert into wingman_sessions (
    id, token_hash, user_id, workspace_id, created_at, expires_at, last_seen_at
  )
  select
    e.x ->> 'id',
    e.x ->> 'token_hash',
    e.x ->> 'user_id',
    e.x ->> 'workspace_id',
    coalesce(nullif(e.x ->> 'created_at', '')::timestamptz, now()),
    coalesce(nullif(e.x ->> 'expires_at', '')::timestamptz, now()),
    coalesce(nullif(e.x ->> 'last_seen_at', '')::timestamptz, now())
  from jsonb_array_elements(case when jsonb_typeof(payload -> 'sessions') = 'array' then payload -> 'sessions' else '[]'::jsonb end) e(x)
  on conflict (id) do update set
    token_hash   = excluded.token_hash,
    user_id      = excluded.user_id,
    workspace_id = excluded.workspace_id,
    created_at   = excluded.created_at,
    expires_at   = excluded.expires_at,
    last_seen_at = excluded.last_seen_at;
  get diagnostics v_sessions = row_count;

  insert into wingman_projects (
    id, workspace_id, owner_id, project_name, customer, site, room_name, stage,
    status, created_at, updated_at, payload
  )
  select
    e.x ->> 'id',
    e.x ->> 'workspace_id',
    nullif(e.x ->> 'owner_id', ''),
    coalesce(nullif(e.x ->> 'project_name', ''), 'Untitled Project'),
    nullif(e.x ->> 'customer', ''),
    nullif(e.x ->> 'site', ''),
    nullif(e.x ->> 'room_name', ''),
    coalesce(nullif(e.x ->> 'stage', ''), 'Discovery'),
    coalesce(nullif(e.x ->> 'status', ''), 'Draft'),
    coalesce(nullif(e.x ->> 'created_at', '')::timestamptz, now()),
    coalesce(nullif(e.x ->> 'updated_at', '')::timestamptz, now()),
    coalesce(e.x -> 'payload', '{}'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(payload -> 'projects') = 'array' then payload -> 'projects' else '[]'::jsonb end) e(x)
  on conflict (id) do update set
    workspace_id = excluded.workspace_id,
    owner_id     = excluded.owner_id,
    project_name = excluded.project_name,
    customer     = excluded.customer,
    site         = excluded.site,
    room_name    = excluded.room_name,
    stage        = excluded.stage,
    status       = excluded.status,
    created_at   = excluded.created_at,
    updated_at   = excluded.updated_at,
    payload      = excluded.payload;
  get diagnostics v_projects = row_count;

  insert into wingman_audit_events (
    id, workspace_id, project_id, actor_name, actor_email, scope, action,
    severity, detail, created_at, payload
  )
  select
    e.x ->> 'id',
    nullif(e.x ->> 'workspace_id', ''),
    nullif(e.x ->> 'project_id', ''),
    coalesce(nullif(e.x ->> 'actor_name', ''), 'Wingman'),
    nullif(e.x ->> 'actor_email', ''),
    coalesce(nullif(e.x ->> 'scope', ''), 'projects'),
    coalesce(nullif(e.x ->> 'action', ''), 'updated'),
    coalesce(nullif(e.x ->> 'severity', ''), 'info'),
    coalesce(nullif(e.x ->> 'detail', ''), 'Workspace activity captured.'),
    coalesce(nullif(e.x ->> 'created_at', '')::timestamptz, now()),
    coalesce(e.x -> 'payload', '{}'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(payload -> 'auditEvents') = 'array' then payload -> 'auditEvents' else '[]'::jsonb end) e(x)
  on conflict (id) do update set
    workspace_id = excluded.workspace_id,
    project_id   = excluded.project_id,
    actor_name   = excluded.actor_name,
    actor_email  = excluded.actor_email,
    scope        = excluded.scope,
    action       = excluded.action,
    severity     = excluded.severity,
    detail       = excluded.detail,
    created_at   = excluded.created_at,
    payload      = excluded.payload;
  get diagnostics v_audit = row_count;

  insert into wingman_telemetry_events (
    id, workspace_id, user_id, project_id, kind, message, timestamp, payload
  )
  select
    e.x ->> 'id',
    nullif(e.x ->> 'workspace_id', ''),
    nullif(e.x ->> 'user_id', ''),
    nullif(e.x ->> 'project_id', ''),
    coalesce(nullif(e.x ->> 'kind', ''), 'info'),
    coalesce(nullif(e.x ->> 'message', ''), 'Runtime event'),
    coalesce(nullif(e.x ->> 'timestamp', '')::timestamptz, now()),
    coalesce(e.x -> 'payload', '{}'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(payload -> 'telemetryEvents') = 'array' then payload -> 'telemetryEvents' else '[]'::jsonb end) e(x)
  on conflict (id) do update set
    workspace_id = excluded.workspace_id,
    user_id      = excluded.user_id,
    project_id   = excluded.project_id,
    kind         = excluded.kind,
    message      = excluded.message,
    timestamp    = excluded.timestamp,
    payload      = excluded.payload;
  get diagnostics v_telemetry = row_count;

  return jsonb_build_object(
    'committed', true,
    'upserted_users',      v_users,
    'upserted_workspaces', v_workspaces,
    'upserted_members',    v_members,
    'upserted_invitations', v_invites,
    'upserted_sessions',   v_sessions,
    'upserted_projects',   v_projects,
    'upserted_auditEvents', v_audit,
    'upserted_telemetryEvents', v_telemetry
  );
end;
$$;

-- Only the service role may replace the whole application snapshot; revoke the
-- implicit PUBLIC execute grant.
revoke execute on function public.wingman_snapshot_commit(jsonb) from public;
grant execute on function public.wingman_snapshot_commit(jsonb) to service_role;