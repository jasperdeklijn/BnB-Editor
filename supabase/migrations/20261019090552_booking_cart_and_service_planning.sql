-- Booking add-on: published service options, live planning, atomic booking lists.
begin;
create schema if not exists booking_private;
revoke all on schema booking_private from public, anon, authenticated;
grant usage on schema booking_private to service_role;

create table public.booking_resources (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  name text not null check (length(name) between 1 and 120), capacity integer not null default 1 check (capacity between 1 and 10000),
  timezone text not null default 'Europe/Amsterdam', windows jsonb not null default '[]' check (jsonb_typeof(windows)='array'),
  unique(id,business_id)
);
alter table public.services add column booking_catalog jsonb;
alter table public.services add column archived_at timestamptz;
alter table public.service_booking_settings add column resource_id uuid;
alter table public.service_booking_settings add constraint service_resource_business_fk foreign key(resource_id,business_id) references public.booking_resources(id,business_id);
create index service_booking_resource_idx on public.service_booking_settings(resource_id) where resource_id is not null;

create table public.booking_availability_exceptions (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  service_id uuid, resource_id uuid, date date not null,
  windows jsonb not null default '[]' check (jsonb_typeof(windows)='array'),
  check (service_id is null or resource_id is null),
  foreign key(service_id,business_id) references public.services(id,business_id),
  foreign key(resource_id,business_id) references public.booking_resources(id,business_id)
);
create unique index booking_exception_scope_date on public.booking_availability_exceptions(business_id,service_id,resource_id,date) nulls not distinct;

create table public.booking_cart_holds (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
  website_id uuid not null references public.websites(id), section_id text not null,
  token_hash text not null unique, idempotency_key uuid not null, selection jsonb not null, plan jsonb not null,
  publication_version text not null, expires_at timestamptz not null default now()+interval '10 minutes',
  status text not null default 'active' check(status in ('active','consumed','cancelled')),
  unique(website_id,idempotency_key), unique(id,business_id)
);
create table public.booking_groups (
  id uuid primary key references public.booking_cart_holds(id), business_id uuid not null references public.businesses(id),
  website_id uuid not null references public.websites(id), leader_id uuid unique,
  status text not null check(status in ('pending','confirmed','cancelled','completed')), plan jsonb not null,
  payment_instructions text not null default '', confirmation_text text not null default '', created_at timestamptz not null default now(), unique(id,business_id)
);
alter table public.calendar_entries add column booking_group_id uuid, add column booking_group_primary boolean not null default false;
alter table public.calendar_entries add column booking_resource_id uuid;
alter table public.calendar_entries add constraint calendar_resource_business_fk foreign key(booking_resource_id,business_id) references public.booking_resources(id,business_id);
alter table public.calendar_entries add constraint calendar_booking_group_business_fk foreign key(booking_group_id,business_id) references public.booking_groups(id,business_id);
alter table public.booking_groups add constraint booking_group_leader_fk foreign key(leader_id) references public.calendar_entries(id);
create index calendar_booking_group_idx on public.calendar_entries(booking_group_id) where booking_group_id is not null;
create index calendar_booking_services_idx on public.calendar_entries using gin ((metadata->'bookingServiceIds'));
create index calendar_booking_resource_busy_idx on public.calendar_entries(business_id,booking_resource_id,start_at,end_at) where status in ('pending','confirmed','blocked');
create unique index calendar_booking_group_primary_idx on public.calendar_entries(booking_group_id) where booking_group_primary;
alter table public.booking_holds add column cart_hold_id uuid references public.booking_cart_holds(id);
alter table public.booking_holds add column booking_resource_id uuid;
alter table public.booking_holds add constraint booking_hold_resource_business_fk foreign key(booking_resource_id,business_id) references public.booking_resources(id,business_id);
create index booking_holds_cart_idx on public.booking_holds(cart_hold_id) where cart_hold_id is not null;
create index booking_holds_resource_busy_idx on public.booking_holds(business_id,booking_resource_id,start_at,end_at) where status='active';
alter table public.booking_reservation_financials add column booking_group_id uuid unique references public.booking_groups(id);
alter table public.booking_invoices add column booking_group_id uuid references public.booking_groups(id);

create function booking_private.entitled(p_business uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.temporary_gold_access_enabled() or exists (
    select 1 from public.businesses b join public.subscriptions s on s.user_id=b.user_id where b.id=p_business
      and s.booking_addon_active and (s.status in ('active','trial') or (s.status='canceled' and s.current_period_end>now()))
  );
$$;
create function booking_private.lock_business(p_business uuid) returns void language sql volatile set search_path='' as $$
  select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('booking-business:'||p_business::text,0));
$$;

-- Both UI actions and direct Data API writes enforce ownership and the add-on.
do $$ declare t text; begin
  foreach t in array array['booking_resources','booking_availability_exceptions','booking_cart_holds','booking_groups'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('create policy owner_read on public.%I for select to authenticated using (business_id in (select id from public.businesses where user_id=(select auth.uid())))',t);
  end loop;
end $$;
grant insert,update,delete on public.booking_resources,public.booking_availability_exceptions to authenticated;
create function booking_private.guard_planning_write() returns trigger language plpgsql security definer set search_path='' as $$
declare b uuid; w jsonb;
begin
  b:=coalesce(new.business_id,old.business_id);
  perform booking_private.lock_business(b);
  if auth.uid() is not null and not exists(select 1 from public.businesses where id=b and user_id=auth.uid()) then raise exception 'BOOKING_OWNER_REQUIRED' using errcode='42501'; end if;
  if auth.uid() is not null and not booking_private.entitled(b) then
    if tg_table_name<>'service_booking_settings' or tg_op<>'UPDATE' then raise exception 'BOOKING_ADDON_REQUIRED' using errcode='42501'; end if;
    if new.booking_enabled or (to_jsonb(new)-'booking_enabled'-'updated_at') is distinct from (to_jsonb(old)-'booking_enabled'-'updated_at') then raise exception 'BOOKING_ADDON_REQUIRED' using errcode='42501'; end if;
  end if;
  if tg_op<>'DELETE' then
    if tg_table_name in ('booking_resources','booking_availability_exceptions') then
      if jsonb_array_length(new.windows)>50 then raise exception 'Te veel beschikbaarheidsvensters'; end if;
      for w in select value from jsonb_array_elements(new.windows) loop
        if coalesce(w->>'start_time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(w->>'end_time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or w->>'end_time'<=w->>'start_time' then raise exception 'Ongeldige beschikbaarheid'; end if;
        if tg_table_name='booking_resources' and coalesce((w->>'weekday')::int,0) not between 1 and 7 then raise exception 'Ongeldige weekdag'; end if;
      end loop;
    end if;
    return new;
  end if;
  return old;
end $$;
create policy owner_write on public.booking_resources for all to authenticated using (business_id in (select id from public.businesses where user_id=(select auth.uid()))) with check (business_id in (select id from public.businesses where user_id=(select auth.uid())));
create policy owner_write on public.booking_availability_exceptions for all to authenticated using (business_id in (select id from public.businesses where user_id=(select auth.uid()))) with check (business_id in (select id from public.businesses where user_id=(select auth.uid())));
create trigger guard_resources before insert or update or delete on public.booking_resources for each row execute function booking_private.guard_planning_write();
create trigger guard_exceptions before insert or update or delete on public.booking_availability_exceptions for each row execute function booking_private.guard_planning_write();
create trigger guard_week_windows before insert or update or delete on public.calendar_availability_windows for each row execute function booking_private.guard_planning_write();
create trigger guard_booking_rules before insert or update or delete on public.service_booking_settings for each row execute function booking_private.guard_planning_write();

create function booking_private.guard_service_catalog() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.booking_catalog is not null and (tg_op='INSERT' or new.booking_catalog is distinct from old.booking_catalog) then
    perform booking_private.lock_business(new.business_id);
    if not booking_private.entitled(new.business_id) then raise exception 'BOOKING_ADDON_REQUIRED' using errcode='42501'; end if;
    if jsonb_typeof(new.booking_catalog)<>'object' or jsonb_typeof(new.booking_catalog->'variants')<>'array' or jsonb_typeof(new.booking_catalog->'extras')<>'array' or jsonb_array_length(new.booking_catalog->'variants') not between 1 and 20 or jsonb_array_length(new.booking_catalog->'extras')>40 then raise exception 'Ongeldige dienstopties'; end if;
  end if;
  return new;
end $$;
create trigger guard_service_catalog before insert or update of booking_catalog on public.services for each row execute function booking_private.guard_service_catalog();

create function booking_private.interval_open(p_business uuid,p_service uuid,p_resource uuid,p_start timestamptz,p_end timestamptz,p_timezone text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare d date:=(p_start at time zone p_timezone)::date; windows_value jsonb; w jsonb; daynum int:=extract(isodow from (p_start at time zone p_timezone));
begin
  if (p_end at time zone p_timezone)::date<>d then return false; end if;
  if exists(select 1 from public.booking_availability_exceptions where business_id=p_business and service_id is null and resource_id is null and date=d and windows='[]'::jsonb) then return false; end if;
  select windows into windows_value from public.booking_availability_exceptions where business_id=p_business and date=d and
    case when p_resource is not null then resource_id=p_resource else service_id=p_service end;
  if windows_value is null then
    select windows into windows_value from public.booking_availability_exceptions where business_id=p_business and date=d and service_id is null and resource_id is null;
  end if;
  if windows_value is not null then
    for w in select value from jsonb_array_elements(windows_value) loop
      if p_start >= (d+(w->>'start_time')::time) at time zone p_timezone and p_end <= (d+(w->>'end_time')::time) at time zone p_timezone then return true; end if;
    end loop;
    return false;
  end if;
  if p_resource is not null then
    select windows into windows_value from public.booking_resources where id=p_resource and business_id=p_business;
    for w in select value from jsonb_array_elements(coalesce(windows_value,'[]')) where (value->>'weekday')::int=daynum loop
      if p_start >= (d+(w->>'start_time')::time) at time zone p_timezone and p_end <= (d+(w->>'end_time')::time) at time zone p_timezone then return true; end if;
    end loop;
    return false;
  end if;
  return exists(select 1 from public.calendar_availability_windows a where a.business_id=p_business and a.weekday=daynum and a.is_active and
    (a.service_id=p_service or (a.service_id is null and not exists(select 1 from public.calendar_availability_windows own where own.business_id=p_business and own.service_id=p_service and own.weekday=daynum)))
    and p_start >= (d+a.start_time) at time zone a.timezone and p_end <= (d+a.end_time) at time zone a.timezone);
end $$;

-- A common guard covers old/public booking routes, manual agenda writes and imports.
create function booking_private.capacity_available(p_business uuid,p_service uuid,p_resource uuid,p_start timestamptz,p_end timestamptz,p_capacity int,p_exclude_entry uuid,p_exclude_hold uuid,p_exclude_group uuid) returns boolean language sql volatile security definer set search_path='' as $$
  with busy as (
    select e.start_at-make_interval(mins=>coalesce(s.buffer_before_minutes,0)) as a,e.end_at+make_interval(mins=>coalesce(s.buffer_after_minutes,0)) as b,
      (e.entry_type='blocked' or e.status='blocked') as blocked
    from public.calendar_entries e left join public.service_booking_settings s on s.service_id=e.service_id
    where e.business_id=p_business and e.id is distinct from p_exclude_entry and (p_exclude_group is null or e.booking_group_id is distinct from p_exclude_group)
      and e.start_at<p_end+interval '1 day' and e.end_at>p_start-interval '1 day'
      and e.status not in ('cancelled','completed') and e.entry_type<>'note'
      and ((e.service_id is null and (e.entry_type='blocked' or e.status='blocked')) or (case when p_resource is null then e.service_id=p_service else coalesce(e.booking_resource_id,s.resource_id)=p_resource end))
    union all
    select h.start_at-make_interval(mins=>s.buffer_before_minutes),h.end_at+make_interval(mins=>s.buffer_after_minutes),false
    from public.booking_holds h join public.service_booking_settings s on s.service_id=h.service_id
    where h.business_id=p_business and h.status='active' and h.expires_at>now() and h.id is distinct from p_exclude_hold
      and h.start_at<p_end+interval '1 day' and h.end_at>p_start-interval '1 day'
      and (case when p_resource is null then h.service_id=p_service else coalesce(h.booking_resource_id,s.resource_id)=p_resource end)
  ), relevant as (select * from busy where a<p_end and b>p_start), events as (
    select greatest(a,p_start) as t,1 as n from relevant union all select least(b,p_end),-1 from relevant
  ), occupancy as (select sum(n) over(order by t,n rows unbounded preceding) as n from events)
  select not exists(select 1 from relevant where blocked) and coalesce((select max(n) from occupancy),0)<p_capacity;
$$;

create function booking_private.guard_capacity() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.service_booking_settings%rowtype; r public.booking_resources%rowtype; from_at timestamptz; to_at timestamptz; exclude_hold uuid; exclude_entry uuid; group_id uuid; enforce_schedule boolean:=false;
begin
  perform booking_private.lock_business(new.business_id);
  if tg_op='UPDATE' and old.booking_resource_id is not null and new.booking_resource_id is distinct from old.booking_resource_id then raise exception 'De gereserveerde agenda staat vast.'; end if;
  if tg_table_name='calendar_entries' then
    if tg_op='UPDATE' and old.booking_group_id is not null and (new.booking_group_id is distinct from old.booking_group_id or new.booking_group_primary is distinct from old.booking_group_primary or new.service_id is distinct from old.service_id or new.source is distinct from old.source or new.metadata->>'source' is distinct from old.metadata->>'source') then raise exception 'De onderdelen van een gezamenlijke boeking staan vast.'; end if;
    if new.entry_type in ('note','blocked') or new.status not in ('pending','confirmed') then return new; end if;
    if tg_op='UPDATE' and new.start_at=old.start_at and new.end_at=old.end_at and new.service_id is not distinct from old.service_id and old.status in ('pending','confirmed') then return new; end if;
    exclude_entry:=new.id; exclude_hold:=nullif(new.metadata->>'holdId','')::uuid; group_id:=new.booking_group_id;
    enforce_schedule:=new.source='website_form' and new.metadata->>'source'='booking_engine';
  else
    if new.status<>'active' or new.expires_at<=now() then return new; end if;
    exclude_hold:=new.id;
  end if;
  select * into s from public.service_booking_settings where service_id=new.service_id and business_id=new.business_id;
  if not found then return new; end if;
  if tg_op='INSERT' then new.booking_resource_id:=s.resource_id; end if;
  s.resource_id:=coalesce(new.booking_resource_id,s.resource_id);
  from_at:=new.start_at-make_interval(mins=>s.buffer_before_minutes); to_at:=new.end_at+make_interval(mins=>s.buffer_after_minutes);
  if not booking_private.capacity_available(new.business_id,new.service_id,null,from_at,to_at,s.capacity,exclude_entry,exclude_hold,group_id) then raise exception 'BOOKING_SLOT_UNAVAILABLE'; end if;
  if s.resource_id is not null then
    select * into r from public.booking_resources where id=s.resource_id and business_id=new.business_id;
    if not found or not booking_private.capacity_available(new.business_id,new.service_id,s.resource_id,from_at,to_at,r.capacity,exclude_entry,exclude_hold,group_id) then raise exception 'BOOKING_SLOT_UNAVAILABLE'; end if;
  end if;
  if tg_table_name='booking_holds' or group_id is not null or enforce_schedule then
    if not s.booking_enabled or (s.booking_mode='appointment' and (not booking_private.interval_open(new.business_id,new.service_id,null,new.start_at,new.end_at,s.timezone) or (s.resource_id is not null and not booking_private.interval_open(new.business_id,new.service_id,s.resource_id,new.start_at,new.end_at,r.timezone)))) then raise exception 'BOOKING_SLOT_UNAVAILABLE'; end if;
    if new.start_at<now()+make_interval(mins=>s.minimum_notice_minutes) or (new.start_at at time zone s.timezone)::date>(now() at time zone s.timezone)::date+s.booking_horizon_days then raise exception 'BOOKING_SLOT_UNAVAILABLE'; end if;
  end if;
  return new;
end $$;
create trigger aa_booking_capacity before insert or update on public.calendar_entries for each row execute function booking_private.guard_capacity();
create trigger aa_booking_capacity before insert or update on public.booking_holds for each row execute function booking_private.guard_capacity();

-- Acquire the business lock before legacy functions acquire row/service locks.
do $$ declare definition text; signature text; lock_expression text; begin
  for signature,lock_expression in values
    ('public.create_public_booking_hold(uuid,uuid,uuid,text,timestamptz,timestamptz,text,text)','p_business_id'),
    ('public.finalize_public_booking(uuid,text,text,text,text,text,text,text)','(select business_id from public.booking_holds where id=p_hold_id)'),
    ('public.apply_booking_change_request(uuid,text,uuid)','(select e.business_id from public.booking_change_requests c join public.calendar_entries e on e.id=c.calendar_entry_id where c.id=p_request_id)'),
    ('public.cancel_customer_booking(uuid)','(select business_id from public.calendar_entries where id=p_entry_id)')
  loop
    definition:=pg_get_functiondef(signature::regprocedure);
    definition:=regexp_replace(definition,'\mbegin\M',E'begin\n perform booking_private.lock_business('||lock_expression||');','i');
    execute definition;
  end loop;
end $$;

create function booking_private.assert_cart_context(p_website uuid,p_business uuid,p_section text,p_version text,p_plan jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare snapshot jsonb; section_data jsonb; item jsonb; service_data jsonb; s public.service_booking_settings%rowtype; needs_approval boolean:=false;
begin
  select live_snapshot into snapshot from public.websites where id=p_website and published and user_id=(select user_id from public.businesses where id=p_business);
  if snapshot is null or snapshot->>'publishedAt' is distinct from p_version or not booking_private.entitled(p_business) then raise exception 'BOOKING_CONTEXT_UNAVAILABLE'; end if;
  select value->'data' into section_data from jsonb_array_elements(snapshot->'sections') where value->>'id'=p_section and value->>'type'='services';
  if section_data is null or section_data->>'bookingSpaceEnabled' is distinct from 'true' or section_data->>'bookingSpaceMode' is distinct from 'calendar' or section_data->>'bookingCartEnabled' is distinct from 'true' then raise exception 'BOOKING_CONTEXT_UNAVAILABLE'; end if;
  if jsonb_typeof(p_plan->'items')<>'array' or jsonb_array_length(p_plan->'items') not between 1 and 10 then raise exception 'BOOKING_CONTEXT_UNAVAILABLE'; end if;
  for item in select value from jsonb_array_elements(p_plan->'items') loop
    select value into service_data from jsonb_array_elements(snapshot->'services') where value->>'id'=item->>'service_id' and value->>'business_id'=p_business::text;
    if service_data is null or service_data->'booking_catalog'->>'enabled' is distinct from 'true' then raise exception 'BOOKING_CONTEXT_UNAVAILABLE'; end if;
    if jsonb_array_length(coalesce(section_data->'bookingSpaceServiceIds','[]'))>0 and not (section_data->'bookingSpaceServiceIds' ? (item->>'service_id')) then raise exception 'BOOKING_CONTEXT_UNAVAILABLE'; end if;
    if jsonb_array_length(coalesce(section_data->'bookingSpaceServiceIds','[]'))=0 and jsonb_array_length(coalesce(section_data->'serviceIds','[]'))>0 and not (section_data->'serviceIds' ? (item->>'service_id')) then raise exception 'BOOKING_CONTEXT_UNAVAILABLE'; end if;
    select * into s from public.service_booking_settings where service_id=(item->>'service_id')::uuid and business_id=p_business;
    if not found or not s.booking_enabled or s.booking_mode<>'appointment' or exists(select 1 from public.services where id=s.service_id and archived_at is not null) then raise exception 'BOOKING_DISABLED'; end if;
    if nullif(item->>'resource_id','')::uuid is distinct from s.resource_id then raise exception 'BOOKING_QUOTE_CHANGED'; end if;
    if s.confirmation_mode='request' then needs_approval:=true; end if;
    if not booking_private.interval_open(p_business,s.service_id,null,(item->>'start_at')::timestamptz,(item->>'end_at')::timestamptz,s.timezone) or (s.resource_id is not null and not booking_private.interval_open(p_business,s.service_id,s.resource_id,(item->>'start_at')::timestamptz,(item->>'end_at')::timestamptz,s.timezone)) then raise exception 'BOOKING_SLOT_UNAVAILABLE'; end if;
  end loop;
  if p_plan->>'confirmation_mode' is distinct from (case when needs_approval then 'request' else 'instant' end) then raise exception 'BOOKING_QUOTE_CHANGED'; end if;
  return section_data;
end $$;

create function public.create_booking_cart_hold(p_website_id uuid,p_business_id uuid,p_section_id text,p_version text,p_selection jsonb,p_plan jsonb,p_token_hash text,p_idempotency_key uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare hold public.booking_cart_holds%rowtype; item jsonb;
begin
  perform booking_private.lock_business(p_business_id);
  perform booking_private.assert_cart_context(p_website_id,p_business_id,p_section_id,p_version,p_plan);
  insert into public.booking_cart_holds(business_id,website_id,section_id,publication_version,selection,plan,token_hash,idempotency_key)
    values(p_business_id,p_website_id,p_section_id,p_version,p_selection,p_plan,p_token_hash,p_idempotency_key) returning * into hold;
  for item in select value from jsonb_array_elements(p_plan->'items') loop
    insert into public.booking_holds(website_id,business_id,service_id,booking_mode,start_at,end_at,timezone,token_hash,expires_at,cart_hold_id)
    values(p_website_id,p_business_id,(item->>'service_id')::uuid,'appointment',(item->>'start_at')::timestamptz,(item->>'end_at')::timestamptz,p_plan->>'timezone',p_token_hash||':'||(item->>'service_id'),hold.expires_at,hold.id);
  end loop;
  return jsonb_build_object('holdId',hold.id,'expiresAt',hold.expires_at,'plan',hold.plan);
end $$;

create function public.cancel_booking_cart_hold(p_id uuid,p_hash text) returns void language plpgsql security invoker set search_path='' as $$
declare b uuid;
begin
  select business_id into b from public.booking_cart_holds where id=p_id and token_hash=p_hash;
  if b is null then return; end if;
  perform booking_private.lock_business(b);
  update public.booking_holds set status='cancelled' where cart_hold_id=p_id and status='active';
  update public.booking_cart_holds set status='cancelled' where id=p_id and status='active';
end $$;

create function public.confirm_booking_cart(p_id uuid,p_hash text,p_plan jsonb,p_customer jsonb,p_locale text,p_recipient text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare h public.booking_cart_holds%rowtype; g public.booking_groups%rowtype; item jsonb; request_id uuid; entry_id uuid; leader uuid; state text; section_data jsonb; owner_id uuid; idx int:=0;
begin
  select business_id into h.business_id from public.booking_cart_holds where id=p_id and token_hash=p_hash;
  if h.business_id is null then raise exception 'BOOKING_HOLD_INVALID'; end if;
  perform booking_private.lock_business(h.business_id);
  select * into h from public.booking_cart_holds where id=p_id and token_hash=p_hash for update;
  if h.status='consumed' then
    select * into g from public.booking_groups where id=p_id;
    if h.plan is distinct from p_plan then raise exception 'BOOKING_QUOTE_CHANGED'; end if;
    return jsonb_build_object('calendarEntryId',g.leader_id,'status',g.status,'groupId',g.id);
  end if;
  if h.status<>'active' or h.expires_at<=now() then raise exception 'BOOKING_HOLD_INVALID'; end if;
  if h.plan is distinct from p_plan then raise exception 'BOOKING_QUOTE_CHANGED'; end if;
  section_data:=booking_private.assert_cart_context(h.website_id,h.business_id,h.section_id,h.publication_version,h.plan);
  select user_id into owner_id from public.businesses where id=h.business_id;
  state:=case when exists(select 1 from jsonb_array_elements(h.plan->'items') i join public.service_booking_settings s on s.service_id=(i->>'service_id')::uuid where s.confirmation_mode='request') then 'pending' else 'confirmed' end;
  insert into public.contact_requests(website_id,business_id,user_id,request_type,name,email,phone,service,preferred_date,message,locale,payload,recipient_email,source)
  values(h.website_id,h.business_id,owner_id,'appointment',left(p_customer->>'name',120),left(p_customer->>'email',254),left(coalesce(p_customer->>'phone',''),40),'Jouw boeking',h.plan->>'start_at',left(coalesce(p_customer->>'message',''),3000),left(p_locale,20),jsonb_build_object('source','booking_engine','groupId',p_id,'plan',h.plan),left(p_recipient,254),'website_form') returning id into request_id;
  insert into public.booking_groups(id,business_id,website_id,status,plan,payment_instructions,confirmation_text) values(p_id,h.business_id,h.website_id,state,h.plan,left(coalesce(section_data->>'bookingCartPaymentInstructions','Je betaalt rechtstreeks aan de ondernemer.'),1000),left(coalesce(section_data->>'bookingCartSuccessText',''),1000));
  -- Consume all our holds before capacity guards examine the resulting calendar entries.
  update public.booking_holds set status='consumed' where cart_hold_id=p_id;
  for item in select value from jsonb_array_elements(h.plan->'items') loop
    insert into public.calendar_entries(business_id,service_id,contact_request_id,entry_type,status,source,title,customer_name,customer_email,customer_phone,start_at,end_at,all_day,timezone,metadata,booking_group_id,booking_group_primary)
    values(h.business_id,(item->>'service_id')::uuid,request_id,'appointment',state,'website_form',left((item->>'description')||' - '||(p_customer->>'name'),240),left(p_customer->>'name',120),left(p_customer->>'email',254),left(coalesce(p_customer->>'phone',''),40),(item->>'start_at')::timestamptz,(item->>'end_at')::timestamptz,false,h.plan->>'timezone',jsonb_build_object('source',case when idx=0 then 'booking_engine' else 'booking_group_child' end,'bookingItem',item,'groupId',p_id,'confirmationMode',case when state='pending' then 'request' else 'instant' end),p_id,idx=0) returning id into entry_id;
    if idx=0 then leader:=entry_id; end if;
    idx:=idx+1;
  end loop;
  update public.booking_groups set leader_id=leader where id=p_id;
  insert into public.contact_request_messages(contact_request_id,business_id,direction,sender_email,sender_name,recipient_email,subject,body,delivery_status,idempotency_key,sent_at)
    values(request_id,h.business_id,'inbound',left(p_customer->>'email',254),left(p_customer->>'name',120),left(p_recipient,254),'Gezamenlijke boekingsaanvraag',left(coalesce(p_customer->>'message',''),3000),'received','contact-request:'||request_id::text,now());
  if state='confirmed' then update public.contact_requests set status='won',status_changed_at=now(),last_activity_at=now(),closed_at=now(),closed_reason='Direct bevestigde boeking' where id=request_id; end if;
  update public.calendar_entries set metadata=metadata||jsonb_build_object('leaderId',leader) where booking_group_id=p_id;
  update public.calendar_entries set metadata=metadata||jsonb_build_object('bookingGroupPlan',h.plan,'bookingServiceIds',(select jsonb_agg(value->>'service_id') from jsonb_array_elements(h.plan->'items'))) where id=leader;
  insert into public.booking_reservation_financials(calendar_entry_id,business_id,reservation_number,booking_group_id,currency,pricing_status,line_items,subtotal_minor,vat_total_minor,total_minor,priced_at)
    values(leader,h.business_id,'RES-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(p_id::text,'-',''),1,10)),p_id,'EUR','ready',h.plan->'financial_lines',(h.plan->>'subtotal_minor')::bigint,(h.plan->>'vat_minor')::bigint,(h.plan->>'total_minor')::bigint,now())
    on conflict(calendar_entry_id) do update set booking_group_id=excluded.booking_group_id,currency=excluded.currency,pricing_status=excluded.pricing_status,line_items=excluded.line_items,subtotal_minor=excluded.subtotal_minor,vat_total_minor=excluded.vat_total_minor,total_minor=excluded.total_minor,priced_at=excluded.priced_at;
  update public.booking_cart_holds set status='consumed' where id=p_id;
  return jsonb_build_object('calendarEntryId',leader,'contactRequestId',request_id,'status',state,'groupId',p_id);
end $$;

-- Group actions retain existing customer links, financial records and notification outbox.
create function booking_private.propagate_group() returns trigger language plpgsql security definer set search_path='' as $$
declare shift interval; g public.booking_groups%rowtype;
begin
  if new.booking_group_id is null or pg_trigger_depth()>1 then return new; end if;
  if new.status=old.status and new.start_at=old.start_at and new.end_at=old.end_at and new.customer_name=old.customer_name and new.customer_email=old.customer_email and new.customer_phone=old.customer_phone then return new; end if;
  if not new.booking_group_primary then
    if new.status is distinct from old.status or new.start_at is distinct from old.start_at or new.end_at is distinct from old.end_at then raise exception 'Beheer deze afspraak via de volledige boeking.'; end if;
    return new;
  end if;
  if new.end_at-new.start_at<>old.end_at-old.start_at then raise exception 'De duur van een boekingsonderdeel staat vast.'; end if;
  shift:=new.start_at-old.start_at;
  select * into g from public.booking_groups where id=new.booking_group_id;
  update public.calendar_entries set status=new.status,start_at=start_at+shift,end_at=end_at+shift,customer_name=new.customer_name,customer_email=new.customer_email,customer_phone=new.customer_phone where booking_group_id=new.booking_group_id and id<>new.id;
  update public.booking_groups set status=new.status,plan=jsonb_set(jsonb_set(jsonb_set(plan,'{start_at}',to_jsonb((plan->>'start_at')::timestamptz+shift)),'{end_at}',to_jsonb((plan->>'end_at')::timestamptz+shift)),'{items}',(select jsonb_agg(jsonb_set(jsonb_set(value,'{start_at}',to_jsonb((value->>'start_at')::timestamptz+shift)),'{end_at}',to_jsonb((value->>'end_at')::timestamptz+shift))) from jsonb_array_elements(plan->'items'))) where id=g.id;
  update public.calendar_entries set metadata=jsonb_set(metadata,'{bookingGroupPlan}',(select plan from public.booking_groups where id=g.id)) where id=new.id;
  return new;
end $$;
create trigger zz_propagate_booking_group after update on public.calendar_entries for each row execute function booking_private.propagate_group();
create function booking_private.prevent_group_delete() returns trigger language plpgsql security invoker set search_path='' as $$ begin
  if old.booking_group_id is not null then raise exception 'Annuleer de volledige boeking om de historie te behouden.'; end if;
  return old;
end $$;
create trigger prevent_group_delete before delete on public.calendar_entries for each row execute function booking_private.prevent_group_delete();

create function public.apply_booking_group_change_request(p_request_id uuid,p_actor text,p_resolved_by uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare request public.booking_change_requests%rowtype; g public.booking_groups%rowtype; leader public.calendar_entries%rowtype; shift interval;
begin
  select e.business_id into leader.business_id from public.booking_change_requests c join public.calendar_entries e on e.id=c.calendar_entry_id where c.id=p_request_id;
  perform booking_private.lock_business(leader.business_id);
  select * into request from public.booking_change_requests where id=p_request_id and status='pending' for update;
  if not found or (p_actor='customer' and request.requested_by<>'owner') or (p_actor='owner' and request.requested_by<>'customer') or p_actor not in ('owner','customer') then raise exception 'BOOKING_CHANGE_INVALID'; end if;
  select * into leader from public.calendar_entries where id=request.calendar_entry_id and booking_group_primary and status in ('pending','confirmed') for update;
  if not found then raise exception 'BOOKING_CHANGE_INVALID'; end if;
  select * into g from public.booking_groups where id=leader.booking_group_id;
  if request.proposed_end_at-request.proposed_start_at<>(g.plan->>'end_at')::timestamptz-(g.plan->>'start_at')::timestamptz then raise exception 'BOOKING_CHANGE_INVALID'; end if;
  shift:=request.proposed_start_at-leader.start_at;
  update public.calendar_entries set start_at=start_at+shift,end_at=end_at+shift,metadata=metadata||jsonb_build_object('lifecycle_actor',p_actor) where id=leader.id;
  update public.booking_change_requests set status='accepted',resolved_at=now(),resolved_by=p_resolved_by where id=p_request_id;
  return leader.id;
end $$;
revoke all on function public.apply_booking_group_change_request(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.apply_booking_group_change_request(uuid,text,uuid) to service_role;

-- Every item's own cancellation deadline applies to a customer group cancellation.
do $$ declare definition text; begin
  definition:=pg_get_functiondef('public.cancel_customer_booking(uuid)'::regprocedure);
  definition:=replace(definition,'select * into booking_settings', E'if selected_entry.booking_group_id is not null and exists(select 1 from public.calendar_entries item join public.service_booking_settings rules on rules.service_id=item.service_id where item.booking_group_id=selected_entry.booking_group_id and now()>item.start_at-make_interval(mins=>rules.cancellation_cutoff_minutes)) then raise exception ''BOOKING_CANCELLATION_CUTOFF''; end if;\n select * into booking_settings');
  execute definition;
end $$;

create function booking_private.guard_cart_editor() returns trigger language plpgsql security definer set search_path='' as $$
declare current_config jsonb; previous_config jsonb:='{}'; owner_id uuid; b uuid;
begin
  if new.type<>'services' then return new; end if;
  select coalesce(jsonb_object_agg(key,value),'{}') into current_config from jsonb_each(coalesce(new.content,'{}')) where key like 'bookingCart%';
  if tg_op='UPDATE' then select coalesce(jsonb_object_agg(key,value),'{}') into previous_config from jsonb_each(coalesce(old.content,'{}')) where key like 'bookingCart%'; end if;
  if current_config=previous_config then return new; end if;
  select user_id into owner_id from public.websites where id=new.website_id;
  select id into b from public.businesses where user_id=owner_id order by id limit 1;
  if b is null or not booking_private.entitled(b) then raise exception 'BOOKING_ADDON_REQUIRED' using errcode='42501'; end if;
  return new;
end $$;
create trigger guard_cart_editor before insert or update of content on public.website_sections for each row execute function booking_private.guard_cart_editor();

create function booking_private.link_group_invoice() returns trigger language plpgsql security definer set search_path='' as $$ begin
  select booking_group_id into new.booking_group_id from public.calendar_entries where id=new.calendar_entry_id;
  return new;
end $$;
create trigger link_group_invoice before insert on public.booking_invoices for each row execute function booking_private.link_group_invoice();

create function booking_private.lock_publication() returns trigger language plpgsql security definer set search_path='' as $$
declare b uuid;
begin
  for b in select id from public.businesses where user_id=new.user_id order by id loop perform booking_private.lock_business(b); end loop;
  return new;
end $$;
create trigger lock_booking_publication before update of published,live_snapshot on public.websites for each row execute function booking_private.lock_publication();
create trigger lock_booking_subscription before update of booking_addon_active,status,current_period_end on public.subscriptions for each row execute function booking_private.lock_publication();

create function booking_private.archive_service() returns trigger language plpgsql security definer set search_path='' as $$ begin
  if new.archived_at is not null and old.archived_at is null then
    perform booking_private.lock_business(new.business_id);
    update public.service_booking_settings set booking_enabled=false where service_id=new.id;
  end if;
  return new;
end $$;
create trigger archive_booking_service before update of archived_at on public.services for each row execute function booking_private.archive_service();

create function public.update_owned_booking_group(p_entry uuid,p_changes jsonb,p_expected_status text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare e public.calendar_entries%rowtype; b uuid; next_status text;
begin
  select business_id into b from public.calendar_entries where id=p_entry and booking_group_primary;
  if b is null then raise exception 'Open de volledige boeking om deze te wijzigen.'; end if;
  if not public.temporary_gold_access_enabled() and not exists(select 1 from public.subscriptions where user_id=auth.uid() and booking_addon_active and (status in ('active','trial') or (status='canceled' and current_period_end>now()))) then raise exception 'BOOKING_ADDON_REQUIRED' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('booking-business:'||b::text,0));
  select * into e from public.calendar_entries where id=p_entry for update;
  if p_expected_status is not null and e.status<>p_expected_status then raise exception 'De boekingsstatus is ondertussen gewijzigd.'; end if;
  if (p_changes ? 'service_id' and nullif(p_changes->>'service_id','')::uuid is distinct from e.service_id) or (p_changes ? 'entry_type' and p_changes->>'entry_type' is distinct from e.entry_type) or (p_changes ? 'contact_request_id' and nullif(p_changes->>'contact_request_id','')::uuid is distinct from e.contact_request_id) then raise exception 'De onderdelen van een gezamenlijke boeking staan vast.'; end if;
  next_status:=coalesce(p_changes->>'status',e.status);
  if next_status<>e.status and not ((e.status='pending' and next_status in ('confirmed','cancelled')) or (e.status='confirmed' and next_status in ('completed','cancelled'))) then raise exception 'Deze statuswijziging is niet toegestaan.'; end if;
  update public.calendar_entries set status=next_status,
    start_at=coalesce((p_changes->>'start_at')::timestamptz,e.start_at),end_at=coalesce((p_changes->>'end_at')::timestamptz,e.end_at),
    title=coalesce(p_changes->>'title',e.title),customer_name=coalesce(p_changes->>'customer_name',e.customer_name),customer_email=coalesce(p_changes->>'customer_email',e.customer_email),customer_phone=coalesce(p_changes->>'customer_phone',e.customer_phone),
    internal_notes=coalesce(p_changes->>'internal_notes',e.internal_notes),metadata=coalesce(p_changes->'metadata',e.metadata)
    where id=p_entry returning * into e;
  select * into e from public.calendar_entries where id=p_entry;
  return to_jsonb(e);
end $$;
revoke all on function public.update_owned_booking_group(uuid,jsonb,text) from public,anon;
grant execute on function public.update_owned_booking_group(uuid,jsonb,text) to authenticated;

create function public.get_service_planning_revision(p_service uuid) returns text language sql stable security invoker set search_path='' as $$
  select md5(jsonb_build_object('catalog',s.booking_catalog,'resource',r.resource_id,
    'windows',(select coalesce(jsonb_agg(to_jsonb(w) order by w.weekday,w.id),'[]') from public.calendar_availability_windows w where w.service_id=s.id),
    'exceptions',(select coalesce(jsonb_agg(to_jsonb(e) order by e.date,e.id),'[]') from public.booking_availability_exceptions e where e.service_id=s.id))::text)
  from public.services s left join public.service_booking_settings r on r.service_id=s.id where s.id=p_service;
$$;
revoke all on function public.get_service_planning_revision(uuid) from public,anon;
grant execute on function public.get_service_planning_revision(uuid) to authenticated,service_role;

create function public.get_service_booking_planning(p_service uuid) returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('revision',public.get_service_planning_revision(s.id),'catalog',s.booking_catalog,'resourceId',r.resource_id,'timezone',coalesce(r.timezone,'Europe/Amsterdam'),
    'windows',(select coalesce(jsonb_agg(to_jsonb(w) order by w.weekday,w.id),'[]') from public.calendar_availability_windows w where w.service_id=s.id),
    'exceptions',(select coalesce(jsonb_agg(to_jsonb(e) order by e.date,e.id),'[]') from public.booking_availability_exceptions e where e.service_id=s.id),
    'resources',(select coalesce(jsonb_agg(to_jsonb(a) order by a.name,a.id),'[]') from public.booking_resources a where a.business_id=s.business_id))
  from public.services s left join public.service_booking_settings r on r.service_id=s.id where s.id=p_service;
$$;
revoke all on function public.get_service_booking_planning(uuid) from public,anon;
grant execute on function public.get_service_booking_planning(uuid) to authenticated,service_role;

create function public.save_service_booking_planning(p_service uuid,p_config jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare b uuid; w jsonb; daynum int; old_resource uuid;
begin
  select business_id into b from public.services where id=p_service;
  if b is null then raise exception 'Dienst niet gevonden'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('booking-business:'||b::text,0));
  if p_config->>'expectedRevision' is distinct from public.get_service_planning_revision(p_service) then raise exception 'De dienstenplanning is ondertussen gewijzigd. Laad de gegevens opnieuw voordat je opslaat.'; end if;
  if nullif(p_config->>'resourceId','') is not null and not exists(select 1 from public.booking_resources where id=(p_config->>'resourceId')::uuid and business_id=b) then raise exception 'Gedeelde agenda niet gevonden'; end if;
  -- The resource/roster triggers and service RLS enforce ownership and add-on access.
  update public.services set booking_catalog=nullif(p_config->'catalog','null'::jsonb) where id=p_service;
  select resource_id into old_resource from public.service_booking_settings where service_id=p_service;
  if old_resource is not null and old_resource is distinct from nullif(p_config->>'resourceId','')::uuid then
    update public.calendar_entries set booking_resource_id=old_resource where service_id=p_service and booking_resource_id is null and status in ('pending','confirmed');
    update public.booking_holds set booking_resource_id=old_resource where service_id=p_service and booking_resource_id is null and status='active';
  end if;
  insert into public.service_booking_settings(service_id,business_id,resource_id) values(p_service,b,nullif(p_config->>'resourceId','')::uuid)
    on conflict(service_id) do update set resource_id=excluded.resource_id;
  delete from public.calendar_availability_windows where service_id=p_service and business_id=b;
  if p_config->>'useBusinessSchedule'='false' then
    for daynum in 1..7 loop
      if not exists(select 1 from jsonb_array_elements(p_config->'windows') where (value->>'weekday')::int=daynum) then
        insert into public.calendar_availability_windows(business_id,service_id,weekday,start_time,end_time,timezone,is_active) values(b,p_service,daynum,'00:00','23:59',p_config->>'timezone',false);
      end if;
    end loop;
    for w in select value from jsonb_array_elements(p_config->'windows') loop
      insert into public.calendar_availability_windows(business_id,service_id,weekday,start_time,end_time,timezone,is_active) values(b,p_service,(w->>'weekday')::int,(w->>'start_time')::time,(w->>'end_time')::time,p_config->>'timezone',true);
    end loop;
  end if;
  delete from public.booking_availability_exceptions where business_id=b and service_id=p_service;
  for w in select value from jsonb_array_elements(p_config->'exceptions') loop
    insert into public.booking_availability_exceptions(business_id,service_id,date,windows) values(b,p_service,(w->>'date')::date,w->'windows');
  end loop;
end $$;
revoke all on function public.save_service_booking_planning(uuid,jsonb) from public,anon;
grant execute on function public.save_service_booking_planning(uuid,jsonb) to authenticated;

revoke all on all functions in schema booking_private from public,anon,authenticated;
grant execute on all functions in schema booking_private to service_role;
revoke all on function public.create_booking_cart_hold(uuid,uuid,text,text,jsonb,jsonb,text,uuid) from public,anon,authenticated;
revoke all on function public.cancel_booking_cart_hold(uuid,text) from public,anon,authenticated;
revoke all on function public.confirm_booking_cart(uuid,text,jsonb,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.create_booking_cart_hold(uuid,uuid,text,text,jsonb,jsonb,text,uuid),public.cancel_booking_cart_hold(uuid,text),public.confirm_booking_cart(uuid,text,jsonb,jsonb,text,text) to service_role;
commit;
