create table if not exists public.wingman_app_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists wingman_app_state_updated_at_idx
  on public.wingman_app_state (updated_at desc);
