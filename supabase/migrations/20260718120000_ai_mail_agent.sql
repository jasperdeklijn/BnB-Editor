begin;

create table if not exists public.mail_accounts (
  id uuid primary key default gen_random_uuid(),
  email_address text not null unique,
  display_name text not null default 'FlexPagina support',
  imap_host text not null default 'imap.transip.email',
  imap_port integer not null default 993 check (imap_port between 1 and 65535),
  imap_secure boolean not null default true,
  smtp_host text not null default 'smtp.transip.email',
  smtp_port integer not null default 465 check (smtp_port between 1 and 65535),
  smtp_secure boolean not null default true,
  inbox_folder text not null default 'INBOX',
  sent_folder text not null default 'Sent',
  last_inbox_uid bigint not null default 0 check (last_inbox_uid >= 0),
  last_sent_uid bigint not null default 0 check (last_sent_uid >= 0),
  inbox_uid_validity text,
  sent_uid_validity text,
  enabled boolean not null default true,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mail_accounts_email_normalized_check check (
    email_address = lower(btrim(email_address)) and position('@' in email_address) > 1
  )
);

create table if not exists public.mail_threads (
  id uuid primary key default gen_random_uuid(),
  mail_account_id uuid not null references public.mail_accounts(id) on delete cascade,
  subject_normalized text not null default '',
  contact_email text not null default '',
  contact_name text,
  status text not null default 'new'
    check (status in ('new', 'draft_ready', 'needs_review', 'replied', 'closed', 'ignored')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  unread_count integer not null default 0 check (unread_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.mail_threads(id) on delete cascade,
  mail_account_id uuid not null references public.mail_accounts(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  internet_message_id text,
  in_reply_to text,
  message_references text[] not null default '{}'::text[],
  imap_folder text not null,
  imap_uid bigint check (imap_uid is null or imap_uid >= 0),
  from_address text not null default '',
  from_name text,
  to_addresses text[] not null default '{}'::text[],
  cc_addresses text[] not null default '{}'::text[],
  subject text not null default '',
  text_body text not null default '',
  html_body text,
  attachment_metadata jsonb not null default '[]'::jsonb,
  raw_headers jsonb not null default '{}'::jsonb,
  received_at timestamptz,
  sent_at timestamptz,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint mail_messages_folder_uid_unique unique (mail_account_id, imap_folder, imap_uid),
  constraint mail_messages_internet_id_unique unique (mail_account_id, internet_message_id)
);

create table if not exists public.mail_knowledge_answers (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  keywords text[] not null default '{}'::text[],
  category text not null default 'algemeen',
  language text not null default 'nl',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  priority integer not null default 0 check (priority between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mail_knowledge_question_not_blank check (btrim(question) <> ''),
  constraint mail_knowledge_answer_not_blank check (btrim(answer) <> '')
);

create table if not exists public.mail_drafts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.mail_threads(id) on delete cascade,
  in_reply_to_message_id uuid not null references public.mail_messages(id) on delete cascade,
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'edited', 'sending', 'sent', 'discarded', 'failed')),
  subject text not null default '',
  suggested_body text not null default '',
  final_body text,
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  confidence_reasons text[] not null default '{}'::text[],
  missing_information text[] not null default '{}'::text[],
  knowledge_answer_ids uuid[] not null default '{}'::uuid[],
  example_message_ids uuid[] not null default '{}'::uuid[],
  model text,
  prompt_version text not null default 'mail-reply-v1',
  generation_error text,
  send_key uuid not null default gen_random_uuid() unique,
  outbound_message_id uuid references public.mail_messages(id) on delete set null,
  generated_at timestamptz,
  edited_at timestamptz,
  sent_at timestamptz,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.mail_feedback (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique references public.mail_drafts(id) on delete cascade,
  outcome text not null check (outcome in ('accepted_without_changes', 'edited_then_sent', 'discarded')),
  rating integer check (rating between 1 and 5),
  reason text,
  edit_ratio numeric check (edit_ratio is null or (edit_ratio >= 0 and edit_ratio <= 1)),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.mail_sync_runs (
  id uuid primary key default gen_random_uuid(),
  mail_account_id uuid references public.mail_accounts(id) on delete cascade,
  run_key text not null unique,
  trigger text not null default 'cron' check (trigger in ('cron', 'manual')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed', 'skipped')),
  fetched_count integer not null default 0 check (fetched_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  draft_count integer not null default 0 check (draft_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

drop trigger if exists set_mail_accounts_updated_at on public.mail_accounts;
create trigger set_mail_accounts_updated_at
  before update on public.mail_accounts
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_mail_threads_updated_at on public.mail_threads;
create trigger set_mail_threads_updated_at
  before update on public.mail_threads
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_mail_knowledge_answers_updated_at on public.mail_knowledge_answers;
create trigger set_mail_knowledge_answers_updated_at
  before update on public.mail_knowledge_answers
  for each row execute procedure public.set_updated_at();

create index if not exists idx_mail_threads_status_last_message
  on public.mail_threads (status, last_message_at desc);
create index if not exists idx_mail_threads_account_last_message
  on public.mail_threads (mail_account_id, last_message_at desc);
create index if not exists idx_mail_messages_thread_created
  on public.mail_messages (thread_id, created_at);
create index if not exists idx_mail_messages_in_reply_to
  on public.mail_messages (mail_account_id, in_reply_to)
  where in_reply_to is not null;
create index if not exists idx_mail_knowledge_status_priority
  on public.mail_knowledge_answers (status, priority desc, updated_at desc);
create index if not exists idx_mail_drafts_thread_created
  on public.mail_drafts (thread_id, created_at desc);
create index if not exists idx_mail_sync_runs_started
  on public.mail_sync_runs (started_at desc);

alter table public.mail_accounts enable row level security;
alter table public.mail_threads enable row level security;
alter table public.mail_messages enable row level security;
alter table public.mail_knowledge_answers enable row level security;
alter table public.mail_drafts enable row level security;
alter table public.mail_feedback enable row level security;
alter table public.mail_sync_runs enable row level security;

insert into public.mail_knowledge_answers (
  question,
  answer,
  keywords,
  category,
  language,
  status,
  priority
) values (
  'Hoe koppel ik een domeinnaam?',
  'Ga in het dashboard naar Domeinen, kies Domein koppelen en volg daar de stappen.',
  array['domein', 'domeinnaam', 'koppelen', 'verbinden', 'dns']::text[],
  'domeinen',
  'nl',
  'active',
  100
)
on conflict do nothing;

comment on table public.mail_accounts is
  'Server-owned mailbox configuration and IMAP cursors. Passwords remain in server environment variables.';
comment on table public.mail_messages is
  'Normalized support mail. Binary attachment bodies and unrestricted raw messages are intentionally not stored.';
comment on table public.mail_drafts is
  'Admin-reviewed AI suggestions. Sending always requires an explicit authenticated admin request.';

commit;
