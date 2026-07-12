-- Server-owned subscription state used for feature entitlements.

begin;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id text not null default 'bronze'
    check (plan_id in ('bronze', 'silver', 'gold')),
  status text not null default 'active'
    check (status in ('active', 'trial', 'past_due', 'canceled', 'expired')),
  current_price numeric(10, 2) not null default 7.95
    check (current_price >= 0),
  currency text not null default 'EUR'
    check (currency = 'EUR'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_period_check check (
    current_period_start is null
    or current_period_end is null
    or current_period_end > current_period_start
  )
);

create index if not exists idx_subscriptions_status
  on public.subscriptions (status);

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription"
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid());

comment on table public.subscriptions is
  'Server-owned subscription and entitlement state. Authenticated users may read only their own row; writes require trusted server/service-role access.';

commit;
