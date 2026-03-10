-- Wingman competitor approvals persistence table (Supabase/Postgres)
-- Apply in Supabase SQL editor before enabling server-side approvals persistence.

create table if not exists public.competitor_approvals (
  id text primary key,
  cache_key text,
  brand text not null,
  sku text not null,
  name text not null,
  source text not null default 'unknown',
  source_url text,
  approved_by text not null default 'wingman-user',
  notes text,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competitor_approvals_brand_sku_idx
  on public.competitor_approvals (lower(brand), upper(sku));

create index if not exists competitor_approvals_updated_at_idx
  on public.competitor_approvals (updated_at desc);

create or replace function public.set_competitor_approvals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_competitor_approvals_updated_at on public.competitor_approvals;
create trigger trg_competitor_approvals_updated_at
before update on public.competitor_approvals
for each row execute procedure public.set_competitor_approvals_updated_at();
