-- Owner writes and customer decisions go through the server, never the public Data API.
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  request_id uuid not null unique references public.contact_requests(id) on delete restrict,
  number bigint generated always as identity unique,
  created_at timestamptz not null default now()
);
create table public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  version integer not null,
  revision integer not null default 1,
  status text not null default 'draft' check (status in ('draft','offered','accepted','declined','withdrawn','superseded')),
  snapshot jsonb not null default '{}',
  valid_until timestamptz,
  pdf_base64 text,
  document_hash text,
  offered_at timestamptz,
  decided_at timestamptz,
  decision_name text,
  decision_note text,
  created_at timestamptz not null default now(),
  unique(quote_id,version)
);
create unique index quote_one_draft on public.quote_versions(quote_id) where status='draft';
create unique index quote_one_offer on public.quote_versions(quote_id) where status='offered';
create table public.customer_request_access (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.contact_requests(id) on delete cascade,
  token_hash text not null unique,
  email text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.customer_request_sessions (
  session_hash text primary key,
  access_id uuid not null references public.customer_request_access(id) on delete cascade,
  expires_at timestamptz not null
);
create table public.quote_decision_codes (
  id uuid primary key default gen_random_uuid(),
  access_id uuid not null references public.customer_request_access(id) on delete cascade,
  version_id uuid not null references public.quote_versions(id) on delete cascade,
  decision text not null check(decision in ('accepted','declined')),
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz
);
create table public.quote_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  version_id uuid references public.quote_versions(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now()
);
create table public.quote_deliveries (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.quote_versions(id) on delete cascade,
  status text not null default 'sending' check(status in ('sending','sent','failed')),
  recipient text not null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create unique index quote_delivery_active on public.quote_deliveries(version_id) where status='sending';
create index quotes_business_created on public.quotes(business_id,created_at desc);
create index request_access_request on public.customer_request_access(request_id);
create index request_sessions_access on public.customer_request_sessions(access_id);
create index quote_codes_access on public.quote_decision_codes(access_id);
create index quote_codes_version on public.quote_decision_codes(version_id);
create index quote_events_quote on public.quote_events(quote_id,created_at);
create index quote_events_version on public.quote_events(version_id);
create index quote_deliveries_version on public.quote_deliveries(version_id,created_at desc);
alter table public.contact_request_messages add column customer_visible boolean not null default false;
alter table public.businesses add column request_portal_receipt_enabled boolean not null default false;
alter table public.booking_invoices add column quote_version_id uuid unique references public.quote_versions(id) on delete restrict;

do $$ declare t text; begin
  foreach t in array array['quotes','quote_versions','customer_request_access','customer_request_sessions','quote_decision_codes','quote_events','quote_deliveries'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
grant usage, select on sequence public.quotes_number_seq to service_role;
grant select on public.quotes, public.quote_versions, public.quote_events, public.quote_deliveries to authenticated;
create policy quotes_owner on public.quotes for select to authenticated using (exists(select 1 from public.businesses b where b.id=business_id and b.user_id=auth.uid()));
create policy versions_owner on public.quote_versions for select to authenticated using (exists(select 1 from public.quotes q where q.id=quote_id));
create policy events_owner on public.quote_events for select to authenticated using (exists(select 1 from public.quotes q where q.id=quote_id));
create policy deliveries_owner on public.quote_deliveries for select to authenticated using (exists(select 1 from public.quote_versions v where v.id=version_id));

create view public.quote_overview with (security_invoker=true) as
select q.id,q.business_id,q.request_id,q.number,q.created_at,r.name as customer_name,r.email as customer_email,
  case when v.status='offered' and v.valid_until<=now() then 'expired' else v.status end as status
from public.quotes q join public.contact_requests r on r.id=q.request_id and r.business_id=q.business_id
left join lateral (select status,valid_until from public.quote_versions where quote_id=q.id order by version desc limit 1) v on true;
revoke all on public.quote_overview from anon,authenticated;
grant select on public.quote_overview to authenticated,service_role;

create or replace function public.guard_quote_document() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then
    if not exists(select 1 from public.contact_requests r where r.id=new.request_id and r.business_id=new.business_id) then raise exception 'Invalid dossier'; end if;
  elsif old.status <> 'draft' and (new.snapshot is distinct from old.snapshot or new.valid_until is distinct from old.valid_until or new.pdf_base64 is distinct from old.pdf_base64 or new.document_hash is distinct from old.document_hash or new.quote_id <> old.quote_id or new.version <> old.version) then
    raise exception 'Offered document is immutable';
  end if;
  return new;
end $$;
create trigger quote_scope before insert on public.quotes for each row execute function public.guard_quote_document();
create trigger quote_immutable before update on public.quote_versions for each row execute function public.guard_quote_document();

-- Service-only, SECURITY INVOKER: application authenticates the owner and passes its verified ID.
create or replace function public.start_quote(p_owner uuid, p_request uuid default null, p_entry uuid default null, p_new_version boolean default false) returns uuid
language plpgsql set search_path=public,pg_temp as $$
declare e public.calendar_entries%rowtype; r public.contact_requests%rowtype; q public.quotes%rowtype; v uuid;
begin
  if p_entry is not null then
    select * into e from public.calendar_entries where id=p_entry for update;
    if not found or not exists(select 1 from public.businesses where id=e.business_id and user_id=p_owner) then raise exception 'Afspraak niet gevonden'; end if;
    if e.source='import' or e.entry_type not in ('appointment','booking') or e.status not in ('pending','confirmed') then raise exception 'Deze afspraak kan niet worden omgezet'; end if;
    if exists(select 1 from public.booking_invoices where calendar_entry_id=e.id and status<>'draft') then raise exception 'Deze afspraak heeft al een uitgegeven factuur'; end if;
    p_request:=e.contact_request_id;
    if p_request is null then
      insert into public.contact_requests(business_id,user_id,request_type,name,email,phone,service,source)
      values(e.business_id,p_owner,'appointment',coalesce(e.customer_name,''),coalesce(e.customer_email,''),coalesce(e.customer_phone,''),e.title,'owner_created') returning id into p_request;
      update public.calendar_entries set contact_request_id=p_request where id=e.id;
    end if;
  end if;
  select * into r from public.contact_requests where id=p_request for update;
  if not found or not exists(select 1 from public.businesses where id=r.business_id and user_id=p_owner) then raise exception 'Aanvraag niet gevonden'; end if;
  insert into public.quotes(business_id,request_id) values(r.business_id,r.id) on conflict(request_id) do nothing;
  select * into q from public.quotes where request_id=r.id for update;
  select id into v from public.quote_versions where quote_id=q.id and status='draft';
  if v is not null then return q.id; end if;
  if not p_new_version and exists(select 1 from public.quote_versions where quote_id=q.id) then return q.id; end if;
  insert into public.quote_versions(quote_id,version,snapshot)
  values(q.id,coalesce((select max(version)+1 from public.quote_versions where quote_id=q.id),1),
    coalesce((select snapshot from public.quote_versions where quote_id=q.id order by version desc limit 1),'{}'));
  return q.id;
end $$;

create or replace function public.transition_quote(p_id uuid,p_revision integer,p_action text,p_snapshot jsonb default null,p_until timestamptz default null,p_pdf text default null,p_hash text default null) returns uuid
language plpgsql set search_path=public,pg_temp as $$
declare v public.quote_versions%rowtype; qid uuid;
begin
  select quote_id into qid from public.quote_versions where id=p_id;
  perform 1 from public.quotes where id=qid for update;
  select * into v from public.quote_versions where id=p_id for update;
  if not found or v.revision<>p_revision then raise exception 'Offerte gewijzigd. Vernieuw de pagina.'; end if;
  if p_action='save' and v.status='draft' then
    update public.quote_versions set snapshot=p_snapshot,valid_until=p_until,revision=revision+1 where id=p_id;
  elsif p_action='offer' and v.status='draft' then
    if v.valid_until is null or v.valid_until<=now() or p_pdf is null or p_hash is null then raise exception 'Controleer geldigheid en PDF'; end if;
    update public.quote_versions set status='superseded',revision=revision+1 where quote_id=qid and status='offered';
    update public.quote_versions set status='offered',pdf_base64=p_pdf,document_hash=p_hash,offered_at=now(),revision=revision+1 where id=p_id;
  elsif p_action='withdraw' and v.status='offered' then
    update public.quote_versions set status='withdrawn',revision=revision+1 where id=p_id;
  else raise exception 'Ongeldige offerteactie'; end if;
  if p_action<>'save' then insert into public.quote_events(quote_id,version_id,event_type) values(qid,p_id,p_action); end if;
  return p_id;
end $$;

create or replace function public.decide_quote(p_session text,p_code_id uuid,p_hash text,p_name text,p_note text) returns text
language plpgsql set search_path=public,pg_temp as $$
declare a public.customer_request_access%rowtype; c public.quote_decision_codes%rowtype; v public.quote_versions%rowtype; q public.quotes%rowtype;
begin
  select a1.* into a from public.customer_request_access a1 join public.customer_request_sessions s on s.access_id=a1.id
    join public.contact_requests r on r.id=a1.request_id
    where s.session_hash=p_session and s.expires_at>now() and a1.expires_at>now() and a1.revoked_at is null and lower(r.email)=lower(a1.email) for update of a1;
  if not found then return 'Toegang verlopen'; end if;
  select * into c from public.quote_decision_codes where id=p_code_id and access_id=a.id for update;
  if not found or c.expires_at<=now() or c.attempts>=5 or c.consumed_at is not null then return 'Code ongeldig of verlopen'; end if;
  update public.quote_decision_codes set attempts=attempts+1 where id=c.id;
  if c.code_hash<>p_hash then return 'Code ongeldig of verlopen'; end if;
  select q1.* into q from public.quotes q1 join public.quote_versions v1 on v1.quote_id=q1.id where v1.id=c.version_id and q1.request_id=a.request_id for update of q1;
  if not found then return 'Offerte niet beschikbaar'; end if;
  select * into v from public.quote_versions where id=c.version_id for update;
  if v.status<>'offered' or v.valid_until<=now() then return 'Offerte niet meer beschikbaar'; end if;
  if length(trim(p_name))<2 then return 'Vul uw naam in'; end if;
  update public.quote_versions set status=c.decision,decided_at=now(),decision_name=left(p_name,200),decision_note=left(p_note,2000),revision=revision+1 where id=v.id;
  update public.quote_decision_codes set consumed_at=now() where id=c.id;
  insert into public.quote_events(quote_id,version_id,event_type) values(q.id,v.id,c.decision);
  update public.contact_requests set last_activity_at=now() where id=a.request_id;
  return 'ok';
end $$;

create or replace function public.invoice_from_quote(p_version uuid,p_owner uuid) returns uuid
language plpgsql set search_path=public,pg_temp as $$
declare v public.quote_versions%rowtype; q public.quotes%rowtype; e public.calendar_entries%rowtype; f public.booking_reservation_financials%rowtype; result uuid;
begin
  select * into v from public.quote_versions where id=p_version;
  select * into q from public.quotes where id=v.quote_id for update;
  if not found or not exists(select 1 from public.businesses where id=q.business_id and user_id=p_owner) or v.status<>'accepted' then raise exception 'Geaccepteerde offerte niet gevonden'; end if;
  select id into result from public.booking_invoices where quote_version_id=v.id;
  if result is not null then return result; end if;
  if (select count(*) from public.calendar_entries where contact_request_id=q.request_id and business_id=q.business_id)<>1 then raise exception 'Koppel eerst precies één afspraak'; end if;
  select * into e from public.calendar_entries where contact_request_id=q.request_id and business_id=q.business_id for update;
  if e.status not in ('confirmed','completed') then raise exception 'Bevestig eerst de afspraak'; end if;
  if exists(select 1 from public.booking_invoices where calendar_entry_id=e.id and document_type='invoice' and status<>'void') then raise exception 'Deze afspraak heeft al een factuur. Open de bestaande factuur.'; end if;
  insert into public.booking_reservation_financials(calendar_entry_id,business_id,reservation_number)
    values(e.id,e.business_id,'RES-'||e.id::text) on conflict(calendar_entry_id) do nothing;
  select * into f from public.booking_reservation_financials where calendar_entry_id=e.id;
  update public.booking_reservation_financials set pricing_status='ready',line_items=v.snapshot->'lines',subtotal_minor=(v.snapshot->>'subtotalMinor')::bigint,vat_total_minor=(v.snapshot->>'vatTotalMinor')::bigint,total_minor=(v.snapshot->>'totalMinor')::bigint,priced_at=now() where calendar_entry_id=e.id;
  insert into public.booking_invoices(business_id,calendar_entry_id,quote_version_id,reservation_number,seller_details,customer_details,line_items,subtotal_minor,vat_total_minor,total_minor,service_date,due_date,created_by)
    values(q.business_id,e.id,v.id,f.reservation_number,v.snapshot->'seller',v.snapshot->'customer',v.snapshot->'lines',(v.snapshot->>'subtotalMinor')::bigint,(v.snapshot->>'vatTotalMinor')::bigint,(v.snapshot->>'totalMinor')::bigint,(e.start_at at time zone coalesce(e.timezone,'Europe/Amsterdam'))::date,current_date+14,p_owner) returning id into result;
  return result;
end $$;
revoke all on function public.start_quote(uuid,uuid,uuid,boolean), public.transition_quote(uuid,integer,text,jsonb,timestamptz,text,text), public.decide_quote(text,uuid,text,text,text), public.invoice_from_quote(uuid,uuid) from public, anon, authenticated;
grant execute on function public.start_quote(uuid,uuid,uuid,boolean), public.transition_quote(uuid,integer,text,jsonb,timestamptz,text,text), public.decide_quote(text,uuid,text,text,text), public.invoice_from_quote(uuid,uuid) to service_role;

create or replace function public.schedule_quote(p_quote uuid,p_owner uuid,p_service uuid,p_start timestamptz,p_end timestamptz) returns uuid
language plpgsql set search_path=public,pg_temp as $$
declare q public.quotes%rowtype; r public.contact_requests%rowtype; s public.service_booking_settings%rowtype; result uuid; occupied bigint;
begin
  select * into q from public.quotes where id=p_quote for update;
  if not found or not exists(select 1 from public.businesses where id=q.business_id and user_id=p_owner)
    or not exists(select 1 from public.quote_versions where quote_id=q.id and status='accepted') then raise exception 'Geaccepteerde offerte niet gevonden'; end if;
  select id into result from public.calendar_entries where contact_request_id=q.request_id and business_id=q.business_id limit 1;
  if result is not null then return result; end if;
  if p_start<=now() or p_end<=p_start then raise exception 'Ongeldig tijdvak'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_service::text,0));
  select * into s from public.service_booking_settings where service_id=p_service and business_id=q.business_id and booking_enabled;
  if not found then raise exception 'Stel eerst boekbare beschikbaarheid voor deze dienst in'; end if;
  if exists(select 1 from public.calendar_entries e where e.business_id=q.business_id and (e.service_id is null or e.service_id=p_service)
    and (e.entry_type='blocked' or e.status='blocked') and e.start_at<p_end+make_interval(mins=>s.buffer_after_minutes) and e.end_at>p_start-make_interval(mins=>s.buffer_before_minutes)) then raise exception 'Tijdslot niet beschikbaar'; end if;
  select (select count(*) from public.calendar_entries e where e.business_id=q.business_id and e.service_id=p_service and e.status in ('pending','confirmed')
    and e.start_at-make_interval(mins=>s.buffer_before_minutes)<p_end and e.end_at+make_interval(mins=>s.buffer_after_minutes)>p_start)
    +(select count(*) from public.booking_holds h where h.service_id=p_service and h.status='active' and h.expires_at>now()
    and h.start_at-make_interval(mins=>s.buffer_before_minutes)<p_end and h.end_at+make_interval(mins=>s.buffer_after_minutes)>p_start) into occupied;
  if occupied>=s.capacity then raise exception 'Tijdslot niet beschikbaar'; end if;
  select * into r from public.contact_requests where id=q.request_id;
  insert into public.calendar_entries(business_id,service_id,contact_request_id,entry_type,status,source,title,customer_name,customer_email,customer_phone,start_at,end_at,timezone)
  values(q.business_id,p_service,q.request_id,case when s.booking_mode='stay' then 'booking' else 'appointment' end,'confirmed','manual',coalesce(nullif(r.service,''),'Afspraak'),r.name,r.email,r.phone,p_start,p_end,s.timezone) returning id into result;
  insert into public.quote_events(quote_id,event_type) values(q.id,'scheduled');
  return result;
end $$;
revoke all on function public.schedule_quote(uuid,uuid,uuid,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.schedule_quote(uuid,uuid,uuid,timestamptz,timestamptz) to service_role;
