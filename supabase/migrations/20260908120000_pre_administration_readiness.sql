-- Code-level production hardening that does not depend on paid providers.

-- Shared, atomic fixed-window rate limiting. Keys are SHA-256 hashes; raw IP
-- addresses and action identifiers are never stored.
create table if not exists public.rate_limit_buckets (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  request_count integer not null check (request_count > 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.rate_limit_buckets enable row level security;
revoke all on table public.rate_limit_buckets from public, anon, authenticated;

create or replace function public.check_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  bucket public.rate_limit_buckets%rowtype;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit not between 1 and 1000
     or p_window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.rate_limit_buckets (key_hash, request_count, reset_at, updated_at)
  values (p_key_hash, 1, v_now + make_interval(secs => p_window_seconds), v_now)
  on conflict (key_hash) do update
  set request_count = case
        when rate_limit_buckets.reset_at <= v_now then 1
        else rate_limit_buckets.request_count + 1
      end,
      reset_at = case
        when rate_limit_buckets.reset_at <= v_now then v_now + make_interval(secs => p_window_seconds)
        else rate_limit_buckets.reset_at
      end,
      updated_at = v_now
  returning * into bucket;

  return query select
    bucket.request_count <= p_limit,
    greatest(0, p_limit - bucket.request_count),
    bucket.reset_at;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Private delivery destinations. The trigger mirrors an owner's draft setting,
-- while public snapshots contain only the opaque section id.
create table if not exists public.website_form_destinations (
  website_id uuid not null references public.websites(id) on delete cascade,
  section_id uuid not null,
  recipient_email text not null check (
    char_length(recipient_email) <= 254
    and recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  updated_at timestamptz not null default now(),
  primary key (website_id, section_id),
  foreign key (section_id, website_id)
    references public.website_sections(id, website_id) on delete cascade
);

alter table public.website_form_destinations enable row level security;

drop policy if exists "Users can manage own form destinations" on public.website_form_destinations;
create policy "Users can manage own form destinations"
  on public.website_form_destinations for all to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = website_form_destinations.website_id and w.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.websites w
    where w.id = website_form_destinations.website_id and w.user_id = auth.uid()
  ));

create or replace function public.sync_website_form_destination()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  destination text := lower(btrim(coalesce(new.content->>'recipientEmail', '')));
begin
  if destination ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     and char_length(destination) <= 254 then
    insert into public.website_form_destinations (website_id, section_id, recipient_email, updated_at)
    values (new.website_id, new.id, destination, now())
    on conflict (website_id, section_id) do update
      set recipient_email = excluded.recipient_email, updated_at = now();
  else
    delete from public.website_form_destinations
    where website_id = new.website_id and section_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_website_form_destination on public.website_sections;
create trigger sync_website_form_destination
  after insert or update of content on public.website_sections
  for each row execute procedure public.sync_website_form_destination();

insert into public.website_form_destinations (website_id, section_id, recipient_email)
select ws.website_id, ws.id, lower(btrim(ws.content->>'recipientEmail'))
from public.website_sections ws
where lower(btrim(coalesce(ws.content->>'recipientEmail', ''))) ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
on conflict (website_id, section_id) do update
  set recipient_email = excluded.recipient_email, updated_at = now();

-- Remove private delivery addresses from existing public snapshots. Section ids
-- remain available as non-secret lookup keys for server-side form delivery.
update public.websites w
set live_snapshot = jsonb_set(
  jsonb_set(
    jsonb_set(
      w.live_snapshot - 'ownerEmail',
      '{website}',
      coalesce(w.live_snapshot->'website', '{}'::jsonb) - 'userId'
    ),
    '{sections}',
    coalesce((
      select jsonb_agg(
        jsonb_set(section, '{data}', (coalesce(section->'data', '{}'::jsonb) - 'recipientEmail') || jsonb_build_object('formDestinationKey', section->>'id'))
      )
      from jsonb_array_elements(coalesce(w.live_snapshot->'sections', '[]'::jsonb)) section
    ), '[]'::jsonb)
  ),
  '{locales}',
  coalesce((
    select jsonb_agg(
      jsonb_set(locale, '{sections}', coalesce((
        select jsonb_agg(
          jsonb_set(section, '{data}', (coalesce(section->'data', '{}'::jsonb) - 'recipientEmail') || jsonb_build_object('formDestinationKey', section->>'id'))
        )
        from jsonb_array_elements(coalesce(locale->'sections', '[]'::jsonb)) section
      ), '[]'::jsonb))
    )
    from jsonb_array_elements(coalesce(w.live_snapshot->'locales', '[]'::jsonb)) locale
  ), '[]'::jsonb)
)
where w.live_snapshot is not null;

-- Enforce the account-wide image quota under a transaction lock. Storage
-- objects are uploaded only through the authenticated API and are removed if
-- this metadata insert is rejected.
drop policy if exists "Users can upload their own images" on storage.objects;

create or replace function public.enforce_user_image_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  used_bytes bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 981723));
  select coalesce(sum(original_size + thumbnail_size), 0)
    into used_bytes
    from public.user_images
    where user_id = new.user_id and id <> new.id;
  if used_bytes + new.original_size + new.thumbnail_size > 52428800 then
    raise exception 'USER_IMAGE_QUOTA_EXCEEDED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_user_image_quota on public.user_images;
create trigger enforce_user_image_quota
  before insert or update of original_size, thumbnail_size, user_id on public.user_images
  for each row execute procedure public.enforce_user_image_quota();

-- Destructive template replacements execute as one database transaction.
create or replace function public.apply_template_transaction(
  p_website_id uuid,
  p_business_id uuid,
  p_applied_template_id text,
  p_business_defaults jsonb,
  p_sections jsonb,
  p_services jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  section_count integer;
  service_count integer;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if not exists (select 1 from public.websites where id = p_website_id and user_id = auth.uid()) then
    raise exception 'Website not found';
  end if;
  if not exists (select 1 from public.businesses where id = p_business_id and user_id = auth.uid()) then
    raise exception 'Business not found';
  end if;
  if jsonb_typeof(p_sections) <> 'array' or jsonb_array_length(p_sections) > 100 then
    raise exception 'Invalid template sections';
  end if;
  if jsonb_typeof(p_services) <> 'array' or jsonb_array_length(p_services) > 250 then
    raise exception 'Invalid template services';
  end if;

  perform 1 from public.websites where id = p_website_id for update;
  perform 1 from public.businesses where id = p_business_id for update;

  update public.businesses
  set name = coalesce(p_business_defaults->>'name', name),
      tagline = coalesce(p_business_defaults->>'tagline', tagline),
      description = coalesce(p_business_defaults->>'description', description),
      phone = coalesce(p_business_defaults->>'phone', phone),
      email = coalesce(p_business_defaults->>'email', email),
      category = coalesce(p_business_defaults->>'category', category)
  where id = p_business_id and user_id = auth.uid();

  update public.websites
  set business_id = p_business_id, applied_template_id = p_applied_template_id, updated_at = now()
  where id = p_website_id and user_id = auth.uid();

  delete from public.website_sections where website_id = p_website_id;
  insert into public.website_sections (website_id, type, content, styles, position)
  select p_website_id, item->>'type', coalesce(item->'data', '{}'::jsonb),
         coalesce(item->'styles', '{}'::jsonb), ordinality::integer
  from jsonb_array_elements(p_sections) with ordinality as section_item(item, ordinality);
  get diagnostics section_count = row_count;

  delete from public.services where business_id = p_business_id;
  insert into public.services (
    business_id, title, description, price, duration, capacity,
    image_urls, tags, position, is_featured
  )
  select p_business_id, coalesce(item->>'title', ''), coalesce(item->>'description', ''),
         coalesce(item->>'price', ''), coalesce(item->>'duration', ''),
         nullif(item->>'capacity', '')::integer,
         coalesce(item->'image_urls', '[]'::jsonb), coalesce(item->'tags', '[]'::jsonb),
         coalesce((item->>'position')::integer, ordinality::integer - 1),
         coalesce((item->>'is_featured')::boolean, false)
  from jsonb_array_elements(p_services) with ordinality as service_item(item, ordinality);
  get diagnostics service_count = row_count;

  return jsonb_build_object('sectionsCount', section_count, 'servicesCount', service_count);
end;
$$;

revoke all on function public.apply_template_transaction(uuid, uuid, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.apply_template_transaction(uuid, uuid, text, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.restore_template_transaction(
  p_website_id uuid,
  p_business_id uuid,
  p_checkpoint jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  section_count integer;
  service_count integer;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if not exists (select 1 from public.websites where id = p_website_id and user_id = auth.uid()) then
    raise exception 'Website not found';
  end if;
  if p_business_id is not null and not exists (
    select 1 from public.businesses where id = p_business_id and user_id = auth.uid()
  ) then raise exception 'Business not found'; end if;
  if jsonb_typeof(coalesce(p_checkpoint->'sections', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_checkpoint->'sections', '[]'::jsonb)) > 100
     or jsonb_array_length(coalesce(p_checkpoint->'services', '[]'::jsonb)) > 250 then
    raise exception 'Invalid restore point';
  end if;

  perform 1 from public.websites where id = p_website_id for update;
  update public.websites set business_id = p_business_id, updated_at = now()
  where id = p_website_id and user_id = auth.uid();

  delete from public.website_sections where website_id = p_website_id;
  insert into public.website_sections (id, website_id, type, content, styles, position)
  select (item->>'id')::uuid, p_website_id, item->>'type',
         coalesce(item->'content', '{}'::jsonb), coalesce(item->'styles', '{}'::jsonb),
         (item->>'position')::integer
  from jsonb_array_elements(coalesce(p_checkpoint->'sections', '[]'::jsonb)) item;
  get diagnostics section_count = row_count;

  insert into public.section_transitions (website_id, from_section_id, to_section_id, transition)
  select p_website_id, (item->>'from_section_id')::uuid, (item->>'to_section_id')::uuid,
         nullif(item->'transition', 'null'::jsonb)
  from jsonb_array_elements(coalesce(p_checkpoint->'transitions', '[]'::jsonb)) item
  where exists (select 1 from public.website_sections where id = (item->>'from_section_id')::uuid and website_id = p_website_id)
    and exists (select 1 from public.website_sections where id = (item->>'to_section_id')::uuid and website_id = p_website_id);

  if p_business_id is not null then
    delete from public.services where business_id = p_business_id;
    insert into public.services (
      id, business_id, title, description, price, duration, capacity,
      image_urls, tags, position, is_featured
    )
    select (item->>'id')::uuid, p_business_id, coalesce(item->>'title', ''),
           coalesce(item->>'description', ''), coalesce(item->>'price', ''),
           coalesce(item->>'duration', ''), nullif(item->>'capacity', '')::integer,
           coalesce(item->'image_urls', '[]'::jsonb), coalesce(item->'tags', '[]'::jsonb),
           coalesce((item->>'position')::integer, 0), coalesce((item->>'is_featured')::boolean, false)
    from jsonb_array_elements(coalesce(p_checkpoint->'services', '[]'::jsonb)) item;
    get diagnostics service_count = row_count;
  else
    service_count := 0;
  end if;

  insert into public.website_locales (website_id, locale, path_segment, display_name, is_default, is_enabled, seo)
  select p_website_id, item->>'locale', item->>'path_segment', item->>'display_name',
         coalesce((item->>'is_default')::boolean, false), coalesce((item->>'is_enabled')::boolean, false),
         coalesce(item->'seo', '{}'::jsonb)
  from jsonb_array_elements(coalesce(p_checkpoint->'locales', '[]'::jsonb)) item
  on conflict (website_id, locale) do update set
    path_segment = excluded.path_segment, display_name = excluded.display_name,
    is_default = excluded.is_default, is_enabled = excluded.is_enabled, seo = excluded.seo;

  insert into public.website_section_translations (website_id, section_id, locale, values, source_hash)
  select p_website_id, (item->>'section_id')::uuid, item->>'locale',
         coalesce(item->'values', '{}'::jsonb), coalesce(item->>'source_hash', '')
  from jsonb_array_elements(coalesce(p_checkpoint->'sectionTranslations', '[]'::jsonb)) item
  on conflict (section_id, locale) do update set values = excluded.values, source_hash = excluded.source_hash;

  if p_business_id is not null then
    insert into public.business_translations (business_id, locale, name, description, opening_note, source_hash)
    select p_business_id, item->>'locale', coalesce(item->>'name', ''),
           coalesce(item->>'description', ''), coalesce(item->>'opening_note', ''), coalesce(item->>'source_hash', '')
    from jsonb_array_elements(coalesce(p_checkpoint->'businessTranslations', '[]'::jsonb)) item
    on conflict (business_id, locale) do update set
      name = excluded.name, description = excluded.description,
      opening_note = excluded.opening_note, source_hash = excluded.source_hash;

    insert into public.service_translations (service_id, locale, title, description, source_hash)
    select (item->>'service_id')::uuid, item->>'locale', coalesce(item->>'title', ''),
           coalesce(item->>'description', ''), coalesce(item->>'source_hash', '')
    from jsonb_array_elements(coalesce(p_checkpoint->'serviceTranslations', '[]'::jsonb)) item
    on conflict (service_id, locale) do update set
      title = excluded.title, description = excluded.description, source_hash = excluded.source_hash;
  end if;

  return jsonb_build_object('sectionsCount', section_count, 'servicesCount', service_count);
end;
$$;

revoke all on function public.restore_template_transaction(uuid, uuid, jsonb) from public;
grant execute on function public.restore_template_transaction(uuid, uuid, jsonb) to authenticated;
