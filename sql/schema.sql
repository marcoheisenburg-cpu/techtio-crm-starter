create extension if not exists "pgcrypto";
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text,
  telegram text,
  email text,
  payment_terms text,
  notes text,
  created_at timestamptz default now()
);

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  email text,
  telegram text,
  status text default 'active',
  created_at timestamptz default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  geo text not null,
  vertical text not null,
  payout numeric(12,2) default 0,
  crm text,
  status text default 'active',
  daily_cap integer default 0,
  notes text,
  created_at timestamptz default now()
);

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
  lifetime_spend numeric(12,2) default 0,
  created_at timestamptz default now(),
  notes text
);

create table public.daily_spend (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  ad_account_id uuid references public.ad_accounts(id) on delete cascade,
  buyer_id uuid references public.buyers(id) on delete set null,
  agency_id uuid references public.agencies(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  geo text not null,
  spend numeric(12,2) not null default 0,
  leads integer not null default 0,
  ftds integer not null default 0,
  revenue numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz default now(),
  unique(date, ad_account_id, offer_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_date date default current_date,
  subid text,
  ad_account_id uuid references public.ad_accounts(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  geo text,
  status text default 'new',
  crm text,
  crm_response jsonb,
  revenue numeric(12,2) default 0
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  sale_date date default current_date,
  subid text,
  lead_id uuid references public.leads(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  amount numeric(12,2) not null default 0,
  status text default 'approved'
);

create view public.daily_spend_metrics as
select
  ds.*,
  case when ds.leads > 0 then ds.spend / ds.leads else 0 end as cpl,
  case when ds.ftds > 0 then ds.spend / ds.ftds else 0 end as cpa,
  ds.revenue - ds.spend as profit,
  case when ds.spend > 0 then ((ds.revenue - ds.spend) / ds.spend) * 100 else 0 end as roi
from public.daily_spend ds;

create table public.budget_pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period text not null,
  total_budget numeric(12,2) not null default 0,
  currency text default 'USD',
  warning_threshold_pct numeric(5,2) default 80,
  status text default 'active',
  notes text,
  created_at timestamptz default now()
);

create table public.buyer_budget_allocations (
  id uuid primary key default gen_random_uuid(),
  budget_pool_id uuid references public.budget_pools(id) on delete cascade,
  buyer_id uuid references public.buyers(id) on delete cascade,
  allocated_budget numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz default now(),
  unique(budget_pool_id, buyer_id)
);

create view public.buyer_budget_usage as
select
  bba.id,
  bp.name as pool_name,
  bp.period,
  b.name as buyer_name,
  bba.allocated_budget,
  coalesce(sum(ds.spend), 0) as spent,
  bba.allocated_budget - coalesce(sum(ds.spend), 0) as remaining_budget,
  case when bba.allocated_budget > 0 then (coalesce(sum(ds.spend), 0) / bba.allocated_budget) * 100 else 0 end as used_pct,
  coalesce(sum(ds.leads), 0) as leads,
  case when coalesce(sum(ds.leads), 0) > 0 then coalesce(sum(ds.spend), 0) / coalesce(sum(ds.leads), 0) else 0 end as cpl,
  coalesce(sum(ds.revenue), 0) - coalesce(sum(ds.spend), 0) as profit
from public.buyer_budget_allocations bba
join public.budget_pools bp on bp.id = bba.budget_pool_id
join public.buyers b on b.id = bba.buyer_id
left join public.daily_spend ds on ds.buyer_id = b.id and to_char(ds.date, 'YYYY-MM') = bp.period
group by bba.id, bp.name, bp.period, b.name, bba.allocated_budget;

create view public.budget_pool_usage as
select
  bp.*,
  coalesce(sum(ds.spend), 0) as spent,
  bp.total_budget - coalesce(sum(ds.spend), 0) as remaining_budget,
  case when bp.total_budget > 0 then (coalesce(sum(ds.spend), 0) / bp.total_budget) * 100 else 0 end as used_pct
from public.budget_pools bp
left join public.daily_spend ds on to_char(ds.date, 'YYYY-MM') = bp.period
group by bp.id;
