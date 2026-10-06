-- Draft-page foundation. No legacy content is converted by this migration.
-- On an existing installation, run the separately reviewed, scoped cleanup first.
begin;

do $$ begin
  if exists (select 1 from public.website_sections)
    or exists (select 1 from public.websites where live_snapshot is not null) then
    raise exception 'Multipage: verwijder eerst de verouderde website-inhoud volgens docs/multipage-draft-rollout.md';
  end if;
end $$;

create table public.website_pages (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  slug text not null,
  position integer not null check (position >= 0),
  is_home boolean not null default false,
  show_in_navigation boolean not null default true,
  include_in_publication boolean not null default false,
  seo jsonb not null default '{}'::jsonb check (jsonb_typeof(seo) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, website_id),
  unique (website_id, slug),
  unique (website_id, position) deferrable initially deferred,
  check ((is_home and slug = '' and position = 0 and include_in_publication)
    or (not is_home and position > 0 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      and char_length(slug) <= 80
      and slug not in ('en','de','fr','nl','api','_next','site','preview','robots.txt','sitemap.xml')))
);
create unique index website_pages_one_home on public.website_pages(website_id) where is_home;
alter table public.website_pages enable row level security;
revoke all on public.website_pages from public, anon, authenticated;
grant select, insert, update, delete on public.website_pages to authenticated;
grant all on public.website_pages to service_role;
create policy website_pages_owner on public.website_pages for all to authenticated
  using (exists(select 1 from public.websites w where w.id = website_id and w.user_id = (select auth.uid())))
  with check (exists(select 1 from public.websites w where w.id = website_id and w.user_id = (select auth.uid())));

-- Stable identity and a mandatory Home page, also for direct Data API writes.
create or replace function public.guard_website_page() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.is_home and exists(select 1 from public.websites where id = old.website_id) then
      raise exception 'De startpagina kan niet worden verwijderd';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and (new.website_id <> old.website_id or new.id <> old.id or new.is_home <> old.is_home) then
    raise exception 'Pagina-identiteit en startpagina kunnen niet worden gewijzigd';
  end if;
  if exists(select 1 from public.website_locales where website_id = new.website_id and path_segment = new.slug) then
    raise exception 'Dit webadres is gereserveerd voor een taal';
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger guard_website_page before insert or update or delete on public.website_pages
  for each row execute function public.guard_website_page();

create or replace function public.initialize_website_home_page() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.website_pages(website_id,title,slug,position,is_home,include_in_publication)
  values(new.id,'Home','',0,true,true);
  return new;
end $$;
revoke all on function public.initialize_website_home_page() from public, anon, authenticated;
create trigger initialize_website_home_page after insert on public.websites
  for each row execute function public.initialize_website_home_page();
-- Empty website shells are initialized; their old content is never backfilled.
insert into public.website_pages(website_id,title,slug,position,is_home,include_in_publication)
select id,'Home','',0,true,true from public.websites;

alter table public.website_sections add column page_id uuid;
alter table public.website_sections add column scope text not null default 'page'
  check (scope in ('page','site_header','site_footer'));
alter table public.website_sections add constraint website_sections_page_scope
  check ((scope = 'page' and page_id is not null) or (scope <> 'page' and page_id is null));
alter table public.website_sections add constraint website_sections_page_website_fkey
  foreign key (page_id, website_id) references public.website_pages(id, website_id) on delete cascade;
create index website_sections_page_order on public.website_sections(website_id,page_id,position);
create unique index website_sections_one_shared_slot on public.website_sections(website_id,scope) where scope <> 'page';

-- New single-page imports/templates explicitly land on Home when no page is supplied.
create or replace function public.initialize_section_page() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.scope = 'page' and new.page_id is null then
    select id into new.page_id from public.website_pages where website_id = new.website_id and is_home;
  end if;
  return new;
end $$;
create trigger initialize_section_page before insert on public.website_sections
  for each row execute function public.initialize_section_page();

create or replace function public.guard_section_page_identity() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.website_id <> old.website_id or new.page_id is distinct from old.page_id or new.scope <> old.scope then
    raise exception 'Secties verplaatsen tussen pagina''s vereist een aparte verplaatsactie';
  end if;
  return new;
end $$;
create trigger guard_section_page_identity before update on public.website_sections
  for each row execute function public.guard_section_page_identity();

create or replace function public.guard_locale_page_path() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if exists(select 1 from public.website_pages where website_id=new.website_id and slug=new.path_segment) then
    raise exception 'Dit taalpad wordt al door een pagina gebruikt';
  end if;
  return new;
end $$;
create trigger guard_locale_page_path before insert or update on public.website_locales
  for each row execute function public.guard_locale_page_path();

create or replace function public.bump_page_draft_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.websites set draft_version = gen_random_uuid()
    where id = case when tg_op = 'DELETE' then old.website_id else new.website_id end;
  return null;
end $$;
revoke all on function public.bump_page_draft_version() from public, anon, authenticated;
create trigger bump_page_draft_version after insert or update or delete on public.website_pages
  for each row execute function public.bump_page_draft_version();

create or replace function public.save_website_page(
  p_website_id uuid, p_page_id uuid, p_title text, p_slug text,
  p_show_in_navigation boolean, p_include_in_publication boolean
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare result public.website_pages;
begin
  perform 1 from public.websites where id = p_website_id and user_id = auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  if p_page_id is null then
    insert into public.website_pages(website_id,title,slug,position,show_in_navigation,include_in_publication)
    values(p_website_id,btrim(p_title),lower(btrim(p_slug)),
      (select coalesce(max(position),0)+1 from public.website_pages where website_id=p_website_id),
      p_show_in_navigation,p_include_in_publication) returning * into result;
  else
    update public.website_pages set title=btrim(p_title),slug=case when is_home then '' else lower(btrim(p_slug)) end,
      show_in_navigation=p_show_in_navigation,
      include_in_publication=case when is_home then true else p_include_in_publication end
    where id=p_page_id and website_id=p_website_id returning * into result;
    if not found then raise exception 'Pagina niet gevonden'; end if;
  end if;
  return to_jsonb(result);
end $$;

create or replace function public.reorder_website_pages(p_website_id uuid,p_page_ids uuid[])
returns void language plpgsql security invoker set search_path = public as $$
begin
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  if p_page_ids is null or cardinality(p_page_ids) <> (select count(*) from public.website_pages where website_id=p_website_id)
    or cardinality(p_page_ids) <> (select count(distinct id) from unnest(p_page_ids) id)
    or exists(select 1 from unnest(p_page_ids) as input(id) where not exists(select 1 from public.website_pages p where p.id=input.id and p.website_id=p_website_id))
    or not exists(select 1 from public.website_pages where id=p_page_ids[1] and website_id=p_website_id and is_home) then
    raise exception 'Ongeldige paginavolgorde';
  end if;
  update public.website_pages p set position=ordered.pos-1
    from unnest(p_page_ids) with ordinality as ordered(id,pos) where p.id=ordered.id and p.website_id=p_website_id;
end $$;

create or replace function public.delete_website_page(p_website_id uuid,p_page_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  delete from public.website_pages where id=p_page_id and website_id=p_website_id;
  if not found then raise exception 'Pagina niet gevonden'; end if;
  update public.website_pages p set position=ordered.pos-1 from (
    select id,row_number() over(order by position,id) as pos from public.website_pages where website_id=p_website_id
  ) ordered where p.id=ordered.id;
end $$;

revoke all on function public.save_website_page(uuid,uuid,text,text,boolean,boolean),
  public.reorder_website_pages(uuid,uuid[]),public.delete_website_page(uuid,uuid) from public, anon;
grant execute on function public.save_website_page(uuid,uuid,text,text,boolean,boolean),
  public.reorder_website_pages(uuid,uuid[]),public.delete_website_page(uuid,uuid) to authenticated;
create or replace function public.reorder_page_sections(p_website_id uuid,p_page_id uuid,p_section_ids uuid[])
returns void language plpgsql security invoker set search_path = public as $$
begin
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  if not exists(select 1 from public.website_pages where id=p_page_id and website_id=p_website_id)
    or p_section_ids is null
    or cardinality(p_section_ids) <> (select count(*) from public.website_sections where website_id=p_website_id and page_id=p_page_id)
    or cardinality(p_section_ids) <> (select count(distinct id) from unnest(p_section_ids) id)
    or exists(select 1 from unnest(p_section_ids) as input(id) where not exists(select 1 from public.website_sections s where s.id=input.id and s.website_id=p_website_id and s.page_id=p_page_id)) then
    raise exception 'Ongeldige sectievolgorde';
  end if;
  update public.website_sections s set position=ordered.pos
    from unnest(p_section_ids) with ordinality as ordered(id,pos) where s.id=ordered.id and s.page_id=p_page_id;
end $$;
revoke all on function public.reorder_page_sections(uuid,uuid,uuid[]) from public,anon;
grant execute on function public.reorder_page_sections(uuid,uuid,uuid[]) to authenticated;

create or replace function public.guard_page_transition() returns trigger
language plpgsql security invoker set search_path = public as $$
declare source_page uuid; target_page uuid;
begin
  select page_id into source_page from public.website_sections where id=new.from_section_id and website_id=new.website_id;
  select page_id into target_page from public.website_sections where id=new.to_section_id and website_id=new.website_id;
  if source_page is null or target_page is null or source_page <> target_page then
    raise exception 'Een overgang moet tussen secties op dezelfde pagina staan';
  end if;
  return new;
end $$;
create trigger guard_page_transition before insert or update on public.section_transitions
  for each row execute function public.guard_page_transition();
-- Persist one page's structural edit atomically. Existing content stays under
-- the editor save queue; new sections receive stable database IDs in this call.
create or replace function public.save_page_structure(p_website_id uuid,p_page_id uuid,p_sections jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare item jsonb; section_id uuid; ids uuid[] := '{}'; mapping jsonb := '{}'; pos integer := 0;
begin
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  if not exists(select 1 from public.website_pages where id=p_page_id and website_id=p_website_id) then
    raise exception 'Pagina niet gevonden';
  end if;
  if jsonb_typeof(p_sections) is distinct from 'array' or jsonb_array_length(p_sections) > 100 then
    raise exception 'Ongeldige secties';
  end if;
  if exists(select 1 from jsonb_array_elements(p_sections) v group by v->>'id' having count(*)>1) then
    raise exception 'Dubbele sectie-identiteit';
  end if;
  for item in select value from jsonb_array_elements(p_sections) loop
    pos := pos+1;
    if item->>'id' like 'section-%' then
      -- A retry after a lost response must retain the same section identity.
      section_id := md5(p_website_id::text || ':' || p_page_id::text || ':' || (item->>'id'))::uuid;
      insert into public.website_sections(id,website_id,page_id,scope,position,type,content,styles)
        values(section_id,p_website_id,p_page_id,'page',pos,item->>'type',coalesce(item->'data','{}'),coalesce(item->'styles','{}'))
        on conflict(id) do update set position=excluded.position,type=excluded.type,content=excluded.content,styles=excluded.styles
          where website_sections.website_id=excluded.website_id and website_sections.page_id=excluded.page_id and website_sections.scope='page'
        returning id into section_id;
      if not found then raise exception 'Sectie-identiteit hoort bij een andere pagina'; end if;
      mapping := mapping || jsonb_build_object(item->>'id',section_id);
    else
      section_id := (item->>'id')::uuid;
      update public.website_sections set position=pos
        where id=section_id and website_id=p_website_id and page_id=p_page_id and scope='page';
      if not found then raise exception 'Sectie hoort niet bij deze pagina'; end if;
    end if;
    if section_id is null then raise exception 'Sectie-identiteit ontbreekt'; end if;
    ids := array_append(ids,section_id);
  end loop;
  delete from public.website_sections where website_id=p_website_id and page_id=p_page_id and not(id=any(ids));
  return mapping;
end $$;
revoke all on function public.save_page_structure(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_page_structure(uuid,uuid,jsonb) to authenticated;
-- Guard existing single-page template transactions during the draft-only phase.
create or replace function public.apply_template_transaction(
  p_website_id uuid,
  p_business_id uuid,
  p_applied_template_id text,
  p_business_defaults jsonb,
  p_sections jsonb,
  p_services jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  section_count integer;
  service_count integer;
begin
  -- Serialize with page creation/deletion and protect the multipage draft until
  -- template/checkpoint contracts support pages explicitly.
  perform 1 from public.websites where id=p_website_id for update;
  if (select count(*) from public.website_pages where website_id=p_website_id) <> 1 then
    raise exception 'Templates en herstelpunten voor meerdere pagina''s volgen later';
  end if;
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if not exists (select 1 from public.websites where id = p_website_id and user_id = auth.uid()) then
    raise exception 'Website not found';
  end if;
  if not exists (select 1 from public.businesses where id = p_business_id and user_id = auth.uid()) then
    raise exception 'Business not found';
  end if;
  if jsonb_typeof(p_sections) <> 'array' or jsonb_array_length(p_sections) > 100 then
    raise exception 'Invalid template sections';
  end if;
  if jsonb_typeof(p_services) <> 'array' or jsonb_array_length(p_services) > 250 then
    raise exception 'Invalid template services';
  end if;

  perform 1 from public.websites where id = p_website_id for update;
  perform 1 from public.businesses where id = p_business_id for update;

  update public.businesses
  set name = coalesce(p_business_defaults->>'name', name),
      tagline = coalesce(p_business_defaults->>'tagline', tagline),
      description = coalesce(p_business_defaults->>'description', description),
      phone = coalesce(p_business_defaults->>'phone', phone),
      email = coalesce(p_business_defaults->>'email', email),
      category = coalesce(p_business_defaults->>'category', category)
  where id = p_business_id and user_id = auth.uid();

  update public.websites
  set business_id = p_business_id, applied_template_id = p_applied_template_id, updated_at = now()
  where id = p_website_id and user_id = auth.uid();

  delete from public.website_sections where website_id = p_website_id;
  insert into public.website_sections (website_id, type, content, styles, position)
  select p_website_id, item->>'type', coalesce(item->'data', '{}'::jsonb),
         coalesce(item->'styles', '{}'::jsonb), ordinality::integer
  from jsonb_array_elements(p_sections) with ordinality as section_item(item, ordinality);
  get diagnostics section_count = row_count;

  delete from public.services where business_id = p_business_id;
  insert into public.services (
    business_id, title, description, price, duration, capacity,
    image_urls, tags, position, is_featured
  )
  select p_business_id, coalesce(item->>'title', ''), coalesce(item->>'description', ''),
         coalesce(item->>'price', ''), coalesce(item->>'duration', ''),
         nullif(item->>'capacity', '')::integer,
         coalesce(item->'image_urls', '[]'::jsonb), coalesce(item->'tags', '[]'::jsonb),
         coalesce((item->>'position')::integer, ordinality::integer - 1),
         coalesce((item->>'is_featured')::boolean, false)
  from jsonb_array_elements(p_services) with ordinality as service_item(item, ordinality);
  get diagnostics service_count = row_count;

  return jsonb_build_object('sectionsCount', section_count, 'servicesCount', service_count);
end;
$$;

create or replace function public.restore_template_transaction(
  p_website_id uuid,
  p_business_id uuid,
  p_checkpoint jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  section_count integer;
  service_count integer;
begin
  -- Serialize with page creation/deletion and protect the multipage draft until
  -- template/checkpoint contracts support pages explicitly.
  perform 1 from public.websites where id=p_website_id for update;
  if (select count(*) from public.website_pages where website_id=p_website_id) <> 1 then
    raise exception 'Templates en herstelpunten voor meerdere pagina''s volgen later';
  end if;
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if not exists (select 1 from public.websites where id = p_website_id and user_id = auth.uid()) then
    raise exception 'Website not found';
  end if;
  if p_business_id is not null and not exists (
    select 1 from public.businesses where id = p_business_id and user_id = auth.uid()
  ) then raise exception 'Business not found'; end if;
  if jsonb_typeof(coalesce(p_checkpoint->'sections', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_checkpoint->'sections', '[]'::jsonb)) > 100
     or jsonb_array_length(coalesce(p_checkpoint->'services', '[]'::jsonb)) > 250 then
    raise exception 'Invalid restore point';
  end if;

  perform 1 from public.websites where id = p_website_id for update;
  update public.websites set business_id = p_business_id, updated_at = now()
  where id = p_website_id and user_id = auth.uid();

  delete from public.website_sections where website_id = p_website_id;
  insert into public.website_sections (id, website_id, type, content, styles, position)
  select (item->>'id')::uuid, p_website_id, item->>'type',
         coalesce(item->'content', '{}'::jsonb), coalesce(item->'styles', '{}'::jsonb),
         (item->>'position')::integer
  from jsonb_array_elements(coalesce(p_checkpoint->'sections', '[]'::jsonb)) item;
  get diagnostics section_count = row_count;

  insert into public.section_transitions (website_id, from_section_id, to_section_id, transition)
  select p_website_id, (item->>'from_section_id')::uuid, (item->>'to_section_id')::uuid,
         nullif(item->'transition', 'null'::jsonb)
  from jsonb_array_elements(coalesce(p_checkpoint->'transitions', '[]'::jsonb)) item
  where exists (select 1 from public.website_sections where id = (item->>'from_section_id')::uuid and website_id = p_website_id)
    and exists (select 1 from public.website_sections where id = (item->>'to_section_id')::uuid and website_id = p_website_id);

  if p_business_id is not null then
    delete from public.services where business_id = p_business_id;
    insert into public.services (
      id, business_id, title, description, price, duration, capacity,
      image_urls, tags, position, is_featured
    )
    select (item->>'id')::uuid, p_business_id, coalesce(item->>'title', ''),
           coalesce(item->>'description', ''), coalesce(item->>'price', ''),
           coalesce(item->>'duration', ''), nullif(item->>'capacity', '')::integer,
           coalesce(item->'image_urls', '[]'::jsonb), coalesce(item->'tags', '[]'::jsonb),
           coalesce((item->>'position')::integer, 0), coalesce((item->>'is_featured')::boolean, false)
    from jsonb_array_elements(coalesce(p_checkpoint->'services', '[]'::jsonb)) item;
    get diagnostics service_count = row_count;
  else
    service_count := 0;
  end if;

  insert into public.website_locales (website_id, locale, path_segment, display_name, is_default, is_enabled, seo)
  select p_website_id, item->>'locale', item->>'path_segment', item->>'display_name',
         coalesce((item->>'is_default')::boolean, false), coalesce((item->>'is_enabled')::boolean, false),
         coalesce(item->'seo', '{}'::jsonb)
  from jsonb_array_elements(coalesce(p_checkpoint->'locales', '[]'::jsonb)) item
  on conflict (website_id, locale) do update set
    path_segment = excluded.path_segment, display_name = excluded.display_name,
    is_default = excluded.is_default, is_enabled = excluded.is_enabled, seo = excluded.seo;

  insert into public.website_section_translations (website_id, section_id, locale, values, source_hash)
  select p_website_id, (item->>'section_id')::uuid, item->>'locale',
         coalesce(item->'values', '{}'::jsonb), coalesce(item->>'source_hash', '')
  from jsonb_array_elements(coalesce(p_checkpoint->'sectionTranslations', '[]'::jsonb)) item
  on conflict (section_id, locale) do update set values = excluded.values, source_hash = excluded.source_hash;

  if p_business_id is not null then
    insert into public.business_translations (business_id, locale, name, description, opening_note, source_hash)
    select p_business_id, item->>'locale', coalesce(item->>'name', ''),
           coalesce(item->>'description', ''), coalesce(item->>'opening_note', ''), coalesce(item->>'source_hash', '')
    from jsonb_array_elements(coalesce(p_checkpoint->'businessTranslations', '[]'::jsonb)) item
    on conflict (business_id, locale) do update set
      name = excluded.name, description = excluded.description,
      opening_note = excluded.opening_note, source_hash = excluded.source_hash;

    insert into public.service_translations (service_id, locale, title, description, source_hash)
    select (item->>'service_id')::uuid, item->>'locale', coalesce(item->>'title', ''),
           coalesce(item->>'description', ''), coalesce(item->>'source_hash', '')
    from jsonb_array_elements(coalesce(p_checkpoint->'serviceTranslations', '[]'::jsonb)) item
    on conflict (service_id, locale) do update set
      title = excluded.title, description = excluded.description, source_hash = excluded.source_hash;
  end if;

  return jsonb_build_object('sectionsCount', section_count, 'servicesCount', service_count);
end;
$$;
commit;
