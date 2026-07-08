-- ============================================================
-- Audit logs for security, billing, website, and domain actions
-- ============================================================

begin;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  action text not null,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);

create index if not exists idx_audit_logs_user_created_at
  on public.audit_logs (user_id, created_at desc)
  where user_id is not null;

create index if not exists idx_audit_logs_website_created_at
  on public.audit_logs (website_id, created_at desc)
  where website_id is not null;

create index if not exists idx_audit_logs_action_created_at
  on public.audit_logs (action, created_at desc);

alter table public.audit_logs enable row level security;

comment on table public.audit_logs is
  'Server-written audit trail for important account, website, billing, domain, and security actions. Client access is intentionally restricted by RLS.';

commit;
