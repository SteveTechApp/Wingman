-- ============================================================================
-- Generation-guarded atomic snapshot commit
-- Version: 13.0.0
--
-- Migration 009 made wingman_snapshot_commit ONE atomic transaction, so a
-- commit lands completely or not at all and concurrent writers serialize on
-- the table locks instead of interleaving their snapshot-deletes. Atomicity
-- removed the torn-commit hazard, but the whole-snapshot reconcile has a
-- second, subtler one that atomicity alone cannot fix.
--
-- The sync path is read -> merge -> commit, and the commit's delete phase
-- removes every row absent from the committed payload. When TWO Wingman
-- server instances share one Supabase project, each has its own in-process
-- store lock (wingman-app-store.mjs withStoreLock) and cannot see the other's
-- read-modify-write cycle: both instances can read the same row state, both
-- merge their own change against it, and the second commit then reconciles
-- the first instance's freshly written rows away as "stale" - silent
-- cross-instance data loss with NO error anywhere. Two overlapping saves from
-- two servers both report success and one of the edits is simply gone.
--
-- Migration 013 closes that gap with an optimistic-concurrency generation
-- register:
--
--   * wingman_db_generation holds ONE row (id 'global') whose `generation`
--     increases by exactly 1 on every successful snapshot commit.
--   * wingman_snapshot_commit takes a second argument, expected_generation:
--     the caller names the generation its snapshot was read at. The commit
--     first tries to CLAIM that exact generation
--       (update ... where id = 'global' and generation = expected_generation)
--     - the single-row lock serializes concurrent claims - and when another
--     writer has already moved the register, the commit REFUSES with
--     { "committed": false, "stale": true, "current_generation": N } before
--     touching a single table. A refused commit is a pure no-op; the caller
--     re-reads the current snapshot (which contains the winner's rows),
--     re-merges, and retries against the fresh generation. The store does
--     exactly this (bounded retry in handleWingmanProjectsSyncPost).
--
-- The register is read FIRST by the store, before the eight snapshot tables:
-- a commit that lands after our register read can only move the generation
-- AHEAD of the snapshot we are assembling, so the CAS refuses the commit
-- instead of letting an older snapshot reconcile over rows we never saw. The
-- guard can under-accept (a needless retry) but never over-accept.
--
-- The old one-argument signature is dropped (same convention as migration
-- 012): exactly one canonical function must exist, and a pre-013 store that
-- calls with one argument fails loudly at PostgREST instead of silently
-- committing without the guard.
--
-- The register row itself is application infrastructure, never part of the
-- snapshot: wingman_snapshot_commit never reads or reconciles it as a table
-- section, so a snapshot payload can never delete or overwrite it.
-- ============================================================================

create table if not exists public.wingman_db_generation (
  id         text primary key,
  generation bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- One register row for the whole database, present from the moment the
-- migration lands so the first guarded commit has a baseline to claim.
insert into public.wingman_db_generation (id, generation)
values ('global', 0)
on conflict (id) do nothing;

-- Only the service role may read or advance the register; it is internal
-- bookkeeping, not application data.
alter table public.wingman_db_generation enable row level security;
create policy service_role_all on public.wingman_db_generation
  for all to service_role using (true) with check (true);

drop function if exists public.wingman_snapshot_commit(jsonb);

create or replace function public.wingman_snapshot_commit(payload jsonb, expected_generation bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_variable
declare
  v_current_generation bigint;
  v_next_generation    bigint;
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

  -- expected_generation is mandatory: a caller that cannot name the generation
  -- its snapshot was read at cannot be guarded, so it must not commit a
  -- destructive whole-snapshot reconcile at all.
  if expected_generation is null then
    raise exception
      'wingman_snapshot_commit requires expected_generation (the generation the snapshot was read at); call wingman_snapshot_commit(payload, expected_generation)';
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
  -- Optimistic-concurrency claim (migration 013). Claim the generation our
  -- snapshot was read at BEFORE writing anything: the single-row update locks
  -- the register for the whole transaction, so two concurrent commits
  -- serialize here instead of on the table rows. A claim that affects zero
  -- rows means another writer committed between our read and this RPC - the
  -- register has moved past expected_generation - so the commit refuses with
  -- a structured stale result and NOTHING is written. The caller re-reads the
  -- current snapshot (which includes the winner's rows), re-merges, and
  -- retries with the fresh generation.
  -- ------------------------------------------------------------------------
  update public.wingman_db_generation
     set generation = generation + 1,
         updated_at = now()
   where id = 'global'
     and generation = expected_generation
   returning generation into v_next_generation;

  if v_next_generation is null then
    select generation into v_current_generation
      from public.wingman_db_generation
     where id = 'global';
    if v_current_generation is null then
      raise exception
        'wingman_db_generation register is empty: insert the ''global'' row (migration 013) before committing snapshots';
    end if;
    return jsonb_build_object(
      'committed', false,
      'stale', true,
      'reason', 'snapshot was read at generation ' || expected_generation ||
                ' but the current generation is ' || v_current_generation ||
                '; re-read the current snapshot and retry',
      'expected_generation', expected_generation,
      'current_generation', v_current_generation
    );
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
    'generation', v_next_generation,
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
-- implicit PUBLIC execute grant for the new signature.
revoke execute on function public.wingman_snapshot_commit(jsonb, bigint) from public;
grant execute on function public.wingman_snapshot_commit(jsonb, bigint) to service_role;
