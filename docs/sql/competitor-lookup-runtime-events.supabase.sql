-- Wingman lookup diagnostics event persistence (Supabase/Postgres)
-- Apply in Supabase SQL editor to persist support diagnostics across restarts.

create table if not exists public.competitor_lookup_runtime_events (
  id text primary key,
  event_ts timestamptz not null,
  scope text not null,
  severity text not null,
  mode text not null,
  message text not null,
  query text,
  brand text,
  sku text,
  warnings jsonb not null default '[]'::jsonb,
  trace jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists competitor_lookup_runtime_events_event_ts_idx
  on public.competitor_lookup_runtime_events (event_ts desc);

create index if not exists competitor_lookup_runtime_events_scope_idx
  on public.competitor_lookup_runtime_events (scope);

create index if not exists competitor_lookup_runtime_events_severity_idx
  on public.competitor_lookup_runtime_events (severity);
