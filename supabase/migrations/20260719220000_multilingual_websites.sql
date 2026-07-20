begin;

alter table public.contact_requests
  add column if not exists locale text not null default 'nl-NL';

create table if not exists public.website_locales (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null check (locale in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR')),
  path_segment text not null check (path_segment ~ '^[a-z]{2}(?:-[a-z0-9]+)?$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  is_default boolean not null default false,
  is_enabled boolean not null default false,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_locales_default_enabled check (not is_default or is_enabled),
  unique (website_id, locale),
  unique (website_id, path_segment)
);

create unique index if not exists website_locales_one_default_idx
  on public.website_locales (website_id)
  where is_default;

create index if not exists website_locales_enabled_idx
  on public.website_locales (website_id, is_enabled);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'website_sections_id_website_unique'
  ) then
    alter table public.website_sections
      add constraint website_sections_id_website_unique unique (id, website_id);
  end if;
end;
$$;

create table if not exists public.website_section_translations (
  website_id uuid not null references public.websites(id) on delete cascade,
  section_id uuid not null,
  locale text not null,
  values jsonb not null default '{}'::jsonb,
  source_hash text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (section_id, locale),
  foreign key (section_id, website_id)
    references public.website_sections(id, website_id) on delete cascade,
  foreign key (website_id, locale)
    references public.website_locales(website_id, locale) on delete cascade
);

create index if not exists website_section_translations_website_locale_idx
  on public.website_section_translations (website_id, locale);

create table if not exists public.business_translations (
  business_id uuid not null references public.businesses(id) on delete cascade,
  locale text not null check (locale in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR')),
  name text not null default '',
  description text not null default '',
  opening_note text not null default '',
  source_hash text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, locale)
);

create table if not exists public.service_translations (
  service_id uuid not null references public.services(id) on delete cascade,
  locale text not null check (locale in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR')),
  title text not null default '',
  description text not null default '',
  source_hash text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (service_id, locale)
);

create or replace function public.ensure_default_website_locale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.website_locales (
    website_id, locale, path_segment, display_name, is_default, is_enabled
  ) values (
    new.id, 'nl-NL', 'nl', 'Nederlands', true, true
  ) on conflict (website_id, locale) do nothing;
  return new;
end;
$$;

drop trigger if exists ensure_default_website_locale on public.websites;
create trigger ensure_default_website_locale
  after insert on public.websites
  for each row execute procedure public.ensure_default_website_locale();

create or replace function public.protect_default_website_locale()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and old.is_default then
    raise exception 'The default website locale cannot be removed or disabled';
  end if;
  if tg_op = 'UPDATE' and old.is_default and not new.is_enabled then
    raise exception 'The default website locale cannot be removed or disabled';
  end if;
  if tg_op = 'UPDATE' and old.is_default and not new.is_default
     and coalesce(current_setting('app.allow_default_locale_change', true), '') <> 'on' then
    raise exception 'Use set_website_default_locale to change the default locale';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger protect_default_website_locale
  before update or delete on public.website_locales
  for each row execute procedure public.protect_default_website_locale();

create or replace function public.set_website_default_locale(p_website_id uuid, p_locale text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot_locale_count integer;
begin
  if not exists (select 1 from public.websites where id = p_website_id and user_id = auth.uid()) then
    raise exception 'Website not found';
  end if;
  if not exists (select 1 from public.website_locales where website_id = p_website_id and locale = p_locale) then
    raise exception 'Locale not configured';
  end if;
  select case when jsonb_typeof(live_snapshot->'locales') = 'array' then jsonb_array_length(live_snapshot->'locales') else 0 end
    into snapshot_locale_count from public.websites where id = p_website_id;
  if snapshot_locale_count > 1 then
    raise exception 'The default locale cannot change after multilingual publication';
  end if;
  if exists (select 1 from public.website_section_translations where website_id = p_website_id) then
    raise exception 'Remove draft translations before changing the default locale';
  end if;
  if exists (
    select 1 from public.websites w
    join public.business_translations bt on bt.business_id = w.business_id
    where w.id = p_website_id
  ) or exists (
    select 1 from public.websites w
    join public.services s on s.business_id = w.business_id
    join public.service_translations st on st.service_id = s.id
    where w.id = p_website_id
  ) then
    raise exception 'Remove draft translations before changing the default locale';
  end if;
  perform set_config('app.allow_default_locale_change', 'on', true);
  update public.website_locales set is_default = false where website_id = p_website_id and is_default;
  update public.website_locales set is_default = true, is_enabled = true where website_id = p_website_id and locale = p_locale;
end;
$$;

grant execute on function public.set_website_default_locale(uuid, text) to authenticated;

insert into public.website_locales (
  website_id, locale, path_segment, display_name, is_default, is_enabled
)
select id, 'nl-NL', 'nl', 'Nederlands', true, true
from public.websites
on conflict (website_id, locale) do nothing;

create or replace function pg_temp.add_translation_item_ids(items jsonb, seed text, prefix text)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_agg(
    case
      when jsonb_typeof(item) = 'object' then
        item || jsonb_build_object('id', coalesce(nullif(item->>'id', ''), prefix || substr(md5(seed || ':' || ordinality::text), 1, 12)))
      else
        jsonb_build_object(
          'id', prefix || substr(md5(seed || ':' || ordinality::text), 1, 12),
          'text', item #>> '{}'
        )
    end
    order by ordinality
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(items, '[]'::jsonb)) with ordinality as entries(item, ordinality);
$$;

update public.website_sections
set content = jsonb_set(content, '{items}', jsonb_build_array(
  jsonb_build_object('id', 'faq-1', 'question', 'Hoe snel kan ik terecht?', 'answer', 'In de meeste gevallen kunnen we binnen 1-3 werkdagen bij u terecht. Neem contact op voor een exacte planning.'),
  jsonb_build_object('id', 'faq-2', 'question', 'Wat zijn de kosten?', 'answer', 'De kosten zijn afhankelijk van het type dienst en de omvang van het werk. We brengen graag een vrijblijvende offerte uit.'),
  jsonb_build_object('id', 'faq-3', 'question', 'Werken jullie met garantie?', 'answer', 'Ja, op al ons werk geven wij garantie. De exacte voorwaarden bespreken we bij de opdrachtbevestiging.'),
  jsonb_build_object('id', 'faq-4', 'question', 'Hoe kan ik een afspraak maken?', 'answer', 'U kunt ons bellen, mailen of het contactformulier op deze pagina gebruiken. We reageren zo snel mogelijk.')
))
where type = 'faq' and coalesce(jsonb_array_length(content->'items'), 0) = 0;

update public.website_sections
set content = jsonb_set(content, '{items}', jsonb_build_array(
  jsonb_build_object('id', 'testimonial-1', 'name', 'Anna de Vries', 'role', 'Vaste klant', 'quote', 'Uitstekende service! Ik ben heel tevreden met het resultaat en de persoonlijke aanpak.', 'rating', 5),
  jsonb_build_object('id', 'testimonial-2', 'name', 'Mark Janssen', 'role', 'Ondernemer', 'quote', 'Professioneel, betrouwbaar en snel. Ik zou het iedereen aanraden.', 'rating', 5),
  jsonb_build_object('id', 'testimonial-3', 'name', 'Sophie Bakker', 'role', 'Particuliere klant', 'quote', 'Fijn contact en top vakwerk. We zijn meer dan tevreden met het eindresultaat.', 'rating', 5)
))
where type = 'testimonials' and coalesce(jsonb_array_length(content->'items'), 0) = 0;

update public.website_sections
set content = jsonb_set(content, '{features}', pg_temp.add_translation_item_ids(content->'features', id::text, 'feature-'))
where type = 'features' and jsonb_typeof(content->'features') = 'array';

update public.website_sections
set content = jsonb_set(content, '{subtitle}', to_jsonb('Neem gerust contact met ons op. We helpen je graag verder.'::text))
where type = 'contact' and coalesce(nullif(btrim(content->>'subtitle'), ''), '') = '';

update public.website_sections
set content = jsonb_set(content, '{items}', pg_temp.add_translation_item_ids(content->'items', id::text, type || '-item-'))
where type in ('faq', 'testimonials', 'opening_hours') and jsonb_typeof(content->'items') = 'array';

update public.website_sections
set content = jsonb_set(content, '{members}', pg_temp.add_translation_item_ids(content->'members', id::text, 'team-member-'))
where type = 'team' and jsonb_typeof(content->'members') = 'array';

update public.website_sections
set content = jsonb_set(
  jsonb_set(content, '{tariffs}', pg_temp.add_translation_item_ids(content->'tariffs', id::text, 'tariff-')),
  '{plans}',
  (
    select coalesce(jsonb_agg(
      plan || jsonb_build_object(
        'features', pg_temp.add_translation_item_ids(plan->'features', website_sections.id::text || ':' || plan->>'id', 'plan-feature-')
      ) order by ordinality
    ), '[]'::jsonb)
    from jsonb_array_elements(pg_temp.add_translation_item_ids(content->'plans', id::text, 'plan-')) with ordinality as plans(plan, ordinality)
  )
)
where type = 'pricing';

update public.website_sections
set content = jsonb_set(content, '{columns}', (
  select coalesce(jsonb_agg(
    column_value || jsonb_build_object(
      'id', coalesce(nullif(column_value->>'id', ''), 'footer-column-' || substr(md5(website_sections.id::text || ':' || column_ordinality::text), 1, 12)),
      'links', pg_temp.add_translation_item_ids(column_value->'links', website_sections.id::text || ':' || column_ordinality::text, 'footer-link-')
    ) order by column_ordinality
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(content->'columns', '[]'::jsonb)) with ordinality as columns(column_value, column_ordinality)
))
where type = 'footer' and jsonb_typeof(content->'columns') = 'array';

create trigger set_website_locales_updated_at
  before update on public.website_locales
  for each row execute procedure public.set_updated_at();
create trigger set_website_section_translations_updated_at
  before update on public.website_section_translations
  for each row execute procedure public.set_updated_at();
create trigger set_business_translations_updated_at
  before update on public.business_translations
  for each row execute procedure public.set_updated_at();
create trigger set_service_translations_updated_at
  before update on public.service_translations
  for each row execute procedure public.set_updated_at();

create or replace function public.bump_multilingual_website_draft_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_website_id uuid;
  target_business_id uuid;
  target_service_id uuid;
begin
  if tg_table_name in ('website_locales', 'website_section_translations') then
    target_website_id = case when tg_op = 'DELETE' then old.website_id else new.website_id end;
    update public.websites set draft_version = gen_random_uuid() where id = target_website_id;
  elsif tg_table_name = 'business_translations' then
    target_business_id = case when tg_op = 'DELETE' then old.business_id else new.business_id end;
    update public.websites set draft_version = gen_random_uuid() where business_id = target_business_id;
  elsif tg_table_name = 'service_translations' then
    target_service_id = case when tg_op = 'DELETE' then old.service_id else new.service_id end;
    select business_id into target_business_id from public.services where id = target_service_id;
    update public.websites set draft_version = gen_random_uuid() where business_id = target_business_id;
  end if;
  return null;
end;
$$;

create trigger bump_website_draft_from_locales
  after insert or update or delete on public.website_locales
  for each row execute procedure public.bump_multilingual_website_draft_versions();
create trigger bump_website_draft_from_section_translations
  after insert or update or delete on public.website_section_translations
  for each row execute procedure public.bump_multilingual_website_draft_versions();
create trigger bump_website_draft_from_business_translations
  after insert or update or delete on public.business_translations
  for each row execute procedure public.bump_multilingual_website_draft_versions();
create trigger bump_website_draft_from_service_translations
  after insert or update or delete on public.service_translations
  for each row execute procedure public.bump_multilingual_website_draft_versions();

alter table public.website_locales enable row level security;
alter table public.website_section_translations enable row level security;
alter table public.business_translations enable row level security;
alter table public.service_translations enable row level security;

create policy "Users can manage own website locales"
  on public.website_locales for all to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = website_locales.website_id and w.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.websites w
    where w.id = website_locales.website_id and w.user_id = auth.uid()
  ));

create policy "Users can manage own website section translations"
  on public.website_section_translations for all to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = website_section_translations.website_id and w.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.websites w
    where w.id = website_section_translations.website_id and w.user_id = auth.uid()
  ));

create policy "Users can manage own business translations"
  on public.business_translations for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_translations.business_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = business_translations.business_id and b.user_id = auth.uid()
  ));

create policy "Users can manage own service translations"
  on public.service_translations for all to authenticated
  using (exists (
    select 1 from public.services s
    join public.businesses b on b.id = s.business_id
    where s.id = service_translations.service_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.services s
    join public.businesses b on b.id = s.business_id
    where s.id = service_translations.service_id and b.user_id = auth.uid()
  ));

commit;
