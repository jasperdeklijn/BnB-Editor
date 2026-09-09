-- Service management is included in Gold and in Booking & Facturatie.
begin;

create or replace function public.can_manage_services()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  subscription public.subscriptions%rowtype;
begin
  if auth.uid() is null then return false; end if;
  select * into subscription from public.subscriptions where user_id = auth.uid();
  -- Match the existing application's temporary Gold fallback.
  if not found then return true; end if;
  if subscription.status in ('active', 'trial')
     or (subscription.status = 'canceled' and subscription.current_period_end > now()) then
    return subscription.plan_id = 'gold'
      or coalesce(to_jsonb(subscription)->>'booking_addon_active' = 'true', false);
  end if;
  return true;
end;
$$;

revoke all on function public.can_manage_services() from public;
grant execute on function public.can_manage_services() to authenticated;

-- Restrictive policies combine with the existing business ownership policies.
drop policy if exists "Service insert requires entitlement" on public.services;
create policy "Service insert requires entitlement" on public.services
  as restrictive for insert to authenticated
  with check (public.can_manage_services());
drop policy if exists "Service update requires entitlement" on public.services;
create policy "Service update requires entitlement" on public.services
  as restrictive for update to authenticated
  using (public.can_manage_services()) with check (public.can_manage_services());
drop policy if exists "Service delete requires entitlement" on public.services;
create policy "Service delete requires entitlement" on public.services
  as restrictive for delete to authenticated
  using (public.can_manage_services());

-- Avoid referencing the new column until it exists during rolling deployment.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'subscriptions' and column_name = 'booking_addon_active') then
    comment on column public.subscriptions.booking_addon_active is
      'Trusted billing state. Unlocks Booking & Facturatie for active/trial or paid-through canceled subscriptions on any plan. Catalog price is defined in lib/pricing.ts.';
  end if;
end;
$$;

commit;
