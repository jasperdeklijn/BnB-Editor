-- ============================================================
-- Scheduled lead-agent settings and run history
-- ============================================================

begin;

create table if not exists public.lead_agent_settings (
  singleton_key boolean primary key default true,
  enabled boolean not null default false,
  cities text[] not null default array['Uden']::text[],
  categories text[] not null default array['kapper']::text[],
  weekly_limit integer not null default 25,
  email_notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_agent_settings_singleton_check check (singleton_key),
  constraint lead_agent_settings_weekly_limit_check check (weekly_limit between 1 and 25),
  constraint lead_agent_settings_cities_check check (cardinality(cities) between 1 and 25),
  constraint lead_agent_settings_categories_check check (cardinality(categories) between 1 and 25)
);

insert into public.lead_agent_settings (singleton_key)
values (true)
on conflict (singleton_key) do nothing;

create table if not exists public.lead_agent_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  trigger text not null default 'cron',
  status text not null default 'running',
  requested_limit integer not null default 0,
  found_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  failed_count integer not null default 0,
  error_message text,
  notification_sent boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint lead_agent_runs_key_not_blank_check check (btrim(run_key) <> ''),
  constraint lead_agent_runs_trigger_check check (trigger in ('cron', 'manual')),
  constraint lead_agent_runs_status_check check (status in ('running', 'succeeded', 'partial', 'failed', 'skipped')),
  constraint lead_agent_runs_counts_check check (
    requested_limit >= 0 and found_count >= 0 and created_count >= 0 and updated_count >= 0 and failed_count >= 0
  )
);

drop trigger if exists set_lead_agent_settings_updated_at on public.lead_agent_settings;
create trigger set_lead_agent_settings_updated_at
  before update on public.lead_agent_settings
  for each row execute procedure public.set_updated_at();

create index if not exists idx_lead_agent_runs_started_at
  on public.lead_agent_runs (started_at desc);

alter table public.lead_agent_settings enable row level security;
alter table public.lead_agent_runs enable row level security;

comment on table public.lead_agent_settings is
  'Server-owned singleton configuration for the scheduled lead agent.';
comment on table public.lead_agent_runs is
  'Server-owned history used for cron idempotency and admin notifications.';

commit;
