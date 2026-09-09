-- Repair the shared limiter without rebuilding or deleting application data.
-- Also installs it if the earlier readiness migration has not been applied.
begin;

-- Code-level production hardening that does not depend on paid providers.

-- Shared, atomic fixed-window rate limiting. Keys are SHA-256 hashes; raw IP
-- addresses and action identifiers are never stored.
create table if not exists public.rate_limit_buckets (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  request_count integer not null check (request_count > 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.rate_limit_buckets enable row level security;
revoke all on table public.rate_limit_buckets from public, anon, authenticated;

create or replace function public.check_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  bucket public.rate_limit_buckets%rowtype;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit not between 1 and 1000
     or p_window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.rate_limit_buckets (key_hash, request_count, reset_at, updated_at)
  values (p_key_hash, 1, v_now + make_interval(secs => p_window_seconds), v_now)
  on conflict (key_hash) do update
  set request_count = case
        when rate_limit_buckets.reset_at <= v_now then 1
        else rate_limit_buckets.request_count + 1
      end,
      reset_at = case
        when rate_limit_buckets.reset_at <= v_now then v_now + make_interval(secs => p_window_seconds)
        else rate_limit_buckets.reset_at
      end,
      updated_at = v_now
  returning * into bucket;

  return query select
    bucket.request_count <= p_limit,
    greatest(0, p_limit - bucket.request_count),
    bucket.reset_at;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

notify pgrst, 'reload schema';

commit;
