-- Complete page operations and immutable publication data. No hosted cleanup.
begin;

-- Keep Home deletion explicit even though completeness is also checked at commit.
create or replace function public.delete_website_page(p_website_id uuid,p_page_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
begin
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  if exists(select 1 from public.website_pages where id=p_page_id and website_id=p_website_id and is_home) then raise exception 'De startpagina kan niet worden verwijderd'; end if;
  delete from public.website_pages where id=p_page_id and website_id=p_website_id;
  if not found then raise exception 'Pagina niet gevonden'; end if;
  update public.website_pages p set position=ordered.pos-1 from (select id,row_number() over(order by position,id) pos from public.website_pages where website_id=p_website_id) ordered where p.id=ordered.id;
end $$;

create table public.website_page_translations (
  website_id uuid not null references public.websites(id) on delete cascade,
  page_id uuid not null,
  locale text not null,
  title text not null check(char_length(btrim(title)) between 1 and 80),
  navigation_label text not null default '' check(char_length(navigation_label)<=80),
  seo jsonb not null default '{}' check(jsonb_typeof(seo)='object'),
  source_hash text,
  primary key(page_id,locale),
  foreign key(page_id,website_id) references public.website_pages(id,website_id) on delete cascade,
  foreign key(website_id,locale) references public.website_locales(website_id,locale) on delete cascade
);
create index website_page_translations_website on public.website_page_translations(website_id);
create table public.website_page_redirects (
  website_id uuid not null references public.websites(id) on delete cascade,
  from_slug text not null check(from_slug='' or from_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  to_page_id uuid not null,
  primary key(website_id,from_slug),
  foreign key(to_page_id,website_id) references public.website_pages(id,website_id) on delete cascade
);
create index website_page_redirects_target on public.website_page_redirects(to_page_id,website_id);
alter table public.website_page_translations enable row level security;
alter table public.website_page_redirects enable row level security;
revoke all on public.website_page_translations,public.website_page_redirects from public,anon,authenticated;
grant select,insert,update,delete on public.website_page_translations,public.website_page_redirects to authenticated;
grant all on public.website_page_translations,public.website_page_redirects to service_role;
create policy page_translations_owner on public.website_page_translations for all to authenticated
using(exists(select 1 from public.websites where id=website_id and user_id=(select auth.uid())))
with check(exists(select 1 from public.websites where id=website_id and user_id=(select auth.uid())));
create policy page_redirects_owner on public.website_page_redirects for all to authenticated
using(exists(select 1 from public.websites where id=website_id and user_id=(select auth.uid())))
with check(exists(select 1 from public.websites where id=website_id and user_id=(select auth.uid())));
create trigger page_translations_revision after insert or update or delete on public.website_page_translations
for each row execute function public.bump_page_draft_version();
create trigger page_redirects_revision after insert or update or delete on public.website_page_redirects
for each row execute function public.bump_page_draft_version();

-- Deferred completeness allows a transactional Home swap without a bypass flag.
create or replace function public.guard_website_page() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
  if tg_op='DELETE' then return old; end if;
  if tg_op='UPDATE' and (new.website_id<>old.website_id or new.id<>old.id) then raise exception 'Pagina-identiteit kan niet worden gewijzigd'; end if;
  if exists(select 1 from public.website_locales where website_id=new.website_id and path_segment=new.slug) then raise exception 'Dit webadres is gereserveerd voor een taal'; end if;
  new.updated_at=now(); return new;
end $$;
create or replace function public.require_website_home() returns trigger
language plpgsql security invoker set search_path=public as $$
declare site uuid := case when tg_op='DELETE' then old.website_id else new.website_id end;
begin
  if exists(select 1 from public.websites where id=site) and (select count(*) from public.website_pages where website_id=site and is_home)<>1 then
    raise exception 'Elke website moet precies één startpagina hebben';
  end if; return null;
end $$;
create constraint trigger require_website_home after insert or update or delete on public.website_pages
deferrable initially deferred for each row execute function public.require_website_home();
alter table public.website_sections add constraint shared_section_type
check(scope='page' or (scope='site_header' and type='nav') or (scope='site_footer' and type='footer'));

-- Rewrite only complete reference strings, never substrings in customer copy.
create or replace function public.remap_design_references(value jsonb, mapping jsonb) returns jsonb
language plpgsql immutable set search_path=public as $$
declare result jsonb; entry record; str text;
begin
  if jsonb_typeof(value)='string' then
    str=value#>>'{}'; return coalesce(mapping->str,value);
  elsif jsonb_typeof(value)='array' then
    select coalesce(jsonb_agg(public.remap_design_references(v,mapping)),'[]') into result from jsonb_array_elements(value) v;
    return result;
  elsif jsonb_typeof(value)='object' then
    result='{}'; for entry in select * from jsonb_each(value) loop
      result=result||jsonb_build_object(entry.key,public.remap_design_references(entry.value,mapping));
    end loop; return result;
  end if; return value;
end $$;

create or replace function public.guard_section_page_identity() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
  if new.website_id<>old.website_id or new.id<>old.id then raise exception 'Sectie-identiteit kan niet worden gewijzigd'; end if;
  if new.page_id is distinct from old.page_id or new.scope<>old.scope then
    perform 1 from public.websites where id=new.website_id and (user_id=auth.uid() or current_user='service_role') for update;
    if not found then raise exception 'Website niet gevonden'; end if;
    delete from public.section_transitions where website_id=new.website_id and (from_section_id=old.id or to_section_id=old.id);
  end if; return new;
end $$;

create or replace function public.guard_shared_shell() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
  if new.type in ('nav','footer') then
    perform 1 from public.websites where id=new.website_id for update;
    if exists(select 1 from public.website_sections s where s.website_id=new.website_id and s.id<>new.id
      and s.type=new.type and ((new.scope='page' and s.scope<>'page') or (new.scope<>'page' and s.scope='page'))) then
      raise exception 'Gebruik de gedeelde header of footer; een lokaal onderdeel van dit type kan niet tegelijk bestaan';
    end if;
  end if;
  return new;
end $$;
create trigger guard_shared_shell before insert or update on public.website_sections for each row execute function public.guard_shared_shell();

create or replace function public.duplicate_website_page(p_website_id uuid,p_page_id uuid,p_title text,p_slug text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare source public.website_pages; dest public.website_pages; section public.website_sections; mapping jsonb:='{}'; new_id uuid;
begin
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  select * into source from public.website_pages where id=p_page_id and website_id=p_website_id;
  if not found then raise exception 'Pagina niet gevonden'; end if;
  insert into public.website_pages(website_id,title,slug,position,show_in_navigation,seo)
  values(p_website_id,btrim(p_title),lower(btrim(p_slug)),(select max(position)+1 from public.website_pages where website_id=p_website_id),source.show_in_navigation,source.seo) returning * into dest;
  mapping=jsonb_build_object('page:'||source.id,'page:'||dest.id);
  for section in select * from public.website_sections where website_id=p_website_id and page_id=p_page_id loop
    new_id=gen_random_uuid();
    mapping=mapping||jsonb_build_object(section.id::text,new_id::text,'#section-'||section.id,'#section-'||new_id,
      'section:'||source.id||':'||section.id,'section:'||dest.id||':'||new_id);
  end loop;
  insert into public.website_sections(id,website_id,page_id,scope,type,position,content,styles)
  select (mapping->>id::text)::uuid,website_id,dest.id,'page',type,position,public.remap_design_references(content,mapping),styles
  from public.website_sections where website_id=p_website_id and page_id=p_page_id;
  insert into public.website_section_translations(website_id,section_id,locale,values,source_hash)
  select website_id,(mapping->>section_id::text)::uuid,locale,public.remap_design_references(values,mapping),null
  from public.website_section_translations where website_id=p_website_id and mapping ? section_id::text;
  insert into public.section_transitions(website_id,from_section_id,to_section_id,transition)
  select website_id,(mapping->>from_section_id::text)::uuid,(mapping->>to_section_id::text)::uuid,transition
  from public.section_transitions where website_id=p_website_id and mapping ? from_section_id::text and mapping ? to_section_id::text;
  insert into public.website_page_translations(website_id,page_id,locale,title,navigation_label,seo,source_hash)
  select website_id,dest.id,locale,title,navigation_label,seo,null from public.website_page_translations where page_id=p_page_id;
  return to_jsonb(dest);
end $$;

create or replace function public.replace_website_home(p_website_id uuid,p_page_id uuid,p_old_home_slug text)
returns void language plpgsql security invoker set search_path=public as $$
declare old_home public.website_pages; target public.website_pages;
begin
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  select * into old_home from public.website_pages where website_id=p_website_id and is_home;
  select * into target from public.website_pages where website_id=p_website_id and id=p_page_id and not is_home;
  if not found then raise exception 'Kies een andere pagina als startpagina'; end if;
  update public.website_pages set is_home=false,slug=lower(btrim(p_old_home_slug)),position=target.position where id=old_home.id;
  update public.website_pages set is_home=true,slug='',position=0,include_in_publication=true where id=target.id;
  -- Root has a new intentional destination; it cannot also be a redirect.
  delete from public.website_page_redirects where website_id=p_website_id and from_slug='';
end $$;

create or replace function public.move_website_section(p_website_id uuid,p_section_id uuid,p_page_id uuid,p_scope text default 'page')
returns void language plpgsql security invoker set search_path=public as $$
declare source public.website_sections; mapping jsonb:='{}';
begin
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  select * into source from public.website_sections where id=p_section_id and website_id=p_website_id;
  if not found then raise exception 'Sectie niet gevonden'; end if;
  if p_scope='page' and not exists(select 1 from public.website_pages where id=p_page_id and website_id=p_website_id) then raise exception 'Pagina niet gevonden'; end if;
  if p_scope not in ('page','site_header','site_footer') or
    (p_scope='site_header' and source.type<>'nav') or (p_scope='site_footer' and source.type<>'footer') then
    raise exception 'Ongeldig gedeeld onderdeel';
  end if;
  -- Slot replacement and conversion are one transaction. A failed conversion restores the old slot.
  if p_scope<>'page' then
    delete from public.website_sections where website_id=p_website_id and (scope=p_scope or (scope='page' and type=source.type)) and id<>p_section_id;
  end if;
  if p_scope='page' and source.page_id is not null then
    mapping=jsonb_build_object('section:'||source.page_id||':'||source.id,'section:'||p_page_id||':'||source.id,
      '#section-'||source.id,'section:'||p_page_id||':'||source.id);
    -- A local anchor inside the moved section now belongs to its destination.
    update public.website_sections set content=public.remap_design_references(content,mapping) where website_id=p_website_id;
  end if;
  update public.website_sections set page_id=case when p_scope='page' then p_page_id else null end,scope=p_scope,
    position=case when p_scope='page' then (select coalesce(max(position),0)+1 from public.website_sections where website_id=p_website_id and page_id=p_page_id) else 0 end
  where id=p_section_id;
end $$;

create or replace function public.create_shared_website_section(p_website_id uuid,p_type text,p_content jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare section_id uuid:=gen_random_uuid(); slot text;
begin
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  if p_type not in ('nav','footer') or jsonb_typeof(p_content) is distinct from 'object' then raise exception 'Ongeldig gedeeld onderdeel'; end if;
  slot:=case when p_type='nav' then 'site_header' else 'site_footer' end;
  delete from public.website_sections where website_id=p_website_id and (scope=slot or (scope='page' and type=p_type));
  insert into public.website_sections(id,website_id,page_id,scope,type,position,content) values(section_id,p_website_id,null,slot,p_type,0,p_content);
  return section_id;
end $$;
revoke all on function public.create_shared_website_section(uuid,text,jsonb) from public,anon;
grant execute on function public.create_shared_website_section(uuid,text,jsonb) to authenticated;

create or replace function public.capture_page_redirect() returns trigger
language plpgsql security invoker set search_path=public as $$
declare published_slug text;
begin
  if new.slug is distinct from old.slug then
    select p->>'slug' into published_slug from public.websites w,
      lateral jsonb_array_elements(coalesce(w.live_snapshot->'pages','[]')) p
      where w.id=new.website_id and p->>'id'=new.id::text;
    if published_slug is not null and published_slug<>new.slug then
      insert into public.website_page_redirects(website_id,from_slug,to_page_id) values(new.website_id,published_slug,new.id)
      on conflict(website_id,from_slug) do update set to_page_id=excluded.to_page_id;
    end if;
  end if; return null;
end $$;
create trigger capture_page_redirect after update on public.website_pages for each row execute function public.capture_page_redirect();

revoke all on function public.duplicate_website_page(uuid,uuid,text,text),public.replace_website_home(uuid,uuid,text),
public.move_website_section(uuid,uuid,uuid,text) from public,anon;
grant execute on function public.duplicate_website_page(uuid,uuid,text,text),public.replace_website_home(uuid,uuid,text),
public.move_website_section(uuid,uuid,uuid,text) to authenticated;
create or replace function public.apply_page_template(p_website_id uuid,p_page_id uuid,p_sections jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare checkpoint jsonb; mapping jsonb;
begin
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  if not exists(select 1 from public.website_pages where id=p_page_id and website_id=p_website_id) then raise exception 'Pagina niet gevonden'; end if;
  select jsonb_build_object('version',3,'scope','page','websiteId',p_website_id,'pageId',p_page_id,
    'sections',coalesce((select jsonb_agg(to_jsonb(s)) from public.website_sections s where website_id=p_website_id and page_id=p_page_id),'[]'),
    'transitions',coalesce((select jsonb_agg(to_jsonb(t)) from public.section_transitions t where website_id=p_website_id and from_section_id in(select id from public.website_sections where page_id=p_page_id)),'[]'),
    'sectionTranslations',coalesce((select jsonb_agg(to_jsonb(t)) from public.website_section_translations t where website_id=p_website_id and section_id in(select id from public.website_sections where page_id=p_page_id)),'[]')) into checkpoint;
  mapping=public.save_page_structure(p_website_id,p_page_id,p_sections);
  return checkpoint;
end $$;

create or replace function public.restore_page_checkpoint(p_website_id uuid,p_page_id uuid,p_checkpoint jsonb)
returns void language plpgsql security invoker set search_path=public as $$
begin
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then raise exception 'Website niet gevonden'; end if;
  if p_checkpoint->>'version' is distinct from '3' or p_checkpoint->>'scope' is distinct from 'page'
    or p_checkpoint->>'websiteId' is distinct from p_website_id::text or p_checkpoint->>'pageId' is distinct from p_page_id::text
    or not exists(select 1 from public.website_pages where id=p_page_id and website_id=p_website_id)
    or jsonb_typeof(p_checkpoint->'sections') is distinct from 'array' or jsonb_array_length(p_checkpoint->'sections')>100 then raise exception 'Ongeldig herstelpunt'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(p_checkpoint->'transitions','[]')) t where
    not exists(select 1 from jsonb_array_elements(p_checkpoint->'sections') s where s->>'id'=t->>'from_section_id')
    or not exists(select 1 from jsonb_array_elements(p_checkpoint->'sections') s where s->>'id'=t->>'to_section_id'))
    or exists(select 1 from jsonb_array_elements(coalesce(p_checkpoint->'sectionTranslations','[]')) t where
      not exists(select 1 from jsonb_array_elements(p_checkpoint->'sections') s where s->>'id'=t->>'section_id')) then raise exception 'Herstelpunt bevat verwijzingen buiten deze pagina'; end if;
  delete from public.website_sections where website_id=p_website_id and page_id=p_page_id;
  insert into public.website_sections(id,website_id,page_id,scope,type,position,content,styles)
  select (s->>'id')::uuid,p_website_id,p_page_id,'page',s->>'type',(s->>'position')::integer,coalesce(s->'content','{}'),coalesce(s->'styles','{}') from jsonb_array_elements(p_checkpoint->'sections') s;
  insert into public.section_transitions(website_id,from_section_id,to_section_id,transition)
  select p_website_id,(t->>'from_section_id')::uuid,(t->>'to_section_id')::uuid,t->'transition' from jsonb_array_elements(coalesce(p_checkpoint->'transitions','[]')) t;
  insert into public.website_section_translations(website_id,section_id,locale,values,source_hash)
  select p_website_id,(t->>'section_id')::uuid,t->>'locale',t->'values',t->>'source_hash' from jsonb_array_elements(coalesce(p_checkpoint->'sectionTranslations','[]')) t;
end $$;
revoke all on function public.apply_page_template(uuid,uuid,jsonb),public.restore_page_checkpoint(uuid,uuid,jsonb) from public,anon;
grant execute on function public.apply_page_template(uuid,uuid,jsonb),public.restore_page_checkpoint(uuid,uuid,jsonb) to authenticated;
-- Called inside the existing import transactions; all copied targets use fresh IDs.
create or replace function public.assign_imported_pages(p_design_id uuid,p_pages jsonb,p_sections jsonb)
returns void language plpgsql security invoker set search_path=public as $$
declare home_id uuid; input_home uuid; page jsonb; section jsonb; mapping jsonb:='{}';
begin
  if not exists(select 1 from public.websites where id=p_design_id and (user_id=auth.uid() or current_user='service_role')) then raise exception 'Website niet gevonden'; end if;
  if jsonb_typeof(p_pages) is distinct from 'array' or jsonb_array_length(p_pages) not between 1 and 40
    or (select count(*) from jsonb_array_elements(p_pages) p where (p->>'isHome')::boolean)<>1 then raise exception 'Ongeldige pagina-import'; end if;
  select id into home_id from public.website_pages where website_id=p_design_id and is_home;
  for page in select value from jsonb_array_elements(p_pages) loop
    if (page->>'isHome')::boolean then
      input_home=(page->>'id')::uuid;
      update public.website_pages set title=page->>'title',show_in_navigation=coalesce((page->>'showInNavigation')::boolean,true) where id=home_id;
    else
      insert into public.website_pages(id,website_id,title,slug,position,show_in_navigation,include_in_publication)
      values((page->>'id')::uuid,p_design_id,page->>'title',page->>'slug',(select max(position)+1 from public.website_pages where website_id=p_design_id),
        coalesce((page->>'showInNavigation')::boolean,true),coalesce((page->>'includeInPublication')::boolean,false));
    end if;
  end loop;
  mapping=jsonb_build_object('page:'||input_home,'page:'||home_id);
  for section in select value from jsonb_array_elements(p_sections) loop
    if section->>'pageId'=input_home::text then
      mapping=mapping||jsonb_build_object('section:'||input_home||':'||(section->>'id'),'section:'||home_id||':'||(section->>'id'));
    end if;
  end loop;
  for section in select value from jsonb_array_elements(p_sections) loop
    update public.website_sections set scope=coalesce(section->>'scope','page'),
      page_id=case when coalesce(section->>'scope','page')<>'page' then null when section->>'pageId'=input_home::text then home_id else (section->>'pageId')::uuid end,
      content=public.remap_design_references(content,mapping)
    where website_id=p_design_id and id=(section->>'id')::uuid;
  end loop;
end $$;
revoke all on function public.assign_imported_pages(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.assign_imported_pages(uuid,jsonb,jsonb) to authenticated,service_role;

create or replace function public.create_multipage_imported_design(p_design_id uuid,p_title text,p_theme jsonb,p_sections jsonb,p_assets jsonb,p_pages jsonb)
returns void language plpgsql security invoker set search_path=public as $$
begin
  perform public.create_imported_design(p_design_id,p_title,p_theme,p_sections,p_assets);
  perform public.assign_imported_pages(p_design_id,p_pages,p_sections);
end $$;
create or replace function public.create_multipage_transfer_design(p_design_id uuid,p_title text,p_theme jsonb,p_sections jsonb,p_assets jsonb,p_pages jsonb,p_request_id uuid,p_revision integer)
returns void language plpgsql security invoker set search_path=public as $$
begin
  perform public.create_transfer_design(p_design_id,p_title,p_theme,p_sections,p_assets,p_request_id,p_revision);
  perform public.assign_imported_pages(p_design_id,p_pages,p_sections);
end $$;
revoke all on function public.create_multipage_imported_design(uuid,text,jsonb,jsonb,jsonb,jsonb),public.create_multipage_transfer_design(uuid,text,jsonb,jsonb,jsonb,jsonb,uuid,integer) from public,anon,authenticated;
grant execute on function public.create_multipage_imported_design(uuid,text,jsonb,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.create_multipage_transfer_design(uuid,text,jsonb,jsonb,jsonb,jsonb,uuid,integer) to service_role;
create or replace function public.save_website_page(p_website_id uuid,p_page_id uuid,p_title text,p_slug text,p_show_in_navigation boolean,p_include_in_publication boolean,p_seo jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb;
begin
  result=public.save_website_page(p_website_id,p_page_id,p_title,p_slug,p_show_in_navigation,p_include_in_publication);
  update public.website_pages set seo=coalesce(p_seo,'{}') where id=(result->>'id')::uuid returning to_jsonb(website_pages.*) into result;
  return result;
end $$;
revoke all on function public.save_website_page(uuid,uuid,text,text,boolean,boolean,jsonb) from public,anon;
grant execute on function public.save_website_page(uuid,uuid,text,text,boolean,boolean,jsonb) to authenticated;

create or replace function public.create_imported_design(
  p_design_id uuid, p_title text, p_theme jsonb, p_sections jsonb, p_assets jsonb
) returns uuid
language plpgsql security invoker set search_path = public
as $$
declare
  owner_id uuid := auth.uid();
  business_id_value uuid;
  item jsonb;
  ordinal bigint;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_design_id is null or length(btrim(p_title)) not between 1 and 200
    or jsonb_typeof(p_sections) is distinct from 'array'
    or jsonb_array_length(p_sections) not between 1 and 40
    or jsonb_typeof(p_assets) is distinct from 'array'
    or jsonb_array_length(p_assets) > 8
    or jsonb_typeof(p_theme) is distinct from 'object' then
    raise exception 'Invalid design';
  end if;
  -- Serialize repeated/concurrent confirmations without adding an import record.
  perform pg_advisory_xact_lock(hashtextextended(p_design_id::text, 0));
  if exists (select 1 from public.websites where id = p_design_id and user_id = owner_id) then
    raise exception 'Design already exists' using errcode = '23505';
  end if;
  select id into business_id_value from public.businesses where user_id = owner_id order by created_at limit 1;
  insert into public.websites(id, user_id, business_id, title, slug, theme_config, published, live_snapshot, custom_domain)
    values (p_design_id, owner_id, business_id_value, btrim(p_title), 'site-' || p_design_id::text, p_theme, false, null, null);
  for item, ordinal in select value, ordinality from jsonb_array_elements(p_sections) with ordinality loop
    if item->>'type' not in ('nav','hero','about','gallery','features','faq','cta','footer')
      or jsonb_typeof(item->'data') is distinct from 'object'
      or jsonb_typeof(item->'styles') is distinct from 'object' then raise exception 'Invalid section'; end if;
    insert into public.website_sections(id, website_id, position, type, content, styles)
      values ((item->>'id')::uuid, p_design_id, ordinal, item->>'type', item->'data', item->'styles');
  end loop;
  for item in select value from jsonb_array_elements(p_assets) loop
    if item->>'original_path' is distinct from owner_id::text || '/originals/' || (item->>'id') || '.webp'
      or item->>'thumbnail_path' is distinct from owner_id::text || '/thumbnails/' || (item->>'id') || '.webp'
      or (item->>'original_size')::bigint not between 1 and 5242880
      or (item->>'thumbnail_size')::bigint not between 1 and 1048576 then
      raise exception 'Invalid owned asset' using errcode = '42501';
    end if;
    insert into public.user_images(id,user_id,display_name,original_path,thumbnail_path,original_size,thumbnail_size)
      values ((item->>'id')::uuid,owner_id,item->>'display_name',item->>'original_path',
        item->>'thumbnail_path',(item->>'original_size')::bigint,(item->>'thumbnail_size')::bigint);
  end loop;
  return p_design_id;
end;
$$;

create or replace function public.create_transfer_design(
  p_design_id uuid, p_title text, p_theme jsonb, p_sections jsonb, p_assets jsonb, p_request_id uuid, p_revision integer
) returns uuid language plpgsql security invoker set search_path = public as $$
declare r public.website_transfer_requests; b uuid; item jsonb; ordinal bigint;
begin
  select * into r from public.website_transfer_requests where id = p_request_id for update;
  if not found or r.revision <> p_revision or r.status not in ('processing','checking','corrections') or r.permission_confirmed_at is null then raise exception 'Invalid transfer'; end if;
  if p_design_id is null or length(btrim(p_title)) not between 1 and 200 or jsonb_typeof(p_sections) is distinct from 'array'
    or jsonb_array_length(p_sections) not between 1 and 40 or jsonb_typeof(p_assets) is distinct from 'array'
    or jsonb_array_length(p_assets) > 8 or jsonb_typeof(p_theme) is distinct from 'object' then raise exception 'Invalid design'; end if;
  select id into b from public.businesses where user_id = r.user_id order by created_at limit 1;
  if b is null then raise exception 'Customer business required'; end if;
  insert into public.websites(id,user_id,business_id,title,slug,theme_config,published,live_snapshot)
    values(p_design_id,r.user_id,b,btrim(p_title),'site-' || p_design_id::text,p_theme,false,null);
  for item, ordinal in select value, ordinality from jsonb_array_elements(p_sections) with ordinality loop
    if item->>'type' not in ('nav','hero','about','gallery','features','faq','cta','footer') or jsonb_typeof(item->'data') is distinct from 'object' or jsonb_typeof(item->'styles') is distinct from 'object' then raise exception 'Invalid section'; end if;
    insert into public.website_sections(id,website_id,position,type,content,styles)
      values((item->>'id')::uuid,p_design_id,ordinal,item->>'type',item->'data',item->'styles');
  end loop;
  for item in select value from jsonb_array_elements(p_assets) loop
    if item->>'original_path' is distinct from r.user_id::text || '/originals/' || (item->>'id') || '.webp'
      or item->>'thumbnail_path' is distinct from r.user_id::text || '/thumbnails/' || (item->>'id') || '.webp'
      or (item->>'original_size')::bigint not between 1 and 5242880 or (item->>'thumbnail_size')::bigint not between 1 and 1048576 then raise exception 'Invalid asset'; end if;
    insert into public.user_images(id,user_id,display_name,original_path,thumbnail_path,original_size,thumbnail_size)
      values((item->>'id')::uuid,r.user_id,item->>'display_name',item->>'original_path',item->>'thumbnail_path',(item->>'original_size')::bigint,(item->>'thumbnail_size')::bigint);
  end loop;
  update public.website_transfer_requests set website_id = p_design_id, status = 'checking', revision = revision + 1,
    approved_at = null, approved_version = null, reviewed_at = null, reviewed_version = null, ready_at = null, updated_at = now() where id = p_request_id;
  return p_design_id;
end; $$;

create or replace function public.multipage_contract_version() returns integer language sql immutable as $$ select 3 $$;
revoke all on function public.multipage_contract_version() from public,anon;
grant execute on function public.multipage_contract_version() to authenticated;
commit;
