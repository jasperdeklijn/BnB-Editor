-- Booking Engine 2.0 phase 2: short-lived capacity holds and atomic finalization.

begin;

create table if not exists public.booking_holds (
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

create index if not exists idx_booking_holds_active_service_time
  on public.booking_holds (service_id, start_at, end_at, expires_at)
  where status = 'active';

create index if not exists idx_booking_holds_business_created
  on public.booking_holds (business_id, created_at desc);

drop trigger if exists set_booking_holds_updated_at on public.booking_holds;
create trigger set_booking_holds_updated_at
  before update on public.booking_holds
  for each row execute procedure public.set_updated_at();

alter table public.booking_holds enable row level security;

drop policy if exists "Users can view own booking holds" on public.booking_holds;
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

drop policy if exists "Users can delete own booking holds" on public.booking_holds;
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
    where w.id = p_website_id
      and w.published = true
  ) then
    raise exception using errcode = 'P0001', message = 'BOOKING_CONTEXT_UNAVAILABLE';
  end if;

  update public.booking_holds
  set status = 'expired'
  where service_id = p_service_id
    and status = 'active'
    and expires_at <= now();

  buffered_start := p_start_at - make_interval(mins => booking_settings.buffer_before_minutes);
  buffered_end := p_end_at + make_interval(mins => booking_settings.buffer_after_minutes);

  if exists (
    select 1 from public.calendar_entries e
    where e.business_id = p_business_id
      and (e.service_id is null or e.service_id = p_service_id)
      and (e.entry_type = 'blocked' or e.status = 'blocked')
      and e.start_at < buffered_end
      and e.end_at > buffered_start
  ) then
    raise exception using errcode = 'P0001', message = 'BOOKING_SLOT_UNAVAILABLE';
  end if;

  select
    (select count(*)
      from public.calendar_entries e
      where e.business_id = p_business_id
        and e.service_id = p_service_id
        and e.status in ('pending', 'confirmed')
        and e.start_at - make_interval(mins => booking_settings.buffer_before_minutes) < p_end_at
        and e.end_at + make_interval(mins => booking_settings.buffer_after_minutes) > p_start_at)
    +
    (select count(*)
      from public.booking_holds h
      where h.service_id = p_service_id
        and h.status = 'active'
        and h.expires_at > now()
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
  )
  returning * into created_hold;

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
  where w.id = selected_hold.website_id
    and w.published = true;

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
      and e.start_at < buffered_end
      and e.end_at > buffered_start
  ) then
    raise exception using errcode = 'P0001', message = 'BOOKING_SLOT_UNAVAILABLE';
  end if;

  select
    (select count(*)
      from public.calendar_entries e
      where e.business_id = selected_hold.business_id
        and e.service_id = selected_hold.service_id
        and e.status in ('pending', 'confirmed')
        and e.start_at - make_interval(mins => booking_settings.buffer_before_minutes) < selected_hold.end_at
        and e.end_at + make_interval(mins => booking_settings.buffer_after_minutes) > selected_hold.start_at)
    +
    (select count(*)
      from public.booking_holds h
      where h.service_id = selected_hold.service_id
        and h.id <> selected_hold.id
        and h.status = 'active'
        and h.expires_at > now()
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
    selected_hold.website_id,
    selected_hold.business_id,
    website_owner_id,
    case when selected_hold.booking_mode = 'stay' then 'booking_request' else 'appointment' end,
    left(p_name, 120),
    left(lower(p_email), 254),
    left(p_phone, 40),
    left(selected_service.title, 160),
    selected_hold.start_at::text,
    left(p_message, 3000),
    left(p_locale, 20),
    jsonb_build_object(
      'source', 'booking_engine',
      'serviceId', selected_hold.service_id,
      'holdId', selected_hold.id,
      'bookingMode', selected_hold.booking_mode,
      'startAt', selected_hold.start_at,
      'endAt', selected_hold.end_at,
      'timezone', selected_hold.timezone,
      'confirmationMode', booking_settings.confirmation_mode
    ),
    left(p_recipient_email, 254),
    'website_form'
  ) returning id into created_request_id;

  insert into public.calendar_entries (
    business_id, service_id, contact_request_id, entry_type, status, source, title,
    customer_name, customer_email, customer_phone, start_at, end_at, all_day,
    timezone, metadata
  ) values (
    selected_hold.business_id,
    selected_hold.service_id,
    created_request_id,
    case when selected_hold.booking_mode = 'stay' then 'booking' else 'appointment' end,
    final_status,
    'website_form',
    left(selected_service.title || ' - ' || p_name, 240),
    left(p_name, 120),
    left(lower(p_email), 254),
    left(p_phone, 40),
    selected_hold.start_at,
    selected_hold.end_at,
    selected_hold.booking_mode = 'stay',
    selected_hold.timezone,
    jsonb_build_object(
      'source', 'booking_engine',
      'holdId', selected_hold.id,
      'confirmationMode', booking_settings.confirmation_mode
    )
  ) returning id into created_entry_id;

  update public.booking_holds
  set status = 'consumed'
  where id = selected_hold.id;

  return query select created_request_id, created_entry_id, final_status;
end;
$$;

revoke all on function public.create_public_booking_hold(uuid, uuid, uuid, text, timestamptz, timestamptz, text, text) from public;
revoke all on function public.create_public_booking_hold(uuid, uuid, uuid, text, timestamptz, timestamptz, text, text) from anon, authenticated;
grant execute on function public.create_public_booking_hold(uuid, uuid, uuid, text, timestamptz, timestamptz, text, text) to service_role;

revoke all on function public.finalize_public_booking(uuid, text, text, text, text, text, text, text) from public;
revoke all on function public.finalize_public_booking(uuid, text, text, text, text, text, text, text) from anon, authenticated;
grant execute on function public.finalize_public_booking(uuid, text, text, text, text, text, text, text) to service_role;

comment on table public.booking_holds is
  'Short-lived Booking Engine 2.0 capacity holds. Raw public tokens are never stored.';

commit;
