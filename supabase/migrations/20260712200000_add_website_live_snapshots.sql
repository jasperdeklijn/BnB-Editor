-- Mutable editor records remain drafts. Public pages render this atomic snapshot.

begin;

alter table public.websites
  add column if not exists live_snapshot jsonb,
  add column if not exists live_published_at timestamptz;

comment on column public.websites.live_snapshot is
  'Immutable public rendering snapshot replaced atomically by a successful publish.';

comment on column public.websites.live_published_at is
  'Timestamp of the draft promotion that produced live_snapshot.';

with website_sources as (
  select
    w.id,
    coalesce(
      w.business_id,
      (
        select b0.id
        from public.businesses b0
        where b0.user_id = w.user_id
        order by b0.created_at asc
        limit 1
      )
    ) as business_id
  from public.websites w
)
update public.websites w
set
  live_published_at = coalesce(w.updated_at, now()),
  live_snapshot = jsonb_build_object(
    'version', 1,
    'publishedAt', coalesce(w.updated_at, now()),
    'website', jsonb_build_object(
      'id', w.id,
      'userId', w.user_id,
      'businessId', source.business_id,
      'title', w.title,
      'slug', w.slug,
      'customDomain', w.custom_domain,
      'seo', coalesce(w.seo, '{}'::jsonb),
      'themeConfig', w.theme_config
    ),
    'ownerEmail', (select u.email from auth.users u where u.id = w.user_id),
    'business', (
      select to_jsonb(b) - 'user_id' - 'created_at' - 'updated_at'
      from public.businesses b
      where b.id = source.business_id
    ),
    'services', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.position)
      from public.services s
      where s.business_id = source.business_id
    ), '[]'::jsonb),
    'availabilityWindows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'business_id', a.business_id,
        'service_id', a.service_id,
        'weekday', a.weekday,
        'start_time', a.start_time,
        'end_time', a.end_time,
        'timezone', a.timezone,
        'is_active', a.is_active
      ))
      from public.calendar_availability_windows a
      where a.business_id = source.business_id
    ), '[]'::jsonb),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'type', s.type,
        'data', coalesce(s.content, '{}'::jsonb) || jsonb_build_object(
          'businessId', source.business_id,
          'websiteId', w.id
        ),
        'styles', coalesce(s.styles, '{}'::jsonb)
      ) order by s.position)
      from public.website_sections s
      where s.website_id = w.id
    ), '[]'::jsonb),
    'transitions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'fromSectionId', t.from_section_id,
        'toSectionId', t.to_section_id,
        'type', coalesce(t.transition->>'type', 'none')
      ))
      from public.section_transitions t
      where t.website_id = w.id
    ), '[]'::jsonb)
  )
from website_sources source
where w.published = true
  and source.id = w.id
  and w.live_snapshot is null;

commit;
