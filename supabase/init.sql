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
drop table if exists public.profiles cascade;
drop table if exists public.booking_notifications cascade;
drop table if exists public.booking_invoice_emails cascade;
drop table if exists public.booking_invoices cascade;
drop table if exists public.booking_document_counters cascade;
drop table if exists public.booking_reservation_financials cascade;
drop table if exists public.booking_invoice_profiles cascade;
drop table if exists public.booking_change_requests cascade;
drop table if exists public.booking_status_history cascade;
drop table if exists public.booking_customer_access cascade;
drop table if exists public.calendar_export_feeds cascade;
drop table if exists public.calendar_import_sources cascade;
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

-- ------------------------------------------------------------
-- Booking Engine 2.0 phase 4 calendar interoperability
-- ------------------------------------------------------------

create table public.calendar_export_feeds (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  access_token uuid not null unique default gen_random_uuid(),
  token_version integer not null default 1 check (token_version > 0),
  enabled boolean not null default true,
  last_rotated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calendar_import_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  feed_url text not null check (char_length(feed_url) between 1 and 2048),
  enabled boolean not null default true,
  last_sync_started_at timestamptz,
  last_sync_succeeded_at timestamptz,
  last_sync_failed_at timestamptz,
  last_error text,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  last_event_count integer not null default 0 check (last_event_count >= 0),
  last_ignored_count integer not null default 0 check (last_ignored_count >= 0),
  last_http_etag text,
  last_http_modified text,
  sync_lock_token uuid,
  sync_lock_expires_at timestamptz,
  next_sync_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_import_sources_business_url_key unique (business_id, feed_url)
);

alter table public.calendar_entries
  add column external_source_id uuid references public.calendar_import_sources(id) on delete cascade,
  add column external_uid text,
  add column external_occurrence_key text,
  add constraint calendar_entries_external_identity_check check (
    (external_source_id is null and external_uid is null and external_occurrence_key is null)
    or
    (external_source_id is not null and external_uid is not null and external_occurrence_key is not null
      and source = 'import' and entry_type = 'blocked' and status = 'blocked')
  );

create unique index calendar_entries_external_event_key
  on public.calendar_entries (external_source_id, external_uid, external_occurrence_key);
create index calendar_import_sources_due_idx
  on public.calendar_import_sources (next_sync_at)
  where enabled = true;
create index calendar_entries_external_source_idx
  on public.calendar_entries (external_source_id)
  where external_source_id is not null;

create trigger set_calendar_export_feeds_updated_at
  before update on public.calendar_export_feeds
  for each row execute procedure public.set_updated_at();
create trigger set_calendar_import_sources_updated_at
  before update on public.calendar_import_sources
  for each row execute procedure public.set_updated_at();

alter table public.calendar_export_feeds enable row level security;
alter table public.calendar_import_sources enable row level security;

create policy "Users can manage own calendar export feed"
  on public.calendar_export_feeds for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = calendar_export_feeds.business_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = calendar_export_feeds.business_id and b.user_id = auth.uid()
  ));

create policy "Users can manage own calendar import sources"
  on public.calendar_import_sources for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = calendar_import_sources.business_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = calendar_import_sources.business_id and b.user_id = auth.uid()
  ));

create or replace function public.replace_calendar_import_events(
  p_source_id uuid,
  p_events jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_source public.calendar_import_sources%rowtype;
  imported_count integer;
begin
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 5000 then
    raise exception 'Invalid calendar import payload';
  end if;

  select * into selected_source
  from public.calendar_import_sources
  where id = p_source_id
  for update;
  if not found then raise exception 'Calendar source not found'; end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_events) as event(
      uid text, occurrence_key text, start_at timestamptz, end_at timestamptz,
      all_day boolean, summary text
    )
    where event.uid is null or event.uid = ''
      or event.occurrence_key is null or event.occurrence_key = ''
      or event.start_at is null or event.end_at is null
      or event.end_at <= event.start_at
      or event.end_at - event.start_at > interval '366 days'
  ) then
    raise exception 'Invalid calendar event payload';
  end if;

  insert into public.calendar_entries (
    business_id, service_id, contact_request_id, entry_type, status, source,
    title, customer_name, customer_email, customer_phone, start_at, end_at,
    all_day, timezone, internal_notes, metadata,
    external_source_id, external_uid, external_occurrence_key
  )
  select
    selected_source.business_id, null, null, 'blocked', 'blocked', 'import',
    left(coalesce(nullif(event.summary, ''), 'Extern bezet'), 200), '', '', '',
    event.start_at, event.end_at, coalesce(event.all_day, false),
    'Europe/Amsterdam', '',
    jsonb_build_object('calendar_import', jsonb_build_object(
      'source_id', selected_source.id,
      'source_name', selected_source.name
    )),
    selected_source.id, left(event.uid, 1000), event.occurrence_key
  from jsonb_to_recordset(p_events) as event(
    uid text, occurrence_key text, start_at timestamptz, end_at timestamptz,
    all_day boolean, summary text
  )
  on conflict (external_source_id, external_uid, external_occurrence_key)
  do update set
    title = excluded.title,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    all_day = excluded.all_day,
    metadata = excluded.metadata;

  delete from public.calendar_entries existing
  where existing.external_source_id = selected_source.id
    and not exists (
      select 1
      from jsonb_to_recordset(p_events) as event(uid text, occurrence_key text)
      where left(event.uid, 1000) = existing.external_uid
        and event.occurrence_key = existing.external_occurrence_key
    );

  imported_count := jsonb_array_length(p_events);
  return imported_count;
end;
$$;

revoke all on function public.replace_calendar_import_events(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_calendar_import_events(uuid, jsonb) to service_role;

comment on table public.calendar_export_feeds is
  'Private bearer-token iCal feeds. Rotating access_token immediately invalidates the previous URL.';
comment on table public.calendar_import_sources is
  'Owner-configured, read-only iCal sources with durable sync health and retry scheduling.';
comment on column public.calendar_import_sources.feed_url is
  'Sensitive bearer URL. Owner-only through RLS and never exposed by public APIs.';
comment on column public.calendar_entries.external_occurrence_key is
  'Stable per-source recurrence identity used for idempotent iCal upserts.';

-- ------------------------------------------------------------
-- Booking Engine 2.0 phase 5: pricing and invoice PDFs
-- ------------------------------------------------------------

create table if not exists public.booking_invoice_profiles (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  legal_name text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  postal_code text not null default '',
  city text not null default '',
  country_code text not null default 'NL' check (country_code ~ '^[A-Z]{2}$'),
  email text not null default '',
  vat_id text not null default '',
  kvk_number text not null default '',
  iban text not null default '',
  default_vat_basis_points integer not null default 2100 check (default_vat_basis_points between 0 and 10000),
  invoice_prefix text not null default 'F' check (invoice_prefix ~ '^[A-Z0-9-]{1,12}$'),
  credit_note_prefix text not null default 'CR' check (credit_note_prefix ~ '^[A-Z0-9-]{1,12}$'),
  payment_term_days integer not null default 14 check (payment_term_days between 0 and 365),
  accent_color text not null default '#16302B' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_reservation_financials (
  calendar_entry_id uuid primary key references public.calendar_entries(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  reservation_number text not null unique,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  pricing_status text not null default 'needs_review' check (pricing_status in ('needs_review', 'ready')),
  settlement_status text not null default 'open' check (settlement_status in ('open', 'paid', 'refunded')),
  line_items jsonb not null default '[]'::jsonb check (jsonb_typeof(line_items) = 'array'),
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  vat_total_minor bigint not null default 0 check (vat_total_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0 and total_minor = subtotal_minor + vat_total_minor),
  priced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_reservation_financials_business_number_key unique (business_id, reservation_number)
);

create table if not exists public.booking_document_counters (
  business_id uuid not null references public.businesses(id) on delete cascade,
  document_type text not null check (document_type in ('invoice', 'credit_note')),
  document_year integer not null check (document_year between 2000 and 9999),
  last_value bigint not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (business_id, document_type, document_year)
);

create table if not exists public.booking_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  calendar_entry_id uuid not null references public.calendar_entries(id) on delete cascade,
  document_type text not null default 'invoice' check (document_type in ('invoice', 'credit_note')),
  status text not null default 'draft' check (status in ('draft', 'issued', 'credited', 'void')),
  invoice_number text,
  reservation_number text not null,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  seller_details jsonb not null default '{}'::jsonb check (jsonb_typeof(seller_details) = 'object'),
  customer_details jsonb not null default '{}'::jsonb check (jsonb_typeof(customer_details) = 'object'),
  line_items jsonb not null default '[]'::jsonb check (jsonb_typeof(line_items) = 'array'),
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  vat_total_minor bigint not null default 0 check (vat_total_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0 and total_minor = subtotal_minor + vat_total_minor),
  service_date date not null,
  due_date date not null,
  issued_at timestamptz,
  corrects_invoice_id uuid references public.booking_invoices(id) on delete restrict,
  pdf_storage_path text,
  pdf_sha256 text,
  pdf_size_bytes integer check (pdf_size_bytes is null or pdf_size_bytes > 0),
  first_downloaded_at timestamptz,
  emailed_at timestamptz,
  email_message_id text,
  voided_at timestamptz,
  void_reason text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_invoices_number_state_check check (
    (status = 'draft' and invoice_number is null and issued_at is null)
    or (status <> 'draft' and invoice_number is not null and issued_at is not null)
  ),
  constraint booking_invoices_credit_reference_check check (
    (document_type = 'invoice' and corrects_invoice_id is null)
    or (document_type = 'credit_note' and corrects_invoice_id is not null)
  )
);

create table if not exists public.booking_invoice_emails (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.booking_invoices(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  recipient_email text not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists booking_invoices_business_number_idx
  on public.booking_invoices (business_id, invoice_number)
  where invoice_number is not null;
create unique index if not exists booking_invoices_one_draft_idx
  on public.booking_invoices (calendar_entry_id)
  where document_type = 'invoice' and status = 'draft';
create unique index if not exists booking_invoices_one_credit_note_idx
  on public.booking_invoices (corrects_invoice_id)
  where corrects_invoice_id is not null;
create unique index if not exists booking_invoice_emails_one_active_idx
  on public.booking_invoice_emails (invoice_id)
  where status in ('pending', 'sending');
create index if not exists booking_reservation_financials_number_idx
  on public.booking_reservation_financials (reservation_number);
create index if not exists booking_invoices_reservation_number_idx
  on public.booking_invoices (reservation_number);
create index if not exists booking_invoices_entry_created_idx
  on public.booking_invoices (calendar_entry_id, created_at desc);

drop trigger if exists set_booking_invoice_profiles_updated_at on public.booking_invoice_profiles;
create trigger set_booking_invoice_profiles_updated_at before update on public.booking_invoice_profiles
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_booking_reservation_financials_updated_at on public.booking_reservation_financials;
create trigger set_booking_reservation_financials_updated_at before update on public.booking_reservation_financials
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_booking_invoices_updated_at on public.booking_invoices;
create trigger set_booking_invoices_updated_at before update on public.booking_invoices
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_booking_invoice_emails_updated_at on public.booking_invoice_emails;
create trigger set_booking_invoice_emails_updated_at before update on public.booking_invoice_emails
  for each row execute procedure public.set_updated_at();

alter table public.booking_invoice_profiles enable row level security;
alter table public.booking_reservation_financials enable row level security;
alter table public.booking_document_counters enable row level security;
alter table public.booking_invoices enable row level security;
alter table public.booking_invoice_emails enable row level security;

create policy "Users can view own booking invoice profile" on public.booking_invoice_profiles
  for select to authenticated using (exists (
    select 1 from public.businesses b where b.id = booking_invoice_profiles.business_id and b.user_id = auth.uid()
  ));
create policy "Users can view own reservation financials" on public.booking_reservation_financials
  for select to authenticated using (exists (
    select 1 from public.businesses b where b.id = booking_reservation_financials.business_id and b.user_id = auth.uid()
  ));
create policy "Users can view own booking invoices" on public.booking_invoices
  for select to authenticated using (exists (
    select 1 from public.businesses b where b.id = booking_invoices.business_id and b.user_id = auth.uid()
  ));
create policy "Users can view own booking invoice emails" on public.booking_invoice_emails
  for select to authenticated using (exists (
    select 1 from public.businesses b where b.id = booking_invoice_emails.business_id and b.user_id = auth.uid()
  ));

create or replace function public.ensure_booking_reservation_financial()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'confirmed'
    and new.source = 'website_form'
    and coalesce(new.metadata->>'source', '') = 'booking_engine'
  then
    insert into public.booking_reservation_financials (
      calendar_entry_id, business_id, reservation_number
    ) values (
      new.id,
      new.business_id,
      'RES-' || to_char(coalesce(new.created_at, now()), 'YYYY') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 10))
    ) on conflict (calendar_entry_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_booking_reservation_financial_trigger on public.calendar_entries;
create trigger ensure_booking_reservation_financial_trigger
  after insert or update of status on public.calendar_entries
  for each row execute procedure public.ensure_booking_reservation_financial();

insert into public.booking_reservation_financials (calendar_entry_id, business_id, reservation_number)
select e.id, e.business_id,
  'RES-' || to_char(e.created_at, 'YYYY') || '-' || upper(substr(replace(e.id::text, '-', ''), 1, 10))
from public.calendar_entries e
where e.status = 'confirmed'
  and e.source = 'website_form'
  and coalesce(e.metadata->>'source', '') = 'booking_engine'
on conflict (calendar_entry_id) do nothing;

create or replace function public.next_booking_document_number(
  p_business_id uuid,
  p_document_type text,
  p_issued_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_year integer := extract(year from p_issued_at)::integer;
  selected_prefix text;
  selected_value bigint;
begin
  if p_document_type not in ('invoice', 'credit_note') then raise exception 'Invalid document type'; end if;
  select case when p_document_type = 'credit_note' then credit_note_prefix else invoice_prefix end
  into selected_prefix
  from public.booking_invoice_profiles where business_id = p_business_id;
  selected_prefix := coalesce(selected_prefix, case when p_document_type = 'credit_note' then 'CR' else 'F' end);

  insert into public.booking_document_counters (business_id, document_type, document_year, last_value)
  values (p_business_id, p_document_type, selected_year, 1)
  on conflict (business_id, document_type, document_year)
  do update set last_value = booking_document_counters.last_value + 1, updated_at = now()
  returning last_value into selected_value;

  return selected_prefix || '-' || selected_year::text || '-' || lpad(selected_value::text, 6, '0');
end;
$$;

create or replace function public.issue_booking_invoice(p_invoice_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_invoice public.booking_invoices%rowtype;
  generated_number text;
  issue_time timestamptz := now();
begin
  select * into selected_invoice from public.booking_invoices where id = p_invoice_id for update;
  if not found or selected_invoice.status <> 'draft' then raise exception 'Invoice is not an editable draft'; end if;
  if selected_invoice.currency <> 'EUR' then raise exception 'Only EUR invoices are supported'; end if;
  if selected_invoice.document_type = 'invoice' and selected_invoice.due_date < issue_time::date then
    raise exception 'Invoice due date cannot precede its issue date';
  end if;
  if jsonb_array_length(selected_invoice.line_items) = 0
    or coalesce(selected_invoice.seller_details->>'legal_name', '') = ''
    or coalesce(selected_invoice.seller_details->>'address_line1', '') = ''
    or coalesce(selected_invoice.seller_details->>'postal_code', '') = ''
    or coalesce(selected_invoice.seller_details->>'city', '') = ''
    or coalesce(selected_invoice.seller_details->>'vat_id', '') = ''
    or coalesce(selected_invoice.customer_details->>'name', '') = ''
    or coalesce(selected_invoice.customer_details->>'address_line1', '') = ''
    or coalesce(selected_invoice.customer_details->>'postal_code', '') = ''
    or coalesce(selected_invoice.customer_details->>'city', '') = ''
  then raise exception 'Invoice configuration is incomplete'; end if;

  generated_number := public.next_booking_document_number(
    selected_invoice.business_id, selected_invoice.document_type, issue_time
  );
  update public.booking_invoices
  set status = 'issued', invoice_number = generated_number, issued_at = issue_time
  where id = selected_invoice.id;

  if selected_invoice.document_type = 'credit_note' then
    update public.booking_invoices
    set status = 'credited'
    where id = selected_invoice.corrects_invoice_id and status = 'issued';
  end if;
  return generated_number;
end;
$$;

create or replace function public.protect_issued_booking_invoice()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' and (
    new.business_id is distinct from old.business_id
    or new.calendar_entry_id is distinct from old.calendar_entry_id
    or new.document_type is distinct from old.document_type
    or new.invoice_number is distinct from old.invoice_number
    or new.reservation_number is distinct from old.reservation_number
    or new.currency is distinct from old.currency
    or new.seller_details is distinct from old.seller_details
    or new.customer_details is distinct from old.customer_details
    or new.line_items is distinct from old.line_items
    or new.subtotal_minor is distinct from old.subtotal_minor
    or new.vat_total_minor is distinct from old.vat_total_minor
    or new.total_minor is distinct from old.total_minor
    or new.service_date is distinct from old.service_date
    or new.due_date is distinct from old.due_date
    or new.issued_at is distinct from old.issued_at
    or new.corrects_invoice_id is distinct from old.corrects_invoice_id
  ) then
    raise exception 'Issued invoice values are immutable';
  end if;
  if old.status = 'credited' and new.status <> 'credited' then raise exception 'Credited invoice status is immutable'; end if;
  if old.status = 'void' and new.status <> 'void' then raise exception 'Void invoice status is immutable'; end if;
  if old.pdf_storage_path is not null and (
    new.pdf_storage_path is distinct from old.pdf_storage_path
    or new.pdf_sha256 is distinct from old.pdf_sha256
    or new.pdf_size_bytes is distinct from old.pdf_size_bytes
  ) then raise exception 'Stored invoice PDF is immutable'; end if;
  return new;
end;
$$;

drop trigger if exists protect_issued_booking_invoice_trigger on public.booking_invoices;
create trigger protect_issued_booking_invoice_trigger
  before update on public.booking_invoices
  for each row execute procedure public.protect_issued_booking_invoice();

revoke all on function public.next_booking_document_number(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.issue_booking_invoice(uuid) from public, anon, authenticated;
grant execute on function public.issue_booking_invoice(uuid) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('booking-invoices', 'booking-invoices', false, 5242880, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.booking_reservation_financials is
  'Owner-managed reservation price snapshot and manual settlement status; no payment provider integration.';
comment on table public.booking_invoices is
  'Draft and immutable issued invoice/credit-note snapshots with private PDF storage references.';
comment on column public.booking_invoices.corrects_invoice_id is
  'A credit note performs a full reversal of an issued invoice; issued values are never edited in place.';

-- ------------------------------------------------------------
-- Guided onboarding
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  full_name text not null default '',
  phone text,
  job_title text,
  bio text,
  avatar_url text,
  locale text not null default 'nl-NL'
    check (locale in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR')),
  onboarding_step smallint not null default 1
    check (onboarding_step between 1 and 3),
  onboarding_business_id uuid references public.businesses(id) on delete set null,
  onboarding_website_id uuid references public.websites(id) on delete set null,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A few deployments already have a minimal profile table used by the editor
-- header. Make the migration additive for those databases as well.
alter table public.profiles
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists full_name text not null default '',
  add column if not exists phone text,
  add column if not exists job_title text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists locale text not null default 'nl-NL',
  add column if not exists onboarding_step smallint not null default 1,
  add column if not exists onboarding_business_id uuid references public.businesses(id) on delete set null,
  add column if not exists onboarding_website_id uuid references public.websites(id) on delete set null,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles add constraint profiles_locale_check
  check (locale in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR'));
alter table public.profiles drop constraint if exists profiles_onboarding_step_check;
alter table public.profiles add constraint profiles_onboarding_step_check
  check (onboarding_step between 1 and 3);

alter table public.businesses
  add column if not exists chamber_of_commerce_number text,
  add column if not exists vat_number text;

alter table public.websites
  add column if not exists primary_goal text
    check (primary_goal in ('bookings', 'contact_requests', 'showcase', 'other'));

create unique index if not exists websites_slug_lower_unique
  on public.websites (lower(slug));
create index if not exists profiles_onboarding_business_id_idx
  on public.profiles (onboarding_business_id);
create index if not exists profiles_onboarding_website_id_idx
  on public.profiles (onboarding_website_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Users that exist when this migration lands are grandfathered so the release
-- cannot unexpectedly block an established account. New users are inserted by
-- the auth trigger below with an incomplete onboarding state.
insert into public.profiles (
  id,
  first_name,
  last_name,
  full_name,
  phone,
  bio,
  avatar_url,
  locale,
  onboarding_step,
  onboarding_completed_at
)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'first_name', ''),
  coalesce(users.raw_user_meta_data ->> 'last_name', ''),
  coalesce(users.raw_user_meta_data ->> 'full_name', ''),
  nullif(btrim(users.raw_user_meta_data ->> 'phone'), ''),
  nullif(btrim(users.raw_user_meta_data ->> 'bio'), ''),
  nullif(btrim(users.raw_user_meta_data ->> 'avatar_url'), ''),
  case
    when users.raw_user_meta_data ->> 'locale' in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR')
      then users.raw_user_meta_data ->> 'locale'
    else 'nl-NL'
  end,
  3,
  now()
from auth.users users
on conflict (id) do update set
  onboarding_step = 3,
  onboarding_completed_at = coalesce(profiles.onboarding_completed_at, now());

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (
      id,
      first_name,
      last_name,
      full_name,
      phone,
      avatar_url,
      locale,
      onboarding_step,
      onboarding_completed_at
    ) values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'first_name', ''),
      coalesce(new.raw_user_meta_data ->> 'last_name', ''),
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), ''),
      case
        when new.raw_user_meta_data ->> 'locale' in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR')
          then new.raw_user_meta_data ->> 'locale'
        else 'nl-NL'
      end,
      1,
      null
    ) on conflict (id) do nothing;
  exception when others then
    -- A profile bootstrap problem must never make Supabase Auth signup fail.
    raise warning 'Could not create onboarding profile for user %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists create_profile_after_auth_signup on auth.users;
create trigger create_profile_after_auth_signup
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile settings" on public.profiles;
create policy "Users can update own profile settings"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, full_name, phone, job_title, bio, avatar_url, locale)
  on public.profiles to authenticated;

create or replace function public.save_onboarding_personal(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_job_title text,
  p_locale text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_first_name text := btrim(coalesce(p_first_name, ''));
  normalized_last_name text := btrim(coalesce(p_last_name, ''));
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if char_length(normalized_first_name) not between 1 and 100 then raise exception 'Invalid first name'; end if;
  if char_length(normalized_last_name) not between 1 and 100 then raise exception 'Invalid last name'; end if;
  if p_locale not in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR') then raise exception 'Invalid locale'; end if;
  if char_length(coalesce(p_phone, '')) > 40 then raise exception 'Invalid phone'; end if;
  if char_length(coalesce(p_job_title, '')) > 100 then raise exception 'Invalid job title'; end if;

  insert into public.profiles (
    id, first_name, last_name, full_name, phone, job_title, locale, onboarding_step
  ) values (
    current_user_id,
    normalized_first_name,
    normalized_last_name,
    normalized_first_name || ' ' || normalized_last_name,
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_job_title, '')), ''),
    p_locale,
    2
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    full_name = excluded.full_name,
    phone = excluded.phone,
    job_title = excluded.job_title,
    locale = excluded.locale,
    onboarding_step = greatest(profiles.onboarding_step, 2);
end;
$$;

create or replace function public.save_onboarding_business(
  p_name text,
  p_category text,
  p_country text,
  p_city text,
  p_email text,
  p_phone text,
  p_chamber_of_commerce_number text,
  p_vat_number text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  profile_row public.profiles%rowtype;
  business_id uuid;
  normalized_name text := btrim(coalesce(p_name, ''));
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  normalized_country text := upper(btrim(coalesce(p_country, '')));
  normalized_kvk text := nullif(regexp_replace(coalesce(p_chamber_of_commerce_number, ''), '\s', '', 'g'), '');
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select * into profile_row from public.profiles where id = current_user_id for update;
  if profile_row.id is null or profile_row.onboarding_step < 2 then raise exception 'Personal step incomplete'; end if;
  if char_length(normalized_name) not between 1 and 160 then raise exception 'Invalid business name'; end if;
  if p_category not in ('bnb', 'hairdresser', 'gardener', 'coach', 'restaurant', 'photographer', 'freelancer', 'construction', 'general_service') then raise exception 'Invalid category'; end if;
  if normalized_country not in ('NL', 'BE', 'DE', 'FR', 'GB') then raise exception 'Invalid country'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(normalized_email) > 254 then raise exception 'Invalid email'; end if;
  if char_length(coalesce(p_city, '')) > 100 then raise exception 'Invalid city'; end if;
  if char_length(coalesce(p_phone, '')) > 40 then raise exception 'Invalid phone'; end if;
  if normalized_country = 'NL' and normalized_kvk is not null and normalized_kvk !~ '^[0-9]{8}$' then raise exception 'Invalid chamber of commerce number'; end if;
  if char_length(coalesce(p_vat_number, '')) > 32 then raise exception 'Invalid VAT number'; end if;

  business_id := profile_row.onboarding_business_id;
  if business_id is null or not exists (
    select 1 from public.businesses where id = business_id and user_id = current_user_id
  ) then
    select id into business_id
    from public.businesses
    where user_id = current_user_id
    order by created_at asc
    limit 1
    for update;
  end if;

  if business_id is null then
    insert into public.businesses (
      user_id, name, category, country, city, email, phone,
      chamber_of_commerce_number, vat_number
    ) values (
      current_user_id,
      normalized_name,
      p_category,
      normalized_country,
      coalesce(nullif(btrim(coalesce(p_city, '')), ''), ''),
      normalized_email,
      coalesce(nullif(btrim(coalesce(p_phone, '')), ''), ''),
      normalized_kvk,
      nullif(btrim(coalesce(p_vat_number, '')), '')
    ) returning id into business_id;
  else
    update public.businesses set
      name = normalized_name,
      category = p_category,
      country = normalized_country,
      city = coalesce(nullif(btrim(coalesce(p_city, '')), ''), ''),
      email = normalized_email,
      phone = coalesce(nullif(btrim(coalesce(p_phone, '')), ''), ''),
      chamber_of_commerce_number = normalized_kvk,
      vat_number = nullif(btrim(coalesce(p_vat_number, '')), '')
    where id = business_id and user_id = current_user_id;
  end if;

  update public.profiles set
    onboarding_business_id = business_id,
    onboarding_step = greatest(onboarding_step, 3)
  where id = current_user_id;

  return business_id;
end;
$$;

create or replace function public.complete_onboarding(
  p_title text,
  p_slug text,
  p_primary_goal text,
  p_default_locale text,
  p_description text,
  p_existing_url text,
  p_sections jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  profile_row public.profiles%rowtype;
  business_row public.businesses%rowtype;
  target_website_id uuid;
  normalized_title text := btrim(coalesce(p_title, ''));
  normalized_slug text := lower(btrim(coalesce(p_slug, '')));
  section_row jsonb;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select * into profile_row from public.profiles where id = current_user_id for update;
  if profile_row.id is null
     or btrim(profile_row.first_name) = ''
     or btrim(profile_row.last_name) = ''
     or profile_row.onboarding_step < 3 then
    raise exception 'Personal step incomplete';
  end if;

  select * into business_row
  from public.businesses
  where id = profile_row.onboarding_business_id and user_id = current_user_id
  for update;
  if business_row.id is null
     or btrim(business_row.name) = ''
     or btrim(business_row.email) = '' then
    raise exception 'Business step incomplete';
  end if;

  if char_length(normalized_title) not between 1 and 160 then raise exception 'Invalid website title'; end if;
  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(normalized_slug) not between 3 and 63 then raise exception 'Invalid slug'; end if;
  if normalized_slug in ('www', 'admin', 'api', 'dashboard', 'editor', 'login', 'onboarding', 'auth', 'preview', 'site') then raise exception 'Reserved slug'; end if;
  if p_primary_goal not in ('bookings', 'contact_requests', 'showcase', 'other') then raise exception 'Invalid primary goal'; end if;
  if p_default_locale not in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR') then raise exception 'Invalid locale'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'Invalid description'; end if;
  if char_length(coalesce(p_existing_url, '')) > 500 then raise exception 'Invalid website URL'; end if;
  if nullif(btrim(coalesce(p_existing_url, '')), '') is not null
     and btrim(p_existing_url) !~* '^https?://[^[:space:]]+$' then raise exception 'Invalid website URL'; end if;
  if jsonb_typeof(coalesce(p_sections, '[]'::jsonb)) <> 'array' then raise exception 'Invalid starter sections'; end if;

  target_website_id := profile_row.onboarding_website_id;
  if target_website_id is null or not exists (
    select 1 from public.websites where id = target_website_id and user_id = current_user_id
  ) then
    select id into target_website_id
    from public.websites
    where user_id = current_user_id and published = false
    order by created_at asc
    limit 1
    for update;
  end if;

  if exists (
    select 1 from public.websites
    where lower(slug) = normalized_slug
      and (target_website_id is null or id <> target_website_id)
  ) then
    raise exception 'Slug unavailable' using errcode = '23505';
  end if;

  update public.businesses set
    description = coalesce(nullif(btrim(coalesce(p_description, '')), ''), ''),
    website_url = coalesce(nullif(btrim(coalesce(p_existing_url, '')), ''), '')
  where id = business_row.id;

  if target_website_id is null then
    insert into public.websites (
      user_id, business_id, title, slug, primary_goal, published
    ) values (
      current_user_id, business_row.id, normalized_title, normalized_slug, p_primary_goal, false
    ) returning id into target_website_id;
  else
    update public.websites set
      business_id = business_row.id,
      title = normalized_title,
      slug = normalized_slug,
      primary_goal = p_primary_goal,
      published = false
    where id = target_website_id and user_id = current_user_id;
  end if;

  insert into public.website_locales (
    website_id, locale, path_segment, display_name, is_default, is_enabled
  ) values (
    target_website_id,
    p_default_locale,
    case p_default_locale when 'nl-NL' then 'nl' when 'en-GB' then 'en' when 'de-DE' then 'de' else 'fr' end,
    case p_default_locale when 'nl-NL' then 'Nederlands' when 'en-GB' then 'English' when 'de-DE' then 'Deutsch' else 'Français' end,
    p_default_locale = 'nl-NL',
    true
  ) on conflict (website_id, locale) do update set is_enabled = true;

  if not exists (
    select 1 from public.website_locales
    where website_id = target_website_id and locale = p_default_locale and is_default
  ) then
    perform public.set_website_default_locale(target_website_id, p_default_locale);
  end if;

  if not exists (select 1 from public.website_sections where website_id = target_website_id) then
    for section_row in select value from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb))
    loop
      if section_row ->> 'type' in (
        'hero', 'gallery', 'services', 'contact', 'features', 'about', 'nav', 'footer',
        'testimonials', 'faq', 'opening_hours', 'pricing', 'team', 'map', 'cta', 'request_form'
      ) then
        insert into public.website_sections (website_id, position, type, content, styles)
        values (
          target_website_id,
          greatest(0, coalesce((section_row ->> 'position')::integer, 0)),
          section_row ->> 'type',
          coalesce(section_row -> 'content', '{}'::jsonb),
          coalesce(section_row -> 'styles', '{}'::jsonb)
        );
      end if;
    end loop;
  end if;

  update public.profiles set
    onboarding_business_id = business_row.id,
    onboarding_website_id = target_website_id,
    onboarding_step = 3,
    onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = current_user_id;

  return target_website_id;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function public.save_onboarding_personal(text, text, text, text, text) from public, anon;
revoke all on function public.save_onboarding_business(text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.complete_onboarding(text, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.save_onboarding_personal(text, text, text, text, text) to authenticated;
grant execute on function public.save_onboarding_business(text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.complete_onboarding(text, text, text, text, text, text, jsonb) to authenticated;

commit;
-- ============================================================
-- Agent team platform (mirrors 20260822120000 migration)
-- ============================================================

begin;

create table if not exists public.agent_settings (
  singleton_key boolean primary key default true,
  agents_enabled boolean not null default false,
  observe_only boolean not null default true,
  support_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  daily_budget_eur numeric(12, 4) not null default 5 check (daily_budget_eur >= 0),
  budget_reservation_eur numeric(12, 4) not null default 0.10 check (budget_reservation_eur > 0),
  daily_run_limit integer not null default 100 check (daily_run_limit between 1 and 10000),
  max_jobs_per_dispatch integer not null default 2 check (max_jobs_per_dispatch between 1 and 10),
  support_model text not null default 'openai/gpt-5.4-mini',
  marketing_model text not null default 'openai/gpt-5.4-mini',
  model_allowlist text[] not null default array['openai/gpt-5.4-mini']::text[],
  run_retention_days integer not null default 90 check (run_retention_days between 7 and 730),
  audit_retention_days integer not null default 365 check (audit_retention_days between 30 and 2555),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_settings_singleton_check check (singleton_key),
  constraint agent_settings_support_model_allowed check (support_model = any(model_allowlist)),
  constraint agent_settings_marketing_model_allowed check (marketing_model = any(model_allowlist))
);

insert into public.agent_settings (singleton_key)
values (true)
on conflict (singleton_key) do nothing;

create table if not exists public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  scope text not null check (scope in ('platform', 'business')),
  job_type text not null,
  payload_version integer not null default 1 check (payload_version > 0),
  source text not null,
  deduplication_key text not null,
  priority smallint not null default 50 check (priority between 0 and 100),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'queued' check (status in (
    'queued', 'claimed', 'running', 'waiting_for_dependency', 'awaiting_approval',
    'executing', 'completed', 'failed', 'dead_letter', 'cancelled', 'expired'
  )),
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by text,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  last_error_code text,
  last_error_message text,
  correlation_id uuid not null default gen_random_uuid(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_jobs_scope_business_check check (
    (scope = 'platform' and business_id is null)
    or (scope = 'business' and business_id is not null)
  ),
  constraint agent_jobs_type_not_blank check (btrim(job_type) <> ''),
  constraint agent_jobs_source_not_blank check (btrim(source) <> ''),
  constraint agent_jobs_dedupe_not_blank check (btrim(deduplication_key) <> ''),
  constraint agent_jobs_payload_object_check check (jsonb_typeof(payload) = 'object'),
  constraint agent_jobs_source_dedupe_unique unique (source, deduplication_key)
);

create table if not exists public.agent_job_dependencies (
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  depends_on_job_id uuid not null references public.agent_jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, depends_on_job_id),
  constraint agent_job_dependencies_not_self check (job_id <> depends_on_job_id)
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  parent_run_id uuid references public.agent_runs(id) on delete set null,
  agent_type text not null,
  provider text not null,
  model text not null,
  status text not null default 'queued' check (status in ('queued', 'in_progress', 'completed', 'failed', 'cancelled')),
  prompt_version text not null,
  provider_response_id text,
  input_summary text not null default '',
  output_summary text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  estimated_cost numeric(12, 6) check (estimated_cost is null or estimated_cost >= 0),
  currency text not null default 'EUR',
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint agent_runs_agent_not_blank check (btrim(agent_type) <> ''),
  constraint agent_runs_provider_not_blank check (btrim(provider) <> ''),
  constraint agent_runs_model_not_blank check (btrim(model) <> '')
);

create table if not exists public.agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  artifact_type text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  content_hash text not null,
  supersedes_artifact_id uuid references public.agent_artifacts(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint agent_artifacts_content_object_check check (jsonb_typeof(content) = 'object'),
  constraint agent_artifacts_hash_not_blank check (btrim(content_hash) <> ''),
  constraint agent_artifacts_job_type_version_unique unique (job_id, artifact_type, version)
);

create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  artifact_id uuid not null references public.agent_artifacts(id) on delete cascade,
  artifact_content_hash text not null,
  action_type text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'expired', 'invalidated', 'executed', 'execution_failed'
  )),
  requested_at timestamptz not null default now(),
  expires_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_approvals_action_not_blank check (btrim(action_type) <> '')
);

create table if not exists public.agent_executions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  approval_id uuid not null unique references public.agent_approvals(id) on delete cascade,
  artifact_id uuid not null references public.agent_artifacts(id) on delete cascade,
  executor_type text not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'executing', 'succeeded', 'failed', 'unknown')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  provider_action_id text,
  result_summary text,
  last_error_code text,
  last_error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_executions_executor_not_blank check (btrim(executor_type) <> ''),
  constraint agent_executions_key_not_blank check (btrim(idempotency_key) <> '')
);

create table if not exists public.agent_audit_logs (
  id bigint generated always as identity primary key,
  actor_type text not null,
  actor_id text,
  event_type text not null,
  object_type text not null,
  object_id uuid,
  previous_status text,
  new_status text,
  correlation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint agent_audit_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

alter table if exists public.mail_sync_runs
  add column if not exists agent_job_id uuid references public.agent_jobs(id) on delete set null;

alter table if exists public.mail_drafts
  add column if not exists provider_response_id text,
  add column if not exists input_tokens integer check (input_tokens is null or input_tokens >= 0),
  add column if not exists output_tokens integer check (output_tokens is null or output_tokens >= 0),
  add column if not exists total_tokens integer check (total_tokens is null or total_tokens >= 0);

alter table if exists public.lead_agent_runs
  add column if not exists agent_job_id uuid references public.agent_jobs(id) on delete set null;

drop trigger if exists set_agent_settings_updated_at on public.agent_settings;
create trigger set_agent_settings_updated_at
  before update on public.agent_settings
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_agent_jobs_updated_at on public.agent_jobs;
create trigger set_agent_jobs_updated_at
  before update on public.agent_jobs
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_agent_approvals_updated_at on public.agent_approvals;
create trigger set_agent_approvals_updated_at
  before update on public.agent_approvals
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_agent_executions_updated_at on public.agent_executions;
create trigger set_agent_executions_updated_at
  before update on public.agent_executions
  for each row execute procedure public.set_updated_at();

create index if not exists idx_agent_jobs_claim
  on public.agent_jobs (status, available_at, priority desc, created_at)
  where status = 'queued';
create index if not exists idx_agent_jobs_lease
  on public.agent_jobs (lease_expires_at)
  where status in ('claimed', 'running');
create index if not exists idx_agent_jobs_business_created
  on public.agent_jobs (business_id, created_at desc);
create index if not exists idx_agent_runs_job_created
  on public.agent_runs (job_id, created_at desc);
create index if not exists idx_agent_artifacts_job_created
  on public.agent_artifacts (job_id, created_at desc);
create index if not exists idx_agent_approvals_pending
  on public.agent_approvals (status, requested_at)
  where status = 'pending';
create index if not exists idx_agent_executions_pending
  on public.agent_executions (status, created_at)
  where status in ('pending', 'unknown');
create index if not exists idx_agent_audit_object
  on public.agent_audit_logs (object_type, object_id, created_at desc);
create index if not exists idx_agent_audit_correlation
  on public.agent_audit_logs (correlation_id, created_at);

alter table public.agent_settings enable row level security;
alter table public.agent_jobs enable row level security;
alter table public.agent_job_dependencies enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_artifacts enable row level security;
alter table public.agent_approvals enable row level security;
alter table public.agent_executions enable row level security;
alter table public.agent_audit_logs enable row level security;

create or replace function public.prevent_agent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.agent_maintenance', true) = 'retention' then return old; end if;
  raise exception 'agent_audit_logs is append-only' using errcode = '55000';
end;
$$;

drop trigger if exists prevent_agent_audit_update_delete on public.agent_audit_logs;
create trigger prevent_agent_audit_update_delete
  before update or delete on public.agent_audit_logs
  for each row execute function public.prevent_agent_audit_mutation();

create or replace function public.prevent_agent_artifact_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'agent_artifacts are immutable; create a new version' using errcode = '55000';
end;
$$;

drop trigger if exists prevent_agent_artifact_update on public.agent_artifacts;
create trigger prevent_agent_artifact_update
  before update on public.agent_artifacts
  for each row execute function public.prevent_agent_artifact_update();

create or replace function public.enqueue_agent_job(
  p_job_type text,
  p_source text,
  p_deduplication_key text,
  p_scope text default 'platform',
  p_business_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_payload_version integer default 1,
  p_priority smallint default 50,
  p_risk_level text default 'low',
  p_scheduled_for timestamptz default now(),
  p_max_attempts integer default 3
)
returns table(job_id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id uuid;
begin
  if btrim(coalesce(p_job_type, '')) = '' or btrim(coalesce(p_source, '')) = '' or btrim(coalesce(p_deduplication_key, '')) = '' then
    raise exception 'Job type, source and deduplication key are required' using errcode = '22023';
  end if;
  if p_scope not in ('platform', 'business')
    or (p_scope = 'platform' and p_business_id is not null)
    or (p_scope = 'business' and p_business_id is null) then
    raise exception 'Invalid job scope' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  insert into public.agent_jobs (
    business_id, scope, job_type, payload_version, source, deduplication_key,
    priority, risk_level, payload, scheduled_for, available_at, max_attempts
  ) values (
    p_business_id, p_scope, p_job_type, p_payload_version, p_source, p_deduplication_key,
    p_priority, p_risk_level, coalesce(p_payload, '{}'::jsonb), p_scheduled_for, p_scheduled_for, p_max_attempts
  )
  on conflict (source, deduplication_key) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    insert into public.agent_audit_logs (
      actor_type, event_type, object_type, object_id, new_status, correlation_id, metadata
    )
    select 'system', 'job.enqueued', 'agent_job', id, status, correlation_id,
      jsonb_build_object('jobType', job_type, 'source', source)
    from public.agent_jobs where id = inserted_id;
    return query select inserted_id, true;
    return;
  end if;

  return query
  select id, false
  from public.agent_jobs
  where source = p_source and deduplication_key = p_deduplication_key;
end;
$$;

create or replace function public.claim_agent_jobs(
  p_worker_id text,
  p_limit integer default 2,
  p_lease_seconds integer default 120
)
returns setof public.agent_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if btrim(coalesce(p_worker_id, '')) = '' then
    raise exception 'Worker id is required' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select j.id
    from public.agent_jobs j
    where j.status = 'queued'
      and exists (select 1 from public.agent_settings s where s.singleton_key = true and s.agents_enabled)
      and j.available_at <= now()
      and j.scheduled_for <= now()
      and not exists (
        select 1
        from public.agent_job_dependencies d
        join public.agent_jobs dependency on dependency.id = d.depends_on_job_id
        where d.job_id = j.id and dependency.status <> 'completed'
      )
    order by j.priority desc, j.created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 10)
  ), claimed as (
    update public.agent_jobs j
    set status = 'claimed',
        claimed_at = now(),
        claimed_by = p_worker_id,
        heartbeat_at = now(),
        lease_expires_at = now() + make_interval(secs => least(greatest(p_lease_seconds, 30), 900)),
        attempt_count = attempt_count + 1
    from candidates c
    where j.id = c.id
    returning j.*
  ), audited as (
    insert into public.agent_audit_logs (
      actor_type, actor_id, event_type, object_type, object_id,
      previous_status, new_status, correlation_id, metadata
    )
    select 'worker', p_worker_id, 'job.claimed', 'agent_job', id,
      'queued', 'claimed', correlation_id, jsonb_build_object('attempt', attempt_count)
    from claimed
    returning 1
  )
  select claimed.* from claimed;
end;
$$;

create or replace function public.transition_agent_job(
  p_job_id uuid,
  p_new_status text,
  p_actor_type text,
  p_actor_id text default null,
  p_worker_id text default null,
  p_error_code text default null,
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.agent_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job public.agent_jobs;
  old_status text;
  legal boolean := false;
begin
  select * into current_job from public.agent_jobs where id = p_job_id for update;
  if current_job.id is null then raise exception 'Agent job not found' using errcode = 'P0002'; end if;
  old_status := current_job.status;
  if p_worker_id is not null and current_job.claimed_by is distinct from p_worker_id then
    raise exception 'Worker does not own this job' using errcode = '42501';
  end if;

  legal := case current_job.status
    when 'queued' then p_new_status in ('claimed', 'cancelled')
    when 'claimed' then p_new_status in ('running', 'queued', 'dead_letter', 'cancelled')
    when 'running' then p_new_status in ('completed', 'awaiting_approval', 'waiting_for_dependency', 'queued', 'failed', 'dead_letter', 'cancelled')
    when 'waiting_for_dependency' then p_new_status in ('queued', 'cancelled', 'expired')
    when 'awaiting_approval' then p_new_status in ('executing', 'completed', 'cancelled', 'expired')
    when 'executing' then p_new_status in ('completed', 'failed', 'cancelled')
    when 'failed' then p_new_status in ('queued', 'dead_letter', 'cancelled')
    when 'dead_letter' then p_new_status in ('queued', 'cancelled')
    else false
  end;
  if not legal then
    raise exception 'Invalid agent job transition: % -> %', current_job.status, p_new_status using errcode = '22023';
  end if;

  update public.agent_jobs
  set status = p_new_status,
      available_at = case
        when p_new_status = 'queued' and old_status <> 'queued'
          then now() + make_interval(secs => least(300, (5 * power(2, greatest(current_job.attempt_count - 1, 0)) + floor(random() * 5))::integer))
        else available_at
      end,
      last_error_code = p_error_code,
      last_error_message = case when p_error_message is null then null else left(p_error_message, 500) end,
      completed_at = case when p_new_status in ('completed', 'dead_letter', 'cancelled', 'expired') then now() else null end,
      claimed_by = case when p_new_status in ('queued', 'waiting_for_dependency', 'awaiting_approval', 'completed', 'failed', 'dead_letter', 'cancelled', 'expired') then null else claimed_by end,
      claimed_at = case when p_new_status in ('queued', 'waiting_for_dependency', 'awaiting_approval', 'completed', 'failed', 'dead_letter', 'cancelled', 'expired') then null else claimed_at end,
      lease_expires_at = case when p_new_status in ('queued', 'waiting_for_dependency', 'awaiting_approval', 'completed', 'failed', 'dead_letter', 'cancelled', 'expired') then null else lease_expires_at end,
      heartbeat_at = case when p_new_status in ('running', 'executing') then now() else heartbeat_at end
  where id = p_job_id
  returning * into current_job;

  insert into public.agent_audit_logs (
    actor_type, actor_id, event_type, object_type, object_id,
    previous_status, new_status, correlation_id, metadata
  ) values (
    p_actor_type, p_actor_id, 'job.status_changed', 'agent_job', p_job_id,
    old_status, p_new_status,
    current_job.correlation_id, coalesce(p_metadata, '{}'::jsonb)
  );

  return current_job;
end;
$$;

create or replace function public.renew_agent_job_lease(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.agent_jobs
  set heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => least(greatest(p_lease_seconds, 30), 900))
  where id = p_job_id
    and claimed_by = p_worker_id
    and status in ('claimed', 'running', 'executing');
  return found;
end;
$$;

create or replace function public.requeue_expired_agent_jobs()
returns table(requeued integer, dead_lettered integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requeue_count integer := 0;
  dead_count integer := 0;
begin
  update public.agent_runs r
  set status = 'failed', error_code = 'lease_expired', error_message = 'De workerlease is verlopen.', finished_at = now()
  where r.status = 'in_progress'
    and exists (
      select 1 from public.agent_jobs j
      where j.id = r.job_id and j.status in ('claimed', 'running') and j.lease_expires_at < now()
    );

  with expired as (
    select id, status, correlation_id
    from public.agent_jobs
    where status in ('claimed', 'running') and lease_expires_at < now()
    for update skip locked
  ), moved as (
    update public.agent_jobs j
    set status = case when j.attempt_count >= j.max_attempts then 'dead_letter' else 'queued' end,
        available_at = case when j.attempt_count >= j.max_attempts then j.available_at else now() + make_interval(secs => least(300, 5 * power(2, greatest(j.attempt_count - 1, 0))::integer)) end,
        claimed_by = null,
        claimed_at = null,
        lease_expires_at = null,
        heartbeat_at = null,
        last_error_code = 'lease_expired',
        last_error_message = 'De workerlease is verlopen.',
        completed_at = case when j.attempt_count >= j.max_attempts then now() else null end
    from expired e
    where j.id = e.id
    returning j.id, e.status as previous_status, j.status, j.correlation_id
  ), audit_rows as (
    insert into public.agent_audit_logs (
      actor_type, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata
    )
    select 'reconciler', 'job.lease_expired', 'agent_job', id, previous_status, status, correlation_id, '{}'::jsonb
    from moved
    returning 1
  )
  select count(*) filter (where status = 'queued'), count(*) filter (where status = 'dead_letter')
  into requeue_count, dead_count
  from moved;

  return query select coalesce(requeue_count, 0), coalesce(dead_count, 0);
end;
$$;

create or replace function public.decide_agent_approval(
  p_approval_id uuid,
  p_decision text,
  p_decided_by uuid,
  p_note text default null
)
returns table(approval_status text, execution_id uuid, observe_only boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  approval_row public.agent_approvals;
  artifact_hash text;
  settings_row public.agent_settings;
  created_execution uuid;
begin
  if p_decision not in ('approve', 'reject') then raise exception 'Invalid decision' using errcode = '22023'; end if;
  select * into approval_row from public.agent_approvals where id = p_approval_id for update;
  if approval_row.id is null then raise exception 'Approval not found' using errcode = 'P0002'; end if;
  if approval_row.status <> 'pending' then raise exception 'Approval is no longer pending' using errcode = '55000'; end if;
  if approval_row.expires_at is not null and approval_row.expires_at <= now() then raise exception 'Approval has expired' using errcode = '55000'; end if;
  select content_hash into artifact_hash from public.agent_artifacts where id = approval_row.artifact_id;
  if artifact_hash is distinct from approval_row.artifact_content_hash then raise exception 'Artifact changed' using errcode = '55000'; end if;
  select * into settings_row from public.agent_settings where singleton_key = true;

  if p_decision = 'reject' then
    update public.agent_approvals set status = 'rejected', decided_at = now(), decided_by = p_decided_by, decision_note = left(p_note, 2000) where id = p_approval_id;
    update public.agent_jobs set status = 'cancelled', completed_at = now() where id = approval_row.job_id and status = 'awaiting_approval';
    insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, metadata)
    values ('admin', p_decided_by::text, 'approval.rejected', 'agent_approval', p_approval_id, 'pending', 'rejected', jsonb_build_object('jobId', approval_row.job_id));
    insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    select 'admin', p_decided_by::text, 'job.status_changed', 'agent_job', id, 'awaiting_approval', 'cancelled', correlation_id,
      jsonb_build_object('reason', 'approval_rejected', 'approvalId', p_approval_id)
    from public.agent_jobs where id = approval_row.job_id;
    return query select 'rejected'::text, null::uuid, coalesce(settings_row.observe_only, true);
    return;
  end if;

  if coalesce(settings_row.observe_only, true) then
    update public.agent_approvals set status = 'executed', decided_at = now(), decided_by = p_decided_by, decision_note = left(p_note, 2000) where id = p_approval_id;
    update public.agent_jobs set status = 'completed', completed_at = now() where id = approval_row.job_id and status = 'awaiting_approval';
    insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, metadata)
    values ('admin', p_decided_by::text, 'approval.observe_only_approved', 'agent_approval', p_approval_id, 'pending', 'executed', jsonb_build_object('jobId', approval_row.job_id));
    insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    select 'admin', p_decided_by::text, 'job.status_changed', 'agent_job', id, 'awaiting_approval', 'completed', correlation_id,
      jsonb_build_object('reason', 'observe_only_approval', 'approvalId', p_approval_id)
    from public.agent_jobs where id = approval_row.job_id;
    return query select 'executed'::text, null::uuid, true;
    return;
  end if;

  if not coalesce(settings_row.agents_enabled, false) then
    raise exception 'Agent kill switch is active' using errcode = '55000';
  end if;

  update public.agent_approvals set status = 'approved', decided_at = now(), decided_by = p_decided_by, decision_note = left(p_note, 2000) where id = p_approval_id;
  insert into public.agent_executions (job_id, approval_id, artifact_id, executor_type, idempotency_key)
  values (approval_row.job_id, approval_row.id, approval_row.artifact_id, approval_row.action_type, 'approval:' || approval_row.id::text || ':' || approval_row.artifact_content_hash)
  returning id into created_execution;
  update public.agent_jobs set status = 'executing' where id = approval_row.job_id and status = 'awaiting_approval';
  insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, metadata)
  values ('admin', p_decided_by::text, 'approval.approved', 'agent_approval', p_approval_id, 'pending', 'approved', jsonb_build_object('jobId', approval_row.job_id, 'executionId', created_execution));
  insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
  select 'admin', p_decided_by::text, 'job.status_changed', 'agent_job', id, 'awaiting_approval', 'executing', correlation_id,
    jsonb_build_object('approvalId', p_approval_id, 'executionId', created_execution)
  from public.agent_jobs where id = approval_row.job_id;
  return query select 'approved'::text, created_execution, false;
end;
$$;

create or replace function public.complete_agent_run_with_artifact(
  p_run_id uuid,
  p_job_id uuid,
  p_artifact_type text,
  p_title text,
  p_content jsonb,
  p_content_hash text,
  p_output_summary text,
  p_provider_response_id text default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_total_tokens integer default null,
  p_action_type text default null,
  p_risk_level text default 'low',
  p_approval_expires_at timestamptz default null
)
returns table(artifact_id uuid, approval_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_row public.agent_jobs;
  new_artifact_id uuid;
  new_approval_id uuid;
begin
  select * into job_row from public.agent_jobs where id = p_job_id for update;
  if job_row.id is null then raise exception 'Agent job not found' using errcode = 'P0002'; end if;
  if job_row.status <> 'running' then raise exception 'Agent job is not running' using errcode = '55000'; end if;
  if jsonb_typeof(coalesce(p_content, '{}'::jsonb)) <> 'object' then raise exception 'Artifact content must be an object' using errcode = '22023'; end if;

  update public.agent_runs
  set status = 'completed', output_summary = left(coalesce(p_output_summary, ''), 2000),
      provider_response_id = p_provider_response_id,
      input_tokens = p_input_tokens, output_tokens = p_output_tokens, total_tokens = p_total_tokens,
      finished_at = now()
  where id = p_run_id and job_id = p_job_id and status = 'in_progress';
  if not found then raise exception 'Active agent run not found' using errcode = '55000'; end if;

  insert into public.agent_artifacts (job_id, run_id, artifact_type, title, content, version, content_hash)
  values (p_job_id, p_run_id, p_artifact_type, left(p_title, 500), p_content, 1, p_content_hash)
  returning id into new_artifact_id;

  if p_action_type is null then
    update public.agent_jobs set status = 'completed', completed_at = now(), claimed_by = null, claimed_at = null, heartbeat_at = null, lease_expires_at = null where id = p_job_id;
    insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    values ('worker', 'job.status_changed', 'agent_job', p_job_id, 'running', 'completed', job_row.correlation_id, jsonb_build_object('artifactId', new_artifact_id));
  else
    insert into public.agent_approvals (job_id, artifact_id, artifact_content_hash, action_type, risk_level, expires_at)
    values (p_job_id, new_artifact_id, p_content_hash, p_action_type, p_risk_level, p_approval_expires_at)
    returning id into new_approval_id;
    update public.agent_jobs set status = 'awaiting_approval', claimed_by = null, claimed_at = null, heartbeat_at = null, lease_expires_at = null where id = p_job_id;
    insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    values ('worker', 'job.status_changed', 'agent_job', p_job_id, 'running', 'awaiting_approval', job_row.correlation_id,
      jsonb_build_object('artifactId', new_artifact_id, 'approvalId', new_approval_id));
  end if;

  return query select new_artifact_id, new_approval_id;
end;
$$;

create or replace function public.revise_agent_artifact(
  p_artifact_id uuid,
  p_actor_id uuid,
  p_title text,
  p_content jsonb,
  p_content_hash text,
  p_action_type text,
  p_risk_level text,
  p_expires_at timestamptz default null
)
returns table(artifact_id uuid, approval_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_artifact public.agent_artifacts;
  next_version integer;
  new_artifact_id uuid;
  new_approval_id uuid;
begin
  select * into current_artifact from public.agent_artifacts where id = p_artifact_id for update;
  if current_artifact.id is null then raise exception 'Artifact not found' using errcode = 'P0002'; end if;
  if jsonb_typeof(coalesce(p_content, '{}'::jsonb)) <> 'object' then raise exception 'Artifact content must be an object' using errcode = '22023'; end if;
  select coalesce(max(version), 0) + 1 into next_version
  from public.agent_artifacts
  where job_id = current_artifact.job_id and artifact_type = current_artifact.artifact_type;

  update public.agent_approvals
  set status = 'invalidated'
  where artifact_id = current_artifact.id and status = 'pending';

  insert into public.agent_artifacts (
    job_id, run_id, artifact_type, title, content, version, content_hash, supersedes_artifact_id
  ) values (
    current_artifact.job_id, current_artifact.run_id, current_artifact.artifact_type,
    left(p_title, 500), p_content, next_version, p_content_hash, current_artifact.id
  ) returning id into new_artifact_id;

  insert into public.agent_approvals (job_id, artifact_id, artifact_content_hash, action_type, risk_level, expires_at)
  values (current_artifact.job_id, new_artifact_id, p_content_hash, p_action_type, p_risk_level, p_expires_at)
  returning id into new_approval_id;

  insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, metadata)
  values ('admin', p_actor_id::text, 'artifact.revised', 'agent_artifact', new_artifact_id,
    jsonb_build_object('supersedesArtifactId', current_artifact.id, 'approvalId', new_approval_id));
  return query select new_artifact_id, new_approval_id;
end;
$$;

create or replace function public.claim_agent_execution(
  p_execution_id uuid
)
returns public.agent_executions
language plpgsql
security definer
set search_path = ''
as $$
declare
  execution_row public.agent_executions;
begin
  update public.agent_executions
  set status = 'executing', attempt_count = attempt_count + 1, started_at = coalesce(started_at, now())
  where id = p_execution_id and status = 'pending' and attempt_count < max_attempts
    and exists (
      select 1 from public.agent_settings s
      where s.singleton_key = true and s.agents_enabled and not s.observe_only
    )
  returning * into execution_row;
  if execution_row.id is null then raise exception 'Execution is not claimable' using errcode = '55000'; end if;
  insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, metadata)
  values ('executor', 'execution.claimed', 'agent_execution', execution_row.id, 'pending', 'executing', jsonb_build_object('attempt', execution_row.attempt_count));
  return execution_row;
end;
$$;

create or replace function public.complete_agent_execution(
  p_execution_id uuid,
  p_status text,
  p_provider_action_id text default null,
  p_result_summary text default null,
  p_error_code text default null,
  p_error_message text default null
)
returns public.agent_executions
language plpgsql
security definer
set search_path = ''
as $$
declare
  execution_row public.agent_executions;
  resulting_job_status text;
  previous_execution_status text;
begin
  if p_status not in ('succeeded', 'failed', 'unknown') then raise exception 'Invalid execution status' using errcode = '22023'; end if;
  select * into execution_row from public.agent_executions where id = p_execution_id for update;
  if execution_row.id is null then raise exception 'Execution not found' using errcode = 'P0002'; end if;
  if execution_row.status not in ('executing', 'unknown') then raise exception 'Execution is not active' using errcode = '55000'; end if;
  if execution_row.status = 'unknown' and p_status = 'unknown' then raise exception 'Execution is already unknown' using errcode = '55000'; end if;
  previous_execution_status := execution_row.status;

  update public.agent_executions
  set status = p_status, provider_action_id = p_provider_action_id,
      result_summary = left(p_result_summary, 2000), last_error_code = p_error_code,
      last_error_message = case when p_error_message is null then null else left(p_error_message, 500) end,
      finished_at = case when p_status in ('succeeded', 'failed') then now() else null end
  where id = p_execution_id
  returning * into execution_row;

  if p_status = 'succeeded' then
    update public.agent_approvals set status = 'executed' where id = execution_row.approval_id;
    update public.agent_jobs set status = 'completed', completed_at = now() where id = execution_row.job_id;
    resulting_job_status := 'completed';
  elsif p_status = 'failed' then
    update public.agent_approvals set status = 'execution_failed' where id = execution_row.approval_id;
    update public.agent_jobs set status = 'failed', last_error_code = p_error_code,
      last_error_message = case when p_error_message is null then null else left(p_error_message, 500) end
    where id = execution_row.job_id;
    resulting_job_status := 'failed';
  else
    resulting_job_status := 'executing';
  end if;

  insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, metadata)
  values ('executor', 'execution.completed', 'agent_execution', execution_row.id, previous_execution_status, p_status,
    jsonb_build_object('jobId', execution_row.job_id, 'jobStatus', resulting_job_status));
  if p_status in ('succeeded', 'failed') then
    insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    select 'executor', 'job.status_changed', 'agent_job', id, 'executing', resulting_job_status, correlation_id,
      jsonb_build_object('executionId', execution_row.id)
    from public.agent_jobs where id = execution_row.job_id;
  end if;
  return execution_row;
end;
$$;

create or replace function public.retry_agent_job(
  p_job_id uuid,
  p_actor_id uuid
)
returns public.agent_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_row public.agent_jobs;
  previous_job_status text;
begin
  select * into job_row from public.agent_jobs where id = p_job_id for update;
  if job_row.id is null then raise exception 'Agent job not found' using errcode = 'P0002'; end if;
  if job_row.status not in ('failed', 'dead_letter') then raise exception 'Agent job is not retryable' using errcode = '55000'; end if;
  previous_job_status := job_row.status;

  update public.agent_jobs
  set status = 'queued', attempt_count = 0, available_at = now(), scheduled_for = least(scheduled_for, now()),
      claimed_by = null, claimed_at = null, heartbeat_at = null, lease_expires_at = null,
      last_error_code = null, last_error_message = null, completed_at = null
  where id = p_job_id
  returning * into job_row;

  insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
  values ('admin', p_actor_id::text, 'job.manual_retry', 'agent_job', p_job_id, previous_job_status, 'queued', job_row.correlation_id, '{}'::jsonb);
  return job_row;
end;
$$;

create or replace function public.expire_agent_approvals()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer := 0;
begin
  with expired as (
    update public.agent_approvals
    set status = 'expired'
    where status = 'pending' and expires_at is not null and expires_at <= now()
    returning id, job_id
  ), jobs as (
    update public.agent_jobs j set status = 'expired', completed_at = now()
    from expired e where j.id = e.job_id and j.status = 'awaiting_approval'
    returning j.id, j.correlation_id
  ), audit_rows as (
    insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    select 'reconciler', 'job.status_changed', 'agent_job', id, 'awaiting_approval', 'expired', correlation_id,
      jsonb_build_object('reason', 'approval_expired')
    from jobs returning 1
  )
  select count(*) into affected from expired;
  return affected;
end;
$$;

create or replace function public.cleanup_agent_history()
returns table(deleted_jobs integer, deleted_audit_logs integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings_row public.agent_settings;
  jobs_count integer := 0;
  audit_count integer := 0;
begin
  select * into settings_row from public.agent_settings where singleton_key = true;
  perform set_config('app.agent_maintenance', 'retention', true);

  delete from public.agent_jobs
  where status in ('completed', 'failed', 'dead_letter', 'cancelled', 'expired')
    and coalesce(completed_at, updated_at) < now() - make_interval(days => coalesce(settings_row.run_retention_days, 90));
  get diagnostics jobs_count = row_count;

  delete from public.agent_audit_logs
  where created_at < now() - make_interval(days => coalesce(settings_row.audit_retention_days, 365));
  get diagnostics audit_count = row_count;

  return query select jobs_count, audit_count;
end;
$$;

revoke all on function public.enqueue_agent_job(text, text, text, text, uuid, jsonb, integer, smallint, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.claim_agent_jobs(text, integer, integer) from public, anon, authenticated;
revoke all on function public.transition_agent_job(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.renew_agent_job_lease(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.requeue_expired_agent_jobs() from public, anon, authenticated;
revoke all on function public.decide_agent_approval(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.complete_agent_run_with_artifact(uuid, uuid, text, text, jsonb, text, text, text, integer, integer, integer, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.revise_agent_artifact(uuid, uuid, text, jsonb, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_agent_execution(uuid) from public, anon, authenticated;
revoke all on function public.complete_agent_execution(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.retry_agent_job(uuid, uuid) from public, anon, authenticated;
revoke all on function public.expire_agent_approvals() from public, anon, authenticated;
revoke all on function public.cleanup_agent_history() from public, anon, authenticated;

grant execute on function public.enqueue_agent_job(text, text, text, text, uuid, jsonb, integer, smallint, text, timestamptz, integer) to service_role;
grant execute on function public.claim_agent_jobs(text, integer, integer) to service_role;
grant execute on function public.transition_agent_job(uuid, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.renew_agent_job_lease(uuid, text, integer) to service_role;
grant execute on function public.requeue_expired_agent_jobs() to service_role;
grant execute on function public.decide_agent_approval(uuid, text, uuid, text) to service_role;
grant execute on function public.complete_agent_run_with_artifact(uuid, uuid, text, text, jsonb, text, text, text, integer, integer, integer, text, text, timestamptz) to service_role;
grant execute on function public.revise_agent_artifact(uuid, uuid, text, jsonb, text, text, text, timestamptz) to service_role;
grant execute on function public.claim_agent_execution(uuid) to service_role;
grant execute on function public.complete_agent_execution(uuid, text, text, text, text, text) to service_role;
grant execute on function public.retry_agent_job(uuid, uuid) to service_role;
grant execute on function public.expire_agent_approvals() to service_role;
grant execute on function public.cleanup_agent_history() to service_role;

comment on table public.agent_jobs is 'Durable server-owned queue for FlexPagina agent workflows.';
comment on table public.agent_artifacts is 'Immutable versioned agent outputs; prefer references over copied customer data.';
comment on table public.agent_approvals is 'Single-use human decisions bound to an exact artifact content hash.';
comment on table public.agent_executions is 'External side-effect ledger with stable idempotency keys and unknown outcome support.';
comment on table public.agent_audit_logs is 'Append-only technical trail for agent state and approval changes.';

commit;


