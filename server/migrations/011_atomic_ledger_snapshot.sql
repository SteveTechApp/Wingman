-- ============================================================================
-- Atomic mirror commit for the competitor decision ledger
-- Version: 11.0.0
--
-- competitor-decision-ledger-store.mjs previously mirrored the whole ledger to
-- competitor_match_decisions as TWO separate PostgREST calls: a full-table
-- upsert, then a read-back so stale rows (ids not in the pushed ledger) could
-- be deleted. Each call was its own auto-committed transaction, so:
--
--   1. A failure between them left a torn mirror (new rows written, stale rows
--      still present) - the code even surfaced the window in its own error
--      message: "Upsert succeeded but stale-row cleanup failed".
--   2. Two machines syncing concurrently could interleave: machine A's
--      stale-row delete ran between machine B's upsert and B's delete,
--      erasing B's freshly written decisions as "stale" - the same silent
--      cross-instance loss the app snapshot had before migration 009.
--
-- This function performs the ENTIRE mirror reconciliation (delete rows no
-- longer in the incoming ledger + upsert the incoming rows) inside ONE
-- transaction: a commit either lands completely or not at all, and concurrent
-- writers serialize on the table lock. The sync tool calls it via a single
-- PostgREST RPC:
--
--   select * from wingman_ledger_commit('{
--     "ledger": [ { "id": "...", "payload": {...}, "updated_at": "..." } ]
--   }'::jsonb)
--
-- Only service_role may execute it - the function can replace the whole mirror.
-- ============================================================================

create or replace function public.wingman_ledger_commit(payload jsonb)
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
  -- Delete rows no longer in the ledger snapshot (the mirror must be exact).
  -- --------------------------------------------------------------------------

  -- Only reconcile when the caller actually provided the ledger as an array:
  -- an omitted or JSON-null section must leave the mirror untouched (the
  -- documented payload contract), never wipe it. An explicit [] still means
  -- "the mirror should be empty", so the delete runs and clears the table.
  delete from public.competitor_match_decisions l
  where jsonb_typeof(payload -> 'ledger') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(payload -> 'ledger') e(x)
      where e.x ->> 'id' = l.id
    );

  -- --------------------------------------------------------------------------
  -- Upsert the incoming rows.
  -- --------------------------------------------------------------------------

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

  return jsonb_build_object(
    'committed', true,
    'upserted_ledger', v_ledger
  );
end;
$$;

-- Only the service role may replace the whole mirror; revoke the implicit
-- PUBLIC execute grant.
revoke execute on function public.wingman_ledger_commit(jsonb) from public;
grant execute on function public.wingman_ledger_commit(jsonb) to service_role;

-- ============================================================================
-- Diagnostics (Verify block)
-- The function must exist and be executable only by service_role.
--   select proname from pg_proc where proname = 'wingman_ledger_commit';
-- ============================================================================