-- ============================================================
-- Milestone 13: generic contact/request storage
-- ============================================================

begin;

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references public.websites(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  request_type text not null default 'contact'
    check (request_type in ('contact', 'quote', 'appointment', 'booking_request', 'whatsapp')),
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  service text not null default '',
  preferred_date text not null default '',
  budget text not null default '',
  message text not null default '',
  payload jsonb not null default '{}'::jsonb,
  recipient_email text not null default '',
  source text not null default 'website_form',
  created_at timestamptz not null default now()
);

alter table public.contact_requests
  add column if not exists website_id uuid references public.websites(id) on delete set null,
  add column if not exists business_id uuid references public.businesses(id) on delete set null,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists request_type text not null default 'contact',
  add column if not exists name text not null default '',
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists service text not null default '',
  add column if not exists preferred_date text not null default '',
  add column if not exists budget text not null default '',
  add column if not exists message text not null default '',
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists recipient_email text not null default '',
  add column if not exists source text not null default 'website_form',
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contact_requests_request_type_check'
      and conrelid = 'public.contact_requests'::regclass
  ) then
    alter table public.contact_requests
      add constraint contact_requests_request_type_check
      check (request_type in ('contact', 'quote', 'appointment', 'booking_request', 'whatsapp'));
  end if;
end $$;

create index if not exists idx_contact_requests_website_id
  on public.contact_requests (website_id);

create index if not exists idx_contact_requests_business_id
  on public.contact_requests (business_id);

create index if not exists idx_contact_requests_user_id_created_at
  on public.contact_requests (user_id, created_at desc);

alter table public.contact_requests enable row level security;

drop policy if exists "Users can view own contact requests" on public.contact_requests;
create policy "Users can view own contact requests"
  on public.contact_requests for select
  using (auth.uid() = user_id);

drop policy if exists "Anyone can insert public contact requests" on public.contact_requests;
create policy "Anyone can insert public contact requests"
  on public.contact_requests for insert
  with check (true);

drop policy if exists "Users can delete own contact requests" on public.contact_requests;
create policy "Users can delete own contact requests"
  on public.contact_requests for delete
  using (auth.uid() = user_id);

commit;

