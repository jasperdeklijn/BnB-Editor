-- Draft version tracking and atomic, race-safe live snapshot promotion.

begin;

alter table public.websites
  add column if not exists draft_version uuid not null default gen_random_uuid();

update public.websites
set live_snapshot = jsonb_set(live_snapshot, '{draftVersion}', to_jsonb(draft_version::text), true)
where live_snapshot is not null
  and not (live_snapshot ? 'draftVersion');

create or replace function public.bump_website_own_draft_version()
returns trigger
language plpgsql
as $$
begin
  if row(new.title, new.slug, new.custom_domain, new.business_id, new.seo, new.analytics, new.theme_config)
     is distinct from
     row(old.title, old.slug, old.custom_domain, old.business_id, old.seo, old.analytics, old.theme_config) then
    new.draft_version = gen_random_uuid();
  end if;
  return new;
end;
$$;

drop trigger if exists bump_website_own_draft_version on public.websites;
create trigger bump_website_own_draft_version
  before update on public.websites
  for each row execute procedure public.bump_website_own_draft_version();

create or replace function public.bump_related_website_draft_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_website_id uuid;
  target_business_id uuid;
  target_user_id uuid;
begin
  if tg_table_name in ('website_sections', 'section_transitions') then
    target_website_id = case when tg_op = 'DELETE' then old.website_id else new.website_id end;
    update public.websites set draft_version = gen_random_uuid() where id = target_website_id;
  elsif tg_table_name in ('services', 'calendar_availability_windows') then
    target_business_id = case when tg_op = 'DELETE' then old.business_id else new.business_id end;
    select user_id into target_user_id from public.businesses where id = target_business_id;
    update public.websites
      set draft_version = gen_random_uuid()
      where business_id = target_business_id
         or (business_id is null and user_id = target_user_id);
  elsif tg_table_name = 'businesses' then
    target_business_id = case when tg_op = 'DELETE' then old.id else new.id end;
    target_user_id = case when tg_op = 'DELETE' then old.user_id else new.user_id end;
    update public.websites
      set draft_version = gen_random_uuid()
      where business_id = target_business_id
         or (business_id is null and user_id = target_user_id);
  end if;
  return null;
end;
$$;

drop trigger if exists bump_website_draft_from_sections on public.website_sections;
create trigger bump_website_draft_from_sections
  after insert or update or delete on public.website_sections
  for each row execute procedure public.bump_related_website_draft_versions();

drop trigger if exists bump_website_draft_from_transitions on public.section_transitions;
create trigger bump_website_draft_from_transitions
  after insert or update or delete on public.section_transitions
  for each row execute procedure public.bump_related_website_draft_versions();

drop trigger if exists bump_website_draft_from_business on public.businesses;
create trigger bump_website_draft_from_business
  after insert or update or delete on public.businesses
  for each row execute procedure public.bump_related_website_draft_versions();

drop trigger if exists bump_website_draft_from_services on public.services;
create trigger bump_website_draft_from_services
  after insert or update or delete on public.services
  for each row execute procedure public.bump_related_website_draft_versions();

drop trigger if exists bump_website_draft_from_availability on public.calendar_availability_windows;
create trigger bump_website_draft_from_availability
  after insert or update or delete on public.calendar_availability_windows
  for each row execute procedure public.bump_related_website_draft_versions();

create or replace function public.promote_website_live_snapshot(
  p_website_id uuid,
  p_expected_draft_version uuid,
  p_expected_subscription_updated_at timestamptz,
  p_live_snapshot jsonb,
  p_live_published_at timestamptz
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_draft_version uuid;
  current_subscription_updated_at timestamptz;
  has_subscription boolean;
begin
  if current_user_id is null then return 'unauthorized'; end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select updated_at into current_subscription_updated_at
    from public.subscriptions
    where user_id = current_user_id
    for share;
  has_subscription := found;

  if (p_expected_subscription_updated_at is null and has_subscription)
     or (p_expected_subscription_updated_at is not null and (not has_subscription or current_subscription_updated_at is distinct from p_expected_subscription_updated_at)) then
    return 'subscription_changed';
  end if;

  select draft_version into current_draft_version
    from public.websites
    where id = p_website_id and user_id = current_user_id
    for update;
  if not found then return 'not_found'; end if;
  if current_draft_version is distinct from p_expected_draft_version then return 'draft_changed'; end if;

  if exists (
    select 1 from public.websites
    where user_id = current_user_id and published = true and id <> p_website_id
  ) then
    return 'live_website_exists';
  end if;

  update public.websites
  set published = true,
      live_snapshot = p_live_snapshot,
      live_published_at = p_live_published_at,
      updated_at = now()
  where id = p_website_id and user_id = current_user_id;

  return 'published';
end;
$$;

revoke all on function public.promote_website_live_snapshot(uuid, uuid, timestamptz, jsonb, timestamptz) from public;
grant execute on function public.promote_website_live_snapshot(uuid, uuid, timestamptz, jsonb, timestamptz) to authenticated;

commit;
