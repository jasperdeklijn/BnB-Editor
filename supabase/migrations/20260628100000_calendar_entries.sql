-- ============================================================
-- Calendar entries for appointments, bookings, blocked periods, and notes
-- ============================================================

begin;

create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  contact_request_id uuid references public.contact_requests(id) on delete set null,
  entry_type text not null default 'appointment',
  status text not null default 'pending',
  source text not null default 'manual',
  title text not null default '',
  customer_name text not null default '',
  customer_email text not null default '',
  customer_phone text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  timezone text not null default 'Europe/Amsterdam',
  internal_notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_entries
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists contact_request_id uuid references public.contact_requests(id) on delete set null,
  add column if not exists entry_type text not null default 'appointment',
  add column if not exists status text not null default 'pending',
  add column if not exists source text not null default 'manual',
  add column if not exists title text not null default '',
  add column if not exists customer_name text not null default '',
  add column if not exists customer_email text not null default '',
  add column if not exists customer_phone text not null default '',
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists all_day boolean not null default false,
  add column if not exists timezone text not null default 'Europe/Amsterdam',
  add column if not exists internal_notes text not null default '',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'calendar_entries_entry_type_check'
      and conrelid = 'public.calendar_entries'::regclass
  ) then
    alter table public.calendar_entries
      add constraint calendar_entries_entry_type_check
      check (entry_type in ('appointment', 'booking', 'blocked', 'note'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'calendar_entries_status_check'
      and conrelid = 'public.calendar_entries'::regclass
  ) then
    alter table public.calendar_entries
      add constraint calendar_entries_status_check
      check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'blocked'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'calendar_entries_source_check'
      and conrelid = 'public.calendar_entries'::regclass
  ) then
    alter table public.calendar_entries
      add constraint calendar_entries_source_check
      check (source in ('manual', 'website_form', 'contact_request', 'import'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'calendar_entries_time_range_check'
      and conrelid = 'public.calendar_entries'::regclass
  ) then
    alter table public.calendar_entries
      add constraint calendar_entries_time_range_check
      check (end_at > start_at);
  end if;
end $$;

create index if not exists idx_calendar_entries_business_start
  on public.calendar_entries (business_id, start_at);

create index if not exists idx_calendar_entries_business_end
  on public.calendar_entries (business_id, end_at);

create index if not exists idx_calendar_entries_service_start
  on public.calendar_entries (service_id, start_at)
  where service_id is not null;

create index if not exists idx_calendar_entries_contact_request
  on public.calendar_entries (contact_request_id)
  where contact_request_id is not null;

create index if not exists idx_calendar_entries_status
  on public.calendar_entries (business_id, status);

drop trigger if exists set_calendar_entries_updated_at on public.calendar_entries;
create trigger set_calendar_entries_updated_at
  before update on public.calendar_entries
  for each row execute procedure public.set_updated_at();

alter table public.calendar_entries enable row level security;

drop policy if exists "Users can view own calendar entries" on public.calendar_entries;
create policy "Users can view own calendar entries"
  on public.calendar_entries for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_entries.business_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own calendar entries" on public.calendar_entries;
create policy "Users can insert own calendar entries"
  on public.calendar_entries for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_entries.business_id
        and b.user_id = auth.uid()
    )
    and (
      calendar_entries.service_id is null
      or exists (
        select 1 from public.services s
        where s.id = calendar_entries.service_id
          and s.business_id = calendar_entries.business_id
      )
    )
    and (
      calendar_entries.contact_request_id is null
      or exists (
        select 1 from public.contact_requests cr
        where cr.id = calendar_entries.contact_request_id
          and cr.business_id = calendar_entries.business_id
      )
    )
  );

drop policy if exists "Users can update own calendar entries" on public.calendar_entries;
create policy "Users can update own calendar entries"
  on public.calendar_entries for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_entries.business_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_entries.business_id
        and b.user_id = auth.uid()
    )
    and (
      calendar_entries.service_id is null
      or exists (
        select 1 from public.services s
        where s.id = calendar_entries.service_id
          and s.business_id = calendar_entries.business_id
      )
    )
    and (
      calendar_entries.contact_request_id is null
      or exists (
        select 1 from public.contact_requests cr
        where cr.id = calendar_entries.contact_request_id
          and cr.business_id = calendar_entries.business_id
      )
    )
  );

drop policy if exists "Users can delete own calendar entries" on public.calendar_entries;
create policy "Users can delete own calendar entries"
  on public.calendar_entries for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = calendar_entries.business_id
        and b.user_id = auth.uid()
    )
  );

commit;
