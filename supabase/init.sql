-- ============================================================
-- Small Business Website Builder database init
-- ============================================================
-- Use this file to rebuild the application database schema in a
-- Supabase project. It intentionally drops the application tables
-- and recreates them from the current generic business/services model.
--
-- Run from Supabase SQL Editor or psql connected to your Supabase DB.
-- WARNING: this deletes application data in the tables listed below.
-- It does not delete auth.users.
-- ============================================================

begin;

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Reset application schema objects
-- ------------------------------------------------------------

drop table if exists public.contact_requests cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.calendar_availability_windows cascade;
drop table if exists public.calendar_entries cascade;
drop table if exists public.leads cascade;
drop table if exists public.section_transitions cascade;
drop table if exists public.website_sections cascade;
drop table if exists public.services cascade;
drop table if exists public.rooms cascade;
drop table if exists public.websites cascade;
drop table if exists public.businesses cascade;
drop table if exists public.bnbs cascade;

drop function if exists public.set_updated_at() cascade;
drop function if exists public.update_updated_at_column() cascade;

-- ------------------------------------------------------------
-- Shared updated_at trigger helper
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Backwards-compatible name used by older migrations/scripts.
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------`r`n-- Generic business/services model`r`n-- ------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  category text not null default 'general_service',
  tagline text not null default '',
  description text not null default '',
  email text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  website_url text not null default '',
  street text not null default '',
  city text not null default '',
  postal text not null default '',
  country text not null default 'NL',
  latitude numeric,
  longitude numeric,
  social_links jsonb not null default '{}'::jsonb,
  opening_note text not null default '',
  appointment_start_time text not null default '',
  appointment_end_time text not null default '',
  capacity integer,
  languages text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  price text not null default '',
  duration text not null default '',
  capacity integer,
  image_urls jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_businesses_updated_at
  before update on public.businesses
  for each row execute procedure public.set_updated_at();

create trigger set_services_updated_at
  before update on public.services
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Websites, sections, and transitions
-- ------------------------------------------------------------

create table public.websites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  title text not null default 'Mijn website',
  slug text not null unique,
  custom_domain text unique,
  published boolean not null default false,
  seo jsonb not null default '{}'::jsonb,
  analytics jsonb not null default '{}'::jsonb,
  theme_config jsonb default null,
  live_snapshot jsonb,
  live_published_at timestamptz,
  draft_version uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.websites.theme_config is
  'Theme configuration including paletteId, fontPairId, spacing, and radius';

comment on column public.websites.live_snapshot is
  'Immutable public rendering snapshot replaced atomically by a successful publish.';

comment on column public.websites.live_published_at is
  'Timestamp of the draft promotion that produced live_snapshot.';

create table public.website_sections (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  position integer not null,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  styles jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  action text not null,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone not null default now()
);

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references public.websites(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  request_type text not null default 'contact'
    check (request_type in ('contact', 'quote', 'appointment', 'booking_request', 'whatsapp')),
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  service text not null default '',
  preferred_date text not null default '',
  budget text not null default '',
  message text not null default '',
  payload jsonb not null default '{}'::jsonb,
  recipient_email text not null default '',
  source text not null default 'website_form',
  created_at timestamptz not null default now()
);

create table public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  contact_request_id uuid references public.contact_requests(id) on delete set null,
  entry_type text not null default 'appointment'
    check (entry_type in ('appointment', 'booking', 'blocked', 'note')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'blocked')),
  source text not null default 'manual'
    check (source in ('manual', 'website_form', 'contact_request', 'import')),
  title text not null default '',
  customer_name text not null default '',
  customer_email text not null default '',
  customer_phone text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  timezone text not null default 'Europe/Amsterdam',
  internal_notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_entries_time_range_check check (end_at > start_at)
);

create table public.calendar_availability_windows (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  weekday integer not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'Europe/Amsterdam',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_availability_windows_time_range_check check (end_time > start_time)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  category text,
  city text,
  website text,
  phone text,
  email text,
  google_place_id text,
  google_rating numeric,
  google_reviews_count integer,
  has_website boolean not null default false,
  has_https boolean not null default false,
  has_mobile_meta boolean not null default false,
  has_contact_form boolean not null default false,
  has_clear_cta boolean not null default false,
  pagespeed_score integer,
  seo_title text,
  seo_description text,
  lead_score integer not null default 0,
  reason text,
  outreach_draft text,
  status text not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_google_place_id_unique unique (google_place_id),
  constraint leads_website_unique unique (website),
  constraint leads_google_place_id_not_blank_check
    check (google_place_id is null or btrim(google_place_id) <> ''),
  constraint leads_website_not_blank_check
    check (website is null or btrim(website) <> ''),
  constraint leads_google_rating_check
    check (google_rating is null or (google_rating >= 0 and google_rating <= 5)),
  constraint leads_google_reviews_count_check
    check (google_reviews_count is null or google_reviews_count >= 0),
  constraint leads_pagespeed_score_check
    check (pagespeed_score is null or (pagespeed_score >= 0 and pagespeed_score <= 100)),
  constraint leads_lead_score_check
    check (lead_score >= 0 and lead_score <= 100),
  constraint leads_status_check
    check (status in ('new', 'interesting', 'contacted', 'not_interested', 'customer', 'ignored'))
);

create table public.section_transitions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  from_section_id uuid not null references public.website_sections(id) on delete cascade,
  to_section_id uuid not null references public.website_sections(id) on delete cascade,
  transition jsonb default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_from_to unique (from_section_id, to_section_id)
);

create trigger update_websites_updated_at
  before update on public.websites
  for each row execute procedure public.set_updated_at();

create trigger trg_website_sections_updated_at
  before update on public.website_sections
  for each row execute procedure public.set_updated_at();

create trigger trg_section_transitions_updated_at
  before update on public.section_transitions
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Server-owned subscriptions and entitlements
-- ------------------------------------------------------------

create table public.subscriptions (
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

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Draft version tracking and atomic live promotion
-- ------------------------------------------------------------

create or replace function public.bump_website_own_draft_version()
returns trigger
language plpgsql
as $$
begin
  if row(new.title, new.slug, new.custom_domain, new.business_id, new.seo, new.analytics, new.theme_config)
     is distinct from
     row(old.title, old.slug, old.custom_domain, old.business_id, old.seo, old.analytics, old.theme_config) then
    new.draft_version = gen_random_uuid();
  end if;
  return new;
end;
$$;

create trigger bump_website_own_draft_version
  before update on public.websites
  for each row execute procedure public.bump_website_own_draft_version();

create or replace function public.bump_related_website_draft_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_website_id uuid;
  target_business_id uuid;
  target_user_id uuid;
begin
  if tg_table_name in ('website_sections', 'section_transitions') then
    target_website_id = case when tg_op = 'DELETE' then old.website_id else new.website_id end;
    update public.websites set draft_version = gen_random_uuid() where id = target_website_id;
  elsif tg_table_name in ('services', 'calendar_availability_windows') then
    target_business_id = case when tg_op = 'DELETE' then old.business_id else new.business_id end;
    select user_id into target_user_id from public.businesses where id = target_business_id;
    update public.websites
      set draft_version = gen_random_uuid()
      where business_id = target_business_id
         or (business_id is null and user_id = target_user_id);
  elsif tg_table_name = 'businesses' then
    target_business_id = case when tg_op = 'DELETE' then old.id else new.id end;
    target_user_id = case when tg_op = 'DELETE' then old.user_id else new.user_id end;
    update public.websites
      set draft_version = gen_random_uuid()
      where business_id = target_business_id
         or (business_id is null and user_id = target_user_id);
  end if;
  return null;
end;
$$;

create trigger bump_website_draft_from_sections
  after insert or update or delete on public.website_sections
  for each row execute procedure public.bump_related_website_draft_versions();

create trigger bump_website_draft_from_transitions
  after insert or update or delete on public.section_transitions
  for each row execute procedure public.bump_related_website_draft_versions();

create trigger bump_website_draft_from_business
  after insert or update or delete on public.businesses
  for each row execute procedure public.bump_related_website_draft_versions();

create trigger bump_website_draft_from_services
  after insert or update or delete on public.services
  for each row execute procedure public.bump_related_website_draft_versions();

create trigger bump_website_draft_from_availability
  after insert or update or delete on public.calendar_availability_windows
  for each row execute procedure public.bump_related_website_draft_versions();

create or replace function public.promote_website_live_snapshot(
  p_website_id uuid,
  p_expected_draft_version uuid,
  p_expected_subscription_updated_at timestamptz,
  p_live_snapshot jsonb,
  p_live_published_at timestamptz
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_draft_version uuid;
  current_subscription_updated_at timestamptz;
  has_subscription boolean;
begin
  if current_user_id is null then return 'unauthorized'; end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select updated_at into current_subscription_updated_at
    from public.subscriptions
    where user_id = current_user_id
    for share;
  has_subscription := found;

  if (p_expected_subscription_updated_at is null and has_subscription)
     or (p_expected_subscription_updated_at is not null and (not has_subscription or current_subscription_updated_at is distinct from p_expected_subscription_updated_at)) then
    return 'subscription_changed';
  end if;

  select draft_version into current_draft_version
    from public.websites
    where id = p_website_id and user_id = current_user_id
    for update;
  if not found then return 'not_found'; end if;
  if current_draft_version is distinct from p_expected_draft_version then return 'draft_changed'; end if;

  if exists (
    select 1 from public.websites
    where user_id = current_user_id and published = true and id <> p_website_id
  ) then
    return 'live_website_exists';
  end if;

  update public.websites
  set published = true,
      live_snapshot = p_live_snapshot,
      live_published_at = p_live_published_at,
      updated_at = now()
  where id = p_website_id and user_id = current_user_id;

  return 'published';
end;
$$;

revoke all on function public.promote_website_live_snapshot(uuid, uuid, timestamptz, jsonb, timestamptz) from public;
grant execute on function public.promote_website_live_snapshot(uuid, uuid, timestamptz, jsonb, timestamptz) to authenticated;

create trigger set_calendar_entries_updated_at
  before update on public.calendar_entries
  for each row execute procedure public.set_updated_at();

create trigger set_calendar_availability_windows_updated_at
  before update on public.calendar_availability_windows
  for each row execute procedure public.set_updated_at();

create trigger set_leads_updated_at
  before update on public.leads
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------

create index websites_slug_idx on public.websites (slug);
create index websites_user_id_idx on public.websites (user_id);
create index idx_websites_business_id on public.websites (business_id);
create index idx_websites_custom_domain on public.websites (custom_domain)
  where custom_domain is not null;
create index idx_websites_theme_config on public.websites using gin (theme_config);

create index idx_businesses_user_id on public.businesses (user_id);
create index idx_businesses_category on public.businesses (category);

create index idx_services_business_id on public.services (business_id);
create index idx_services_business_position on public.services (business_id, position);
create index idx_subscriptions_status on public.subscriptions (status);

create index idx_website_sections_website_id on public.website_sections (website_id);
create index idx_website_sections_position on public.website_sections (website_id, position);
create index idx_website_sections_type on public.website_sections (type);

create index idx_contact_requests_website_id on public.contact_requests (website_id);
create index idx_contact_requests_business_id on public.contact_requests (business_id);
create index idx_contact_requests_user_id_created_at on public.contact_requests (user_id, created_at desc);

create index idx_calendar_entries_business_start on public.calendar_entries (business_id, start_at);
create index idx_calendar_entries_business_end on public.calendar_entries (business_id, end_at);
create index idx_calendar_entries_service_start on public.calendar_entries (service_id, start_at)
  where service_id is not null;
create index idx_calendar_entries_contact_request on public.calendar_entries (contact_request_id)
  where contact_request_id is not null;
create index idx_calendar_entries_status on public.calendar_entries (business_id, status);

create index idx_calendar_availability_business_weekday
  on public.calendar_availability_windows (business_id, weekday, start_time);
create index idx_calendar_availability_service_weekday
  on public.calendar_availability_windows (service_id, weekday, start_time)
  where service_id is not null;

create index idx_leads_city on public.leads (city);
create index idx_leads_category on public.leads (category);
create index idx_leads_status on public.leads (status);

create index idx_section_transitions_website_id on public.section_transitions (website_id);
create index idx_section_transitions_from_section on public.section_transitions (from_section_id);
create index idx_section_transitions_to_section on public.section_transitions (to_section_id);

create index idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index idx_audit_logs_user_created_at on public.audit_logs (user_id, created_at desc)
  where user_id is not null;
create index idx_audit_logs_website_created_at on public.audit_logs (website_id, created_at desc)
  where website_id is not null;
create index idx_audit_logs_action_created_at on public.audit_logs (action, created_at desc);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.services enable row level security;
alter table public.websites enable row level security;
alter table public.website_sections enable row level security;
alter table public.section_transitions enable row level security;
alter table public.contact_requests enable row level security;
alter table public.calendar_entries enable row level security;
alter table public.calendar_availability_windows enable row level security;
alter table public.leads enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid());

comment on table public.subscriptions is
  'Server-owned subscription and entitlement state. Authenticated users may read only their own row; writes require trusted server/service-role access.';

-- Businesses
create policy "Anyone can view published website businesses"
  on public.businesses for select
  using (
    exists (
      select 1 from public.websites w
      where w.business_id = businesses.id
        and w.published = true
    )
  );

create policy "Users can view own businesses"
  on public.businesses for select
  using (auth.uid() = user_id);

create policy "Users can insert own businesses"
  on public.businesses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own businesses"
  on public.businesses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own businesses"
  on public.businesses for delete
  using (auth.uid() = user_id);

-- Services
create policy "Anyone can view published website services"
  on public.services for select
  using (
    exists (
      select 1 from public.websites w
      where w.business_id = services.business_id
        and w.published = true
    )
  );

create policy "Users can view own services"
  on public.services for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = services.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can insert own services"
  on public.services for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = services.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can update own services"
  on public.services for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = services.business_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = services.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can delete own services"
  on public.services for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = services.business_id
        and b.user_id = auth.uid()
    )
  );

-- Websites
create policy "Anyone can view published websites"
  on public.websites for select
  using (published = true);

create policy "Users can view their own websites"
  on public.websites for select
  using (auth.uid() = user_id);

create policy "Users can insert their own websites"
  on public.websites for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own websites"
  on public.websites for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own websites"
  on public.websites for delete
  using (auth.uid() = user_id);

-- Website sections
create policy "Anyone can view sections of published websites"
  on public.website_sections for select
  using (
    exists (
      select 1 from public.websites w
      where w.id = website_sections.website_id
        and w.published = true
    )
  );

create policy "Users can view their own website sections"
  on public.website_sections for select
  using (
    exists (
      select 1 from public.websites w
      where w.id = website_sections.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can insert their own website sections"
  on public.website_sections for insert
  with check (
    exists (
      select 1 from public.websites w
      where w.id = website_sections.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can update their own website sections"
  on public.website_sections for update
  using (
    exists (
      select 1 from public.websites w
      where w.id = website_sections.website_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.websites w
      where w.id = website_sections.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can delete their own website sections"
  on public.website_sections for delete
  using (
    exists (
      select 1 from public.websites w
      where w.id = website_sections.website_id
        and w.user_id = auth.uid()
    )
  );

-- Contact requests
create policy "Users can view own contact requests"
  on public.contact_requests for select
  using (auth.uid() = user_id);

create policy "Anyone can insert public contact requests"
  on public.contact_requests for insert
  with check (true);

create policy "Users can delete own contact requests"
  on public.contact_requests for delete
  using (auth.uid() = user_id);

-- Calendar entries
create policy "Users can view own calendar entries"
  on public.calendar_entries for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_entries.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can insert own calendar entries"
  on public.calendar_entries for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_entries.business_id
        and b.user_id = auth.uid()
    )
    and (
      calendar_entries.service_id is null
      or exists (
        select 1 from public.services s
        where s.id = calendar_entries.service_id
          and s.business_id = calendar_entries.business_id
      )
    )
    and (
      calendar_entries.contact_request_id is null
      or exists (
        select 1 from public.contact_requests cr
        where cr.id = calendar_entries.contact_request_id
          and cr.business_id = calendar_entries.business_id
      )
    )
  );

create policy "Users can update own calendar entries"
  on public.calendar_entries for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_entries.business_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_entries.business_id
        and b.user_id = auth.uid()
    )
    and (
      calendar_entries.service_id is null
      or exists (
        select 1 from public.services s
        where s.id = calendar_entries.service_id
          and s.business_id = calendar_entries.business_id
      )
    )
    and (
      calendar_entries.contact_request_id is null
      or exists (
        select 1 from public.contact_requests cr
        where cr.id = calendar_entries.contact_request_id
          and cr.business_id = calendar_entries.business_id
      )
    )
  );

create policy "Users can delete own calendar entries"
  on public.calendar_entries for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_entries.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can view own calendar availability windows"
  on public.calendar_availability_windows for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_availability_windows.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can insert own calendar availability windows"
  on public.calendar_availability_windows for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_availability_windows.business_id
        and b.user_id = auth.uid()
    )
    and (
      calendar_availability_windows.service_id is null
      or exists (
        select 1 from public.services s
        where s.id = calendar_availability_windows.service_id
          and s.business_id = calendar_availability_windows.business_id
      )
    )
  );

create policy "Users can update own calendar availability windows"
  on public.calendar_availability_windows for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_availability_windows.business_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_availability_windows.business_id
        and b.user_id = auth.uid()
    )
    and (
      calendar_availability_windows.service_id is null
      or exists (
        select 1 from public.services s
        where s.id = calendar_availability_windows.service_id
          and s.business_id = calendar_availability_windows.business_id
      )
    )
  );

create policy "Users can delete own calendar availability windows"
  on public.calendar_availability_windows for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_availability_windows.business_id
        and b.user_id = auth.uid()
    )
  );

-- Section transitions
create policy "Anyone can view transitions of published websites"
  on public.section_transitions for select
  using (
    exists (
      select 1 from public.websites w
      where w.id = section_transitions.website_id
        and w.published = true
    )
  );

create policy "Users can view their own website transitions"
  on public.section_transitions for select
  using (
    exists (
      select 1 from public.websites w
      where w.id = section_transitions.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can insert their own website transitions"
  on public.section_transitions for insert
  with check (
    exists (
      select 1 from public.websites w
      where w.id = section_transitions.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can update their own website transitions"
  on public.section_transitions for update
  using (
    exists (
      select 1 from public.websites w
      where w.id = section_transitions.website_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.websites w
      where w.id = section_transitions.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can delete their own website transitions"
  on public.section_transitions for delete
  using (
    exists (
      select 1 from public.websites w
      where w.id = section_transitions.website_id
        and w.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- Storage bucket and policies
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('user-images', 'user-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Users can upload their own images" on storage.objects;
drop policy if exists "Users can view their own images" on storage.objects;
drop policy if exists "Public read access for images" on storage.objects;
drop policy if exists "Users can delete their own images" on storage.objects;
drop policy if exists "Users can update their own images" on storage.objects;

create policy "Users can upload their own images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public read access for images"
  on storage.objects for select
  to public
  using (bucket_id = 'user-images');

create policy "Users can delete their own images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;


