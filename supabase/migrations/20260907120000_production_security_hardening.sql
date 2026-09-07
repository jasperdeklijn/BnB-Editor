-- Production readiness hardening: enforce tenant-consistent website links and
-- apply server-side storage limits to the public image bucket.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_id_user_id_key'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_id_user_id_key unique (id, user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'websites_business_owner_fkey'
      and conrelid = 'public.websites'::regclass
  ) then
    alter table public.websites
      add constraint websites_business_owner_fkey
      foreign key (business_id, user_id)
      references public.businesses(id, user_id)
      not valid;
  end if;
end;
$$;

-- Validation deliberately blocks rollout if legacy cross-tenant links exist;
-- investigate those rows instead of silently reassigning customer data.
alter table public.websites validate constraint websites_business_owner_fkey;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-images',
  'user-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public rendering reads only the immutable live snapshot. Mutable source
-- tables remain owner-only so draft edits cannot be discovered before publish.
create or replace function public.get_public_website(
  p_slug text default null,
  p_domain text default null
)
returns table (id uuid, slug text, published boolean, live_snapshot jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select w.id, w.slug, w.published, w.live_snapshot
  from public.websites w
  where w.published = true
    and w.live_snapshot is not null
    and (
      (p_slug is not null and char_length(p_slug) between 1 and 120 and w.slug = p_slug)
      or (
        p_domain is not null
        and char_length(p_domain) between 1 and 253
        and exists (
          select 1 from public.website_domains d
          where d.website_id = w.id
            and d.domain = lower(trim(trailing '.' from p_domain))
            and d.status = 'active'
        )
      )
    )
  order by case when p_slug is not null and w.slug = p_slug then 0 else 1 end
  limit 1;
$$;

revoke all on function public.get_public_website(text, text) from public;
grant execute on function public.get_public_website(text, text) to anon, authenticated;

drop policy if exists "Anyone can view published website businesses" on public.businesses;
drop policy if exists "Anyone can view published website services" on public.services;
drop policy if exists "Anyone can view published websites" on public.websites;
drop policy if exists "Anyone can view active domains of published websites" on public.website_domains;
drop policy if exists "Anyone can view sections of published websites" on public.website_sections;
drop policy if exists "Anyone can view transitions of published websites" on public.section_transitions;

commit;
