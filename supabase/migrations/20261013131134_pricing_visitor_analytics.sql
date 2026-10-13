begin;

-- Only live snapshots consume the quota. Draft designs/pages remain unrestricted.
drop trigger if exists enforce_website_page_plan on public.website_pages;
create or replace function public.enforce_website_page_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner_plan text; page_limit integer; page_count integer;
begin
  if not new.published then return new; end if;
  -- Metadata-only updates must preserve grandfathered live content after downgrade.
  if tg_op = 'UPDATE' and old.published and new.user_id = old.user_id
    and new.live_snapshot is not distinct from old.live_snapshot then return new; end if;
  select case when status in ('active','trial') or (status='canceled' and current_period_end>now()) then plan_id else 'bronze' end into owner_plan from public.subscriptions where user_id = new.user_id for share;
  page_limit := case coalesce(owner_plan,'bronze') when 'bronze' then 3 when 'silver' then 10 else null end;
  page_count := case when jsonb_typeof(new.live_snapshot->'pages') = 'array'
    then jsonb_array_length(new.live_snapshot->'pages') else 1 end;
  if page_limit is not null and page_count > page_limit then
    raise exception 'PUBLISHED_PAGE_LIMIT: Maximaal % gepubliceerde pagina''s. Selecteer pagina''s in Pagina-instellingen of upgrade. De live versie blijft behouden.', page_limit using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.enforce_website_page_plan() from public,anon,authenticated;

create schema if not exists analytics_private;
revoke all on schema analytics_private from public,anon,authenticated;
grant usage on schema analytics_private to authenticated,service_role;

create table if not exists public.website_analytics_daily (
  website_id uuid not null references public.websites(id) on delete cascade,
  day date not null,
  page_id text not null default '', -- empty is the website total; dimensions have a page ID
  source text not null check (source in ('all','direct','search','social','referral')),
  device text not null check (device in ('all','desktop','mobile','tablet')),
  views bigint not null default 0 check (views >= 0),
  visitors bigint not null default 0 check (visitors >= 0),
  contact bigint not null default 0 check (contact >= 0),
  booking bigint not null default 0 check (booking >= 0),
  primary key (website_id,day,page_id,source,device)
);
create index if not exists website_analytics_retention_idx on public.website_analytics_daily(day);
alter table public.website_analytics_daily enable row level security;
revoke all on public.website_analytics_daily from public,anon,authenticated;
grant all on public.website_analytics_daily to service_role;
-- Even if a grant is added by future tooling, owner isolation remains in place.
create policy analytics_owner on public.website_analytics_daily for select to authenticated
  using (exists(select 1 from public.websites w where w.id=website_id and w.user_id=(select auth.uid())));

create table if not exists analytics_private.seen (
  website_id uuid not null references public.websites(id) on delete cascade,
  day date not null,
  key text not null check (length(key) <= 180),
  primary key (website_id,day,key)
);
create index if not exists analytics_seen_retention_idx on analytics_private.seen(day);
alter table analytics_private.seen enable row level security;
revoke all on analytics_private.seen from public,anon,authenticated;

create table if not exists analytics_private.conversions (
  website_id uuid not null references public.websites(id) on delete cascade,
  kind text not null check (kind in ('contact','booking')),
  success_id uuid not null,
  created_at timestamptz not null default now(),
  counted boolean not null default false,
  primary key (website_id,kind,success_id)
);
alter table analytics_private.conversions enable row level security;
revoke all on analytics_private.conversions from public,anon,authenticated;

create or replace function public.ingest_website_analytics(p_website_id uuid,p_page_id uuid,p_visitor text,p_device text,p_events jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare today date := (now() at time zone 'UTC')::date; event jsonb; n integer; total integer:=0; fresh integer:=0; src text;
begin
  if p_visitor !~ '^[a-f0-9]{64}$' or p_device not in ('desktop','mobile','tablet')
    or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) not between 1 and 20 then return; end if;
  -- Serialize batches and recheck current privacy/publication state inside the write.
  perform 1 from public.websites w where w.id=p_website_id and w.published
    and w.analytics->>'firstPartyEnabled'='true'
    and exists(select 1 from jsonb_array_elements(w.live_snapshot->'pages') p where p->>'id'=p_page_id::text) for share;
  if not found then return; end if;
  for event in select value from jsonb_array_elements(p_events) loop
    src := event->>'source';
    if event->>'id' !~ '^[a-f0-9]{64}$' or src not in ('direct','search','social','referral') then continue; end if;
    insert into analytics_private.seen values(p_website_id,today,'event:'||(event->>'id')) on conflict do nothing;
    get diagnostics n = row_count;
    if n=0 then continue; end if;
    -- Suppress rapid reloads, React remounts and duplicated browser submissions.
    insert into analytics_private.seen values(p_website_id,today,'view:'||p_visitor||':'||p_page_id||':'||floor(extract(epoch from now())/30)::text) on conflict do nothing;
    get diagnostics n = row_count;
    if n=0 then continue; end if;
    total := total+1;
    insert into public.website_analytics_daily(website_id,day,page_id,source,device,views)
      values(p_website_id,today,p_page_id::text,src,p_device,1)
      on conflict(website_id,day,page_id,source,device) do update set views=website_analytics_daily.views+1;
  end loop;
  if total=0 then return; end if;
  insert into analytics_private.seen values(p_website_id,today,'visitor:'||p_visitor) on conflict do nothing;
  get diagnostics fresh = row_count;
  insert into public.website_analytics_daily(website_id,day,page_id,source,device,views,visitors)
    values(p_website_id,today,'','all','all',total,fresh)
    on conflict(website_id,day,page_id,source,device) do update set views=website_analytics_daily.views+excluded.views,visitors=website_analytics_daily.visitors+excluded.visitors;
  delete from analytics_private.seen where website_id=p_website_id and day<today-1;
end $$;
revoke all on function public.ingest_website_analytics(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.ingest_website_analytics(uuid,uuid,text,text,jsonb) to service_role;

-- Called only from validated, consenting backend success paths. Pending bookings
-- register eligibility now; the confirmation trigger counts them exactly once.
create or replace function public.record_website_conversion(p_website_id uuid,p_kind text,p_success_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; eligible boolean; confirmed boolean; n integer; today date := (now() at time zone 'UTC')::date;
begin
  select user_id into owner_id from public.websites where id=p_website_id and published and analytics->>'firstPartyEnabled'='true' for share;
  if owner_id is null or p_kind not in ('contact','booking') then return; end if;
  select plan_id='gold' and (status in ('active','trial') or (status='canceled' and current_period_end>now())) and (p_kind='contact' or booking_addon_active) into eligible from public.subscriptions where user_id=owner_id;
  if not coalesce(eligible,false) then return; end if;
  if p_kind='contact' then
    if not exists(select 1 from public.contact_requests where id=p_success_id and website_id=p_website_id and request_type='contact') then return; end if;
    confirmed:=true;
  else
    select e.status in ('confirmed','completed') into confirmed from public.calendar_entries e
      join public.contact_requests r on r.id=e.contact_request_id
      where e.id=p_success_id and r.website_id=p_website_id and e.source='website_form';
    if confirmed is null then return; end if;
  end if;
  insert into analytics_private.conversions(website_id,kind,success_id) values(p_website_id,p_kind,p_success_id) on conflict do nothing;
  if not confirmed then return; end if;
  update analytics_private.conversions set counted=true where website_id=p_website_id and kind=p_kind and success_id=p_success_id and not counted;
  get diagnostics n = row_count;
  if n=0 then return; end if;
  insert into public.website_analytics_daily(website_id,day,page_id,source,device,contact,booking)
    values(p_website_id,today,'','all','all',case when p_kind='contact' then 1 else 0 end,case when p_kind='booking' then 1 else 0 end)
    on conflict(website_id,day,page_id,source,device) do update set contact=website_analytics_daily.contact+excluded.contact,booking=website_analytics_daily.booking+excluded.booking;
end $$;
revoke all on function public.record_website_conversion(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.record_website_conversion(uuid,text,uuid) to service_role;

create or replace function analytics_private.confirmed_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
declare site uuid;
begin
  if new.status='confirmed' and old.status is distinct from new.status then
    select website_id into site from analytics_private.conversions where kind='booking' and success_id=new.id and not counted;
    if site is not null then perform public.record_website_conversion(site,'booking',new.id); end if;
  end if;
  return new;
end $$;
revoke all on function analytics_private.confirmed_booking() from public,anon,authenticated;
create trigger analytics_confirmed_booking after update of status on public.calendar_entries for each row execute function analytics_private.confirmed_booking();

create or replace function analytics_private.report(p_website_id uuid,p_from date,p_to date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; plan text; enabled boolean; booking_active boolean; start_day date; end_day date; result jsonb; today date := (now() at time zone 'UTC')::date;
begin
  select user_id,analytics->>'firstPartyEnabled'='true' into owner_id,enabled from public.websites where id=p_website_id and user_id=(select auth.uid());
  if owner_id is null then raise exception 'Website niet gevonden' using errcode='42501'; end if;
  select case when status in ('active','trial') or (status='canceled' and current_period_end>now()) then plan_id else 'bronze' end, booking_addon_active and (status in ('active','trial') or (status='canceled' and current_period_end>now())) into plan,booking_active from public.subscriptions where user_id=owner_id;
  plan:=coalesce(plan,'bronze');
  end_day:=least(coalesce(p_to,today),today);
  start_day:=greatest(coalesce(p_from,end_day-6),today-(case plan when 'bronze' then 29 when 'silver' then 89 else 365 end));
  if start_day>end_day then raise exception 'Ongeldige datums'; end if;
  select jsonb_build_object('plan',plan,'enabled',coalesce(enabled,false),'booking',coalesce(booking_active,false),'from',start_day,'to',end_day,
    'visitors',coalesce(sum(visitors),0),'views',coalesce(sum(views),0),'daysWithData',count(distinct day) filter(where views>0)) into result
    from public.website_analytics_daily where website_id=p_website_id and day between start_day and end_day and page_id='';
  if plan in ('silver','gold') then
    result:= result || jsonb_build_object(
      'pages',(select coalesce(jsonb_agg(r),'[]'::jsonb) from (select page_id as "pageId",sum(views) as views from public.website_analytics_daily where website_id=p_website_id and day between start_day and end_day and page_id<>'' group by page_id order by sum(views) desc limit 100) r),
      'sources',(select coalesce(jsonb_agg(r),'[]'::jsonb) from (select source as name,sum(views) as views from public.website_analytics_daily where website_id=p_website_id and day between start_day and end_day and page_id<>'' group by source) r),
      'devices',(select coalesce(jsonb_agg(r),'[]'::jsonb) from (select device as name,sum(views) as views from public.website_analytics_daily where website_id=p_website_id and day between start_day and end_day and page_id<>'' group by device) r),
      'trend',(select coalesce(jsonb_agg(r order by day),'[]'::jsonb) from (select day,sum(views) as views,sum(visitors) as visitors from public.website_analytics_daily where website_id=p_website_id and day between start_day and end_day and page_id='' group by day) r));
  end if;
  if plan='gold' then
    result:=result || jsonb_build_object('conversions',(select jsonb_build_object('contact',coalesce(sum(contact),0),'booking',case when booking_active then coalesce(sum(booking),0) else null end) from public.website_analytics_daily where website_id=p_website_id and day between start_day and end_day and page_id=''));
  end if;
  return result;
end $$;
revoke all on function analytics_private.report(uuid,date,date) from public,anon;
grant execute on function analytics_private.report(uuid,date,date) to authenticated;
create or replace function public.website_analytics_report(p_website_id uuid,p_from date default null,p_to date default null)
returns jsonb language sql security invoker set search_path = '' as $$ select analytics_private.report(p_website_id,p_from,p_to) $$;
revoke all on function public.website_analytics_report(uuid,date,date) from public,anon;
grant execute on function public.website_analytics_report(uuid,date,date) to authenticated;

create or replace function public.cleanup_website_analytics() returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from analytics_private.seen where day<(now() at time zone 'UTC')::date-1;
  delete from public.website_analytics_daily where day<(now() at time zone 'UTC')::date-365;
  delete from analytics_private.conversions where created_at<now()-interval '366 days';
end $$;
revoke all on function public.cleanup_website_analytics() from public,anon,authenticated;
grant execute on function public.cleanup_website_analytics() to service_role;

-- Advanced fields are saved through existing owner-authorized tables; guard direct writes.
create or replace function public.enforce_website_seo_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; plan text; previous_seo jsonb := '{}'::jsonb; advanced_changed boolean;
begin
  if tg_table_name='websites' then owner_id:=new.user_id;
  else select user_id into owner_id from public.websites where id=new.website_id; end if;
  if tg_op='UPDATE' then previous_seo:=coalesce(old.seo,'{}'::jsonb); end if;
  advanced_changed := (coalesce(new.seo,'{}'::jsonb)->>'ogImage' is distinct from previous_seo->>'ogImage' and coalesce(new.seo->>'ogImage','')<>'')
    or (coalesce(new.seo,'{}'::jsonb)->>'canonicalUrl' is distinct from previous_seo->>'canonicalUrl' and coalesce(new.seo->>'canonicalUrl','')<>'');
  if tg_table_name='websites' then
    if tg_op='INSERT' then advanced_changed:=advanced_changed or coalesce(new.analytics->>'measurementId','')<>'';
    else advanced_changed:=advanced_changed or (new.analytics->>'measurementId' is distinct from old.analytics->>'measurementId' and coalesce(new.analytics->>'measurementId','')<>'') or (new.analytics->>'provider' is distinct from old.analytics->>'provider' and coalesce(new.analytics->>'provider','')<>'') or (new.analytics->>'consentMode' is distinct from old.analytics->>'consentMode'); end if;
  end if;
  select case when status in ('active','trial') or (status='canceled' and current_period_end>now()) then plan_id else 'bronze' end into plan from public.subscriptions where user_id=owner_id for share;
  if coalesce(plan,'bronze')='bronze' and advanced_changed then raise exception 'Uitgebreide SEO en GA4 vereisen Silver of Gold' using errcode='42501'; end if;
  return new;
end $$;
revoke all on function public.enforce_website_seo_plan() from public,anon,authenticated;
create trigger website_seo_plan before insert or update of seo,analytics on public.websites for each row execute function public.enforce_website_seo_plan();
create trigger page_seo_plan before insert or update of seo on public.website_pages for each row execute function public.enforce_website_seo_plan();

comment on table public.website_analytics_daily is 'Consented daily aggregates, retained 366 days. Visitors are summed daily browser-session estimates; no IPs, full referrer URLs or fingerprints.';
-- End the temporary free-feature rollout without rewriting billing records.
create or replace function public.can_manage_services() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.subscriptions where user_id=(select auth.uid())
    and (plan_id='gold' or booking_addon_active)
    and (status in ('active','trial') or (status='canceled' and current_period_end>now())));
$$;
revoke all on function public.can_manage_services() from public,anon;
grant execute on function public.can_manage_services() to authenticated;
create or replace function public.review_gold_access(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.subscriptions where user_id=p_user and plan_id='gold'
    and (status in ('active','trial') or (status='canceled' and current_period_end>now())));
$$;
revoke all on function public.review_gold_access(uuid) from public,anon,authenticated;
grant execute on function public.review_gold_access(uuid) to service_role;
alter table public.subscriptions alter column plan_id set default 'bronze', alter column current_price set default 7.95;
create or replace function public.website_analytics_admin_visitors(p_from date,p_to date)
returns bigint language sql security definer set search_path = '' as $$
  select coalesce(sum(visitors),0)::bigint from public.website_analytics_daily
    where page_id='' and day>=p_from and day<p_to;
$$;
revoke all on function public.website_analytics_admin_visitors(date,date) from public,anon,authenticated;
grant execute on function public.website_analytics_admin_visitors(date,date) to service_role;
commit;
