-- ============================================================
-- BnB Editor / Small Business Website Builder database init
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

-- ------------------------------------------------------------
-- Compatibility tables: legacy BnB/rooms model
-- ------------------------------------------------------------
-- These are kept so old compatibility routes/wrappers can still work
-- during the migration window. New code should use businesses/services.

create table public.bnbs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  tagline text not null default '',
  description text not null default '',
  street text not null default '',
  city text not null default '',
  postal text not null default '',
  country text not null default '',
  checkin_time text not null default '15:00',
  checkout_time text not null default '11:00',
  max_guests integer,
  languages text not null default '',
  website_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  bnb_id uuid not null references public.bnbs(id) on delete cascade,
  name text not null default '',
  description text not null default '',
  price text not null default '',
  max_guests integer,
  images jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_bnbs_updated_at
  before update on public.bnbs
  for each row execute procedure public.set_updated_at();

create trigger set_rooms_updated_at
  before update on public.rooms
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Generic business/services model
-- ------------------------------------------------------------

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.websites.theme_config is
  'Theme configuration including paletteId, fontPairId, spacing, and radius';

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

create index idx_website_sections_website_id on public.website_sections (website_id);
create index idx_website_sections_position on public.website_sections (website_id, position);
create index idx_website_sections_type on public.website_sections (type);

create index idx_contact_requests_website_id on public.contact_requests (website_id);
create index idx_contact_requests_business_id on public.contact_requests (business_id);
create index idx_contact_requests_user_id_created_at on public.contact_requests (user_id, created_at desc);

create index idx_section_transitions_website_id on public.section_transitions (website_id);
create index idx_section_transitions_from_section on public.section_transitions (from_section_id);
create index idx_section_transitions_to_section on public.section_transitions (to_section_id);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table public.bnbs enable row level security;
alter table public.rooms enable row level security;
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.websites enable row level security;
alter table public.website_sections enable row level security;
alter table public.section_transitions enable row level security;
alter table public.contact_requests enable row level security;

-- Legacy bnbs
create policy "Users can view own bnb"
  on public.bnbs for select
  using (auth.uid() = user_id);

create policy "Users can insert own bnb"
  on public.bnbs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bnb"
  on public.bnbs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own bnb"
  on public.bnbs for delete
  using (auth.uid() = user_id);

-- Legacy rooms
create policy "Users can view own rooms"
  on public.rooms for select
  using (
    exists (
      select 1 from public.bnbs b
      where b.id = rooms.bnb_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can insert own rooms"
  on public.rooms for insert
  with check (
    exists (
      select 1 from public.bnbs b
      where b.id = rooms.bnb_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can update own rooms"
  on public.rooms for update
  using (
    exists (
      select 1 from public.bnbs b
      where b.id = rooms.bnb_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bnbs b
      where b.id = rooms.bnb_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can delete own rooms"
  on public.rooms for delete
  using (
    exists (
      select 1 from public.bnbs b
      where b.id = rooms.bnb_id
        and b.user_id = auth.uid()
    )
  );

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

