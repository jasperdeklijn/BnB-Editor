begin;

-- Evidence is captured once at account creation, independently of mutable
-- auth user metadata. Existing accounts are deliberately not backfilled.
create table if not exists public.user_terms_acceptances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default clock_timestamp(),
  source text not null default 'signup' check (source = 'signup')
);

alter table public.user_terms_acceptances enable row level security;
revoke all on public.user_terms_acceptances from public, anon, authenticated;
grant select on public.user_terms_acceptances to authenticated, service_role;

drop policy if exists user_terms_acceptances_select_own on public.user_terms_acceptances;
create policy user_terms_acceptances_select_own
  on public.user_terms_acceptances for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.record_signup_terms_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Require JSON boolean true; strings, missing fields and stale versions fail.
  -- Keep the accepted version aligned with lib/legal/terms-version.ts.
  if (new.raw_user_meta_data -> 'terms_accepted') is distinct from 'true'::jsonb
     or (new.raw_user_meta_data ->> 'terms_version') is distinct from '2026-09-17' then
    raise exception 'terms_acceptance_required' using errcode = '23514';
  end if;

  insert into public.user_terms_acceptances (user_id, terms_version)
  values (new.id, new.raw_user_meta_data ->> 'terms_version');
  return new;
end;
$$;

revoke all on function public.record_signup_terms_acceptance() from public, anon, authenticated;
drop trigger if exists record_signup_terms_acceptance on auth.users;
create trigger record_signup_terms_acceptance
  after insert on auth.users
  for each row execute function public.record_signup_terms_acceptance();

notify pgrst, 'reload schema';
commit;
