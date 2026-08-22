begin;

create table if not exists public.agent_settings (
  singleton_key boolean primary key default true,
  agents_enabled boolean not null default false,
  observe_only boolean not null default true,
  support_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  daily_budget_eur numeric(12, 4) not null default 5 check (daily_budget_eur >= 0),
  budget_reservation_eur numeric(12, 4) not null default 0.10 check (budget_reservation_eur > 0),
  daily_run_limit integer not null default 100 check (daily_run_limit between 1 and 10000),
  max_jobs_per_dispatch integer not null default 2 check (max_jobs_per_dispatch between 1 and 10),
  support_model text not null default 'openai/gpt-5.4-mini',
  marketing_model text not null default 'openai/gpt-5.4-mini',
  model_allowlist text[] not null default array['openai/gpt-5.4-mini']::text[],
  run_retention_days integer not null default 90 check (run_retention_days between 7 and 730),
  audit_retention_days integer not null default 365 check (audit_retention_days between 30 and 2555),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_settings_singleton_check check (singleton_key),
  constraint agent_settings_support_model_allowed check (support_model = any(model_allowlist)),
  constraint agent_settings_marketing_model_allowed check (marketing_model = any(model_allowlist))
);

insert into public.agent_settings (singleton_key)
values (true)
on conflict (singleton_key) do nothing;

create table if not exists public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  scope text not null check (scope in ('platform', 'business')),
  job_type text not null,
  payload_version integer not null default 1 check (payload_version > 0),
  source text not null,
  deduplication_key text not null,
  priority smallint not null default 50 check (priority between 0 and 100),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'queued' check (status in (
    'queued', 'claimed', 'running', 'waiting_for_dependency', 'awaiting_approval',
    'executing', 'completed', 'failed', 'dead_letter', 'cancelled', 'expired'
  )),
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by text,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  last_error_code text,
  last_error_message text,
  correlation_id uuid not null default gen_random_uuid(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_jobs_scope_business_check check (
    (scope = 'platform' and business_id is null)
    or (scope = 'business' and business_id is not null)
  ),
  constraint agent_jobs_type_not_blank check (btrim(job_type) <> ''),
  constraint agent_jobs_source_not_blank check (btrim(source) <> ''),
  constraint agent_jobs_dedupe_not_blank check (btrim(deduplication_key) <> ''),
  constraint agent_jobs_payload_object_check check (jsonb_typeof(payload) = 'object'),
  constraint agent_jobs_source_dedupe_unique unique (source, deduplication_key)
);

create table if not exists public.agent_job_dependencies (
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  depends_on_job_id uuid not null references public.agent_jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, depends_on_job_id),
  constraint agent_job_dependencies_not_self check (job_id <> depends_on_job_id)
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  parent_run_id uuid references public.agent_runs(id) on delete set null,
  agent_type text not null,
  provider text not null,
  model text not null,
  status text not null default 'queued' check (status in ('queued', 'in_progress', 'completed', 'failed', 'cancelled')),
  prompt_version text not null,
  provider_response_id text,
  input_summary text not null default '',
  output_summary text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  estimated_cost numeric(12, 6) check (estimated_cost is null or estimated_cost >= 0),
  currency text not null default 'EUR',
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint agent_runs_agent_not_blank check (btrim(agent_type) <> ''),
  constraint agent_runs_provider_not_blank check (btrim(provider) <> ''),
  constraint agent_runs_model_not_blank check (btrim(model) <> '')
);

create table if not exists public.agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  artifact_type text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  content_hash text not null,
  supersedes_artifact_id uuid references public.agent_artifacts(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint agent_artifacts_content_object_check check (jsonb_typeof(content) = 'object'),
  constraint agent_artifacts_hash_not_blank check (btrim(content_hash) <> ''),
  constraint agent_artifacts_job_type_version_unique unique (job_id, artifact_type, version)
);

create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  artifact_id uuid not null references public.agent_artifacts(id) on delete cascade,
  artifact_content_hash text not null,
  action_type text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'expired', 'invalidated', 'executed', 'execution_failed'
  )),
  requested_at timestamptz not null default now(),
  expires_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_approvals_action_not_blank check (btrim(action_type) <> '')
);

create table if not exists public.agent_executions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  approval_id uuid not null unique references public.agent_approvals(id) on delete cascade,
  artifact_id uuid not null references public.agent_artifacts(id) on delete cascade,
  executor_type text not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'executing', 'succeeded', 'failed', 'unknown')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  provider_action_id text,
  result_summary text,
  last_error_code text,
  last_error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_executions_executor_not_blank check (btrim(executor_type) <> ''),
  constraint agent_executions_key_not_blank check (btrim(idempotency_key) <> '')
);

create table if not exists public.agent_audit_logs (
  id bigint generated always as identity primary key,
  actor_type text not null,
  actor_id text,
  event_type text not null,
  object_type text not null,
  object_id uuid,
  previous_status text,
  new_status text,
  correlation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint agent_audit_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

alter table if exists public.mail_sync_runs
  add column if not exists agent_job_id uuid references public.agent_jobs(id) on delete set null;

alter table if exists public.mail_drafts
  add column if not exists provider_response_id text,
  add column if not exists input_tokens integer check (input_tokens is null or input_tokens >= 0),
  add column if not exists output_tokens integer check (output_tokens is null or output_tokens >= 0),
  add column if not exists total_tokens integer check (total_tokens is null or total_tokens >= 0);

alter table if exists public.lead_agent_runs
  add column if not exists agent_job_id uuid references public.agent_jobs(id) on delete set null;

drop trigger if exists set_agent_settings_updated_at on public.agent_settings;
create trigger set_agent_settings_updated_at
  before update on public.agent_settings
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_agent_jobs_updated_at on public.agent_jobs;
create trigger set_agent_jobs_updated_at
  before update on public.agent_jobs
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_agent_approvals_updated_at on public.agent_approvals;
create trigger set_agent_approvals_updated_at
  before update on public.agent_approvals
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_agent_executions_updated_at on public.agent_executions;
create trigger set_agent_executions_updated_at
  before update on public.agent_executions
  for each row execute procedure public.set_updated_at();

create index if not exists idx_agent_jobs_claim
  on public.agent_jobs (status, available_at, priority desc, created_at)
  where status = 'queued';
create index if not exists idx_agent_jobs_lease
  on public.agent_jobs (lease_expires_at)
  where status in ('claimed', 'running');
create index if not exists idx_agent_jobs_business_created
  on public.agent_jobs (business_id, created_at desc);
create index if not exists idx_agent_runs_job_created
  on public.agent_runs (job_id, created_at desc);
create index if not exists idx_agent_artifacts_job_created
  on public.agent_artifacts (job_id, created_at desc);
create index if not exists idx_agent_approvals_pending
  on public.agent_approvals (status, requested_at)
  where status = 'pending';
create index if not exists idx_agent_executions_pending
  on public.agent_executions (status, created_at)
  where status in ('pending', 'unknown');
create index if not exists idx_agent_audit_object
  on public.agent_audit_logs (object_type, object_id, created_at desc);
create index if not exists idx_agent_audit_correlation
  on public.agent_audit_logs (correlation_id, created_at);

alter table public.agent_settings enable row level security;
alter table public.agent_jobs enable row level security;
alter table public.agent_job_dependencies enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_artifacts enable row level security;
alter table public.agent_approvals enable row level security;
alter table public.agent_executions enable row level security;
alter table public.agent_audit_logs enable row level security;

create or replace function public.prevent_agent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.agent_maintenance', true) = 'retention' then return old; end if;
  raise exception 'agent_audit_logs is append-only' using errcode = '55000';
end;
$$;

drop trigger if exists prevent_agent_audit_update_delete on public.agent_audit_logs;
create trigger prevent_agent_audit_update_delete
  before update or delete on public.agent_audit_logs
  for each row execute function public.prevent_agent_audit_mutation();

create or replace function public.prevent_agent_artifact_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'agent_artifacts are immutable; create a new version' using errcode = '55000';
end;
$$;

drop trigger if exists prevent_agent_artifact_update on public.agent_artifacts;
create trigger prevent_agent_artifact_update
  before update on public.agent_artifacts
  for each row execute function public.prevent_agent_artifact_update();

create or replace function public.enqueue_agent_job(
  p_job_type text,
  p_source text,
  p_deduplication_key text,
  p_scope text default 'platform',
  p_business_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_payload_version integer default 1,
  p_priority smallint default 50,
  p_risk_level text default 'low',
  p_scheduled_for timestamptz default now(),
  p_max_attempts integer default 3
)
returns table(job_id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id uuid;
begin
  if btrim(coalesce(p_job_type, '')) = '' or btrim(coalesce(p_source, '')) = '' or btrim(coalesce(p_deduplication_key, '')) = '' then
    raise exception 'Job type, source and deduplication key are required' using errcode = '22023';
  end if;
  if p_scope not in ('platform', 'business')
    or (p_scope = 'platform' and p_business_id is not null)
    or (p_scope = 'business' and p_business_id is null) then
    raise exception 'Invalid job scope' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  insert into public.agent_jobs (
    business_id, scope, job_type, payload_version, source, deduplication_key,
    priority, risk_level, payload, scheduled_for, available_at, max_attempts
  ) values (
    p_business_id, p_scope, p_job_type, p_payload_version, p_source, p_deduplication_key,
    p_priority, p_risk_level, coalesce(p_payload, '{}'::jsonb), p_scheduled_for, p_scheduled_for, p_max_attempts
  )
  on conflict (source, deduplication_key) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    insert into public.agent_audit_logs (
      actor_type, event_type, object_type, object_id, new_status, correlation_id, metadata
    )
    select 'system', 'job.enqueued', 'agent_job', id, status, correlation_id,
      jsonb_build_object('jobType', job_type, 'source', source)
    from public.agent_jobs where id = inserted_id;
    return query select inserted_id, true;
    return;
  end if;

  return query
  select id, false
  from public.agent_jobs
  where source = p_source and deduplication_key = p_deduplication_key;
end;
$$;

create or replace function public.claim_agent_jobs(
  p_worker_id text,
  p_limit integer default 2,
  p_lease_seconds integer default 120
)
returns setof public.agent_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if btrim(coalesce(p_worker_id, '')) = '' then
    raise exception 'Worker id is required' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select j.id
    from public.agent_jobs j
    where j.status = 'queued'
      and exists (select 1 from public.agent_settings s where s.singleton_key = true and s.agents_enabled)
      and j.available_at <= now()
      and j.scheduled_for <= now()
      and not exists (
        select 1
        from public.agent_job_dependencies d
        join public.agent_jobs dependency on dependency.id = d.depends_on_job_id
        where d.job_id = j.id and dependency.status <> 'completed'
      )
    order by j.priority desc, j.created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 10)
  ), claimed as (
    update public.agent_jobs j
    set status = 'claimed',
        claimed_at = now(),
        claimed_by = p_worker_id,
        heartbeat_at = now(),
        lease_expires_at = now() + make_interval(secs => least(greatest(p_lease_seconds, 30), 900)),
        attempt_count = attempt_count + 1
    from candidates c
    where j.id = c.id
    returning j.*
  ), audited as (
    insert into public.agent_audit_logs (
      actor_type, actor_id, event_type, object_type, object_id,
      previous_status, new_status, correlation_id, metadata
    )
    select 'worker', p_worker_id, 'job.claimed', 'agent_job', id,
      'queued', 'claimed', correlation_id, jsonb_build_object('attempt', attempt_count)
    from claimed
    returning 1
  )
  select claimed.* from claimed;
end;
$$;

create or replace function public.transition_agent_job(
  p_job_id uuid,
  p_new_status text,
  p_actor_type text,
  p_actor_id text default null,
  p_worker_id text default null,
  p_error_code text default null,
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.agent_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job public.agent_jobs;
  old_status text;
  legal boolean := false;
begin
  select * into current_job from public.agent_jobs where id = p_job_id for update;
  if current_job.id is null then raise exception 'Agent job not found' using errcode = 'P0002'; end if;
  old_status := current_job.status;
  if p_worker_id is not null and current_job.claimed_by is distinct from p_worker_id then
    raise exception 'Worker does not own this job' using errcode = '42501';
  end if;

  legal := case current_job.status
    when 'queued' then p_new_status in ('claimed', 'cancelled')
    when 'claimed' then p_new_status in ('running', 'queued', 'dead_letter', 'cancelled')
    when 'running' then p_new_status in ('completed', 'awaiting_approval', 'waiting_for_dependency', 'queued', 'failed', 'dead_letter', 'cancelled')
    when 'waiting_for_dependency' then p_new_status in ('queued', 'cancelled', 'expired')
    when 'awaiting_approval' then p_new_status in ('executing', 'completed', 'cancelled', 'expired')
    when 'executing' then p_new_status in ('completed', 'failed', 'cancelled')
    when 'failed' then p_new_status in ('queued', 'dead_letter', 'cancelled')
    when 'dead_letter' then p_new_status in ('queued', 'cancelled')
    else false
  end;
  if not legal then
    raise exception 'Invalid agent job transition: % -> %', current_job.status, p_new_status using errcode = '22023';
  end if;

  update public.agent_jobs
  set status = p_new_status,
      available_at = case
        when p_new_status = 'queued' and old_status <> 'queued'
          then now() + make_interval(secs => least(300, (5 * power(2, greatest(current_job.attempt_count - 1, 0)) + floor(random() * 5))::integer))
        else available_at
      end,
      last_error_code = p_error_code,
      last_error_message = case when p_error_message is null then null else left(p_error_message, 500) end,
      completed_at = case when p_new_status in ('completed', 'dead_letter', 'cancelled', 'expired') then now() else null end,
      claimed_by = case when p_new_status in ('queued', 'waiting_for_dependency', 'awaiting_approval', 'completed', 'failed', 'dead_letter', 'cancelled', 'expired') then null else claimed_by end,
      claimed_at = case when p_new_status in ('queued', 'waiting_for_dependency', 'awaiting_approval', 'completed', 'failed', 'dead_letter', 'cancelled', 'expired') then null else claimed_at end,
      lease_expires_at = case when p_new_status in ('queued', 'waiting_for_dependency', 'awaiting_approval', 'completed', 'failed', 'dead_letter', 'cancelled', 'expired') then null else lease_expires_at end,
      heartbeat_at = case when p_new_status in ('running', 'executing') then now() else heartbeat_at end
  where id = p_job_id
  returning * into current_job;

  insert into public.agent_audit_logs (
    actor_type, actor_id, event_type, object_type, object_id,
    previous_status, new_status, correlation_id, metadata
  ) values (
    p_actor_type, p_actor_id, 'job.status_changed', 'agent_job', p_job_id,
    old_status, p_new_status,
    current_job.correlation_id, coalesce(p_metadata, '{}'::jsonb)
  );

  return current_job;
end;
$$;

create or replace function public.renew_agent_job_lease(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.agent_jobs
  set heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => least(greatest(p_lease_seconds, 30), 900))
  where id = p_job_id
    and claimed_by = p_worker_id
    and status in ('claimed', 'running', 'executing');
  return found;
end;
$$;

create or replace function public.requeue_expired_agent_jobs()
returns table(requeued integer, dead_lettered integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requeue_count integer := 0;
  dead_count integer := 0;
begin
  update public.agent_runs r
  set status = 'failed', error_code = 'lease_expired', error_message = 'De workerlease is verlopen.', finished_at = now()
  where r.status = 'in_progress'
    and exists (
      select 1 from public.agent_jobs j
      where j.id = r.job_id and j.status in ('claimed', 'running') and j.lease_expires_at < now()
    );

  with expired as (
    select id, status, correlation_id
    from public.agent_jobs
    where status in ('claimed', 'running') and lease_expires_at < now()
    for update skip locked
  ), moved as (
    update public.agent_jobs j
    set status = case when j.attempt_count >= j.max_attempts then 'dead_letter' else 'queued' end,
        available_at = case when j.attempt_count >= j.max_attempts then j.available_at else now() + make_interval(secs => least(300, 5 * power(2, greatest(j.attempt_count - 1, 0))::integer)) end,
        claimed_by = null,
        claimed_at = null,
        lease_expires_at = null,
        heartbeat_at = null,
        last_error_code = 'lease_expired',
        last_error_message = 'De workerlease is verlopen.',
        completed_at = case when j.attempt_count >= j.max_attempts then now() else null end
    from expired e
    where j.id = e.id
    returning j.id, e.status as previous_status, j.status, j.correlation_id
  ), audit_rows as (
    insert into public.agent_audit_logs (
      actor_type, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata
    )
    select 'reconciler', 'job.lease_expired', 'agent_job', id, previous_status, status, correlation_id, '{}'::jsonb
    from moved
    returning 1
  )
  select count(*) filter (where status = 'queued'), count(*) filter (where status = 'dead_letter')
  into requeue_count, dead_count
  from moved;

  return query select coalesce(requeue_count, 0), coalesce(dead_count, 0);
end;
$$;

create or replace function public.decide_agent_approval(
  p_approval_id uuid,
  p_decision text,
  p_decided_by uuid,
  p_note text default null
)
returns table(approval_status text, execution_id uuid, observe_only boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  approval_row public.agent_approvals;
  artifact_hash text;
  settings_row public.agent_settings;
  created_execution uuid;
begin
  if p_decision not in ('approve', 'reject') then raise exception 'Invalid decision' using errcode = '22023'; end if;
  select * into approval_row from public.agent_approvals where id = p_approval_id for update;
  if approval_row.id is null then raise exception 'Approval not found' using errcode = 'P0002'; end if;
  if approval_row.status <> 'pending' then raise exception 'Approval is no longer pending' using errcode = '55000'; end if;
  if approval_row.expires_at is not null and approval_row.expires_at <= now() then raise exception 'Approval has expired' using errcode = '55000'; end if;
  select content_hash into artifact_hash from public.agent_artifacts where id = approval_row.artifact_id;
  if artifact_hash is distinct from approval_row.artifact_content_hash then raise exception 'Artifact changed' using errcode = '55000'; end if;
  select * into settings_row from public.agent_settings where singleton_key = true;

  if p_decision = 'reject' then
    update public.agent_approvals set status = 'rejected', decided_at = now(), decided_by = p_decided_by, decision_note = left(p_note, 2000) where id = p_approval_id;
    update public.agent_jobs set status = 'cancelled', completed_at = now() where id = approval_row.job_id and status = 'awaiting_approval';
    insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, metadata)
    values ('admin', p_decided_by::text, 'approval.rejected', 'agent_approval', p_approval_id, 'pending', 'rejected', jsonb_build_object('jobId', approval_row.job_id));
    insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    select 'admin', p_decided_by::text, 'job.status_changed', 'agent_job', id, 'awaiting_approval', 'cancelled', correlation_id,
      jsonb_build_object('reason', 'approval_rejected', 'approvalId', p_approval_id)
    from public.agent_jobs where id = approval_row.job_id;
    return query select 'rejected'::text, null::uuid, coalesce(settings_row.observe_only, true);
    return;
  end if;

  if coalesce(settings_row.observe_only, true) then
    update public.agent_approvals set status = 'executed', decided_at = now(), decided_by = p_decided_by, decision_note = left(p_note, 2000) where id = p_approval_id;
    update public.agent_jobs set status = 'completed', completed_at = now() where id = approval_row.job_id and status = 'awaiting_approval';
    insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, metadata)
    values ('admin', p_decided_by::text, 'approval.observe_only_approved', 'agent_approval', p_approval_id, 'pending', 'executed', jsonb_build_object('jobId', approval_row.job_id));
    insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    select 'admin', p_decided_by::text, 'job.status_changed', 'agent_job', id, 'awaiting_approval', 'completed', correlation_id,
      jsonb_build_object('reason', 'observe_only_approval', 'approvalId', p_approval_id)
    from public.agent_jobs where id = approval_row.job_id;
    return query select 'executed'::text, null::uuid, true;
    return;
  end if;

  if not coalesce(settings_row.agents_enabled, false) then
    raise exception 'Agent kill switch is active' using errcode = '55000';
  end if;

  update public.agent_approvals set status = 'approved', decided_at = now(), decided_by = p_decided_by, decision_note = left(p_note, 2000) where id = p_approval_id;
  insert into public.agent_executions (job_id, approval_id, artifact_id, executor_type, idempotency_key)
  values (approval_row.job_id, approval_row.id, approval_row.artifact_id, approval_row.action_type, 'approval:' || approval_row.id::text || ':' || approval_row.artifact_content_hash)
  returning id into created_execution;
  update public.agent_jobs set status = 'executing' where id = approval_row.job_id and status = 'awaiting_approval';
  insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, metadata)
  values ('admin', p_decided_by::text, 'approval.approved', 'agent_approval', p_approval_id, 'pending', 'approved', jsonb_build_object('jobId', approval_row.job_id, 'executionId', created_execution));
  insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
  select 'admin', p_decided_by::text, 'job.status_changed', 'agent_job', id, 'awaiting_approval', 'executing', correlation_id,
    jsonb_build_object('approvalId', p_approval_id, 'executionId', created_execution)
  from public.agent_jobs where id = approval_row.job_id;
  return query select 'approved'::text, created_execution, false;
end;
$$;

create or replace function public.complete_agent_run_with_artifact(
  p_run_id uuid,
  p_job_id uuid,
  p_artifact_type text,
  p_title text,
  p_content jsonb,
  p_content_hash text,
  p_output_summary text,
  p_provider_response_id text default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_total_tokens integer default null,
  p_action_type text default null,
  p_risk_level text default 'low',
  p_approval_expires_at timestamptz default null
)
returns table(artifact_id uuid, approval_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_row public.agent_jobs;
  new_artifact_id uuid;
  new_approval_id uuid;
begin
  select * into job_row from public.agent_jobs where id = p_job_id for update;
  if job_row.id is null then raise exception 'Agent job not found' using errcode = 'P0002'; end if;
  if job_row.status <> 'running' then raise exception 'Agent job is not running' using errcode = '55000'; end if;
  if jsonb_typeof(coalesce(p_content, '{}'::jsonb)) <> 'object' then raise exception 'Artifact content must be an object' using errcode = '22023'; end if;

  update public.agent_runs
  set status = 'completed', output_summary = left(coalesce(p_output_summary, ''), 2000),
      provider_response_id = p_provider_response_id,
      input_tokens = p_input_tokens, output_tokens = p_output_tokens, total_tokens = p_total_tokens,
      finished_at = now()
  where id = p_run_id and job_id = p_job_id and status = 'in_progress';
  if not found then raise exception 'Active agent run not found' using errcode = '55000'; end if;

  insert into public.agent_artifacts (job_id, run_id, artifact_type, title, content, version, content_hash)
  values (p_job_id, p_run_id, p_artifact_type, left(p_title, 500), p_content, 1, p_content_hash)
  returning id into new_artifact_id;

  if p_action_type is null then
    update public.agent_jobs set status = 'completed', completed_at = now(), claimed_by = null, claimed_at = null, heartbeat_at = null, lease_expires_at = null where id = p_job_id;
    insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    values ('worker', 'job.status_changed', 'agent_job', p_job_id, 'running', 'completed', job_row.correlation_id, jsonb_build_object('artifactId', new_artifact_id));
  else
    insert into public.agent_approvals (job_id, artifact_id, artifact_content_hash, action_type, risk_level, expires_at)
    values (p_job_id, new_artifact_id, p_content_hash, p_action_type, p_risk_level, p_approval_expires_at)
    returning id into new_approval_id;
    update public.agent_jobs set status = 'awaiting_approval', claimed_by = null, claimed_at = null, heartbeat_at = null, lease_expires_at = null where id = p_job_id;
    insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    values ('worker', 'job.status_changed', 'agent_job', p_job_id, 'running', 'awaiting_approval', job_row.correlation_id,
      jsonb_build_object('artifactId', new_artifact_id, 'approvalId', new_approval_id));
  end if;

  return query select new_artifact_id, new_approval_id;
end;
$$;

create or replace function public.revise_agent_artifact(
  p_artifact_id uuid,
  p_actor_id uuid,
  p_title text,
  p_content jsonb,
  p_content_hash text,
  p_action_type text,
  p_risk_level text,
  p_expires_at timestamptz default null
)
returns table(artifact_id uuid, approval_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_artifact public.agent_artifacts;
  next_version integer;
  new_artifact_id uuid;
  new_approval_id uuid;
begin
  select * into current_artifact from public.agent_artifacts where id = p_artifact_id for update;
  if current_artifact.id is null then raise exception 'Artifact not found' using errcode = 'P0002'; end if;
  if jsonb_typeof(coalesce(p_content, '{}'::jsonb)) <> 'object' then raise exception 'Artifact content must be an object' using errcode = '22023'; end if;
  select coalesce(max(version), 0) + 1 into next_version
  from public.agent_artifacts
  where job_id = current_artifact.job_id and artifact_type = current_artifact.artifact_type;

  update public.agent_approvals
  set status = 'invalidated'
  where artifact_id = current_artifact.id and status = 'pending';

  insert into public.agent_artifacts (
    job_id, run_id, artifact_type, title, content, version, content_hash, supersedes_artifact_id
  ) values (
    current_artifact.job_id, current_artifact.run_id, current_artifact.artifact_type,
    left(p_title, 500), p_content, next_version, p_content_hash, current_artifact.id
  ) returning id into new_artifact_id;

  insert into public.agent_approvals (job_id, artifact_id, artifact_content_hash, action_type, risk_level, expires_at)
  values (current_artifact.job_id, new_artifact_id, p_content_hash, p_action_type, p_risk_level, p_expires_at)
  returning id into new_approval_id;

  insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, metadata)
  values ('admin', p_actor_id::text, 'artifact.revised', 'agent_artifact', new_artifact_id,
    jsonb_build_object('supersedesArtifactId', current_artifact.id, 'approvalId', new_approval_id));
  return query select new_artifact_id, new_approval_id;
end;
$$;

create or replace function public.claim_agent_execution(
  p_execution_id uuid
)
returns public.agent_executions
language plpgsql
security definer
set search_path = ''
as $$
declare
  execution_row public.agent_executions;
begin
  update public.agent_executions
  set status = 'executing', attempt_count = attempt_count + 1, started_at = coalesce(started_at, now())
  where id = p_execution_id and status = 'pending' and attempt_count < max_attempts
    and exists (
      select 1 from public.agent_settings s
      where s.singleton_key = true and s.agents_enabled and not s.observe_only
    )
  returning * into execution_row;
  if execution_row.id is null then raise exception 'Execution is not claimable' using errcode = '55000'; end if;
  insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, metadata)
  values ('executor', 'execution.claimed', 'agent_execution', execution_row.id, 'pending', 'executing', jsonb_build_object('attempt', execution_row.attempt_count));
  return execution_row;
end;
$$;

create or replace function public.complete_agent_execution(
  p_execution_id uuid,
  p_status text,
  p_provider_action_id text default null,
  p_result_summary text default null,
  p_error_code text default null,
  p_error_message text default null
)
returns public.agent_executions
language plpgsql
security definer
set search_path = ''
as $$
declare
  execution_row public.agent_executions;
  resulting_job_status text;
  previous_execution_status text;
begin
  if p_status not in ('succeeded', 'failed', 'unknown') then raise exception 'Invalid execution status' using errcode = '22023'; end if;
  select * into execution_row from public.agent_executions where id = p_execution_id for update;
  if execution_row.id is null then raise exception 'Execution not found' using errcode = 'P0002'; end if;
  if execution_row.status not in ('executing', 'unknown') then raise exception 'Execution is not active' using errcode = '55000'; end if;
  if execution_row.status = 'unknown' and p_status = 'unknown' then raise exception 'Execution is already unknown' using errcode = '55000'; end if;
  previous_execution_status := execution_row.status;

  update public.agent_executions
  set status = p_status, provider_action_id = p_provider_action_id,
      result_summary = left(p_result_summary, 2000), last_error_code = p_error_code,
      last_error_message = case when p_error_message is null then null else left(p_error_message, 500) end,
      finished_at = case when p_status in ('succeeded', 'failed') then now() else null end
  where id = p_execution_id
  returning * into execution_row;

  if p_status = 'succeeded' then
    update public.agent_approvals set status = 'executed' where id = execution_row.approval_id;
    update public.agent_jobs set status = 'completed', completed_at = now() where id = execution_row.job_id;
    resulting_job_status := 'completed';
  elsif p_status = 'failed' then
    update public.agent_approvals set status = 'execution_failed' where id = execution_row.approval_id;
    update public.agent_jobs set status = 'failed', last_error_code = p_error_code,
      last_error_message = case when p_error_message is null then null else left(p_error_message, 500) end
    where id = execution_row.job_id;
    resulting_job_status := 'failed';
  else
    resulting_job_status := 'executing';
  end if;

  insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, metadata)
  values ('executor', 'execution.completed', 'agent_execution', execution_row.id, previous_execution_status, p_status,
    jsonb_build_object('jobId', execution_row.job_id, 'jobStatus', resulting_job_status));
  if p_status in ('succeeded', 'failed') then
    insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    select 'executor', 'job.status_changed', 'agent_job', id, 'executing', resulting_job_status, correlation_id,
      jsonb_build_object('executionId', execution_row.id)
    from public.agent_jobs where id = execution_row.job_id;
  end if;
  return execution_row;
end;
$$;

create or replace function public.retry_agent_job(
  p_job_id uuid,
  p_actor_id uuid
)
returns public.agent_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_row public.agent_jobs;
  previous_job_status text;
begin
  select * into job_row from public.agent_jobs where id = p_job_id for update;
  if job_row.id is null then raise exception 'Agent job not found' using errcode = 'P0002'; end if;
  if job_row.status not in ('failed', 'dead_letter') then raise exception 'Agent job is not retryable' using errcode = '55000'; end if;
  previous_job_status := job_row.status;

  update public.agent_jobs
  set status = 'queued', attempt_count = 0, available_at = now(), scheduled_for = least(scheduled_for, now()),
      claimed_by = null, claimed_at = null, heartbeat_at = null, lease_expires_at = null,
      last_error_code = null, last_error_message = null, completed_at = null
  where id = p_job_id
  returning * into job_row;

  insert into public.agent_audit_logs (actor_type, actor_id, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
  values ('admin', p_actor_id::text, 'job.manual_retry', 'agent_job', p_job_id, previous_job_status, 'queued', job_row.correlation_id, '{}'::jsonb);
  return job_row;
end;
$$;

create or replace function public.expire_agent_approvals()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer := 0;
begin
  with expired as (
    update public.agent_approvals
    set status = 'expired'
    where status = 'pending' and expires_at is not null and expires_at <= now()
    returning id, job_id
  ), jobs as (
    update public.agent_jobs j set status = 'expired', completed_at = now()
    from expired e where j.id = e.job_id and j.status = 'awaiting_approval'
    returning j.id, j.correlation_id
  ), audit_rows as (
    insert into public.agent_audit_logs (actor_type, event_type, object_type, object_id, previous_status, new_status, correlation_id, metadata)
    select 'reconciler', 'job.status_changed', 'agent_job', id, 'awaiting_approval', 'expired', correlation_id,
      jsonb_build_object('reason', 'approval_expired')
    from jobs returning 1
  )
  select count(*) into affected from expired;
  return affected;
end;
$$;

create or replace function public.cleanup_agent_history()
returns table(deleted_jobs integer, deleted_audit_logs integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings_row public.agent_settings;
  jobs_count integer := 0;
  audit_count integer := 0;
begin
  select * into settings_row from public.agent_settings where singleton_key = true;
  perform set_config('app.agent_maintenance', 'retention', true);

  delete from public.agent_jobs
  where status in ('completed', 'failed', 'dead_letter', 'cancelled', 'expired')
    and coalesce(completed_at, updated_at) < now() - make_interval(days => coalesce(settings_row.run_retention_days, 90));
  get diagnostics jobs_count = row_count;

  delete from public.agent_audit_logs
  where created_at < now() - make_interval(days => coalesce(settings_row.audit_retention_days, 365));
  get diagnostics audit_count = row_count;

  return query select jobs_count, audit_count;
end;
$$;

revoke all on function public.enqueue_agent_job(text, text, text, text, uuid, jsonb, integer, smallint, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.claim_agent_jobs(text, integer, integer) from public, anon, authenticated;
revoke all on function public.transition_agent_job(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.renew_agent_job_lease(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.requeue_expired_agent_jobs() from public, anon, authenticated;
revoke all on function public.decide_agent_approval(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.complete_agent_run_with_artifact(uuid, uuid, text, text, jsonb, text, text, text, integer, integer, integer, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.revise_agent_artifact(uuid, uuid, text, jsonb, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_agent_execution(uuid) from public, anon, authenticated;
revoke all on function public.complete_agent_execution(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.retry_agent_job(uuid, uuid) from public, anon, authenticated;
revoke all on function public.expire_agent_approvals() from public, anon, authenticated;
revoke all on function public.cleanup_agent_history() from public, anon, authenticated;

grant execute on function public.enqueue_agent_job(text, text, text, text, uuid, jsonb, integer, smallint, text, timestamptz, integer) to service_role;
grant execute on function public.claim_agent_jobs(text, integer, integer) to service_role;
grant execute on function public.transition_agent_job(uuid, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.renew_agent_job_lease(uuid, text, integer) to service_role;
grant execute on function public.requeue_expired_agent_jobs() to service_role;
grant execute on function public.decide_agent_approval(uuid, text, uuid, text) to service_role;
grant execute on function public.complete_agent_run_with_artifact(uuid, uuid, text, text, jsonb, text, text, text, integer, integer, integer, text, text, timestamptz) to service_role;
grant execute on function public.revise_agent_artifact(uuid, uuid, text, jsonb, text, text, text, timestamptz) to service_role;
grant execute on function public.claim_agent_execution(uuid) to service_role;
grant execute on function public.complete_agent_execution(uuid, text, text, text, text, text) to service_role;
grant execute on function public.retry_agent_job(uuid, uuid) to service_role;
grant execute on function public.expire_agent_approvals() to service_role;
grant execute on function public.cleanup_agent_history() to service_role;

comment on table public.agent_jobs is 'Durable server-owned queue for FlexPagina agent workflows.';
comment on table public.agent_artifacts is 'Immutable versioned agent outputs; prefer references over copied customer data.';
comment on table public.agent_approvals is 'Single-use human decisions bound to an exact artifact content hash.';
comment on table public.agent_executions is 'External side-effect ledger with stable idempotency keys and unknown outcome support.';
comment on table public.agent_audit_logs is 'Append-only technical trail for agent state and approval changes.';

commit;
