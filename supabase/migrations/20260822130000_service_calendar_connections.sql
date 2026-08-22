-- Extend Booking Engine 2.0 calendar interoperability with provider- and service-scoped feeds.

begin;

alter table public.calendar_import_sources
  add column if not exists service_id uuid,
  add column if not exists provider text not null default 'other',
  add column if not exists url_host text not null default '',
  add column if not exists feed_url_fingerprint text;

alter table public.calendar_import_sources
  drop constraint if exists calendar_import_sources_business_url_key,
  drop constraint if exists calendar_import_sources_feed_url_check,
  add constraint calendar_import_sources_feed_url_check
    check (char_length(feed_url) between 1 and 4096),
  add constraint calendar_import_sources_provider_check
    check (provider in ('booking_com', 'google_calendar', 'other')),
  add constraint calendar_import_sources_service_business_fkey
    foreign key (service_id, business_id)
    references public.services(id, business_id) on delete cascade,
  add constraint calendar_import_sources_provider_scope_check
    check (provider = 'other' or service_id is not null);

create unique index if not exists calendar_import_sources_service_provider_key
  on public.calendar_import_sources (service_id, provider)
  where service_id is not null and provider in ('booking_com', 'google_calendar');

create unique index if not exists calendar_import_sources_fingerprint_key
  on public.calendar_import_sources (
    business_id,
    coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid),
    feed_url_fingerprint
  )
  where feed_url_fingerprint is not null;

alter table public.calendar_export_feeds
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists service_id uuid,
  add column if not exists target_provider text not null default 'overview',
  add column if not exists token_hash text,
  add column if not exists token_prefix text;

alter table public.calendar_export_feeds
  alter column id set not null,
  alter column access_token drop not null,
  alter column access_token drop default,
  drop constraint if exists calendar_export_feeds_pkey,
  add constraint calendar_export_feeds_pkey primary key (id),
  add constraint calendar_export_feeds_service_business_fkey
    foreign key (service_id, business_id)
    references public.services(id, business_id) on delete cascade,
  add constraint calendar_export_feeds_target_provider_check
    check (target_provider in ('overview', 'booking_com', 'google_calendar')),
  add constraint calendar_export_feeds_scope_check
    check (
      (target_provider = 'overview' and service_id is null)
      or (target_provider <> 'overview' and service_id is not null)
    ),
  add constraint calendar_export_feeds_token_check
    check (access_token is not null or token_hash is not null);

create unique index if not exists calendar_export_feeds_overview_key
  on public.calendar_export_feeds (business_id)
  where target_provider = 'overview' and service_id is null;

create unique index if not exists calendar_export_feeds_service_provider_key
  on public.calendar_export_feeds (service_id, target_provider)
  where service_id is not null;

create unique index if not exists calendar_export_feeds_token_hash_key
  on public.calendar_export_feeds (token_hash)
  where token_hash is not null;

update public.calendar_entries
set title = 'Extern bezet'
where source = 'import' and title <> 'Extern bezet';

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
  safe_title text;
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

  safe_title := case selected_source.provider
    when 'booking_com' then 'Geboekt via Booking.com'
    when 'google_calendar' then 'Bezet via Google Agenda'
    else 'Extern bezet'
  end;

  insert into public.calendar_entries (
    business_id, service_id, contact_request_id, entry_type, status, source,
    title, customer_name, customer_email, customer_phone, start_at, end_at,
    all_day, timezone, internal_notes, metadata,
    external_source_id, external_uid, external_occurrence_key
  )
  select
    selected_source.business_id, selected_source.service_id, null, 'blocked', 'blocked', 'import',
    safe_title, '', '', '', event.start_at, event.end_at, coalesce(event.all_day, false),
    'Europe/Amsterdam', '',
    jsonb_build_object('calendar_import', jsonb_build_object(
      'source_id', selected_source.id,
      'provider', selected_source.provider
    )),
    selected_source.id, left(event.uid, 1000), event.occurrence_key
  from jsonb_to_recordset(p_events) as event(
    uid text, occurrence_key text, start_at timestamptz, end_at timestamptz,
    all_day boolean, summary text
  )
  on conflict (external_source_id, external_uid, external_occurrence_key)
  do update set
    service_id = excluded.service_id,
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

comment on column public.calendar_import_sources.feed_url is
  'AES-256-GCM encrypted iCal URL. Legacy plaintext values are encrypted on their next synchronization.';
comment on column public.calendar_import_sources.feed_url_fingerprint is
  'Keyed fingerprint used for duplicate detection without exposing the secret URL.';
comment on column public.calendar_export_feeds.token_hash is
  'SHA-256 hash of new export bearer tokens. The raw token is shown only when created or rotated.';

commit;
