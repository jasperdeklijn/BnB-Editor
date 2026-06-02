-- ============================================================
-- Milestone 8: migrate BnB data model to generic businesses/services
-- ============================================================

begin;

create extension if not exists "pgcrypto";

create table if not exists public.businesses (
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

create table if not exists public.services (
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

alter table if exists public.websites
  add column if not exists business_id uuid references public.businesses(id) on delete set null,
  add column if not exists seo jsonb not null default '{}'::jsonb,
  add column if not exists analytics jsonb not null default '{}'::jsonb;

create index if not exists idx_businesses_user_id
  on public.businesses (user_id);

create index if not exists idx_businesses_category
  on public.businesses (category);

create index if not exists idx_services_business_id
  on public.services (business_id);

create index if not exists idx_services_business_position
  on public.services (business_id, position);

create index if not exists idx_websites_business_id
  on public.websites (business_id);

create index if not exists idx_website_sections_type
  on public.website_sections (type);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at
  before update on public.businesses
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
  before update on public.services
  for each row execute procedure public.set_updated_at();

do $$
begin
  if to_regclass('public.bnbs') is not null then
    execute $backfill_businesses$
      insert into public.businesses (
        id,
        user_id,
        name,
        category,
        tagline,
        description,
        website_url,
        street,
        city,
        postal,
        country,
        opening_note,
        appointment_start_time,
        appointment_end_time,
        capacity,
        languages,
        created_at,
        updated_at
      )
      select
        b.id,
        b.user_id,
        coalesce(b.name, ''),
        'general_service',
        coalesce(b.tagline, ''),
        coalesce(b.description, ''),
        coalesce(b.website_url, ''),
        coalesce(b.street, ''),
        coalesce(b.city, ''),
        coalesce(b.postal, ''),
        coalesce(nullif(b.country, ''), 'NL'),
        coalesce(b.checkin_time, ''),
        coalesce(b.checkin_time, ''),
        coalesce(b.checkout_time, ''),
        b.max_guests,
        coalesce(b.languages, ''),
        coalesce(b.created_at, now()),
        coalesce(b.updated_at, now())
      from public.bnbs b
      on conflict (id) do update set
        user_id = excluded.user_id,
        name = excluded.name,
        tagline = excluded.tagline,
        description = excluded.description,
        website_url = excluded.website_url,
        street = excluded.street,
        city = excluded.city,
        postal = excluded.postal,
        country = excluded.country,
        opening_note = excluded.opening_note,
        appointment_start_time = excluded.appointment_start_time,
        appointment_end_time = excluded.appointment_end_time,
        capacity = excluded.capacity,
        languages = excluded.languages,
        updated_at = excluded.updated_at
    $backfill_businesses$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.rooms') is not null then
    execute $backfill_services$
      insert into public.services (
        id,
        business_id,
        title,
        description,
        price,
        capacity,
        image_urls,
        position,
        created_at,
        updated_at
      )
      select
        r.id,
        r.bnb_id,
        coalesce(r.name, ''),
        coalesce(r.description, ''),
        coalesce(r.price, ''),
        r.max_guests,
        coalesce(r.images, '[]'::jsonb),
        coalesce(r.position, 0),
        coalesce(r.created_at, now()),
        coalesce(r.updated_at, now())
      from public.rooms r
      where exists (
        select 1
        from public.businesses b
        where b.id = r.bnb_id
      )
      on conflict (id) do update set
        business_id = excluded.business_id,
        title = excluded.title,
        description = excluded.description,
        price = excluded.price,
        capacity = excluded.capacity,
        image_urls = excluded.image_urls,
        position = excluded.position,
        updated_at = excluded.updated_at
    $backfill_services$;
  end if;
end $$;

update public.websites w
set business_id = (
  select b.id
  from public.businesses b
  where b.user_id = w.user_id
  order by b.created_at asc
  limit 1
)
where w.business_id is null
  and exists (
    select 1
    from public.businesses b
    where b.user_id = w.user_id
  );

update public.website_sections ws
set
  type = 'services',
  content =
    ws.content
    || jsonb_build_object(
      'businessId',
      coalesce(
        nullif(ws.content -> 'businessId', 'null'::jsonb),
        nullif(ws.content -> 'bnbId', 'null'::jsonb),
        to_jsonb(w.business_id)
      ),
      'serviceIds',
      coalesce(
        nullif(ws.content -> 'serviceIds', 'null'::jsonb),
        nullif(ws.content -> 'roomIds', 'null'::jsonb),
        '[]'::jsonb
      )
    )
    || case
      when ws.content ->> 'title' in ('Onze Kamers', 'Kamers', 'Onze kamers') then
        jsonb_build_object('title', 'Onze diensten')
      else '{}'::jsonb
    end
from public.websites w
where ws.website_id = w.id
  and ws.type = 'rooms';

alter table public.businesses enable row level security;
alter table public.services enable row level security;

drop policy if exists "Anyone can view published website businesses" on public.businesses;
create policy "Anyone can view published website businesses"
  on public.businesses for select
  using (
    exists (
      select 1
      from public.websites w
      where w.business_id = businesses.id
        and w.published = true
    )
  );

drop policy if exists "Users can view own businesses" on public.businesses;
create policy "Users can view own businesses"
  on public.businesses for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own businesses" on public.businesses;
create policy "Users can insert own businesses"
  on public.businesses for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own businesses" on public.businesses;
create policy "Users can update own businesses"
  on public.businesses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own businesses" on public.businesses;
create policy "Users can delete own businesses"
  on public.businesses for delete
  using (auth.uid() = user_id);

drop policy if exists "Anyone can view published website services" on public.services;
create policy "Anyone can view published website services"
  on public.services for select
  using (
    exists (
      select 1
      from public.websites w
      where w.business_id = services.business_id
        and w.published = true
    )
  );

drop policy if exists "Users can view own services" on public.services;
create policy "Users can view own services"
  on public.services for select
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = services.business_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own services" on public.services;
create policy "Users can insert own services"
  on public.services for insert
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = services.business_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own services" on public.services;
create policy "Users can update own services"
  on public.services for update
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = services.business_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = services.business_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own services" on public.services;
create policy "Users can delete own services"
  on public.services for delete
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = services.business_id
        and b.user_id = auth.uid()
    )
  );

commit;
