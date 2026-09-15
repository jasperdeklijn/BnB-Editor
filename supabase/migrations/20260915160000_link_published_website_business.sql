begin;

-- Older websites can have a business only in their published snapshot, because
-- buildWebsiteLiveSnapshot resolves a legacy fallback without storing the link.
-- Reviews and other tenant-scoped records require websites.business_id itself.
create or replace function public.bind_website_snapshot_business()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.business_id is null then
    select b.id into new.business_id
    from public.businesses b
    where b.user_id = new.user_id
      and b.id::text = new.live_snapshot #>> '{website,businessId}';
  end if;
  return new;
end;
$$;
revoke all on function public.bind_website_snapshot_business() from public;

-- Runs before bump_website_own_draft_version so the repaired link is tracked.
drop trigger if exists bind_website_snapshot_business on public.websites;
create trigger bind_website_snapshot_business
  before insert or update of live_snapshot on public.websites
  for each row execute function public.bind_website_snapshot_business();

-- Repair only missing links backed by an existing business of the same owner.
-- Preserve explicit links, published content, subscriptions and review records.
update public.websites w
set business_id = b.id
from public.businesses b
where w.business_id is null
  and w.published
  and b.user_id = w.user_id
  and b.id::text = w.live_snapshot #>> '{website,businessId}';

commit;
