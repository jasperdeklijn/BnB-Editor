begin;

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
