create table if not exists public.wingman_users (
  id text primary key,
  name text not null,
  company text,
  email text not null unique,
  role text not null default 'sales',
  password_salt text not null,
  password_hash text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  last_login_at timestamptz
);

create table if not exists public.wingman_workspaces (
  id text primary key,
  name text not null,
  slug text not null unique,
  tier text not null default 'pilot',
  owner_user_id text not null references public.wingman_users(id) on delete cascade,
  active_project_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wingman_workspace_members (
  id text primary key,
  workspace_id text not null references public.wingman_workspaces(id) on delete cascade,
  user_id text not null references public.wingman_users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, user_id)
);

create table if not exists public.wingman_sessions (
  id text primary key,
  token_hash text not null unique,
  user_id text not null references public.wingman_users(id) on delete cascade,
  workspace_id text not null references public.wingman_workspaces(id) on delete cascade,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null
);

create table if not exists public.wingman_projects (
  id text primary key,
  workspace_id text not null references public.wingman_workspaces(id) on delete cascade,
  owner_id text references public.wingman_users(id) on delete set null,
  project_name text not null,
  customer text,
  site text,
  room_name text,
  stage text not null default 'Discovery',
  status text not null default 'Draft',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  payload jsonb not null
);

create table if not exists public.wingman_audit_events (
  id text primary key,
  workspace_id text references public.wingman_workspaces(id) on delete cascade,
  project_id text,
  actor_name text not null,
  actor_email text,
  scope text not null,
  action text not null,
  severity text not null default 'info',
  detail text not null,
  created_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.wingman_telemetry_events (
  id text primary key,
  workspace_id text references public.wingman_workspaces(id) on delete cascade,
  user_id text references public.wingman_users(id) on delete set null,
  project_id text,
  kind text not null,
  message text not null,
  timestamp timestamptz not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists wingman_workspace_members_workspace_idx
  on public.wingman_workspace_members (workspace_id);

create index if not exists wingman_sessions_workspace_idx
  on public.wingman_sessions (workspace_id, expires_at desc);

create index if not exists wingman_projects_workspace_idx
  on public.wingman_projects (workspace_id, updated_at desc);

create index if not exists wingman_audit_events_workspace_idx
  on public.wingman_audit_events (workspace_id, created_at desc);

create index if not exists wingman_telemetry_events_workspace_idx
  on public.wingman_telemetry_events (workspace_id, timestamp desc);
