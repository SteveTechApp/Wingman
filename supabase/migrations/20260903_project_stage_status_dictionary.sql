-- ============================================================================
-- Canonical project stage/status data dictionary (migration-time definition)
-- Version: 14.0.0
--
-- wingman_projects.stage and wingman_projects.status are the two relational
-- columns that carry the CANONICAL account-lifecycle vocabulary:
--
--   stage  -> Discovery | Design | Proposal | Deployment | Support
--              (Discovery -> Design -> Proposal -> Deployment -> Support;
--               list order is the lifecycle order for analytics)
--   status -> Draft | In Progress | Commercial Ready | Archived
--              (Draft -> In Progress -> Commercial Ready -> Archived)
--
-- The project DOCUMENT the client owns speaks a different vocabulary
-- (ProjectStage: Discovery | Competitor Compare | Proposal Builder |
-- Recommendations | Templates | Support; StatusVariant: recommended |
-- caution | alternative) and travels VERBATIM inside the payload JSONB
-- column. The canonical columns are a one-way enrichment computed at
-- snapshot build time by server/project-row-vocabulary.mjs
-- (canonicalStageForRow / canonicalStatusForRow, wired into
-- writeDbToSupabaseTables; incident record ADR-0001 section 1.2g). The full
-- mapping tables, per-value meanings, and the extension procedure live in
-- docs/PROJECT_LIFECYCLE_DICTIONARY.md - future flows and analytics must
-- read and write only these two vocabularies at their respective layers.
--
-- WHY THIS MIGRATION EXISTS: the server migration set created these CHECKs
-- inline from the start (001_initial_schema.sql), but the mirrored Supabase
-- GitHub-integration set (20260310_create_wingman_workspace_tables.sql)
-- created wingman_projects WITHOUT them - two provisioning routes, two
-- schemas, and the constraint-less route would silently accept verbatim
-- client values in the canonical columns. This migration closes the gap on
-- BOTH routes with the NAMED constraints below. It is idempotent:
-- environments that already carry the constraints (under the same
-- auto-generated names from migration 001) are a no-op, and environments
-- provisioned from the Supabase set gain the same backstop.
--
-- If this migration fails validation on an existing database, rows outside
-- the canonical vocabulary are present there (written before the constraint
-- existed); canonicalise or remove those rows first, then re-run.
-- ============================================================================

do $$
begin
  if not exists (
    select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public'
       and t.relname = 'wingman_projects'
       and c.conname = 'wingman_projects_stage_check'
  ) then
    alter table public.wingman_projects
      add constraint wingman_projects_stage_check
      check (stage in ('Discovery', 'Design', 'Proposal', 'Deployment', 'Support'));
  end if;

  if not exists (
    select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public'
       and t.relname = 'wingman_projects'
       and c.conname = 'wingman_projects_status_check'
  ) then
    alter table public.wingman_projects
      add constraint wingman_projects_status_check
      check (status in ('Draft', 'In Progress', 'Commercial Ready', 'Archived'));
  end if;
end
$$;
