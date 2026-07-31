-- Convert persisted compatibility formats before their runtime readers are removed.

create or replace function public._canonicalize_section_content(section_content jsonb, section_type text)
returns jsonb
language plpgsql
as $$
declare
  result jsonb := coalesce(section_content, '{}'::jsonb);
  old_layout text;
  canonical_layout text;
  image_total integer;
  canonical_images jsonb;
begin
  old_layout := result ->> 'layout';
  canonical_layout := case old_layout
    when 'centered' then 'classic'
    when 'grid' then 'classic'
    when 'fullwidth' then 'showcase'
    when 'featured' then 'showcase'
    when 'full-slider' then 'showcase'
    when 'minimal' then 'compact'
    when 'list' then 'split'
    when 'vertical-carousel' then 'split'
    when 'split-reverse' then 'banner'
    when 'carousel' then 'banner'
    when 'masonry' then 'banner'
    when 'magazine' then 'card'
    when 'single-with-thumbs' then 'card'
    else null
  end;

  if canonical_layout is not null then
    result := jsonb_set(result, '{layout}', to_jsonb(canonical_layout));
  end if;

  result := replace(replace(result::text, '"#over-ons"', '"#about"'), '"#diensten"', '"#services"')::jsonb;

  if section_type = 'gallery' then
    if jsonb_typeof(result -> 'images') = 'object' then
      select coalesce(jsonb_agg(value order by key::integer), '[]'::jsonb)
      into canonical_images
      from jsonb_each(result -> 'images')
      where key ~ '^[0-9]+$';
      result := jsonb_set(result, '{images}', canonical_images);
    elsif jsonb_typeof(result -> 'images') = 'number' or result ? 'image_count' then
      image_total := greatest(1, least(12, coalesce(
        case when jsonb_typeof(result -> 'images') = 'number' then (result ->> 'images')::integer end,
        case when jsonb_typeof(result -> 'image_count') = 'number' then (result ->> 'image_count')::integer end,
        6
      )));
      select jsonb_agg(to_jsonb('/placeholder.svg?height=400&width=400&query=small+business+service+' || image_index))
      into canonical_images
      from generate_series(1, image_total) as image_index;
      result := jsonb_set(result, '{images}', canonical_images);
    end if;
    result := result - 'image_count';
  end if;

  return result;
end;
$$;

create or replace function public._canonicalize_snapshot_sections(snapshot_sections jsonb)
returns jsonb
language sql
as $$
  select coalesce(
    jsonb_agg(
      section_value || jsonb_build_object(
        'data',
        public._canonicalize_section_content(section_value -> 'data', section_value ->> 'type')
      )
      order by section_ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(snapshot_sections, '[]'::jsonb))
    with ordinality as sections(section_value, section_ordinality);
$$;

update public.website_sections
set content = public._canonicalize_section_content(content, type)
where content is not null;

update public.websites
set live_snapshot = jsonb_set(
  jsonb_set(live_snapshot, '{version}', '2'::jsonb),
  '{locales}',
  jsonb_build_array(jsonb_build_object(
    'locale', 'nl-NL',
    'pathSegment', 'nl',
    'displayName', 'Nederlands',
    'isDefault', true,
    'seo', coalesce(live_snapshot #> '{website,seo}', '{}'::jsonb),
    'business', live_snapshot -> 'business',
    'services', coalesce(live_snapshot -> 'services', '[]'::jsonb),
    'sections', public._canonicalize_snapshot_sections(live_snapshot -> 'sections')
  ))
)
where live_snapshot ->> 'version' = '1';

update public.websites
set live_snapshot = jsonb_set(
  jsonb_set(
    live_snapshot,
    '{sections}',
    public._canonicalize_snapshot_sections(live_snapshot -> 'sections')
  ),
  '{locales}',
  (
    select coalesce(jsonb_agg(
      locale_value || jsonb_build_object(
        'sections',
        public._canonicalize_snapshot_sections(locale_value -> 'sections')
      )
      order by locale_ordinality
    ), '[]'::jsonb)
    from jsonb_array_elements(coalesce(live_snapshot -> 'locales', '[]'::jsonb))
      with ordinality as locales(locale_value, locale_ordinality)
  )
)
where live_snapshot is not null;

with root_image_objects as materialized (
  select
    objects.*,
    (storage.foldername(objects.name))[1] as owner_folder
  from storage.objects as objects
  where objects.bucket_id = 'user-images'
    and array_length(storage.foldername(objects.name), 1) = 1
    and storage.filename(objects.name) <> '.emptyFolderPlaceholder'
    and storage.filename(objects.name) !~* '^avatar(?:\.|$)'
    and (storage.foldername(objects.name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)
insert into public.user_images (
  user_id,
  display_name,
  original_path,
  thumbnail_path,
  original_size,
  thumbnail_size,
  created_at
)
select
  objects.owner_folder::uuid,
  storage.filename(objects.name),
  objects.name,
  null,
  coalesce((objects.metadata ->> 'size')::bigint, 0),
  0,
  objects.created_at
from root_image_objects as objects
join auth.users as users on users.id = objects.owner_folder::uuid
on conflict (original_path) do nothing;

drop function public._canonicalize_snapshot_sections(jsonb);
drop function public._canonicalize_section_content(jsonb, text);
