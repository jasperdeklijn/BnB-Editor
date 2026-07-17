create table public.website_domains (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  domain text not null unique,
  is_primary boolean not null default false,
  status text not null default 'provisioning'
    check (status in ('provisioning', 'active', 'add_failed', 'removal_pending', 'removal_failed')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_domains_normalized_domain_check check (
    domain = lower(domain)
    and domain = btrim(domain)
    and domain !~ '^www\.'
  )
);

create unique index website_domains_one_primary_idx
  on public.website_domains (website_id)
  where is_primary;

create index website_domains_website_id_idx on public.website_domains (website_id);
create index website_domains_routable_idx on public.website_domains (domain)
  where status = 'active';

create trigger set_website_domains_updated_at
  before update on public.website_domains
  for each row execute procedure public.set_updated_at();

insert into public.website_domains (website_id, domain, is_primary, status)
select id, lower(regexp_replace(custom_domain, '^www\.', '', 'i')), true, 'active'
from public.websites
where custom_domain is not null
on conflict (domain) do nothing;

alter table public.website_domains enable row level security;

create policy "Anyone can view active domains of published websites"
  on public.website_domains for select
  using (
    status = 'active'
    and exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.published = true
    )
  );

create policy "Users can view their own website domains"
  on public.website_domains for select
  using (
    exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can insert their own website domains"
  on public.website_domains for insert
  with check (
    exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can update their own website domains"
  on public.website_domains for update
  using (
    exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can delete their own website domains"
  on public.website_domains for delete
  using (
    exists (
      select 1 from public.websites w
      where w.id = website_domains.website_id
        and w.user_id = auth.uid()
    )
  );

create or replace function public.set_website_primary_domain(
  p_website_id uuid,
  p_domain_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_domain text;
begin
  if not exists (
    select 1 from public.websites
    where id = p_website_id and user_id = auth.uid()
  ) then
    return false;
  end if;

  select domain into selected_domain
  from public.website_domains
  where id = p_domain_id
    and website_id = p_website_id
    and status = 'active';

  if selected_domain is null then
    return false;
  end if;

  update public.website_domains
  set is_primary = false
  where website_id = p_website_id and is_primary;

  update public.website_domains
  set is_primary = true
  where id = p_domain_id and website_id = p_website_id;

  update public.websites
  set custom_domain = selected_domain, updated_at = now()
  where id = p_website_id and user_id = auth.uid();

  return true;
end;
$$;

create or replace function public.finalize_website_domain_removal(
  p_website_id uuid,
  p_domain_id uuid
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  removed_was_primary boolean;
  replacement_id uuid;
  replacement_domain text;
begin
  if not exists (
    select 1 from public.websites
    where id = p_website_id and user_id = auth.uid()
  ) then
    return 'unauthorized';
  end if;

  select is_primary into removed_was_primary
  from public.website_domains
  where id = p_domain_id
    and website_id = p_website_id
    and status in ('removal_pending', 'removal_failed');

  if removed_was_primary is null then
    return 'not_found';
  end if;

  delete from public.website_domains
  where id = p_domain_id and website_id = p_website_id;

  if removed_was_primary then
    select id, domain into replacement_id, replacement_domain
    from public.website_domains
    where website_id = p_website_id and status = 'active'
    order by created_at asc
    limit 1;

    if replacement_id is not null then
      update public.website_domains set is_primary = true where id = replacement_id;
    end if;

    update public.websites
    set custom_domain = replacement_domain, updated_at = now()
    where id = p_website_id and user_id = auth.uid();
  end if;

  return 'removed';
end;
$$;

revoke all on function public.set_website_primary_domain(uuid, uuid) from public;
grant execute on function public.set_website_primary_domain(uuid, uuid) to authenticated;
revoke all on function public.finalize_website_domain_removal(uuid, uuid) from public;
grant execute on function public.finalize_website_domain_removal(uuid, uuid) to authenticated;
