-- Booking Engine 2.0 phase 4: private iCal export and safe busy-time imports.

begin;

create table if not exists public.calendar_export_feeds (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  access_token uuid not null unique default gen_random_uuid(),
  token_version integer not null default 1 check (token_version > 0),
  enabled boolean not null default true,
  last_rotated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_import_sources (
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
  add column if not exists external_source_id uuid references public.calendar_import_sources(id) on delete cascade,
  add column if not exists external_uid text,
  add column if not exists external_occurrence_key text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'calendar_entries_external_identity_check'
      and conrelid = 'public.calendar_entries'::regclass
  ) then
    alter table public.calendar_entries
      add constraint calendar_entries_external_identity_check check (
        (external_source_id is null and external_uid is null and external_occurrence_key is null)
        or
        (external_source_id is not null and external_uid is not null and external_occurrence_key is not null
          and source = 'import' and entry_type = 'blocked' and status = 'blocked')
      );
  end if;
end $$;

create unique index if not exists calendar_entries_external_event_key
  on public.calendar_entries (external_source_id, external_uid, external_occurrence_key);
create index if not exists calendar_import_sources_due_idx
  on public.calendar_import_sources (next_sync_at)
  where enabled = true;
create index if not exists calendar_entries_external_source_idx
  on public.calendar_entries (external_source_id)
  where external_source_id is not null;

drop trigger if exists set_calendar_export_feeds_updated_at on public.calendar_export_feeds;
create trigger set_calendar_export_feeds_updated_at
  before update on public.calendar_export_feeds
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_calendar_import_sources_updated_at on public.calendar_import_sources;
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

commit;
