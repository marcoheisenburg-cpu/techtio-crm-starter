create table public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  account_name text not null,
  account_external_id text,
  platform text default 'Facebook',
  agency_id uuid references public.agencies(id) on delete set null,
  buyer_id uuid references public.buyers(id) on delete set null,
  business_manager text,
  geo text,
  vertical text,
  status text default 'active',
  currency text default 'USD',
  timezone text,

  daily_limit numeric(12,2) default 0,
  daily_budget numeric(12,2) default 0,
  monthly_budget numeric(12,2) default 0,
  spend_limit numeric(12,2) default 0,
  lifetime_spend numeric(12,2) default 0,

  ban_date date,
  ban_reason text,
  replacement_needed boolean default false,

  created_at timestamptz default now(),
  notes text
);