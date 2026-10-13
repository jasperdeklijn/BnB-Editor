begin;
-- Temporary feature access only. No subscription rows, add-on flags, prices,
-- analytics consent settings, ownership policies or live snapshots are changed.
-- Disable this function together with DEFAULT_ALL_FEATURES_INCLUDED to restore paid gates.
create or replace function public.temporary_gold_access_enabled() returns boolean
language sql stable security invoker set search_path = '' as $$ select true $$;
revoke all on function public.temporary_gold_access_enabled() from public,anon;
grant execute on function public.temporary_gold_access_enabled() to authenticated,service_role;

create or replace function public.enforce_website_page_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner_plan text; page_limit integer; page_count integer;
begin
  if public.temporary_gold_access_enabled() then return new; end if;
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

create or replace function public.record_website_conversion(p_website_id uuid,p_kind text,p_success_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; eligible boolean; confirmed boolean; n integer; today date := (now() at time zone 'UTC')::date;
begin
  select user_id into owner_id from public.websites where id=p_website_id and published and analytics->>'firstPartyEnabled'='true' for share;
  if owner_id is null or p_kind not in ('contact','booking') then return; end if;
  select plan_id='gold' and (status in ('active','trial') or (status='canceled' and current_period_end>now())) and (p_kind='contact' or booking_addon_active) into eligible from public.subscriptions where user_id=owner_id;
  if public.temporary_gold_access_enabled() then eligible := true; end if;
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

create or replace function analytics_private.report(p_website_id uuid,p_from date,p_to date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; plan text; enabled boolean; booking_active boolean; start_day date; end_day date; result jsonb; today date := (now() at time zone 'UTC')::date;
begin
  select user_id,analytics->>'firstPartyEnabled'='true' into owner_id,enabled from public.websites where id=p_website_id and user_id=(select auth.uid());
  if owner_id is null then raise exception 'Website niet gevonden' using errcode='42501'; end if;
  select case when status in ('active','trial') or (status='canceled' and current_period_end>now()) then plan_id else 'bronze' end, booking_addon_active and (status in ('active','trial') or (status='canceled' and current_period_end>now())) into plan,booking_active from public.subscriptions where user_id=owner_id;
  if public.temporary_gold_access_enabled() then plan := 'gold'; booking_active := true; end if;
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

create or replace function public.enforce_website_seo_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; plan text; previous_seo jsonb := '{}'::jsonb; advanced_changed boolean;
begin
  if public.temporary_gold_access_enabled() then return new; end if;
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

create or replace function public.can_manage_services() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id=(select auth.uid())) and (public.temporary_gold_access_enabled() or exists(select 1 from public.subscriptions where user_id=(select auth.uid())
    and (plan_id='gold' or booking_addon_active)
    and (status in ('active','trial') or (status='canceled' and current_period_end>now()))));
$$;

create or replace function public.review_gold_access(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id=p_user) and (public.temporary_gold_access_enabled() or exists(select 1 from public.subscriptions where user_id=p_user and plan_id='gold'
    and (status in ('active','trial') or (status='canceled' and current_period_end>now()))));
$$;
revoke all on function public.enforce_website_page_plan(),public.enforce_website_seo_plan() from public,anon,authenticated;
revoke all on function public.record_website_conversion(uuid,text,uuid),public.review_gold_access(uuid) from public,anon,authenticated;
grant execute on function public.record_website_conversion(uuid,text,uuid),public.review_gold_access(uuid) to service_role;
revoke all on function public.can_manage_services(),analytics_private.report(uuid,date,date) from public,anon;
grant execute on function public.can_manage_services(),analytics_private.report(uuid,date,date) to authenticated;
commit;

