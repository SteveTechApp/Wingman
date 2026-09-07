-- ============================================================================
-- Per-project guarded commit (ADR-0001 Phase 1 per-project revisioned sync)
-- Version: 15.0.0
--
-- Migration 013 made the WHOLE-SNAPSHOT commit generation-guarded so two
-- Wingman server instances sharing one Supabase project cannot reconcile each
-- other's rows away. But a project SAVE still pays for the whole snapshot: the
-- sync handler reads all eight tables, merges the client's workspace payload,
-- and wingman_snapshot_commit reconciles every table in one transaction -
-- serialized behind the in-process store lock and one register claim. On the
-- zero-network stack that leaves exactly two per-save cost terms: the store-
-- lock queue and the whole-snapshot RPC.
--
-- Migration 015 adds the per-project write that removes both terms from a
-- project save. wingman_project_put commits ONE project row (plus its audit
-- row) atomically:
--
--   * The row's OWN revision is the concurrency guard. The caller names the
--     revision its copy was read at (the row's payload->>'syncRevision'); the
--     guarded UPDATE matches on that revision and bumps it by one, so two
--     overlapping per-project commits from different server instances
--     serialize on the single-row lock and a stale writer is REFUSED
--     (committed:false, stale:true, current_revision) before writing anything.
--     No whole-database register claim is needed for the row write itself -
--     the single-row CAS is the claim. A new project (no row yet) is inserted
--     with the revision its payload already carries; a concurrent insert is
--     detected by the primary-key conflict and surfaced the same way.
--
--   * A per-project commit nevertheless ADVANCES the wingman_db_generation
--     register (id 'global') in the same transaction, without claiming a
--     specific generation. That is what keeps the whole-snapshot path safe:
--     migration 013's register is read BEFORE the snapshot tables, so any
--     whole-snapshot commit whose read predates this per-project write sees
--     the register moved past the generation it claims and refuses, forcing
--     the sync handler's bounded re-read/merge/retry instead of silently
--     reconciling this fresh row away as "stale". The refusal cost is paid
--     only when both write paths genuinely overlap.
--
-- The caller passes the row already shaped the way the app serializes it for
-- wingman_snapshot_commit (same column vocabulary, payload JSONB carrying the
-- full client document INCLUDING its bumped syncRevision and the server-owned
-- _merge metadata), plus the optional audit row to write in the same
-- transaction. Stage/status canonicalisation stays in the app
-- (project-row-vocabulary.mjs) so the two write paths cannot drift.
--
-- The register row itself is never written by this function beyond the
-- unconditional +1 advance; it stays application infrastructure, exactly as in
-- migration 013.
-- ============================================================================

create or replace function public.wingman_project_put(
  p_row jsonb,
  p_expected_revision bigint,
  p_audit jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_variable
declare
  v_row_id         text;
  v_workspace_id   text;
  v_audit_id       text;
  v_current        bigint;
  v_next_revision  bigint;
  v_generation     bigint;
  v_upserted_audit int := 0;
begin
  if jsonb_typeof(p_row) <> 'object' then
    raise exception 'wingman_project_put p_row must be a JSON object, got %', coalesce(jsonb_typeof(p_row), 'null');
  end if;

  if p_expected_revision is null then
    raise exception
      'wingman_project_put requires p_expected_revision (the row revision the caller''s copy was read at); call wingman_project_put(p_row, p_expected_revision, p_audit)';
  end if;

  -- -------------------------------------------------------------------------
  -- Oversized-payload circuit breaker (413 semantics, same ceiling as the
  -- whole-snapshot commit): a project document larger than this cannot be
  -- posted through PostgREST reliably. The store pre-flights the SAME
  -- 8388608-byte default (WINGMAN_SNAPSHOT_COMMIT_MAX_BYTES) before calling
  -- this RPC; this raise is the backstop for direct callers.
  -- -------------------------------------------------------------------------
  if octet_length(p_row::text) > 8388608 then
    raise exception
      'wingman_project_put row too large (413): % bytes exceeds the 8388608-byte project commit limit; shrink the project document',
      octet_length(p_row::text);
  end if;

  v_row_id       := p_row ->> 'id';
  v_workspace_id := p_row ->> 'workspace_id';
  if v_row_id is null or v_workspace_id is null then
    raise exception 'wingman_project_put p_row must carry id and workspace_id';
  end if;

  -- -------------------------------------------------------------------------
  -- Guarded update first: the row exists and its payload revision matches the
  -- revision the caller read at. The single-row lock on the matched UPDATE
  -- serializes concurrent per-project commits; the row's own revision IS the
  -- claim, so no whole-database register CAS is needed here.
  -- -------------------------------------------------------------------------
  update public.wingman_projects
     set payload      = coalesce(p_row -> 'payload', '{}'::jsonb),
         owner_id     = nullif(p_row ->> 'owner_id', ''),
         project_name = coalesce(nullif(p_row ->> 'project_name', ''), 'Untitled Project'),
         customer     = nullif(p_row ->> 'customer', ''),
         site         = nullif(p_row ->> 'site', ''),
         room_name    = nullif(p_row ->> 'room_name', ''),
         stage        = coalesce(nullif(p_row ->> 'stage', ''), 'Discovery'),
         status       = coalesce(nullif(p_row ->> 'status', ''), 'Draft'),
         created_at   = coalesce(nullif(p_row ->> 'created_at', '')::timestamptz, created_at),
         updated_at   = coalesce(nullif(p_row ->> 'updated_at', '')::timestamptz, now())
   where id = v_row_id
     and workspace_id = v_workspace_id
     and coalesce((payload ->> 'syncRevision')::bigint, 0) = p_expected_revision
   returning coalesce((payload ->> 'syncRevision')::bigint, 0) into v_next_revision;

  if v_next_revision is not null then
    -- Advance the generation register so any whole-snapshot commit that read
    -- BEFORE this write refuses instead of reconciling the row away. The
    -- advance is unconditional (this transaction already owns the row write,
    -- so the register move cannot race it); if the register row is missing the
    -- migration 013 baseline, fail loudly rather than writing unguarded rows.
    update public.wingman_db_generation
       set generation = generation + 1,
           updated_at = now()
     where id = 'global'
     returning generation into v_generation;

    if v_generation is null then
      raise exception
        'wingman_db_generation register is empty: insert the ''global'' row (migration 013) before committing project rows';
    end if;

    if p_audit is not null and jsonb_typeof(p_audit) = 'object' then
      insert into public.wingman_audit_events (
        id, workspace_id, project_id, actor_name, actor_email, scope, action,
        severity, detail, created_at, payload
      )
      values (
        coalesce(p_audit ->> 'id', 'audit_' || md5(random()::text || clock_timestamp()::text)),
        nullif(p_audit ->> 'workspace_id', ''),
        nullif(p_audit ->> 'project_id', ''),
        coalesce(nullif(p_audit ->> 'actor_name', ''), 'Wingman'),
        nullif(p_audit ->> 'actor_email', ''),
        coalesce(nullif(p_audit ->> 'scope', ''), 'projects'),
        coalesce(nullif(p_audit ->> 'action', ''), 'updated'),
        coalesce(nullif(p_audit ->> 'severity', ''), 'info'),
        coalesce(nullif(p_audit ->> 'detail', ''), 'Project changes were synchronized to the deployment backend.'),
        coalesce(nullif(p_audit ->> 'created_at', '')::timestamptz, now()),
        coalesce(p_audit -> 'payload', '{}'::jsonb)
      )
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
      get diagnostics v_upserted_audit = row_count;
    end if;

    return jsonb_build_object(
      'committed', true,
      'revision', v_next_revision,
      'generation', v_generation,
      'upserted_audit', v_upserted_audit
    );
  end if;

  -- -------------------------------------------------------------------------
  -- The guarded update matched no row. Two possibilities: the row exists at a
  -- NEWER revision (a concurrent writer won - refuse without writing), or the
  -- row does not exist yet (a new project - insert below).
  -- -------------------------------------------------------------------------
  select coalesce((payload ->> 'syncRevision')::bigint, 0)
    into v_current
    from public.wingman_projects
   where id = v_row_id;

  if v_current is not null then
    return jsonb_build_object(
      'committed', false,
      'stale', true,
      'reason', 'project was read at revision ' || p_expected_revision ||
                ' but is now at revision ' || v_current ||
                '; re-read the current row, re-merge, and retry',
      'expected_revision', p_expected_revision,
      'current_revision', v_current
    );
  end if;

  -- Row absent: insert the new project. The payload already carries its seeded
  -- revision (the app's merge seeds new projects at greatest(1, base + 1)).
  -- A concurrent insert from another instance is detected by the primary-key
  -- conflict and surfaced as a stale refusal (the row now exists; re-read it).
  begin
    insert into public.wingman_projects (
      id, workspace_id, owner_id, project_name, customer, site, room_name,
      stage, status, created_at, updated_at, payload
    )
    values (
      v_row_id,
      v_workspace_id,
      nullif(p_row ->> 'owner_id', ''),
      coalesce(nullif(p_row ->> 'project_name', ''), 'Untitled Project'),
      nullif(p_row ->> 'customer', ''),
      nullif(p_row ->> 'site', ''),
      nullif(p_row ->> 'room_name', ''),
      coalesce(nullif(p_row ->> 'stage', ''), 'Discovery'),
      coalesce(nullif(p_row ->> 'status', ''), 'Draft'),
      coalesce(nullif(p_row ->> 'created_at', '')::timestamptz, now()),
      coalesce(nullif(p_row ->> 'updated_at', '')::timestamptz, now()),
      coalesce(p_row -> 'payload', '{}'::jsonb)
    )
    on conflict (id) do nothing
    returning coalesce((payload ->> 'syncRevision')::bigint, 0) into v_next_revision;
  exception
    when unique_violation then
      v_next_revision := null;
  end;

  if v_next_revision is null then
    -- Another instance created the row between our read and this insert:
    -- re-read its revision and refuse so the caller re-merges against the
    -- current content instead of overwriting it.
    select coalesce((payload ->> 'syncRevision')::bigint, 0)
      into v_current
      from public.wingman_projects
     where id = v_row_id;
    return jsonb_build_object(
      'committed', false,
      'stale', true,
      'reason', 'project did not exist when read but was created concurrently; re-read the current row, re-merge, and retry',
      'expected_revision', p_expected_revision,
      'current_revision', coalesce(v_current, 0)
    );
  end if;

  update public.wingman_db_generation
     set generation = generation + 1,
         updated_at = now()
   where id = 'global'
   returning generation into v_generation;

  if v_generation is null then
    raise exception
      'wingman_db_generation register is empty: insert the ''global'' row (migration 013) before committing project rows';
  end if;

  if p_audit is not null and jsonb_typeof(p_audit) = 'object' then
    insert into public.wingman_audit_events (
      id, workspace_id, project_id, actor_name, actor_email, scope, action,
      severity, detail, created_at, payload
    )
    values (
      coalesce(p_audit ->> 'id', 'audit_' || md5(random()::text || clock_timestamp()::text)),
      nullif(p_audit ->> 'workspace_id', ''),
      nullif(p_audit ->> 'project_id', ''),
      coalesce(nullif(p_audit ->> 'actor_name', ''), 'Wingman'),
      nullif(p_audit ->> 'actor_email', ''),
      coalesce(nullif(p_audit ->> 'scope', ''), 'projects'),
      coalesce(nullif(p_audit ->> 'action', ''), 'updated'),
      coalesce(nullif(p_audit ->> 'severity', ''), 'info'),
      coalesce(nullif(p_audit ->> 'detail', ''), 'Project changes were synchronized to the deployment backend.'),
      coalesce(nullif(p_audit ->> 'created_at', '')::timestamptz, now()),
      coalesce(p_audit -> 'payload', '{}'::jsonb)
    )
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
    get diagnostics v_upserted_audit = row_count;
  end if;

  return jsonb_build_object(
    'committed', true,
    'revision', v_next_revision,
    'generation', v_generation,
    'upserted_audit', v_upserted_audit
  );
end;
$$;

-- Only the service role may commit project rows; revoke the implicit PUBLIC
-- execute grant for the new function.
revoke execute on function public.wingman_project_put(jsonb, bigint, jsonb) from public;
grant execute on function public.wingman_project_put(jsonb, bigint, jsonb) to service_role;
