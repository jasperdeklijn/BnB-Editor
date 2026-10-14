-- Demo content is separate from customer websites and subscription limits.
create table public.demo_websites (
  id uuid primary key,
  title text not null check (length(btrim(title)) between 1 and 200),
  slug text not null unique check (length(slug) <= 63 and slug ~ '^demo-[a-z0-9]+(-[a-z0-9]+)*$'),
  source_filename text not null check (length(source_filename) between 1 and 255 and source_filename ~* '\.json$'),
  design jsonb not null check (jsonb_typeof(design) = 'object'),
  live_design jsonb not null check (jsonb_typeof(live_design) = 'object'),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  thumbnail_url text,
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index demo_websites_created_at_idx on public.demo_websites (created_at desc, id);
alter table public.demo_websites enable row level security;

-- Only the server's admin endpoints can manage demos. Public readers get a
-- publication-only projection, never source filenames, authors or draft pages.
revoke all on public.demo_websites from public, anon, authenticated;
grant all on public.demo_websites to service_role;
grant select (title, slug, live_design, published) on public.demo_websites to anon, authenticated;
create policy demo_public_read on public.demo_websites for select to anon, authenticated using (published = true);

-- Reserve demo- for future demo names. Existing customer slugs remain valid and
-- may be updated without renaming. Both checks run inside the write transaction.
grant select (slug) on public.websites to service_role;
create function public.guard_demo_subdomain() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_table_name = 'websites' then
    if tg_op = 'UPDATE' and new.slug is not distinct from old.slug then return new; end if;
    if lower(new.slug) like 'demo-%' then
      raise exception 'Het voorvoegsel demo- is gereserveerd voor demowebsites.' using errcode = '23514';
    end if;
  elsif exists (select 1 from public.websites w where lower(w.slug) = new.slug) then
    raise exception 'Dit subdomein is al in gebruik.' using errcode = '23505';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_demo_subdomain() from public, anon, authenticated;
grant execute on function public.guard_demo_subdomain() to service_role;
create trigger websites_reserve_demo_subdomain before insert or update of slug on public.websites
  for each row execute function public.guard_demo_subdomain();
create trigger demos_check_customer_subdomain before insert or update of slug on public.demo_websites
  for each row execute function public.guard_demo_subdomain();
