-- ============================================================
-- AI lead agent leads table
-- ============================================================

begin;

create table if not exists public.leads (
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

create index if not exists idx_leads_city
  on public.leads (city);

create index if not exists idx_leads_category
  on public.leads (category);

create index if not exists idx_leads_status
  on public.leads (status);

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
  before update on public.leads
  for each row execute procedure public.set_updated_at();

alter table public.leads enable row level security;

commit;
