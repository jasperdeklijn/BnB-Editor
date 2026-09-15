begin;

-- Match resolveEffectivePlan in lib/subscriptions.ts, including temporary Gold.
-- No subscription or billing records are changed by this repair.
create or replace function public.review_gold_access(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from auth.users u
    left join public.subscriptions s on s.user_id = u.id
    where u.id = p_user and (
      case when s.status in ('active', 'trial')
        or (s.status = 'canceled' and s.current_period_end > now())
      then coalesce(s.plan_id::text not in ('bronze', 'silver'), true)
      else true
      end
    )
  );
$$;
revoke all on function public.review_gold_access(uuid) from public, anon, authenticated;
grant execute on function public.review_gold_access(uuid) to service_role;

commit;
