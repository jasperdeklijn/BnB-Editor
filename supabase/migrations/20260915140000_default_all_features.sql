begin;

-- Match the temporary all-features default in lib/subscriptions.ts.
-- Existing ownership policies and billing records remain unchanged.
create or replace function public.can_manage_services()
returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return exists (select 1 from auth.users where id = auth.uid());
end;
$$;
revoke all on function public.can_manage_services() from public;
grant execute on function public.can_manage_services() to authenticated;

create or replace function public.review_gold_access(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users where id = p_user);
$$;
revoke all on function public.review_gold_access(uuid) from public, anon, authenticated;
grant execute on function public.review_gold_access(uuid) to service_role;

commit;
