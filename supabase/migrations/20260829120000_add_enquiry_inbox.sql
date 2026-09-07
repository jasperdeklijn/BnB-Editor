begin;

alter table public.contact_requests
  add column if not exists status text not null default 'new',
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists last_replied_at timestamptz,
  add column if not exists follow_up_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_reason text not null default '',
  add column if not exists owner_notes text not null default '',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contact_requests_status_check'
      and conrelid = 'public.contact_requests'::regclass
  ) then
    alter table public.contact_requests
      add constraint contact_requests_status_check
      check (status in ('new', 'in_progress', 'awaiting_customer', 'won', 'lost', 'spam', 'archived'));
  end if;
end $$;

create table if not exists public.contact_request_messages (
  id uuid primary key default gen_random_uuid(),
  contact_request_id uuid not null references public.contact_requests(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_email text not null default '',
  sender_name text not null default '',
  recipient_email text not null default '',
  subject text not null default '',
  body text not null default '',
  delivery_status text not null default 'received'
    check (delivery_status in ('received', 'queued', 'sent', 'failed')),
  provider_message_id text,
  idempotency_key text not null unique,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_request_activities (
  id uuid primary key default gen_random_uuid(),
  contact_request_id uuid not null references public.contact_requests(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('status_changed', 'note_added', 'follow_up_set', 'reply_sent')),
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_request_reply_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  subject text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_request_reply_templates_name_not_blank check (btrim(name) <> ''),
  constraint contact_request_reply_templates_name_unique unique (business_id, name)
);

insert into public.contact_request_messages (
  contact_request_id, business_id, direction, sender_email, sender_name,
  recipient_email, subject, body, delivery_status, idempotency_key, sent_at, created_at
)
select
  cr.id,
  cr.business_id,
  'inbound',
  cr.email,
  cr.name,
  cr.recipient_email,
  case cr.request_type
    when 'quote' then 'Offerteaanvraag'
    when 'appointment' then 'Afspraakaanvraag'
    when 'booking_request' then 'Boekingsaanvraag'
    else 'Website aanvraag'
  end,
  cr.message,
  'received',
  'contact-request:' || cr.id::text,
  cr.created_at,
  cr.created_at
from public.contact_requests cr
where cr.business_id is not null
on conflict (idempotency_key) do nothing;

create index if not exists idx_contact_requests_business_inbox
  on public.contact_requests (business_id, status, last_activity_at desc);

create index if not exists idx_contact_requests_business_follow_up
  on public.contact_requests (business_id, follow_up_at)
  where follow_up_at is not null and closed_at is null;

create index if not exists idx_contact_request_messages_request_created
  on public.contact_request_messages (contact_request_id, created_at);

create index if not exists idx_contact_request_messages_business_created
  on public.contact_request_messages (business_id, created_at desc);

create index if not exists idx_contact_request_activities_request_created
  on public.contact_request_activities (contact_request_id, created_at);

create index if not exists idx_contact_request_reply_templates_business
  on public.contact_request_reply_templates (business_id, name);

drop trigger if exists set_contact_requests_updated_at on public.contact_requests;
create trigger set_contact_requests_updated_at
  before update on public.contact_requests
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_contact_request_messages_updated_at on public.contact_request_messages;
create trigger set_contact_request_messages_updated_at
  before update on public.contact_request_messages
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_contact_request_reply_templates_updated_at on public.contact_request_reply_templates;
create trigger set_contact_request_reply_templates_updated_at
  before update on public.contact_request_reply_templates
  for each row execute procedure public.set_updated_at();

alter table public.contact_request_messages enable row level security;
alter table public.contact_request_activities enable row level security;
alter table public.contact_request_reply_templates enable row level security;

drop policy if exists "Users can update own contact requests" on public.contact_requests;
create policy "Users can update own contact requests"
  on public.contact_requests for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = contact_requests.business_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = contact_requests.business_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view own contact request messages" on public.contact_request_messages;
create policy "Users can view own contact request messages"
  on public.contact_request_messages for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = contact_request_messages.business_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own outbound contact request messages" on public.contact_request_messages;
create policy "Users can insert own outbound contact request messages"
  on public.contact_request_messages for insert
  with check (
    direction = 'outbound'
    and exists (
      select 1 from public.businesses b
      where b.id = contact_request_messages.business_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own outbound contact request messages" on public.contact_request_messages;
create policy "Users can update own outbound contact request messages"
  on public.contact_request_messages for update
  using (
    direction = 'outbound'
    and exists (
      select 1 from public.businesses b
      where b.id = contact_request_messages.business_id and b.user_id = auth.uid()
    )
  )
  with check (
    direction = 'outbound'
    and exists (
      select 1 from public.businesses b
      where b.id = contact_request_messages.business_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view own contact request activities" on public.contact_request_activities;
create policy "Users can view own contact request activities"
  on public.contact_request_activities for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = contact_request_activities.business_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own contact request activities" on public.contact_request_activities;
create policy "Users can insert own contact request activities"
  on public.contact_request_activities for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = contact_request_activities.business_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage own contact request reply templates" on public.contact_request_reply_templates;
create policy "Users can manage own contact request reply templates"
  on public.contact_request_reply_templates for all
  using (
    exists (
      select 1 from public.businesses b
      where b.id = contact_request_reply_templates.business_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = contact_request_reply_templates.business_id and b.user_id = auth.uid()
    )
  );

comment on table public.contact_request_messages is
  'Tenant-scoped website enquiry conversation history. WhatsApp messages are intentionally out of scope.';

commit;
