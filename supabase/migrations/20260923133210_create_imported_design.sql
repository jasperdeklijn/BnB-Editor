-- Only native design content and managed asset metadata are persisted.
-- SECURITY INVOKER retains the existing owner RLS on every inserted row.
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
    if item->>'type' not in ('nav','hero','about','gallery','features','faq','cta')
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
revoke all on function public.create_imported_design(uuid,text,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.create_imported_design(uuid,text,jsonb,jsonb,jsonb) to authenticated;

