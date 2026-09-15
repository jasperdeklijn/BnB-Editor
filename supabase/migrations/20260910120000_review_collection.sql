begin;

-- Gold review collection. Existing customer content is archived before migration.
create or replace function public.review_gold_access(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.subscriptions s where s.user_id = p_user and s.plan_id = 'gold'
    and (s.current_period_end is null or s.current_period_end > now())
    and (s.status in ('active','trial') or (s.status = 'canceled' and s.current_period_end > now())));
$$;
create or replace function public.review_collection_live(p_website uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.websites w where w.id = p_website and w.published and w.business_id is not null
    and public.review_gold_access(w.user_id)
    and exists (select 1 from jsonb_array_elements(coalesce(w.live_snapshot->'sections','[]'::jsonb)) s
      where s->>'type' = 'testimonials' and s->'data'->>'reviewMode' = 'collection'));
$$;
revoke all on function public.review_gold_access(uuid), public.review_collection_live(uuid) from public, anon, authenticated;
grant execute on function public.review_gold_access(uuid), public.review_collection_live(uuid) to service_role;

create table public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 10 and 3000),
  status text not null default 'unconfirmed' check (status in ('unconfirmed','pending','published','rejected','withdrawn')),
  consent_at timestamptz not null default now(),
  confirmed_at timestamptz,
  published_at timestamptz,
  withdrawn_at timestamptz,
  confirmation_hash text unique,
  confirmation_expires_at timestamptz,
  withdrawal_hash text unique,
  withdrawal_expires_at timestamptz,
  delivery_status text not null default 'pending' check (delivery_status in ('pending','sent','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('pending','published','rejected') or confirmed_at is not null),
  check (status <> 'published' or (published_at is not null and withdrawn_at is null)),
  check (status <> 'withdrawn' or withdrawn_at is not null)
);
create unique index customer_reviews_email_unique on public.customer_reviews(website_id, lower(email)) where status <> 'withdrawn';
create index customer_reviews_public on public.customer_reviews(website_id, created_at desc) where status = 'published';
create index customer_reviews_unconfirmed_expiry on public.customer_reviews(created_at) where status = 'unconfirmed';
create table public.review_events (
  id bigint generated always as identity primary key,
  website_id uuid not null references public.websites(id) on delete cascade,
  review_id uuid references public.customer_reviews(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);
alter table public.customer_reviews enable row level security;
alter table public.review_events enable row level security;
revoke all on public.customer_reviews, public.review_events from anon, authenticated;
grant select on public.customer_reviews, public.review_events to authenticated;
grant all on public.customer_reviews, public.review_events to service_role;
grant usage, select on sequence public.review_events_id_seq to service_role;
create policy reviews_owner_read on public.customer_reviews for select to authenticated using
  (exists (select 1 from public.websites w where w.id = website_id and w.user_id = auth.uid()));
create policy review_events_owner_read on public.review_events for select to authenticated using
  (exists (select 1 from public.websites w where w.id = website_id and w.user_id = auth.uid()));

create or replace function public.guard_customer_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and not exists (select 1 from public.websites w where w.id = new.website_id and w.business_id = new.business_id) then
    raise exception 'Invalid review scope';
  end if;
  if tg_op = 'INSERT' and not public.review_collection_live(new.website_id) then raise exception 'Review collection unavailable'; end if;
  if tg_op = 'UPDATE' and (new.website_id <> old.website_id or new.business_id <> old.business_id
    or new.display_name <> old.display_name or new.email <> old.email or new.rating <> old.rating or new.body <> old.body
    or new.consent_at <> old.consent_at) then raise exception 'Original reviews are immutable'; end if;
  new.updated_at = now();
  return new;
end $$;
create trigger guard_customer_review before insert or update on public.customer_reviews for each row execute function public.guard_customer_review();

create or replace function public.review_token_action(p_hash text, p_action text) returns boolean
language plpgsql security definer set search_path = public as $$
declare r public.customer_reviews;
begin
  if p_action = 'confirm' then
    select * into r from public.customer_reviews where confirmation_hash = p_hash for update;
    if not found or r.status <> 'unconfirmed' or r.confirmation_expires_at <= now() or r.confirmation_expires_at is null
      or r.created_at < now() - interval '7 days' or not public.review_collection_live(r.website_id) then return false; end if;
    update public.customer_reviews set status = 'pending', confirmed_at = now(), confirmation_hash = null, confirmation_expires_at = null where id = r.id;
  elsif p_action = 'withdraw' then
    select * into r from public.customer_reviews where withdrawal_hash = p_hash for update;
    if not found or r.status = 'withdrawn' or r.withdrawal_expires_at <= now() or r.withdrawal_expires_at is null then return false; end if;
    update public.customer_reviews set status = 'withdrawn', withdrawn_at = now(), published_at = null,
      confirmation_hash = null, withdrawal_hash = null where id = r.id;
  else return false;
  end if;
  insert into public.review_events(website_id, review_id, action) values(r.website_id, r.id, p_action);
  return true;
end $$;

create or replace function public.moderate_customer_review(p_id uuid, p_website uuid, p_actor uuid, p_action text, p_reason text, p_expected text) returns boolean
language plpgsql security definer set search_path = public as $$
declare r public.customer_reviews;
begin
  if not exists (select 1 from public.websites where id = p_website and user_id = p_actor) then raise exception 'Website not found'; end if;
  select * into r from public.customer_reviews where id = p_id and website_id = p_website for update;
  if not found or r.status <> p_expected then return false; end if;
  if char_length(btrim(p_reason)) < 3 or char_length(p_reason) > 500 then raise exception 'Reason required'; end if;
  if p_action = 'delete' then
    insert into public.review_events(website_id, review_id, actor_id, action, reason) values(p_website,r.id,p_actor,p_action,p_reason);
    delete from public.customer_reviews where id = r.id;
    return true;
  end if;
  if not public.review_gold_access(p_actor) then raise exception 'Gold required'; end if;
  if not exists(select 1 from public.websites w where w.id = p_website and w.business_id = r.business_id) then return false; end if;
  if r.status not in ('pending','published','rejected') or r.confirmed_at is null or r.withdrawn_at is not null then return false; end if;
  if p_action not in ('published','rejected','pending') then raise exception 'Invalid action'; end if;
  if p_action = 'published' and not public.review_collection_live(p_website) then raise exception 'Publish collection mode first'; end if;
  update public.customer_reviews set status = p_action, published_at = case when p_action = 'published' then now() else null end where id = r.id;
  insert into public.review_events(website_id, review_id, actor_id, action, reason) values(p_website,r.id,p_actor,p_action,p_reason);
  return true;
end $$;
create or replace function public.public_customer_reviews(p_website uuid, p_limit integer default 6)
returns table(id uuid, display_name text, rating integer, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id,r.display_name,r.rating,r.body,r.created_at from public.customer_reviews r
  where r.website_id = p_website and public.review_collection_live(p_website)
    and exists(select 1 from public.websites w where w.id = p_website and w.business_id = r.business_id)
    and r.status = 'published' and r.confirmed_at is not null and r.withdrawn_at is null
  order by r.created_at desc, r.id limit greatest(1,least(12,p_limit));
$$;
create or replace function public.expire_unconfirmed_reviews() returns void
language sql security definer set search_path = public as $$
  delete from public.customer_reviews where status = 'unconfirmed' and created_at < now() - interval '7 days';
$$;
revoke all on function public.review_token_action(text,text), public.moderate_customer_review(uuid,uuid,uuid,text,text,text), public.public_customer_reviews(uuid,integer), public.expire_unconfirmed_reviews() from public, anon, authenticated;
grant execute on function public.review_token_action(text,text), public.moderate_customer_review(uuid,uuid,uuid,text,text,text), public.public_customer_reviews(uuid,integer), public.expire_unconfirmed_reviews() to service_role;

-- Preserve all pre-migration review content, including translations and live copies.
create table public.review_legacy_archive (
  website_id uuid primary key references public.websites(id) on delete cascade,
  sections jsonb not null, translations jsonb not null, live_snapshot jsonb,
  archived_at timestamptz not null default now()
);
alter table public.review_legacy_archive enable row level security;
revoke all on public.review_legacy_archive from anon, authenticated;
grant select on public.review_legacy_archive to authenticated;
grant all on public.review_legacy_archive to service_role;
create policy review_legacy_owner_read on public.review_legacy_archive for select to authenticated using
  (exists (select 1 from public.websites w where w.id = website_id and w.user_id = auth.uid()));
insert into public.review_legacy_archive(website_id, sections, translations, live_snapshot)
select w.id,
  coalesce((select jsonb_agg(to_jsonb(s)) from public.website_sections s where s.website_id=w.id and s.type='testimonials'),'[]'),
  coalesce((select jsonb_agg(to_jsonb(t)) from public.website_section_translations t join public.website_sections s on s.id=t.section_id where s.website_id=w.id and s.type='testimonials'),'[]'),
  w.live_snapshot
from public.websites w where exists(select 1 from public.website_sections s where s.website_id=w.id and s.type='testimonials')
  or w.live_snapshot::text like '%"testimonials"%';

create or replace function public.clean_legacy_review_data(d jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select (coalesce(d,'{}') - 'items') || jsonb_build_object('reviewMode',coalesce(d->>'reviewMode','google'),'googleReviewUrl',coalesce(d->>'googleReviewUrl',''));
$$;
create or replace function public.clean_legacy_review_snapshot(doc jsonb) returns jsonb
language plpgsql immutable set search_path = public as $$
begin
  if doc is null then return null; end if;
  if jsonb_typeof(doc->'sections') = 'array' then
    doc = jsonb_set(doc,'{sections}',coalesce((select jsonb_agg(case when s->>'type'='testimonials' then jsonb_set(s,'{data}',public.clean_legacy_review_data(s->'data')) else s end) from jsonb_array_elements(doc->'sections') s),'[]'));
  end if;
  if jsonb_typeof(doc->'locales') = 'array' then
    doc = jsonb_set(doc,'{locales}',coalesce((select jsonb_agg(public.clean_legacy_review_snapshot(l)) from jsonb_array_elements(doc->'locales') l),'[]'));
  end if;
  return doc;
end $$;
update public.website_section_translations t set values = values - 'items'
where exists(select 1 from public.website_sections s where s.id=t.section_id and s.type='testimonials');
update public.website_sections set content = public.clean_legacy_review_data(content) where type='testimonials';
update public.websites set live_snapshot = public.clean_legacy_review_snapshot(live_snapshot) where id in (select website_id from public.review_legacy_archive);

-- Enforce settings even for direct Supabase writes and snapshot promotion RPCs.
create or replace function public.validate_review_settings(d jsonb, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare u text := coalesce(d->>'googleReviewUrl','');
begin
  if d ? 'items' then raise exception 'Manual reviews are no longer supported'; end if;
  if coalesce(d->>'reviewMode','google') not in ('google','collection') then raise exception 'Invalid review mode'; end if;
  if d->>'reviewMode' = 'collection' and not public.review_gold_access(p_user) then raise exception 'Recensies verzamelen vereist een actief Gold-abonnement'; end if;
  if u <> '' and (char_length(u)>2048 or u !~ '^https://((www\.)?google\.(com|nl)/maps([/?#]|$)|maps\.google\.com/([?#]|$)|search\.google\.com/local/reviews\?placeid=|maps\.app\.goo\.gl/[A-Za-z0-9_-]+([/?#]|$)|g\.page/[A-Za-z0-9_-]+([/?#]|$))') then raise exception 'Ongeldige Google-recensielink'; end if;
  if d ? 'reviewLimit' and (jsonb_typeof(d->'reviewLimit') <> 'number' or (d->>'reviewLimit')::numeric not between 1 and 12 or (d->>'reviewLimit')::numeric <> trunc((d->>'reviewLimit')::numeric)) then raise exception 'Kies 1 tot 12 recensies'; end if;
end $$;
create or replace function public.guard_review_section_settings() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner_id uuid; s jsonb; l jsonb;
begin
  if tg_table_name = 'website_sections' then
    if new.type='testimonials' then
      select user_id into owner_id from public.websites where id=new.website_id;
      perform public.validate_review_settings(new.content,owner_id);
    end if;
  else
    if new.published and (tg_op = 'INSERT' or not old.published or new.live_snapshot is distinct from old.live_snapshot) then
      for s in select value from jsonb_array_elements(coalesce(new.live_snapshot->'sections','[]')) loop
        if s->>'type'='testimonials' then perform public.validate_review_settings(s->'data',new.user_id); end if;
      end loop;
      for l in select value from jsonb_array_elements(coalesce(new.live_snapshot->'locales','[]')) loop
        for s in select value from jsonb_array_elements(coalesce(l->'sections','[]')) loop
          if s->>'type'='testimonials' then perform public.validate_review_settings(s->'data',new.user_id); end if;
        end loop;
      end loop;
    end if;
  end if;
  return new;
end $$;
create trigger guard_review_section_settings before insert or update of content, type on public.website_sections for each row execute function public.guard_review_section_settings();
create trigger guard_review_snapshot_settings before insert or update of live_snapshot, published on public.websites for each row execute function public.guard_review_section_settings();
revoke all on function public.guard_customer_review(), public.guard_review_section_settings(), public.validate_review_settings(jsonb,uuid) from public, anon, authenticated;

commit;
