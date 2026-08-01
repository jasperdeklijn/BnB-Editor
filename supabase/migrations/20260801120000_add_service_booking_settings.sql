-- Booking Engine 2.0 phase 1: per-service rules used by the availability engine.

begin;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'services_id_business_id_key'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_id_business_id_key unique (id, business_id);
  end if;
end $$;

create table if not exists public.service_booking_settings (
  service_id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  booking_enabled boolean not null default false,
  booking_mode text not null default 'appointment'
    check (booking_mode in ('appointment', 'stay')),
  confirmation_mode text not null default 'request'
    check (confirmation_mode in ('request', 'instant')),
  timezone text not null default 'Europe/Amsterdam',
  duration_minutes integer not null default 60
    check (duration_minutes between 5 and 1440),
  slot_interval_minutes integer not null default 30
    check (slot_interval_minutes between 5 and 1440),
  buffer_before_minutes integer not null default 0
    check (buffer_before_minutes between 0 and 1440),
  buffer_after_minutes integer not null default 0
    check (buffer_after_minutes between 0 and 1440),
  minimum_notice_minutes integer not null default 1440
    check (minimum_notice_minutes between 0 and 525600),
  booking_horizon_days integer not null default 90
    check (booking_horizon_days between 1 and 730),
  capacity integer not null default 1
    check (capacity between 1 and 10000),
  minimum_nights integer not null default 1
    check (minimum_nights between 1 and 365),
  maximum_nights integer not null default 30
    check (maximum_nights between 1 and 730),
  check_in_time time not null default '15:00',
  check_out_time time not null default '11:00',
  cancellation_cutoff_minutes integer not null default 1440
    check (cancellation_cutoff_minutes between 0 and 525600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_booking_settings_nights_check
    check (maximum_nights >= minimum_nights),
  constraint service_booking_settings_service_business_unique
    unique (service_id, business_id),
  constraint service_booking_settings_service_business_fkey
    foreign key (service_id, business_id)
    references public.services(id, business_id) on delete cascade
);

create index if not exists idx_service_booking_settings_business
  on public.service_booking_settings (business_id);

create index if not exists idx_service_booking_settings_enabled
  on public.service_booking_settings (business_id, booking_enabled)
  where booking_enabled = true;

drop trigger if exists set_service_booking_settings_updated_at on public.service_booking_settings;
create trigger set_service_booking_settings_updated_at
  before update on public.service_booking_settings
  for each row execute procedure public.set_updated_at();

alter table public.service_booking_settings enable row level security;

drop policy if exists "Users can view own service booking settings" on public.service_booking_settings;
create policy "Users can view own service booking settings"
  on public.service_booking_settings for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = service_booking_settings.business_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own service booking settings" on public.service_booking_settings;
create policy "Users can insert own service booking settings"
  on public.service_booking_settings for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = service_booking_settings.business_id
        and b.user_id = auth.uid()
    )
    and exists (
      select 1 from public.services s
      where s.id = service_booking_settings.service_id
        and s.business_id = service_booking_settings.business_id
    )
  );

drop policy if exists "Users can update own service booking settings" on public.service_booking_settings;
create policy "Users can update own service booking settings"
  on public.service_booking_settings for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = service_booking_settings.business_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = service_booking_settings.business_id
        and b.user_id = auth.uid()
    )
    and exists (
      select 1 from public.services s
      where s.id = service_booking_settings.service_id
        and s.business_id = service_booking_settings.business_id
    )
  );

drop policy if exists "Users can delete own service booking settings" on public.service_booking_settings;
create policy "Users can delete own service booking settings"
  on public.service_booking_settings for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = service_booking_settings.business_id
        and b.user_id = auth.uid()
    )
  );

comment on table public.service_booking_settings is
  'Owner-managed Booking Engine 2.0 rules. Public booking remains Gold-gated at the server runtime boundary.';

commit;
