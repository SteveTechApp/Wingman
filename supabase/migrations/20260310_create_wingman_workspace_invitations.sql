create table if not exists public.wingman_workspace_invitations (
  id text primary key,
  workspace_id text not null references public.wingman_workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'customer',
  status text not null default 'pending',
  invited_by_user_id text references public.wingman_users(id) on delete set null,
  invited_by_name text not null,
  invited_by_email text,
  token_hash text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz
);

create index if not exists wingman_workspace_invitations_workspace_idx
  on public.wingman_workspace_invitations (workspace_id, created_at desc);

create index if not exists wingman_workspace_invitations_email_idx
  on public.wingman_workspace_invitations (workspace_id, email);
