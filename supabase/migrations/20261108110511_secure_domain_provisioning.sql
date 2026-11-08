-- Domain identity and provider authorization are server-owned.
-- Existing rows are intentionally NOT attested: their domain values were editable.
begin;

alter table public.website_domains
  add column if not exists provider_domain text,
  add column if not exists provider_project_id text;
alter table public.website_domains add constraint website_domains_provider_binding_check check (
  (provider_domain is null and provider_project_id is null)
  or (provider_domain is not null and provider_domain = domain
      and provider_project_id is not null and btrim(provider_project_id) <> '')
);
comment on column public.website_domains.provider_domain is
  'Server-only evidence of a successful provider create response. Never backfill from customer-controlled domain values.';
comment on column public.website_domains.provider_project_id is
  'Vercel project bound to the successful create response; checked again before deletion.';

revoke all on public.website_domains from public, anon, authenticated;
grant select on public.website_domains to authenticated;
grant all on public.website_domains to service_role;
drop policy if exists "Users can insert their own website domains" on public.website_domains;
drop policy if exists "Users can update their own website domains" on public.website_domains;
drop policy if exists "Users can delete their own website domains" on public.website_domains;

-- Narrow owner-authorized operations keep primary selection/removal atomic,
-- without restoring arbitrary customer writes to the domain table.
create or replace function public.set_website_primary_domain(p_website_id uuid, p_domain_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare selected_domain text;
begin
  if auth.uid() is null then return false; end if;
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then return false; end if;
  select domain into selected_domain from public.website_domains
    where id=p_domain_id and website_id=p_website_id and status='active'
      and provider_domain=domain and provider_project_id is not null;
  if selected_domain is null then return false; end if;
  update public.website_domains set is_primary=false where website_id=p_website_id and is_primary;
  update public.website_domains set is_primary=true where id=p_domain_id and website_id=p_website_id;
  update public.websites set custom_domain=selected_domain,updated_at=now()
    where id=p_website_id and user_id=auth.uid();
  return true;
end;
$$;

create or replace function public.finalize_website_domain_removal(p_website_id uuid, p_domain_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare removed_was_primary boolean; replacement_id uuid; replacement_domain text;
begin
  if auth.uid() is null then return 'unauthorized'; end if;
  perform 1 from public.websites where id=p_website_id and user_id=auth.uid() for update;
  if not found then return 'unauthorized'; end if;
  select is_primary into removed_was_primary from public.website_domains
    where id=p_domain_id and website_id=p_website_id
      and status in ('removal_pending','removal_failed')
      and provider_domain=domain and provider_project_id is not null;
  if not found then return 'not_found'; end if;
  delete from public.website_domains where id=p_domain_id and website_id=p_website_id;
  if removed_was_primary then
    select id,domain into replacement_id,replacement_domain from public.website_domains
      where website_id=p_website_id and status='active'
        and provider_domain=domain and provider_project_id is not null
      order by created_at,id limit 1;
    if replacement_id is not null then
      update public.website_domains set is_primary=true where id=replacement_id;
    end if;
    update public.websites set custom_domain=replacement_domain,updated_at=now()
      where id=p_website_id and user_id=auth.uid();
  end if;
  return 'removed';
end;
$$;
revoke all on function public.set_website_primary_domain(uuid,uuid),
  public.finalize_website_domain_removal(uuid,uuid) from public,anon,authenticated;
grant execute on function public.set_website_primary_domain(uuid,uuid),
  public.finalize_website_domain_removal(uuid,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
