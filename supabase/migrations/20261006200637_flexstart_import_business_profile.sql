begin;
-- Create a missing customer profile from the confirmed intake in the same transaction as the draft.
-- Existing profiles are reused without changing their details.
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
  if b is null then
    insert into public.businesses(user_id,name,city,website_url)
      values(r.user_id,r.business_name,r.city,r.source_url) returning id into b;
  end if;
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
revoke all on function public.create_transfer_design(uuid,text,jsonb,jsonb,jsonb,uuid,integer) from public,anon,authenticated;
grant execute on function public.create_transfer_design(uuid,text,jsonb,jsonb,jsonb,uuid,integer) to service_role;
commit;
