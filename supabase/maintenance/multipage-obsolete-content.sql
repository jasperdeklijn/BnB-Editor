-- Review and populate the explicit UUID list on an isolated staging target.
-- Never use this after the page foundation is installed. No accounts/businesses/billing are deleted.
begin;
do $$ begin
  if to_regclass('public.website_pages') is not null then
    raise exception 'Multipage already installed: obsolete-model cleanup is prohibited';
  end if;
end $$;
create temporary table obsolete_website_ids(id uuid primary key) on commit drop;
-- insert into obsolete_website_ids values ('REPLACE_WITH_REVIEWED_UUID');
do $$ begin
  if not exists(select 1 from obsolete_website_ids) then
    raise exception 'Supply reviewed website UUIDs explicitly before executing cleanup';
  end if;
  if exists(select 1 from obsolete_website_ids old left join public.websites w on w.id=old.id where w.id is null) then
    raise exception 'A selected website does not exist';
  end if;
end $$;
select w.id,w.user_id,w.slug,w.custom_domain from public.websites w join obsolete_website_ids old on old.id=w.id;
delete from public.website_sections s using obsolete_website_ids old where s.website_id=old.id;
update public.websites w set live_snapshot=null,live_published_at=null,published=false
  from obsolete_website_ids old where w.id=old.id;
-- Deliberately rollback until the UUID list, backup and row counts are reviewed.
rollback;
