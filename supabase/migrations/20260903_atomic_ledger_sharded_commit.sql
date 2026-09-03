-- ============================================================================
-- Sharded commit support for the competitor decision ledger mirror
-- Version: 12.0.0
--
-- Migration 011's wingman_ledger_commit is the atomic full-mirror commit: one
-- transaction deletes rows no longer in the ledger and upserts the incoming
-- rows, bounded by an 8 MiB payload ceiling (the same 413-style cap the store
-- pre-flights). A mirror that grows past that ceiling previously had no sync
-- path at all - the store refused with LEDGER_PAYLOAD_TOO_LARGE.
--
-- This migration gives the same function a `mode` parameter so an oversized
-- mirror can be pushed in SHARDS below the ceiling:
--
--   mode 'full'      (default)  - current behavior: delete stale + upsert in
--                                 one transaction, bounded by the ceiling.
--   mode 'upsert'    - upsert the incoming rows ONLY; never deletes. Each
--                      shard push is a small, ceiling-bounded transaction.
--   mode 'reconcile' - delete every row whose id is NOT in the incoming
--                      payload; never upserts. Called ONCE at the end with
--                      the full id list (ids are tiny, far below the ceiling),
--                      so stale rows are removed atomically after all shards
--                      have landed.
--
-- The sharded protocol is N x wingman_ledger_commit(shard, 'upsert') followed
-- by one wingman_ledger_commit(full-id-list, 'reconcile'). Upserts only ever
-- add/refresh rows (never delete), and the final reconcile is a single atomic
-- delete, so the mirror is never observed torn and never loses a row that a
-- concurrent writer just pushed: a shard push from another machine lands as an
-- upsert, and only the machine whose reconcile runs last decides the stale set.
--
-- The old single-argument signature is dropped so exactly one canonical
-- function exists (PostgREST would otherwise route one-arg calls to the
-- pre-012 overload and skip the mode logic entirely).
-- ============================================================================

drop function if exists public.wingman_ledger_commit(jsonb);

create or replace function public.wingman_ledger_commit(payload jsonb, mode text default 'full')
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ledger int := 0;
begin
  if jsonb_typeof(payload) <> 'object' then
    raise exception 'wingman_ledger_commit payload must be a JSON object, got %', coalesce(jsonb_typeof(payload), 'null');
  end if;

  if mode not in ('full', 'upsert', 'reconcile') then
    raise exception 'wingman_ledger_commit mode must be one of full|upsert|reconcile, got %', coalesce(mode, 'null');
  end if;

  -- --------------------------------------------------------------------------
  -- Oversized-payload circuit breaker (413 semantics, mirroring the API's body
  -- cap): a mirror blob larger than this cannot be posted through PostgREST
  -- reliably and would only fail far from the cause. The store pre-flights the
  -- SAME 8388608-byte default (WINGMAN_LEDGER_COMMIT_MAX_BYTES) before calling
  -- this RPC; this raise is the backstop for direct callers.
  -- --------------------------------------------------------------------------
  if octet_length(payload::text) > 8388608 then
    raise exception
      'wingman_ledger_commit payload too large (413): % bytes exceeds the 8388608-byte commit limit; shrink the mirror or sync in shards',
      octet_length(payload::text);
  end if;

  -- --------------------------------------------------------------------------
  -- Delete phase: 'full' and 'reconcile' reconcile the mirror (delete rows no
  -- longer in the incoming ledger). 'upsert' must never delete - it is one
  -- shard of a larger push whose other shards are not present in this payload.
  -- --------------------------------------------------------------------------

  -- Only reconcile when the caller actually provided the ledger as an array:
  -- an omitted or JSON-null section must leave the mirror untouched (the
  -- documented payload contract), never wipe it. An explicit [] still means
  -- "the mirror should be empty", so the delete runs and clears the table.
  if mode in ('full', 'reconcile') then
    delete from public.competitor_match_decisions l
    where jsonb_typeof(payload -> 'ledger') = 'array'
      and not exists (
        select 1 from jsonb_array_elements(payload -> 'ledger') e(x)
        where e.x ->> 'id' = l.id
      );
  end if;

  -- --------------------------------------------------------------------------
  -- Upsert phase: 'full' and 'upsert' write the incoming rows; 'reconcile'
  -- passes id-only rows and must never touch payloads.
  -- --------------------------------------------------------------------------

  if mode in ('full', 'upsert') then
    insert into public.competitor_match_decisions (id, payload, updated_at)
    select
      e.x ->> 'id',
      coalesce(e.x -> 'payload', '{}'::jsonb),
      coalesce(nullif(e.x ->> 'updated_at', '')::timestamptz, now())
    from jsonb_array_elements(case when jsonb_typeof(payload -> 'ledger') = 'array' then payload -> 'ledger' else '[]'::jsonb end) e(x)
    on conflict (id) do update set
      payload    = excluded.payload,
      updated_at = excluded.updated_at;
    get diagnostics v_ledger = row_count;
  end if;

  return jsonb_build_object(
    'committed', true,
    'upserted_ledger', v_ledger,
    'mode', mode
  );
end;
$$;

-- Only the service role may replace the whole mirror; revoke the implicit
-- PUBLIC execute grant for the new signature.
revoke execute on function public.wingman_ledger_commit(jsonb, text) from public;
grant execute on function public.wingman_ledger_commit(jsonb, text) to service_role;