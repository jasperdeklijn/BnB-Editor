-- Page access uses the stored plan even while other Gold features are free.
-- Preserve existing drafts/live content; guard new pages and new publications.
create or replace function public.enforce_website_page_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid;
  owner_plan text;
begin
  if tg_table_name = 'website_pages' then
    if tg_op = 'UPDATE' then
      if new.website_id = old.website_id then return new; end if;
    end if;
    -- Serialize direct inserts as well as RPCs against the website.
    select user_id into owner_id from public.websites where id = new.website_id for update;
  else
    if not new.published then return new; end if;
    if jsonb_typeof(new.live_snapshot->'pages') is distinct from 'array' then return new; end if;
    if jsonb_array_length(new.live_snapshot->'pages') <= 1 then return new; end if;
    owner_id := new.user_id;
  end if;

  -- The plan row is server-owned. Hold it through the mutation/publication.
  select plan_id into owner_plan from public.subscriptions where user_id = owner_id for share;
  if coalesce(owner_plan, 'gold') = 'bronze' then
    if tg_table_name = 'websites' then
      raise exception 'MULTIPAGE_REQUIRES_SILVER: Bronze is voor één pagina. Kies Silver of Gold voor meerdere pagina''s.' using errcode = '42501';
    end if;
    if not new.is_home or exists (select 1 from public.website_pages where website_id = new.website_id and id <> new.id) then
      raise exception 'MULTIPAGE_REQUIRES_SILVER: Bronze is voor één pagina. Kies Silver of Gold voor meerdere pagina''s.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Trigger-only definer: callers cannot supply an owner or query other plans.
revoke all on function public.enforce_website_page_plan() from public, anon, authenticated;
drop trigger if exists enforce_website_page_plan on public.website_pages;
create trigger enforce_website_page_plan before insert or update of website_id on public.website_pages
  for each row execute function public.enforce_website_page_plan();
drop trigger if exists enforce_website_publication_plan on public.websites;
create trigger enforce_website_publication_plan before insert or update of live_snapshot, published, user_id on public.websites
  for each row execute function public.enforce_website_page_plan();
