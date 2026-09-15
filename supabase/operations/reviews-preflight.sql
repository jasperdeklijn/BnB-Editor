-- Read-only report. Run BEFORE 20260910120000_review_collection.sql.
-- No review is classified as an example using its author's name alone.
with sources as (
  select s.website_id, 'draft'::text as source, s.content->'items' as items
  from public.website_sections s where s.type = 'testimonials'
  union all
  select t.website_id, 'translation', t.values->'items'
  from public.website_section_translations t join public.website_sections s on s.id=t.section_id where s.type='testimonials'
  union all
  select w.id, 'live', s->'data'->'items'
  from public.websites w cross join lateral jsonb_array_elements(coalesce(w.live_snapshot->'sections','[]')) s where s->>'type'='testimonials'
  union all
  select w.id, 'live translation', s->'data'->'items'
  from public.websites w cross join lateral jsonb_array_elements(coalesce(w.live_snapshot->'locales','[]')) l
  cross join lateral jsonb_array_elements(coalesce(l->'sections','[]')) s where s->>'type'='testimonials'
), known_examples as (
  select value as item from jsonb_array_elements('[
    {"name":"Anna de Vries","role":"Vaste klant","quote":"Uitstekende service! Ik ben heel tevreden met het resultaat en de persoonlijke aanpak.","rating":5},
    {"name":"Mark Janssen","role":"Ondernemer","quote":"Professioneel, betrouwbaar en snel. Ik zou het iedereen aanraden.","rating":5},
    {"name":"Sophie Bakker","role":"Particuliere klant","quote":"Fijn contact en top vakwerk. We zijn meer dan tevreden met het eindresultaat.","rating":5}
  ]'::jsonb)
)
select src.website_id, src.source, count(i.item) as total_items,
  count(i.item) filter(where exists(select 1 from known_examples e where e.item=i.item-'id')) as exact_known_examples,
  count(i.item) filter(where not exists(select 1 from known_examples e where e.item=i.item-'id')) as other_items_to_preserve_privately
from sources src left join lateral jsonb_array_elements(case when jsonb_typeof(src.items)='array' then src.items else '[]' end) i(item) on true
group by src.website_id,src.source order by src.website_id,src.source;
