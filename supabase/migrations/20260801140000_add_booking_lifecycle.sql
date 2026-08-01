-- Booking Engine 2.0 phase 3: customer access, lifecycle history, change requests, and notifications.

begin;

create table if not exists public.booking_customer_access (
  calendar_entry_id uuid primary key references public.calendar_entries(id) on delete cascade,
  token_version integer not null default 1 check (token_version > 0),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  calendar_entry_id uuid not null references public.calendar_entries(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_type text not null check (event_type in (
    'created', 'confirmed', 'declined', 'cancelled', 'completed', 'rescheduled',
    'reschedule_requested', 'alternative_proposed', 'reschedule_declined'
  )),
  from_status text check (from_status is null or from_status in ('pending', 'confirmed', 'cancelled', 'completed', 'blocked')),
  to_status text check (to_status is null or to_status in ('pending', 'confirmed', 'cancelled', 'completed', 'blocked')),
  actor_type text not null default 'system' check (actor_type in ('customer', 'owner', 'system')),
  public_message text not null default '',
  private_note text not null default '',
  proposed_start_at timestamptz,
  proposed_end_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint booking_status_history_proposed_range_check check (
    proposed_start_at is null or proposed_end_at is null or proposed_end_at > proposed_start_at
  )
);

create table if not exists public.booking_change_requests (
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

create table if not exists public.booking_notifications (
  id uuid primary key default gen_random_uuid(),
  calendar_entry_id uuid not null references public.calendar_entries(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  notification_type text not null check (notification_type in (
    'request_received', 'confirmed', 'declined', 'rescheduled', 'cancelled',
    'new_request', 'new_booking', 'customer_cancelled', 'customer_reschedule_requested',
    'alternative_proposed', 'reschedule_declined'
  )),
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

create unique index if not exists booking_change_requests_one_pending_idx
  on public.booking_change_requests (calendar_entry_id, request_kind, requested_by)
  where status = 'pending';
create index if not exists idx_booking_history_entry_created
  on public.booking_status_history (calendar_entry_id, created_at);
create index if not exists idx_booking_changes_entry_created
  on public.booking_change_requests (calendar_entry_id, created_at desc);
create index if not exists idx_booking_notifications_delivery
  on public.booking_notifications (status, created_at)
  where status in ('pending', 'failed');

drop trigger if exists set_booking_customer_access_updated_at on public.booking_customer_access;
create trigger set_booking_customer_access_updated_at
  before update on public.booking_customer_access
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_booking_change_requests_updated_at on public.booking_change_requests;
create trigger set_booking_change_requests_updated_at
  before update on public.booking_change_requests
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_booking_notifications_updated_at on public.booking_notifications;
create trigger set_booking_notifications_updated_at
  before update on public.booking_notifications
  for each row execute procedure public.set_updated_at();

alter table public.booking_customer_access enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.booking_change_requests enable row level security;
alter table public.booking_notifications enable row level security;

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

-- Existing Booking Engine entries receive management access and a baseline
-- history row without retroactively sending old notification emails.
insert into public.booking_customer_access (calendar_entry_id, expires_at)
select e.id, greatest(e.end_at + interval '90 days', now() + interval '730 days')
from public.calendar_entries e
where e.source = 'website_form' and coalesce(e.metadata->>'source', '') = 'booking_engine'
on conflict (calendar_entry_id) do nothing;

insert into public.booking_status_history (
  calendar_entry_id, business_id, event_type, to_status, actor_type, public_message, created_at
)
select e.id, e.business_id, 'created', e.status, 'system',
  case when e.status = 'confirmed' then 'De boeking is bevestigd.' else 'De aanvraag is ontvangen.' end,
  e.created_at
from public.calendar_entries e
where e.source = 'website_form'
  and coalesce(e.metadata->>'source', '') = 'booking_engine'
  and not exists (select 1 from public.booking_status_history h where h.calendar_entry_id = e.id);

create or replace function public.sanitize_booking_lifecycle_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor text;
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
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor text;
  public_message_value text;
  private_note_value text;
  owner_email text;
  booking_locale text;
  lifecycle_event text;
  customer_notification text;
  payload_value jsonb;
  lifecycle_event_id uuid;
begin
  if not (
    new.source = 'website_form'
    and (
      coalesce(new.metadata->>'source', '') = 'booking_engine'
      or exists (select 1 from public.booking_customer_access a where a.calendar_entry_id = new.id)
    )
  ) then
    return new;
  end if;

  actor := coalesce(nullif(current_setting('app.booking_actor', true), ''), case when auth.uid() is null then 'system' else 'owner' end);
  if actor not in ('customer', 'owner', 'system') then actor := 'system'; end if;
  public_message_value := left(coalesce(current_setting('app.booking_public_message', true), ''), 1000);
  private_note_value := left(coalesce(current_setting('app.booking_private_note', true), ''), 2000);

  select coalesce(cr.recipient_email, ''), coalesce(cr.locale, 'nl-NL')
  into owner_email, booking_locale
  from public.contact_requests cr
  where cr.id = new.contact_request_id;

  payload_value := jsonb_build_object(
    'title', new.title,
    'customerName', new.customer_name,
    'startAt', new.start_at,
    'endAt', new.end_at,
    'timezone', new.timezone,
    'status', new.status,
    'entryType', new.entry_type
  );

  if tg_op = 'INSERT' then
    insert into public.booking_customer_access (calendar_entry_id, expires_at)
    values (new.id, greatest(new.end_at + interval '90 days', now() + interval '730 days'))
    on conflict (calendar_entry_id) do nothing;

    insert into public.booking_status_history (
      calendar_entry_id, business_id, event_type, to_status, actor_type, public_message
    ) values (
      new.id, new.business_id, 'created', new.status, 'system',
      case when new.status = 'confirmed' then 'De boeking is bevestigd.' else 'De aanvraag is ontvangen.' end
    );

    customer_notification := case when new.status = 'confirmed' then 'confirmed' else 'request_received' end;
    insert into public.booking_notifications (
      calendar_entry_id, business_id, notification_type, recipient_type, recipient_email,
      locale, idempotency_key, payload
    ) values (
      new.id, new.business_id, customer_notification, 'customer', new.customer_email,
      booking_locale, new.id::text || ':created:customer:' || customer_notification, payload_value
    ) on conflict (idempotency_key) do nothing;

    if owner_email <> '' then
      insert into public.booking_notifications (
        calendar_entry_id, business_id, notification_type, recipient_type, recipient_email,
        locale, idempotency_key, payload
      ) values (
        new.id, new.business_id,
        case when new.status = 'confirmed' then 'new_booking' else 'new_request' end,
        'owner', owner_email, booking_locale,
        new.id::text || ':created:owner:' || new.status, payload_value
      ) on conflict (idempotency_key) do nothing;
    end if;
    return new;
  end if;

  if old.status is distinct from new.status then
    lifecycle_event := case
      when new.status = 'confirmed' then 'confirmed'
      when new.status = 'cancelled' and actor = 'owner' and old.status = 'pending' then 'declined'
      when new.status = 'cancelled' then 'cancelled'
      when new.status = 'completed' then 'completed'
      else null
    end;

    if lifecycle_event is not null then
      lifecycle_event_id := gen_random_uuid();
      insert into public.booking_status_history (
        id, calendar_entry_id, business_id, event_type, from_status, to_status, actor_type,
        public_message, private_note, created_by
      ) values (
        lifecycle_event_id, new.id, new.business_id, lifecycle_event, old.status, new.status, actor,
        public_message_value, private_note_value,
        case when actor = 'owner' then auth.uid() else null end
      );

      customer_notification := case lifecycle_event
        when 'confirmed' then 'confirmed'
        when 'declined' then 'declined'
        when 'cancelled' then 'cancelled'
        else null
      end;
      if customer_notification is not null then
        insert into public.booking_notifications (
          calendar_entry_id, business_id, notification_type, recipient_type, recipient_email,
          locale, idempotency_key, payload
        ) values (
          new.id, new.business_id, customer_notification, 'customer', new.customer_email,
          booking_locale, lifecycle_event_id::text || ':customer:' || customer_notification, payload_value
        ) on conflict (idempotency_key) do nothing;
      end if;
      if lifecycle_event = 'cancelled' and actor = 'customer' and owner_email <> '' then
        insert into public.booking_notifications (
          calendar_entry_id, business_id, notification_type, recipient_type, recipient_email,
          locale, idempotency_key, payload
        ) values (
          new.id, new.business_id, 'customer_cancelled', 'owner', owner_email,
          booking_locale, lifecycle_event_id::text || ':owner:customer_cancelled', payload_value
        ) on conflict (idempotency_key) do nothing;
      end if;
    end if;
  end if;

  if old.start_at is distinct from new.start_at or old.end_at is distinct from new.end_at then
    lifecycle_event_id := gen_random_uuid();
    insert into public.booking_status_history (
      id, calendar_entry_id, business_id, event_type, from_status, to_status, actor_type,
      public_message, private_note, proposed_start_at, proposed_end_at, created_by
    ) values (
      lifecycle_event_id, new.id, new.business_id, 'rescheduled', old.status, new.status, actor,
      public_message_value, private_note_value, new.start_at, new.end_at,
      case when actor = 'owner' then auth.uid() else null end
    );
    insert into public.booking_notifications (
      calendar_entry_id, business_id, notification_type, recipient_type, recipient_email,
      locale, idempotency_key, payload
    ) values (
      new.id, new.business_id, 'rescheduled', 'customer', new.customer_email,
      booking_locale, lifecycle_event_id::text || ':customer:rescheduled', payload_value
    ) on conflict (idempotency_key) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists booking_lifecycle_metadata_trigger on public.calendar_entries;
create trigger booking_lifecycle_metadata_trigger
  before insert or update of status, start_at, end_at, metadata on public.calendar_entries
  for each row execute procedure public.sanitize_booking_lifecycle_metadata();

drop trigger if exists booking_lifecycle_trigger on public.calendar_entries;
create trigger booking_lifecycle_trigger
  after insert or update of status, start_at, end_at, metadata on public.calendar_entries
  for each row execute procedure public.record_booking_lifecycle();

create or replace function public.record_booking_change_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_entry public.calendar_entries%rowtype;
  owner_email text;
  booking_locale text;
  notification_name text;
  recipient_kind text;
  recipient_address text;
begin
  select * into selected_entry from public.calendar_entries where id = new.calendar_entry_id;
  if selected_entry.id is null or selected_entry.business_id <> new.business_id then
    raise exception using errcode = 'P0001', message = 'BOOKING_CHANGE_CONTEXT_INVALID';
  end if;
  select coalesce(cr.recipient_email, ''), coalesce(cr.locale, 'nl-NL')
  into owner_email, booking_locale
  from public.contact_requests cr where cr.id = selected_entry.contact_request_id;

  insert into public.booking_status_history (
    calendar_entry_id, business_id, event_type, from_status, to_status, actor_type,
    public_message, private_note, proposed_start_at, proposed_end_at
  ) values (
    new.calendar_entry_id, new.business_id,
    case when new.request_kind = 'alternative_proposal' then 'alternative_proposed' else 'reschedule_requested' end,
    selected_entry.status, selected_entry.status, new.requested_by,
    left(new.customer_message, 1000), left(new.private_note, 2000),
    new.proposed_start_at, new.proposed_end_at
  );

  if new.requested_by = 'owner' then
    notification_name := 'alternative_proposed';
    recipient_kind := 'customer';
    recipient_address := selected_entry.customer_email;
  else
    notification_name := 'customer_reschedule_requested';
    recipient_kind := 'owner';
    recipient_address := owner_email;
  end if;

  if recipient_address <> '' then
    insert into public.booking_notifications (
      calendar_entry_id, business_id, notification_type, recipient_type, recipient_email,
      locale, idempotency_key, payload
    ) values (
      selected_entry.id, selected_entry.business_id, notification_name, recipient_kind,
      recipient_address, booking_locale, new.id::text || ':' || notification_name,
      jsonb_build_object(
        'title', selected_entry.title, 'customerName', selected_entry.customer_name,
        'startAt', selected_entry.start_at, 'endAt', selected_entry.end_at,
        'proposedStartAt', new.proposed_start_at, 'proposedEndAt', new.proposed_end_at,
        'timezone', selected_entry.timezone, 'message', left(new.customer_message, 1000)
      )
    ) on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists booking_change_request_trigger on public.booking_change_requests;
create trigger booking_change_request_trigger
  after insert on public.booking_change_requests
  for each row execute procedure public.record_booking_change_request();

create or replace function public.apply_booking_change_request(
  p_request_id uuid,
  p_actor text,
  p_resolved_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  change_request public.booking_change_requests%rowtype;
  selected_entry public.calendar_entries%rowtype;
  booking_settings public.service_booking_settings%rowtype;
  occupied_count bigint;
begin
  select * into change_request
  from public.booking_change_requests r
  where r.id = p_request_id and r.status = 'pending'
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'BOOKING_CHANGE_INVALID'; end if;
  if (p_actor = 'customer' and not (change_request.requested_by = 'owner' and change_request.request_kind = 'alternative_proposal'))
    or (p_actor = 'owner' and not (change_request.requested_by = 'customer' and change_request.request_kind = 'reschedule_request')) then
    raise exception using errcode = 'P0001', message = 'BOOKING_CHANGE_FORBIDDEN';
  end if;

  select * into selected_entry from public.calendar_entries e where e.id = change_request.calendar_entry_id for update;
  if selected_entry.id is null or selected_entry.status not in ('pending', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'BOOKING_CHANGE_INVALID';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(selected_entry.service_id::text, 0));
  select * into booking_settings from public.service_booking_settings s
  where s.service_id = selected_entry.service_id and s.business_id = selected_entry.business_id and s.booking_enabled = true;
  if booking_settings.service_id is null then raise exception using errcode = 'P0001', message = 'BOOKING_CONTEXT_UNAVAILABLE'; end if;

  if exists (
    select 1 from public.calendar_entries e
    where e.business_id = selected_entry.business_id and e.id <> selected_entry.id
      and (e.service_id is null or e.service_id = selected_entry.service_id)
      and (e.entry_type = 'blocked' or e.status = 'blocked')
      and e.start_at < change_request.proposed_end_at + make_interval(mins => booking_settings.buffer_after_minutes)
      and e.end_at > change_request.proposed_start_at - make_interval(mins => booking_settings.buffer_before_minutes)
  ) then raise exception using errcode = 'P0001', message = 'BOOKING_SLOT_UNAVAILABLE'; end if;

  select
    (select count(*) from public.calendar_entries e
      where e.business_id = selected_entry.business_id and e.service_id = selected_entry.service_id
        and e.id <> selected_entry.id and e.status in ('pending', 'confirmed')
        and e.start_at - make_interval(mins => booking_settings.buffer_before_minutes) < change_request.proposed_end_at
        and e.end_at + make_interval(mins => booking_settings.buffer_after_minutes) > change_request.proposed_start_at)
    +
    (select count(*) from public.booking_holds h
      where h.service_id = selected_entry.service_id and h.status = 'active' and h.expires_at > now()
        and h.start_at - make_interval(mins => booking_settings.buffer_before_minutes) < change_request.proposed_end_at
        and h.end_at + make_interval(mins => booking_settings.buffer_after_minutes) > change_request.proposed_start_at)
  into occupied_count;
  if occupied_count >= booking_settings.capacity then raise exception using errcode = 'P0001', message = 'BOOKING_SLOT_UNAVAILABLE'; end if;

  update public.calendar_entries
  set start_at = change_request.proposed_start_at,
      end_at = change_request.proposed_end_at,
      metadata = selected_entry.metadata || jsonb_build_object(
        'lifecycle_actor', p_actor,
        'lifecycle_public_message', change_request.customer_message,
        'lifecycle_private_note', change_request.private_note
      )
  where id = selected_entry.id;
  update public.booking_change_requests
  set status = 'accepted', resolved_by = p_resolved_by, resolved_at = now()
  where id = change_request.id;
  return selected_entry.id;
end;
$$;

create or replace function public.cancel_customer_booking(p_entry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_entry public.calendar_entries%rowtype;
  booking_settings public.service_booking_settings%rowtype;
begin
  select * into selected_entry from public.calendar_entries e where e.id = p_entry_id for update;
  if selected_entry.id is null or selected_entry.status not in ('pending', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'BOOKING_CANNOT_CANCEL';
  end if;
  select * into booking_settings from public.service_booking_settings s where s.service_id = selected_entry.service_id;
  if booking_settings.service_id is null
    or now() > selected_entry.start_at - make_interval(mins => booking_settings.cancellation_cutoff_minutes) then
    raise exception using errcode = 'P0001', message = 'BOOKING_CANCELLATION_CUTOFF';
  end if;
  update public.calendar_entries
  set status = 'cancelled',
      metadata = selected_entry.metadata || jsonb_build_object('lifecycle_actor', 'customer')
  where id = selected_entry.id;
  return selected_entry.id;
end;
$$;

create or replace function public.reject_booking_change_request(
  p_request_id uuid,
  p_resolved_by uuid,
  p_private_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  change_request public.booking_change_requests%rowtype;
  selected_entry public.calendar_entries%rowtype;
  booking_locale text;
begin
  select * into change_request from public.booking_change_requests r
  where r.id = p_request_id and r.status = 'pending'
    and r.requested_by = 'customer' and r.request_kind = 'reschedule_request'
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'BOOKING_CHANGE_INVALID'; end if;
  select * into selected_entry from public.calendar_entries e where e.id = change_request.calendar_entry_id;
  select coalesce(cr.locale, 'nl-NL') into booking_locale from public.contact_requests cr where cr.id = selected_entry.contact_request_id;
  update public.booking_change_requests set status = 'rejected', resolved_by = p_resolved_by, resolved_at = now()
  where id = change_request.id;
  insert into public.booking_status_history (calendar_entry_id, business_id, event_type, from_status, to_status, actor_type, private_note, created_by)
  values (selected_entry.id, selected_entry.business_id, 'reschedule_declined', selected_entry.status, selected_entry.status, 'owner', left(p_private_note, 2000), p_resolved_by);
  insert into public.booking_notifications (calendar_entry_id, business_id, notification_type, recipient_type, recipient_email, locale, idempotency_key, payload)
  values (selected_entry.id, selected_entry.business_id, 'reschedule_declined', 'customer', selected_entry.customer_email,
    booking_locale, change_request.id::text || ':reschedule_declined',
    jsonb_build_object('title', selected_entry.title, 'customerName', selected_entry.customer_name,
      'startAt', selected_entry.start_at, 'endAt', selected_entry.end_at, 'timezone', selected_entry.timezone))
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

comment on column public.booking_status_history.private_note is
  'Owner-only lifecycle context. Customer APIs must never select or serialize this column.';
comment on table public.booking_notifications is
  'Idempotent Booking Engine notification outbox. Unique keys prevent duplicate event/template delivery.';

commit;
