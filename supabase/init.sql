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

drop table if exists public.booking_holds cascade;
drop table if exists public.booking_notifications cascade;
drop table if exists public.booking_change_requests cascade;
drop table if exists public.booking_status_history cascade;
drop table if exists public.booking_customer_access cascade;
drop table if exists public.contact_requests cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.website_section_translations cascade;
drop table if exists public.website_locales cascade;
drop table if exists public.website_visits cascade;
drop table if exists public.service_translations cascade;
drop table if exists public.business_translations cascade;
drop table if exists public.user_images cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.service_booking_settings cascade;
drop table if exists public.calendar_availability_windows cascade;
drop table if exists public.calendar_entries cascade;
drop table if exists public.lead_agent_runs cascade;
drop table if exists public.lead_agent_settings cascade;
drop table if exists public.leads cascade;
drop table if exists public.mail_feedback cascade;
drop table if exists public.mail_drafts cascade;
drop table if exists public.mail_messages cascade;
drop table if exists public.mail_threads cascade;
drop table if exists public.mail_sync_runs cascade;
drop table if exists public.mail_knowledge_answers cascade;
drop table if exists public.mail_accounts cascade;
drop table if exists public.section_transitions cascade;
drop table if exists public.website_domains cascade;
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
  updated_at timestamptz not null default now(),
  constraint services_id_business_id_key unique (id, business_id)
);

create table public.service_booking_settings (
  service_id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  booking_enabled boolean not null default false,
  booking_mode text not null default 'appointment'
    check (booking_mode in ('appointment', 'stay')),
  confirmation_mode text not null default 'request'
    check (confirmation_mode in ('request', 'instant')),
  timezone text not null default 'Europe/Amsterdam',
  duration_minutes integer not null default 60 check (duration_minutes between 5 and 1440),
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 1440),
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes between 0 and 1440),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes between 0 and 1440),
  minimum_notice_minutes integer not null default 1440 check (minimum_notice_minutes between 0 and 525600),
  booking_horizon_days integer not null default 90 check (booking_horizon_days between 1 and 730),
  capacity integer not null default 1 check (capacity between 1 and 10000),
  minimum_nights integer not null default 1 check (minimum_nights between 1 and 365),
  maximum_nights integer not null default 30 check (maximum_nights between 1 and 730),
  check_in_time time not null default '15:00',
  check_out_time time not null default '11:00',
  cancellation_cutoff_minutes integer not null default 1440 check (cancellation_cutoff_minutes between 0 and 525600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_booking_settings_nights_check check (maximum_nights >= minimum_nights),
  constraint service_booking_settings_service_business_unique unique (service_id, business_id),
  constraint service_booking_settings_service_business_fkey
    foreign key (service_id, business_id)
    references public.services(id, business_id) on delete cascade
);

create table public.business_translations (
  business_id uuid not null references public.businesses(id) on delete cascade,
  locale text not null check (locale in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR')),
  name text not null default '',
  description text not null default '',
  opening_note text not null default '',
  source_hash text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, locale)
);

create table public.service_translations (
  service_id uuid not null references public.services(id) on delete cascade,
  locale text not null check (locale in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR')),
  title text not null default '',
  description text not null default '',
  source_hash text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (service_id, locale)
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
  applied_template_id text,
  live_snapshot jsonb,
  live_published_at timestamptz,
  draft_version uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.website_visits (
  id bigint generated by default as identity primary key,
  website_id uuid not null references public.websites(id) on delete cascade,
  visited_at timestamptz not null default now()
);

comment on table public.website_visits is
  'Privacy-friendly public website session counts. Stores no IP address, user agent, or visitor identifier.';

create table public.website_locales (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null check (locale in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR')),
  path_segment text not null check (path_segment ~ '^[a-z]{2}(?:-[a-z0-9]+)?$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  is_default boolean not null default false,
  is_enabled boolean not null default false,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_locales_default_enabled check (not is_default or is_enabled),
  unique (website_id, locale),
  unique (website_id, path_segment)
);

comment on column public.websites.theme_config is
  'Theme configuration including paletteId, fontPairId, spacing, and radius';

comment on column public.websites.applied_template_id is
  'Last template applied to this website; used for aggregate product analytics.';

comment on column public.websites.live_snapshot is
  'Immutable public rendering snapshot replaced atomically by a successful publish.';

comment on column public.websites.live_published_at is
  'Timestamp of the draft promotion that produced live_snapshot.';

comment on column public.websites.draft_version is
  'Changes whenever website draft content changes and is checked during atomic live publication.';

create table public.website_sections (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  position integer not null,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  styles jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_sections_id_website_unique unique (id, website_id)
);

create table public.website_section_translations (
  website_id uuid not null references public.websites(id) on delete cascade,
  section_id uuid not null,
  locale text not null,
  values jsonb not null default '{}'::jsonb,
  source_hash text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (section_id, locale),
  foreign key (section_id, website_id)
    references public.website_sections(id, website_id) on delete cascade,
  foreign key (website_id, locale)
    references public.website_locales(website_id, locale) on delete cascade
);

create table public.website_domains (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  domain text not null unique,
  is_primary boolean not null default false,
  status text not null default 'provisioning'
    check (status in ('provisioning', 'active', 'add_failed', 'removal_pending', 'removal_failed')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_domains_normalized_domain_check check (
    domain = lower(domain)
    and domain = btrim(domain)
    and domain !~ '^www\.'
  )
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
  locale text not null default 'nl-NL',
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

create table public.booking_holds (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null,
  booking_mode text not null check (booking_mode in ('appointment', 'stay')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null default 'Europe/Amsterdam',
  token_hash text not null unique,
  status text not null default 'active'
    check (status in ('active', 'consumed', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_holds_time_range_check check (end_at > start_at),
  constraint booking_holds_service_business_fkey
    foreign key (service_id, business_id)
    references public.services(id, business_id) on delete cascade
);

create table public.booking_customer_access (
  calendar_entry_id uuid primary key references public.calendar_entries(id) on delete cascade,
  token_version integer not null default 1 check (token_version > 0),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  calendar_entry_id uuid not null references public.calendar_entries(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'confirmed', 'declined', 'cancelled', 'completed', 'rescheduled', 'reschedule_requested', 'alternative_proposed', 'reschedule_declined')),
  from_status text check (from_status is null or from_status in ('pending', 'confirmed', 'cancelled', 'completed', 'blocked')),
  to_status text check (to_status is null or to_status in ('pending', 'confirmed', 'cancelled', 'completed', 'blocked')),
  actor_type text not null default 'system' check (actor_type in ('customer', 'owner', 'system')),
  public_message text not null default '',
  private_note text not null default '',
  proposed_start_at timestamptz,
  proposed_end_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint booking_status_history_proposed_range_check check (proposed_start_at is null or proposed_end_at is null or proposed_end_at > proposed_start_at)
);

create table public.booking_change_requests (
  id uuid primary key default gen_random_uuid(),
  calendar_entry_id uuid not null references public.calendar_entries(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  request_kind text not null check (request_kind in ('reschedule_request', 'alternative_proposal')),
  requested_by text not null check (requested_by in ('customer', 'owner')),
  proposed_start_at timestamptz not null,
  proposed_end_at timestamptz not null,
  customer_message text not null default '',
  private_note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_change_requests_time_range_check check (proposed_end_at > proposed_start_at)
);

create table public.booking_notifications (
  id uuid primary key default gen_random_uuid(),
  calendar_entry_id uuid not null references public.calendar_entries(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  notification_type text not null check (notification_type in ('request_received', 'confirmed', 'declined', 'rescheduled', 'cancelled', 'new_request', 'new_booking', 'customer_cancelled', 'customer_reschedule_requested', 'alternative_proposed', 'reschedule_declined')),
  recipient_type text not null check (recipient_type in ('customer', 'owner')),
  recipient_email text not null,
  locale text not null default 'nl-NL',
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create table public.lead_agent_settings (
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

insert into public.lead_agent_settings (singleton_key) values (true);

create table public.lead_agent_runs (
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

create table public.mail_accounts (
  id uuid primary key default gen_random_uuid(),
  email_address text not null unique,
  display_name text not null default 'FlexPagina support',
  imap_host text not null default 'imap.transip.email',
  imap_port integer not null default 993 check (imap_port between 1 and 65535),
  imap_secure boolean not null default true,
  smtp_host text not null default 'smtp.transip.email',
  smtp_port integer not null default 465 check (smtp_port between 1 and 65535),
  smtp_secure boolean not null default true,
  inbox_folder text not null default 'INBOX',
  sent_folder text not null default 'Sent',
  last_inbox_uid bigint not null default 0 check (last_inbox_uid >= 0),
  last_sent_uid bigint not null default 0 check (last_sent_uid >= 0),
  inbox_uid_validity text,
  sent_uid_validity text,
  enabled boolean not null default true,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mail_accounts_email_normalized_check check (
    email_address = lower(btrim(email_address)) and position('@' in email_address) > 1
  )
);

create table public.mail_threads (
  id uuid primary key default gen_random_uuid(),
  mail_account_id uuid not null references public.mail_accounts(id) on delete cascade,
  subject_normalized text not null default '',
  contact_email text not null default '',
  contact_name text,
  status text not null default 'new'
    check (status in ('new', 'draft_ready', 'needs_review', 'replied', 'closed', 'ignored')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  unread_count integer not null default 0 check (unread_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.mail_threads(id) on delete cascade,
  mail_account_id uuid not null references public.mail_accounts(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  internet_message_id text,
  in_reply_to text,
  message_references text[] not null default '{}'::text[],
  imap_folder text not null,
  imap_uid bigint check (imap_uid is null or imap_uid >= 0),
  from_address text not null default '',
  from_name text,
  to_addresses text[] not null default '{}'::text[],
  cc_addresses text[] not null default '{}'::text[],
  subject text not null default '',
  text_body text not null default '',
  html_body text,
  attachment_metadata jsonb not null default '[]'::jsonb,
  raw_headers jsonb not null default '{}'::jsonb,
  received_at timestamptz,
  sent_at timestamptz,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint mail_messages_folder_uid_unique unique (mail_account_id, imap_folder, imap_uid),
  constraint mail_messages_internet_id_unique unique (mail_account_id, internet_message_id)
);

create table public.mail_knowledge_answers (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  keywords text[] not null default '{}'::text[],
  category text not null default 'algemeen',
  language text not null default 'nl',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  priority integer not null default 0 check (priority between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mail_knowledge_question_not_blank check (btrim(question) <> ''),
  constraint mail_knowledge_answer_not_blank check (btrim(answer) <> '')
);

create table public.mail_drafts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.mail_threads(id) on delete cascade,
  in_reply_to_message_id uuid not null references public.mail_messages(id) on delete cascade,
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'edited', 'sending', 'sent', 'discarded', 'failed')),
  subject text not null default '',
  suggested_body text not null default '',
  final_body text,
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  confidence_reasons text[] not null default '{}'::text[],
  missing_information text[] not null default '{}'::text[],
  knowledge_answer_ids uuid[] not null default '{}'::uuid[],
  example_message_ids uuid[] not null default '{}'::uuid[],
  model text,
  prompt_version text not null default 'mail-reply-v1',
  generation_error text,
  send_key uuid not null default gen_random_uuid() unique,
  outbound_message_id uuid references public.mail_messages(id) on delete set null,
  generated_at timestamptz,
  edited_at timestamptz,
  sent_at timestamptz,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.mail_feedback (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique references public.mail_drafts(id) on delete cascade,
  outcome text not null check (outcome in ('accepted_without_changes', 'edited_then_sent', 'discarded')),
  rating integer check (rating between 1 and 5),
  reason text,
  edit_ratio numeric check (edit_ratio is null or (edit_ratio >= 0 and edit_ratio <= 1)),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.mail_sync_runs (
  id uuid primary key default gen_random_uuid(),
  mail_account_id uuid references public.mail_accounts(id) on delete cascade,
  run_key text not null unique,
  trigger text not null default 'cron' check (trigger in ('cron', 'manual')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed', 'skipped')),
  fetched_count integer not null default 0 check (fetched_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  draft_count integer not null default 0 check (draft_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

insert into public.mail_knowledge_answers (
  question, answer, keywords, category, language, status, priority
) values (
  'Hoe koppel ik een domeinnaam?',
  'Ga in het dashboard naar Domeinen, kies Domein koppelen en volg daar de stappen.',
  array['domein', 'domeinnaam', 'koppelen', 'verbinden', 'dns']::text[],
  'domeinen', 'nl', 'active', 100
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
  plan_id text not null default 'gold'
    check (plan_id in ('bronze', 'silver', 'gold')),
  status text not null default 'active'
    check (status in ('active', 'trial', 'past_due', 'canceled', 'expired')),
  current_price numeric(10, 2) not null default 24.95
    check (current_price >= 0),
  currency text not null default 'EUR'
    check (currency = 'EUR'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  multilingual_addon_active boolean not null default false,
  multilingual_addon_price numeric(10, 2) not null default 2.99
    check (multilingual_addon_price >= 0),
  stripe_multilingual_addon_item_id text,
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

create trigger set_website_domains_updated_at
  before update on public.website_domains
  for each row execute procedure public.set_updated_at();

create trigger set_website_locales_updated_at
  before update on public.website_locales
  for each row execute procedure public.set_updated_at();

create trigger set_website_section_translations_updated_at
  before update on public.website_section_translations
  for each row execute procedure public.set_updated_at();

create trigger set_business_translations_updated_at
  before update on public.business_translations
  for each row execute procedure public.set_updated_at();

create trigger set_service_translations_updated_at
  before update on public.service_translations
  for each row execute procedure public.set_updated_at();

create or replace function public.ensure_default_website_locale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.website_locales (
    website_id, locale, path_segment, display_name, is_default, is_enabled
  ) values (
    new.id, 'nl-NL', 'nl', 'Nederlands', true, true
  ) on conflict (website_id, locale) do nothing;
  return new;
end;
$$;

create trigger ensure_default_website_locale
  after insert on public.websites
  for each row execute procedure public.ensure_default_website_locale();

create or replace function public.protect_default_website_locale()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE'
     and old.is_default
     and pg_trigger_depth() = 1 then
    raise exception 'The default website locale cannot be removed or disabled';
  end if;
  if tg_op = 'UPDATE' and old.is_default and not new.is_enabled then
    raise exception 'The default website locale cannot be removed or disabled';
  end if;
  if tg_op = 'UPDATE' and old.is_default and not new.is_default
     and coalesce(current_setting('app.allow_default_locale_change', true), '') <> 'on' then
    raise exception 'Use set_website_default_locale to change the default locale';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger protect_default_website_locale
  before update or delete on public.website_locales
  for each row execute procedure public.protect_default_website_locale();

create or replace function public.set_website_default_locale(p_website_id uuid, p_locale text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot_locale_count integer;
begin
  if not exists (select 1 from public.websites where id = p_website_id and user_id = auth.uid()) then
    raise exception 'Website not found';
  end if;
  if not exists (select 1 from public.website_locales where website_id = p_website_id and locale = p_locale) then
    raise exception 'Locale not configured';
  end if;
  select case when jsonb_typeof(live_snapshot->'locales') = 'array' then jsonb_array_length(live_snapshot->'locales') else 0 end
    into snapshot_locale_count from public.websites where id = p_website_id;
  if snapshot_locale_count > 1 then
    raise exception 'The default locale cannot change after multilingual publication';
  end if;
  if exists (select 1 from public.website_section_translations where website_id = p_website_id) then
    raise exception 'Remove draft translations before changing the default locale';
  end if;
  if exists (
    select 1 from public.websites w
    join public.business_translations bt on bt.business_id = w.business_id
    where w.id = p_website_id
  ) or exists (
    select 1 from public.websites w
    join public.services s on s.business_id = w.business_id
    join public.service_translations st on st.service_id = s.id
    where w.id = p_website_id
  ) then
    raise exception 'Remove draft translations before changing the default locale';
  end if;
  perform set_config('app.allow_default_locale_change', 'on', true);
  update public.website_locales set is_default = false where website_id = p_website_id and is_default;
  update public.website_locales set is_default = true, is_enabled = true where website_id = p_website_id and locale = p_locale;
end;
$$;

grant execute on function public.set_website_default_locale(uuid, text) to authenticated;

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

create table public.user_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  original_path text not null unique,
  thumbnail_path text unique,
  original_size bigint not null default 0 check (original_size >= 0),
  thumbnail_size bigint not null default 0 check (thumbnail_size >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_images_paths_owned check (
    original_path like user_id::text || '/%'
    and (thumbnail_path is null or thumbnail_path like user_id::text || '/%')
  )
);

create index idx_user_images_user_created
  on public.user_images (user_id, created_at desc);

create trigger set_user_images_updated_at
  before update on public.user_images
  for each row execute procedure public.set_updated_at();

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

create or replace function public.bump_multilingual_website_draft_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_website_id uuid;
  target_business_id uuid;
  target_service_id uuid;
begin
  if tg_table_name in ('website_locales', 'website_section_translations') then
    target_website_id = case when tg_op = 'DELETE' then old.website_id else new.website_id end;
    update public.websites set draft_version = gen_random_uuid() where id = target_website_id;
  elsif tg_table_name = 'business_translations' then
    target_business_id = case when tg_op = 'DELETE' then old.business_id else new.business_id end;
    update public.websites set draft_version = gen_random_uuid() where business_id = target_business_id;
  elsif tg_table_name = 'service_translations' then
    target_service_id = case when tg_op = 'DELETE' then old.service_id else new.service_id end;
    select business_id into target_business_id from public.services where id = target_service_id;
    update public.websites set draft_version = gen_random_uuid() where business_id = target_business_id;
  end if;
  return null;
end;
$$;

create trigger bump_website_draft_from_locales
  after insert or update or delete on public.website_locales
  for each row execute procedure public.bump_multilingual_website_draft_versions();

create trigger bump_website_draft_from_section_translations
  after insert or update or delete on public.website_section_translations
  for each row execute procedure public.bump_multilingual_website_draft_versions();

create trigger bump_website_draft_from_business_translations
  after insert or update or delete on public.business_translations
  for each row execute procedure public.bump_multilingual_website_draft_versions();

create trigger bump_website_draft_from_service_translations
  after insert or update or delete on public.service_translations
  for each row execute procedure public.bump_multilingual_website_draft_versions();

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

create or replace function public.set_website_primary_domain(
  p_website_id uuid,
  p_domain_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_domain text;
begin
  if not exists (
    select 1 from public.websites
    where id = p_website_id and user_id = auth.uid()
  ) then
    return false;
  end if;

  select domain into selected_domain
  from public.website_domains
  where id = p_domain_id
    and website_id = p_website_id
    and status = 'active';

  if selected_domain is null then
    return false;
  end if;

  update public.website_domains
  set is_primary = false
  where website_id = p_website_id and is_primary;

  update public.website_domains
  set is_primary = true
  where id = p_domain_id and website_id = p_website_id;

  update public.websites
  set custom_domain = selected_domain, updated_at = now()
  where id = p_website_id and user_id = auth.uid();

  return true;
end;
$$;

create or replace function public.finalize_website_domain_removal(
  p_website_id uuid,
  p_domain_id uuid
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  removed_was_primary boolean;
  replacement_id uuid;
  replacement_domain text;
begin
  if not exists (
    select 1 from public.websites
    where id = p_website_id and user_id = auth.uid()
  ) then
    return 'unauthorized';
  end if;

  select is_primary into removed_was_primary
  from public.website_domains
  where id = p_domain_id
    and website_id = p_website_id
    and status in ('removal_pending', 'removal_failed');

  if removed_was_primary is null then
    return 'not_found';
  end if;

  delete from public.website_domains
  where id = p_domain_id and website_id = p_website_id;

  if removed_was_primary then
    select id, domain into replacement_id, replacement_domain
    from public.website_domains
    where website_id = p_website_id and status = 'active'
    order by created_at asc
    limit 1;

    if replacement_id is not null then
      update public.website_domains set is_primary = true where id = replacement_id;
    end if;

    update public.websites
    set custom_domain = replacement_domain, updated_at = now()
    where id = p_website_id and user_id = auth.uid();
  end if;

  return 'removed';
end;
$$;

revoke all on function public.set_website_primary_domain(uuid, uuid) from public;
grant execute on function public.set_website_primary_domain(uuid, uuid) to authenticated;
revoke all on function public.finalize_website_domain_removal(uuid, uuid) from public;
grant execute on function public.finalize_website_domain_removal(uuid, uuid) to authenticated;

create or replace function public.create_public_booking_hold(
  p_website_id uuid,
  p_business_id uuid,
  p_service_id uuid,
  p_booking_mode text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_timezone text,
  p_token_hash text
)
returns table (hold_id uuid, hold_expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking_settings public.service_booking_settings%rowtype;
  occupied_count bigint;
  created_hold public.booking_holds%rowtype;
  buffered_start timestamptz;
  buffered_end timestamptz;
begin
  if p_end_at <= p_start_at or p_start_at <= now() then
    raise exception using errcode = 'P0001', message = 'BOOKING_SLOT_UNAVAILABLE';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_service_id::text, 0));

  select * into booking_settings
  from public.service_booking_settings s
  where s.service_id = p_service_id
    and s.business_id = p_business_id
    and s.booking_enabled = true
    and s.booking_mode = p_booking_mode;

  if not found or not exists (
    select 1 from public.websites w
    where w.id = p_website_id and w.published = true
  ) then
    raise exception using errcode = 'P0001', message = 'BOOKING_CONTEXT_UNAVAILABLE';
  end if;

  update public.booking_holds
  set status = 'expired'
  where service_id = p_service_id and status = 'active' and expires_at <= now();

  buffered_start := p_start_at - make_interval(mins => booking_settings.buffer_before_minutes);
  buffered_end := p_end_at + make_interval(mins => booking_settings.buffer_after_minutes);

  if exists (
    select 1 from public.calendar_entries e
    where e.business_id = p_business_id
      and (e.service_id is null or e.service_id = p_service_id)
      and (e.entry_type = 'blocked' or e.status = 'blocked')
      and e.start_at < buffered_end and e.end_at > buffered_start
  ) then
    raise exception using errcode = 'P0001', message = 'BOOKING_SLOT_UNAVAILABLE';
  end if;

  select
    (select count(*) from public.calendar_entries e
      where e.business_id = p_business_id
        and e.service_id = p_service_id
        and e.status in ('pending', 'confirmed')
        and e.start_at - make_interval(mins => booking_settings.buffer_before_minutes) < p_end_at
        and e.end_at + make_interval(mins => booking_settings.buffer_after_minutes) > p_start_at)
    +
    (select count(*) from public.booking_holds h
      where h.service_id = p_service_id
        and h.status = 'active' and h.expires_at > now()
        and h.start_at - make_interval(mins => booking_settings.buffer_before_minutes) < p_end_at
        and h.end_at + make_interval(mins => booking_settings.buffer_after_minutes) > p_start_at)
  into occupied_count;

  if occupied_count >= booking_settings.capacity then
    raise exception using errcode = 'P0001', message = 'BOOKING_SLOT_UNAVAILABLE';
  end if;

  insert into public.booking_holds (
    website_id, business_id, service_id, booking_mode, start_at, end_at,
    timezone, token_hash, expires_at
  ) values (
    p_website_id, p_business_id, p_service_id, p_booking_mode, p_start_at, p_end_at,
    p_timezone, p_token_hash, now() + interval '10 minutes'
  ) returning * into created_hold;

  return query select created_hold.id, created_hold.expires_at;
end;
$$;

create or replace function public.finalize_public_booking(
  p_hold_id uuid,
  p_token_hash text,
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_locale text,
  p_recipient_email text
)
returns table (contact_request_id uuid, calendar_entry_id uuid, booking_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_hold public.booking_holds%rowtype;
  booking_settings public.service_booking_settings%rowtype;
  selected_service public.services%rowtype;
  website_owner_id uuid;
  created_request_id uuid;
  created_entry_id uuid;
  final_status text;
  occupied_count bigint;
  buffered_start timestamptz;
  buffered_end timestamptz;
  locked_service_id uuid;
begin
  select service_id into locked_service_id
  from public.booking_holds
  where id = p_hold_id;

  if locked_service_id is null then
    raise exception using errcode = 'P0001', message = 'BOOKING_HOLD_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(locked_service_id::text, 0));

  select * into selected_hold
  from public.booking_holds h
  where h.id = p_hold_id
    and h.token_hash = p_token_hash
    and h.status = 'active'
    and h.expires_at > now()
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BOOKING_HOLD_INVALID';
  end if;

  select * into booking_settings
  from public.service_booking_settings s
  where s.service_id = selected_hold.service_id
    and s.business_id = selected_hold.business_id
    and s.booking_enabled = true
    and s.booking_mode = selected_hold.booking_mode;

  select * into selected_service
  from public.services s
  where s.id = selected_hold.service_id
    and s.business_id = selected_hold.business_id;

  select w.user_id into website_owner_id
  from public.websites w
  where w.id = selected_hold.website_id and w.published = true;

  if booking_settings.service_id is null or selected_service.id is null or website_owner_id is null then
    raise exception using errcode = 'P0001', message = 'BOOKING_CONTEXT_UNAVAILABLE';
  end if;

  buffered_start := selected_hold.start_at - make_interval(mins => booking_settings.buffer_before_minutes);
  buffered_end := selected_hold.end_at + make_interval(mins => booking_settings.buffer_after_minutes);

  if exists (
    select 1 from public.calendar_entries e
    where e.business_id = selected_hold.business_id
      and (e.service_id is null or e.service_id = selected_hold.service_id)
      and (e.entry_type = 'blocked' or e.status = 'blocked')
      and e.start_at < buffered_end and e.end_at > buffered_start
  ) then
    raise exception using errcode = 'P0001', message = 'BOOKING_SLOT_UNAVAILABLE';
  end if;

  select
    (select count(*) from public.calendar_entries e
      where e.business_id = selected_hold.business_id
        and e.service_id = selected_hold.service_id
        and e.status in ('pending', 'confirmed')
        and e.start_at - make_interval(mins => booking_settings.buffer_before_minutes) < selected_hold.end_at
        and e.end_at + make_interval(mins => booking_settings.buffer_after_minutes) > selected_hold.start_at)
    +
    (select count(*) from public.booking_holds h
      where h.service_id = selected_hold.service_id
        and h.id <> selected_hold.id
        and h.status = 'active' and h.expires_at > now()
        and h.start_at - make_interval(mins => booking_settings.buffer_before_minutes) < selected_hold.end_at
        and h.end_at + make_interval(mins => booking_settings.buffer_after_minutes) > selected_hold.start_at)
  into occupied_count;

  if occupied_count >= booking_settings.capacity then
    raise exception using errcode = 'P0001', message = 'BOOKING_SLOT_UNAVAILABLE';
  end if;

  final_status := case when booking_settings.confirmation_mode = 'instant' then 'confirmed' else 'pending' end;

  insert into public.contact_requests (
    website_id, business_id, user_id, request_type, name, email, phone, service,
    preferred_date, message, locale, payload, recipient_email, source
  ) values (
    selected_hold.website_id, selected_hold.business_id, website_owner_id,
    case when selected_hold.booking_mode = 'stay' then 'booking_request' else 'appointment' end,
    left(p_name, 120), left(lower(p_email), 254), left(p_phone, 40),
    left(selected_service.title, 160), selected_hold.start_at::text, left(p_message, 3000),
    left(p_locale, 20),
    jsonb_build_object(
      'source', 'booking_engine', 'serviceId', selected_hold.service_id,
      'holdId', selected_hold.id, 'bookingMode', selected_hold.booking_mode,
      'startAt', selected_hold.start_at, 'endAt', selected_hold.end_at,
      'timezone', selected_hold.timezone, 'confirmationMode', booking_settings.confirmation_mode
    ),
    left(p_recipient_email, 254), 'website_form'
  ) returning id into created_request_id;

  insert into public.calendar_entries (
    business_id, service_id, contact_request_id, entry_type, status, source, title,
    customer_name, customer_email, customer_phone, start_at, end_at, all_day,
    timezone, metadata
  ) values (
    selected_hold.business_id, selected_hold.service_id, created_request_id,
    case when selected_hold.booking_mode = 'stay' then 'booking' else 'appointment' end,
    final_status, 'website_form', left(selected_service.title || ' - ' || p_name, 240),
    left(p_name, 120), left(lower(p_email), 254), left(p_phone, 40),
    selected_hold.start_at, selected_hold.end_at, selected_hold.booking_mode = 'stay',
    selected_hold.timezone,
    jsonb_build_object('source', 'booking_engine', 'holdId', selected_hold.id,
      'confirmationMode', booking_settings.confirmation_mode)
  ) returning id into created_entry_id;

  update public.booking_holds set status = 'consumed' where id = selected_hold.id;

  return query select created_request_id, created_entry_id, final_status;
end;
$$;

revoke all on function public.create_public_booking_hold(uuid, uuid, uuid, text, timestamptz, timestamptz, text, text) from public;
revoke all on function public.create_public_booking_hold(uuid, uuid, uuid, text, timestamptz, timestamptz, text, text) from anon, authenticated;
grant execute on function public.create_public_booking_hold(uuid, uuid, uuid, text, timestamptz, timestamptz, text, text) to service_role;
revoke all on function public.finalize_public_booking(uuid, text, text, text, text, text, text, text) from public;
revoke all on function public.finalize_public_booking(uuid, text, text, text, text, text, text, text) from anon, authenticated;
grant execute on function public.finalize_public_booking(uuid, text, text, text, text, text, text, text) to service_role;

create or replace function public.sanitize_booking_lifecycle_metadata()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare actor text;
begin
  actor := coalesce(nullif(new.metadata->>'lifecycle_actor', ''), case when auth.uid() is null then 'system' else 'owner' end);
  if actor not in ('customer', 'owner', 'system') then actor := 'system'; end if;
  perform set_config('app.booking_actor', actor, true);
  perform set_config('app.booking_public_message', left(coalesce(new.metadata->>'lifecycle_public_message', ''), 1000), true);
  perform set_config('app.booking_private_note', left(coalesce(new.metadata->>'lifecycle_private_note', ''), 2000), true);
  new.metadata := new.metadata - 'lifecycle_actor' - 'lifecycle_public_message' - 'lifecycle_private_note';
  return new;
end;
$$;

create or replace function public.record_booking_lifecycle()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  actor text; public_message_value text; private_note_value text; owner_email text;
  booking_locale text; lifecycle_event text; customer_notification text;
  payload_value jsonb; lifecycle_event_id uuid;
begin
  if not (new.source = 'website_form' and (coalesce(new.metadata->>'source', '') = 'booking_engine'
    or exists (select 1 from public.booking_customer_access a where a.calendar_entry_id = new.id))) then return new; end if;
  actor := coalesce(nullif(current_setting('app.booking_actor', true), ''), case when auth.uid() is null then 'system' else 'owner' end);
  if actor not in ('customer', 'owner', 'system') then actor := 'system'; end if;
  public_message_value := left(coalesce(current_setting('app.booking_public_message', true), ''), 1000);
  private_note_value := left(coalesce(current_setting('app.booking_private_note', true), ''), 2000);
  select coalesce(cr.recipient_email, ''), coalesce(cr.locale, 'nl-NL') into owner_email, booking_locale
  from public.contact_requests cr where cr.id = new.contact_request_id;
  payload_value := jsonb_build_object('title', new.title, 'customerName', new.customer_name,
    'startAt', new.start_at, 'endAt', new.end_at, 'timezone', new.timezone,
    'status', new.status, 'entryType', new.entry_type);

  if tg_op = 'INSERT' then
    insert into public.booking_customer_access (calendar_entry_id, expires_at)
    values (new.id, greatest(new.end_at + interval '90 days', now() + interval '730 days'))
    on conflict (calendar_entry_id) do nothing;
    insert into public.booking_status_history (calendar_entry_id, business_id, event_type, to_status, actor_type, public_message)
    values (new.id, new.business_id, 'created', new.status, 'system', case when new.status = 'confirmed' then 'De boeking is bevestigd.' else 'De aanvraag is ontvangen.' end);
    customer_notification := case when new.status = 'confirmed' then 'confirmed' else 'request_received' end;
    insert into public.booking_notifications (calendar_entry_id, business_id, notification_type, recipient_type, recipient_email, locale, idempotency_key, payload)
    values (new.id, new.business_id, customer_notification, 'customer', new.customer_email, booking_locale,
      new.id::text || ':created:customer:' || customer_notification, payload_value)
    on conflict (idempotency_key) do nothing;
    if owner_email <> '' then
      insert into public.booking_notifications (calendar_entry_id, business_id, notification_type, recipient_type, recipient_email, locale, idempotency_key, payload)
      values (new.id, new.business_id, case when new.status = 'confirmed' then 'new_booking' else 'new_request' end,
        'owner', owner_email, booking_locale, new.id::text || ':created:owner:' || new.status, payload_value)
      on conflict (idempotency_key) do nothing;
    end if;
    return new;
  end if;

  if old.status is distinct from new.status then
    lifecycle_event := case when new.status = 'confirmed' then 'confirmed'
      when new.status = 'cancelled' and actor = 'owner' and old.status = 'pending' then 'declined'
      when new.status = 'cancelled' then 'cancelled' when new.status = 'completed' then 'completed' else null end;
    if lifecycle_event is not null then
      lifecycle_event_id := gen_random_uuid();
      insert into public.booking_status_history (id, calendar_entry_id, business_id, event_type, from_status, to_status, actor_type, public_message, private_note, created_by)
      values (lifecycle_event_id, new.id, new.business_id, lifecycle_event, old.status, new.status, actor,
        public_message_value, private_note_value, case when actor = 'owner' then auth.uid() else null end);
      customer_notification := case lifecycle_event when 'confirmed' then 'confirmed' when 'declined' then 'declined' when 'cancelled' then 'cancelled' else null end;
      if customer_notification is not null then
        insert into public.booking_notifications (calendar_entry_id, business_id, notification_type, recipient_type, recipient_email, locale, idempotency_key, payload)
        values (new.id, new.business_id, customer_notification, 'customer', new.customer_email, booking_locale,
          lifecycle_event_id::text || ':customer:' || customer_notification, payload_value)
        on conflict (idempotency_key) do nothing;
      end if;
      if lifecycle_event = 'cancelled' and actor = 'customer' and owner_email <> '' then
        insert into public.booking_notifications (calendar_entry_id, business_id, notification_type, recipient_type, recipient_email, locale, idempotency_key, payload)
        values (new.id, new.business_id, 'customer_cancelled', 'owner', owner_email, booking_locale,
          lifecycle_event_id::text || ':owner:customer_cancelled', payload_value)
        on conflict (idempotency_key) do nothing;
      end if;
    end if;
  end if;

  if old.start_at is distinct from new.start_at or old.end_at is distinct from new.end_at then
    lifecycle_event_id := gen_random_uuid();
    insert into public.booking_status_history (id, calendar_entry_id, business_id, event_type, from_status, to_status, actor_type,
      public_message, private_note, proposed_start_at, proposed_end_at, created_by)
    values (lifecycle_event_id, new.id, new.business_id, 'rescheduled', old.status, new.status, actor,
      public_message_value, private_note_value, new.start_at, new.end_at, case when actor = 'owner' then auth.uid() else null end);
    insert into public.booking_notifications (calendar_entry_id, business_id, notification_type, recipient_type, recipient_email, locale, idempotency_key, payload)
    values (new.id, new.business_id, 'rescheduled', 'customer', new.customer_email, booking_locale,
      lifecycle_event_id::text || ':customer:rescheduled', payload_value)
    on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger booking_lifecycle_metadata_trigger
  before insert or update of status, start_at, end_at, metadata on public.calendar_entries
  for each row execute procedure public.sanitize_booking_lifecycle_metadata();
create trigger booking_lifecycle_trigger
  after insert or update of status, start_at, end_at, metadata on public.calendar_entries
  for each row execute procedure public.record_booking_lifecycle();

create or replace function public.record_booking_change_request()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare selected_entry public.calendar_entries%rowtype; owner_email text; booking_locale text;
  notification_name text; recipient_kind text; recipient_address text;
begin
  select * into selected_entry from public.calendar_entries where id = new.calendar_entry_id;
  if selected_entry.id is null or selected_entry.business_id <> new.business_id then raise exception using errcode = 'P0001', message = 'BOOKING_CHANGE_CONTEXT_INVALID'; end if;
  select coalesce(cr.recipient_email, ''), coalesce(cr.locale, 'nl-NL') into owner_email, booking_locale
  from public.contact_requests cr where cr.id = selected_entry.contact_request_id;
  insert into public.booking_status_history (calendar_entry_id, business_id, event_type, from_status, to_status, actor_type,
    public_message, private_note, proposed_start_at, proposed_end_at)
  values (new.calendar_entry_id, new.business_id,
    case when new.request_kind = 'alternative_proposal' then 'alternative_proposed' else 'reschedule_requested' end,
    selected_entry.status, selected_entry.status, new.requested_by, left(new.customer_message, 1000), left(new.private_note, 2000),
    new.proposed_start_at, new.proposed_end_at);
  if new.requested_by = 'owner' then notification_name := 'alternative_proposed'; recipient_kind := 'customer'; recipient_address := selected_entry.customer_email;
  else notification_name := 'customer_reschedule_requested'; recipient_kind := 'owner'; recipient_address := owner_email; end if;
  if recipient_address <> '' then
    insert into public.booking_notifications (calendar_entry_id, business_id, notification_type, recipient_type, recipient_email, locale, idempotency_key, payload)
    values (selected_entry.id, selected_entry.business_id, notification_name, recipient_kind, recipient_address, booking_locale,
      new.id::text || ':' || notification_name, jsonb_build_object('title', selected_entry.title,
      'customerName', selected_entry.customer_name, 'startAt', selected_entry.start_at, 'endAt', selected_entry.end_at,
      'proposedStartAt', new.proposed_start_at, 'proposedEndAt', new.proposed_end_at,
      'timezone', selected_entry.timezone, 'message', left(new.customer_message, 1000)))
    on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger booking_change_request_trigger after insert on public.booking_change_requests
  for each row execute procedure public.record_booking_change_request();

create or replace function public.apply_booking_change_request(p_request_id uuid, p_actor text, p_resolved_by uuid default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare change_request public.booking_change_requests%rowtype; selected_entry public.calendar_entries%rowtype;
  booking_settings public.service_booking_settings%rowtype; occupied_count bigint;
begin
  select * into change_request from public.booking_change_requests r where r.id = p_request_id and r.status = 'pending' for update;
  if not found then raise exception using errcode = 'P0001', message = 'BOOKING_CHANGE_INVALID'; end if;
  if (p_actor = 'customer' and not (change_request.requested_by = 'owner' and change_request.request_kind = 'alternative_proposal'))
    or (p_actor = 'owner' and not (change_request.requested_by = 'customer' and change_request.request_kind = 'reschedule_request')) then
    raise exception using errcode = 'P0001', message = 'BOOKING_CHANGE_FORBIDDEN'; end if;
  select * into selected_entry from public.calendar_entries e where e.id = change_request.calendar_entry_id for update;
  if selected_entry.id is null or selected_entry.status not in ('pending', 'confirmed') then raise exception using errcode = 'P0001', message = 'BOOKING_CHANGE_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtextextended(selected_entry.service_id::text, 0));
  select * into booking_settings from public.service_booking_settings s
  where s.service_id = selected_entry.service_id and s.business_id = selected_entry.business_id and s.booking_enabled = true;
  if booking_settings.service_id is null then raise exception using errcode = 'P0001', message = 'BOOKING_CONTEXT_UNAVAILABLE'; end if;
  if exists (select 1 from public.calendar_entries e where e.business_id = selected_entry.business_id and e.id <> selected_entry.id
    and (e.service_id is null or e.service_id = selected_entry.service_id) and (e.entry_type = 'blocked' or e.status = 'blocked')
    and e.start_at < change_request.proposed_end_at + make_interval(mins => booking_settings.buffer_after_minutes)
    and e.end_at > change_request.proposed_start_at - make_interval(mins => booking_settings.buffer_before_minutes))
  then raise exception using errcode = 'P0001', message = 'BOOKING_SLOT_UNAVAILABLE'; end if;
  select (select count(*) from public.calendar_entries e where e.business_id = selected_entry.business_id
      and e.service_id = selected_entry.service_id and e.id <> selected_entry.id and e.status in ('pending', 'confirmed')
      and e.start_at - make_interval(mins => booking_settings.buffer_before_minutes) < change_request.proposed_end_at
      and e.end_at + make_interval(mins => booking_settings.buffer_after_minutes) > change_request.proposed_start_at)
    + (select count(*) from public.booking_holds h where h.service_id = selected_entry.service_id
      and h.status = 'active' and h.expires_at > now()
      and h.start_at - make_interval(mins => booking_settings.buffer_before_minutes) < change_request.proposed_end_at
      and h.end_at + make_interval(mins => booking_settings.buffer_after_minutes) > change_request.proposed_start_at)
  into occupied_count;
  if occupied_count >= booking_settings.capacity then raise exception using errcode = 'P0001', message = 'BOOKING_SLOT_UNAVAILABLE'; end if;
  update public.calendar_entries set start_at = change_request.proposed_start_at, end_at = change_request.proposed_end_at,
    metadata = selected_entry.metadata || jsonb_build_object('lifecycle_actor', p_actor,
      'lifecycle_public_message', change_request.customer_message, 'lifecycle_private_note', change_request.private_note)
  where id = selected_entry.id;
  update public.booking_change_requests set status = 'accepted', resolved_by = p_resolved_by, resolved_at = now() where id = change_request.id;
  return selected_entry.id;
end;
$$;

create or replace function public.cancel_customer_booking(p_entry_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare selected_entry public.calendar_entries%rowtype; booking_settings public.service_booking_settings%rowtype;
begin
  select * into selected_entry from public.calendar_entries e where e.id = p_entry_id for update;
  if selected_entry.id is null or selected_entry.status not in ('pending', 'confirmed') then raise exception using errcode = 'P0001', message = 'BOOKING_CANNOT_CANCEL'; end if;
  select * into booking_settings from public.service_booking_settings s where s.service_id = selected_entry.service_id;
  if booking_settings.service_id is null or now() > selected_entry.start_at - make_interval(mins => booking_settings.cancellation_cutoff_minutes)
  then raise exception using errcode = 'P0001', message = 'BOOKING_CANCELLATION_CUTOFF'; end if;
  update public.calendar_entries set status = 'cancelled',
    metadata = selected_entry.metadata || jsonb_build_object('lifecycle_actor', 'customer') where id = selected_entry.id;
  return selected_entry.id;
end;
$$;

create or replace function public.reject_booking_change_request(p_request_id uuid, p_resolved_by uuid, p_private_note text default '')
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare change_request public.booking_change_requests%rowtype; selected_entry public.calendar_entries%rowtype; booking_locale text;
begin
  select * into change_request from public.booking_change_requests r where r.id = p_request_id and r.status = 'pending'
    and r.requested_by = 'customer' and r.request_kind = 'reschedule_request' for update;
  if not found then raise exception using errcode = 'P0001', message = 'BOOKING_CHANGE_INVALID'; end if;
  select * into selected_entry from public.calendar_entries e where e.id = change_request.calendar_entry_id;
  select coalesce(cr.locale, 'nl-NL') into booking_locale from public.contact_requests cr where cr.id = selected_entry.contact_request_id;
  update public.booking_change_requests set status = 'rejected', resolved_by = p_resolved_by, resolved_at = now() where id = change_request.id;
  insert into public.booking_status_history (calendar_entry_id, business_id, event_type, from_status, to_status, actor_type, private_note, created_by)
  values (selected_entry.id, selected_entry.business_id, 'reschedule_declined', selected_entry.status, selected_entry.status, 'owner', left(p_private_note, 2000), p_resolved_by);
  insert into public.booking_notifications (calendar_entry_id, business_id, notification_type, recipient_type, recipient_email, locale, idempotency_key, payload)
  values (selected_entry.id, selected_entry.business_id, 'reschedule_declined', 'customer', selected_entry.customer_email,
    booking_locale, change_request.id::text || ':reschedule_declined', jsonb_build_object('title', selected_entry.title,
      'customerName', selected_entry.customer_name, 'startAt', selected_entry.start_at,
      'endAt', selected_entry.end_at, 'timezone', selected_entry.timezone))
  on conflict (idempotency_key) do nothing;
  return selected_entry.id;
end;
$$;
revoke all on function public.apply_booking_change_request(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.apply_booking_change_request(uuid, text, uuid) to service_role;
revoke all on function public.cancel_customer_booking(uuid) from public, anon, authenticated;
grant execute on function public.cancel_customer_booking(uuid) to service_role;
revoke all on function public.reject_booking_change_request(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reject_booking_change_request(uuid, uuid, text) to service_role;

create trigger set_calendar_entries_updated_at
  before update on public.calendar_entries
  for each row execute procedure public.set_updated_at();

create trigger set_calendar_availability_windows_updated_at
  before update on public.calendar_availability_windows
  for each row execute procedure public.set_updated_at();

create trigger set_booking_holds_updated_at
  before update on public.booking_holds
  for each row execute procedure public.set_updated_at();

create trigger set_booking_customer_access_updated_at
  before update on public.booking_customer_access
  for each row execute procedure public.set_updated_at();
create trigger set_booking_change_requests_updated_at
  before update on public.booking_change_requests
  for each row execute procedure public.set_updated_at();
create trigger set_booking_notifications_updated_at
  before update on public.booking_notifications
  for each row execute procedure public.set_updated_at();

create trigger set_service_booking_settings_updated_at
  before update on public.service_booking_settings
  for each row execute procedure public.set_updated_at();

create trigger set_leads_updated_at
  before update on public.leads
  for each row execute procedure public.set_updated_at();

create trigger set_lead_agent_settings_updated_at
  before update on public.lead_agent_settings
  for each row execute procedure public.set_updated_at();

create trigger set_mail_accounts_updated_at
  before update on public.mail_accounts
  for each row execute procedure public.set_updated_at();

create trigger set_mail_threads_updated_at
  before update on public.mail_threads
  for each row execute procedure public.set_updated_at();

create trigger set_mail_knowledge_answers_updated_at
  before update on public.mail_knowledge_answers
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------

create index websites_slug_idx on public.websites (slug);
create index websites_user_id_idx on public.websites (user_id);
create index idx_websites_business_id on public.websites (business_id);
create index idx_websites_custom_domain on public.websites (custom_domain)
  where custom_domain is not null;
create unique index website_locales_one_default_idx
  on public.website_locales (website_id)
  where is_default;
create index website_locales_enabled_idx on public.website_locales (website_id, is_enabled);
create index website_section_translations_website_locale_idx
  on public.website_section_translations (website_id, locale);
create unique index website_domains_one_primary_idx
  on public.website_domains (website_id)
  where is_primary;
create index website_domains_website_id_idx on public.website_domains (website_id);
create index website_domains_routable_idx on public.website_domains (domain)
  where status = 'active';
create index idx_websites_theme_config on public.websites using gin (theme_config);
create index website_visits_website_visited_at_idx on public.website_visits (website_id, visited_at desc);
create index website_visits_visited_at_idx on public.website_visits (visited_at desc);

create index idx_businesses_user_id on public.businesses (user_id);
create index idx_businesses_category on public.businesses (category);

create index idx_services_business_id on public.services (business_id);
create index idx_services_business_position on public.services (business_id, position);
create index idx_service_booking_settings_business on public.service_booking_settings (business_id);
create index idx_service_booking_settings_enabled on public.service_booking_settings (business_id, booking_enabled)
  where booking_enabled = true;
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

create index idx_booking_holds_active_service_time
  on public.booking_holds (service_id, start_at, end_at, expires_at)
  where status = 'active';
create index idx_booking_holds_business_created
  on public.booking_holds (business_id, created_at desc);
create unique index booking_change_requests_one_pending_idx
  on public.booking_change_requests (calendar_entry_id, request_kind, requested_by)
  where status = 'pending';
create index idx_booking_history_entry_created
  on public.booking_status_history (calendar_entry_id, created_at);
create index idx_booking_changes_entry_created
  on public.booking_change_requests (calendar_entry_id, created_at desc);
create index idx_booking_notifications_delivery
  on public.booking_notifications (status, created_at)
  where status in ('pending', 'failed');

create index idx_leads_city on public.leads (city);
create index idx_leads_category on public.leads (category);
create index idx_leads_status on public.leads (status);
create index idx_lead_agent_runs_started_at on public.lead_agent_runs (started_at desc);
create index idx_mail_threads_status_last_message on public.mail_threads (status, last_message_at desc);
create index idx_mail_threads_account_last_message on public.mail_threads (mail_account_id, last_message_at desc);
create index idx_mail_messages_thread_created on public.mail_messages (thread_id, created_at);
create index idx_mail_messages_in_reply_to on public.mail_messages (mail_account_id, in_reply_to)
  where in_reply_to is not null;
create index idx_mail_knowledge_status_priority on public.mail_knowledge_answers (status, priority desc, updated_at desc);
create index idx_mail_drafts_thread_created on public.mail_drafts (thread_id, created_at desc);
create index idx_mail_sync_runs_started on public.mail_sync_runs (started_at desc);

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
alter table public.user_images enable row level security;
alter table public.subscriptions enable row level security;
alter table public.services enable row level security;
alter table public.service_booking_settings enable row level security;
alter table public.business_translations enable row level security;
alter table public.service_translations enable row level security;
alter table public.websites enable row level security;
alter table public.website_visits enable row level security;
alter table public.website_locales enable row level security;
alter table public.website_domains enable row level security;
alter table public.website_sections enable row level security;
alter table public.website_section_translations enable row level security;
alter table public.section_transitions enable row level security;
alter table public.contact_requests enable row level security;
alter table public.calendar_entries enable row level security;
alter table public.calendar_availability_windows enable row level security;
alter table public.booking_holds enable row level security;
alter table public.booking_customer_access enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.booking_change_requests enable row level security;
alter table public.booking_notifications enable row level security;
alter table public.leads enable row level security;
alter table public.lead_agent_settings enable row level security;
alter table public.lead_agent_runs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.mail_accounts enable row level security;
alter table public.mail_threads enable row level security;
alter table public.mail_messages enable row level security;
alter table public.mail_knowledge_answers enable row level security;
alter table public.mail_drafts enable row level security;
alter table public.mail_feedback enable row level security;
alter table public.mail_sync_runs enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid());

comment on table public.subscriptions is
  'Server-owned subscription and entitlement state. Authenticated users may read only their own row; writes require trusted server/service-role access.';

create policy "Users can view own image metadata"
  on public.user_images for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own image metadata"
  on public.user_images for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own image metadata"
  on public.user_images for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own image metadata"
  on public.user_images for delete to authenticated
  using (user_id = auth.uid());

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

-- Service booking settings
create policy "Users can view own service booking settings"
  on public.service_booking_settings for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = service_booking_settings.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can insert own service booking settings"
  on public.service_booking_settings for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = service_booking_settings.business_id
        and b.user_id = auth.uid()
    )
    and exists (
      select 1 from public.services s
      where s.id = service_booking_settings.service_id
        and s.business_id = service_booking_settings.business_id
    )
  );

create policy "Users can update own service booking settings"
  on public.service_booking_settings for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = service_booking_settings.business_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = service_booking_settings.business_id
        and b.user_id = auth.uid()
    )
    and exists (
      select 1 from public.services s
      where s.id = service_booking_settings.service_id
        and s.business_id = service_booking_settings.business_id
    )
  );

create policy "Users can delete own service booking settings"
  on public.service_booking_settings for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = service_booking_settings.business_id
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

-- Website domains
create policy "Anyone can view active domains of published websites"
  on public.website_domains for select
  using (
    status = 'active'
    and exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.published = true
    )
  );

create policy "Users can view their own website domains"
  on public.website_domains for select
  using (
    exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can insert their own website domains"
  on public.website_domains for insert
  with check (
    exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can update their own website domains"
  on public.website_domains for update
  using (
    exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can delete their own website domains"
  on public.website_domains for delete
  using (
    exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.user_id = auth.uid()
    )
  );

-- Website locales and translations
create policy "Users can manage own website locales"
  on public.website_locales for all to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = website_locales.website_id and w.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.websites w
    where w.id = website_locales.website_id and w.user_id = auth.uid()
  ));

create policy "Users can manage own website section translations"
  on public.website_section_translations for all to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = website_section_translations.website_id and w.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.websites w
    where w.id = website_section_translations.website_id and w.user_id = auth.uid()
  ));

create policy "Users can manage own business translations"
  on public.business_translations for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_translations.business_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = business_translations.business_id and b.user_id = auth.uid()
  ));

create policy "Users can manage own service translations"
  on public.service_translations for all to authenticated
  using (exists (
    select 1 from public.services s
    join public.businesses b on b.id = s.business_id
    where s.id = service_translations.service_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.services s
    join public.businesses b on b.id = s.business_id
    where s.id = service_translations.service_id and b.user_id = auth.uid()
  ));

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

-- Public booking holds are written only through service-role RPCs.
create policy "Users can view own booking holds"
  on public.booking_holds for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = booking_holds.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can delete own booking holds"
  on public.booking_holds for delete
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = booking_holds.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can view own booking customer access"
  on public.booking_customer_access for select to authenticated
  using (exists (
    select 1 from public.calendar_entries e join public.businesses b on b.id = e.business_id
    where e.id = booking_customer_access.calendar_entry_id and b.user_id = auth.uid()
  ));
create policy "Users can view own booking history"
  on public.booking_status_history for select to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = booking_status_history.business_id and b.user_id = auth.uid()
  ));
create policy "Users can view own booking change requests"
  on public.booking_change_requests for select to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = booking_change_requests.business_id and b.user_id = auth.uid()
  ));
create policy "Users can manage own booking change requests"
  on public.booking_change_requests for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = booking_change_requests.business_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = booking_change_requests.business_id and b.user_id = auth.uid()
  ));
create policy "Users can view own booking notifications"
  on public.booking_notifications for select to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = booking_notifications.business_id and b.user_id = auth.uid()
  ));

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


