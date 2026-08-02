-- Booking Engine 2.0 phase 5: reservation pricing and immutable invoice PDFs.

begin;

create table if not exists public.booking_invoice_profiles (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  legal_name text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  postal_code text not null default '',
  city text not null default '',
  country_code text not null default 'NL' check (country_code ~ '^[A-Z]{2}$'),
  email text not null default '',
  vat_id text not null default '',
  kvk_number text not null default '',
  iban text not null default '',
  default_vat_basis_points integer not null default 2100 check (default_vat_basis_points between 0 and 10000),
  invoice_prefix text not null default 'F' check (invoice_prefix ~ '^[A-Z0-9-]{1,12}$'),
  credit_note_prefix text not null default 'CR' check (credit_note_prefix ~ '^[A-Z0-9-]{1,12}$'),
  payment_term_days integer not null default 14 check (payment_term_days between 0 and 365),
  accent_color text not null default '#16302B' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_reservation_financials (
  calendar_entry_id uuid primary key references public.calendar_entries(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  reservation_number text not null unique,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  pricing_status text not null default 'needs_review' check (pricing_status in ('needs_review', 'ready')),
  settlement_status text not null default 'open' check (settlement_status in ('open', 'paid', 'refunded')),
  line_items jsonb not null default '[]'::jsonb check (jsonb_typeof(line_items) = 'array'),
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  vat_total_minor bigint not null default 0 check (vat_total_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0 and total_minor = subtotal_minor + vat_total_minor),
  priced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_reservation_financials_business_number_key unique (business_id, reservation_number)
);

create table if not exists public.booking_document_counters (
  business_id uuid not null references public.businesses(id) on delete cascade,
  document_type text not null check (document_type in ('invoice', 'credit_note')),
  document_year integer not null check (document_year between 2000 and 9999),
  last_value bigint not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (business_id, document_type, document_year)
);

create table if not exists public.booking_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  calendar_entry_id uuid not null references public.calendar_entries(id) on delete cascade,
  document_type text not null default 'invoice' check (document_type in ('invoice', 'credit_note')),
  status text not null default 'draft' check (status in ('draft', 'issued', 'credited', 'void')),
  invoice_number text,
  reservation_number text not null,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  seller_details jsonb not null default '{}'::jsonb check (jsonb_typeof(seller_details) = 'object'),
  customer_details jsonb not null default '{}'::jsonb check (jsonb_typeof(customer_details) = 'object'),
  line_items jsonb not null default '[]'::jsonb check (jsonb_typeof(line_items) = 'array'),
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  vat_total_minor bigint not null default 0 check (vat_total_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0 and total_minor = subtotal_minor + vat_total_minor),
  service_date date not null,
  due_date date not null,
  issued_at timestamptz,
  corrects_invoice_id uuid references public.booking_invoices(id) on delete restrict,
  pdf_storage_path text,
  pdf_sha256 text,
  pdf_size_bytes integer check (pdf_size_bytes is null or pdf_size_bytes > 0),
  first_downloaded_at timestamptz,
  emailed_at timestamptz,
  email_message_id text,
  voided_at timestamptz,
  void_reason text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_invoices_number_state_check check (
    (status = 'draft' and invoice_number is null and issued_at is null)
    or (status <> 'draft' and invoice_number is not null and issued_at is not null)
  ),
  constraint booking_invoices_credit_reference_check check (
    (document_type = 'invoice' and corrects_invoice_id is null)
    or (document_type = 'credit_note' and corrects_invoice_id is not null)
  )
);

create table if not exists public.booking_invoice_emails (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.booking_invoices(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  recipient_email text not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists booking_invoices_business_number_idx
  on public.booking_invoices (business_id, invoice_number)
  where invoice_number is not null;
create unique index if not exists booking_invoices_one_draft_idx
  on public.booking_invoices (calendar_entry_id)
  where document_type = 'invoice' and status = 'draft';
create unique index if not exists booking_invoices_one_credit_note_idx
  on public.booking_invoices (corrects_invoice_id)
  where corrects_invoice_id is not null;
create unique index if not exists booking_invoice_emails_one_active_idx
  on public.booking_invoice_emails (invoice_id)
  where status in ('pending', 'sending');
create index if not exists booking_reservation_financials_number_idx
  on public.booking_reservation_financials (reservation_number);
create index if not exists booking_invoices_reservation_number_idx
  on public.booking_invoices (reservation_number);
create index if not exists booking_invoices_entry_created_idx
  on public.booking_invoices (calendar_entry_id, created_at desc);

drop trigger if exists set_booking_invoice_profiles_updated_at on public.booking_invoice_profiles;
create trigger set_booking_invoice_profiles_updated_at before update on public.booking_invoice_profiles
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_booking_reservation_financials_updated_at on public.booking_reservation_financials;
create trigger set_booking_reservation_financials_updated_at before update on public.booking_reservation_financials
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_booking_invoices_updated_at on public.booking_invoices;
create trigger set_booking_invoices_updated_at before update on public.booking_invoices
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_booking_invoice_emails_updated_at on public.booking_invoice_emails;
create trigger set_booking_invoice_emails_updated_at before update on public.booking_invoice_emails
  for each row execute procedure public.set_updated_at();

alter table public.booking_invoice_profiles enable row level security;
alter table public.booking_reservation_financials enable row level security;
alter table public.booking_document_counters enable row level security;
alter table public.booking_invoices enable row level security;
alter table public.booking_invoice_emails enable row level security;

create policy "Users can view own booking invoice profile" on public.booking_invoice_profiles
  for select to authenticated using (exists (
    select 1 from public.businesses b where b.id = booking_invoice_profiles.business_id and b.user_id = auth.uid()
  ));
create policy "Users can view own reservation financials" on public.booking_reservation_financials
  for select to authenticated using (exists (
    select 1 from public.businesses b where b.id = booking_reservation_financials.business_id and b.user_id = auth.uid()
  ));
create policy "Users can view own booking invoices" on public.booking_invoices
  for select to authenticated using (exists (
    select 1 from public.businesses b where b.id = booking_invoices.business_id and b.user_id = auth.uid()
  ));
create policy "Users can view own booking invoice emails" on public.booking_invoice_emails
  for select to authenticated using (exists (
    select 1 from public.businesses b where b.id = booking_invoice_emails.business_id and b.user_id = auth.uid()
  ));

create or replace function public.ensure_booking_reservation_financial()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'confirmed'
    and new.source = 'website_form'
    and coalesce(new.metadata->>'source', '') = 'booking_engine'
  then
    insert into public.booking_reservation_financials (
      calendar_entry_id, business_id, reservation_number
    ) values (
      new.id,
      new.business_id,
      'RES-' || to_char(coalesce(new.created_at, now()), 'YYYY') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 10))
    ) on conflict (calendar_entry_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_booking_reservation_financial_trigger on public.calendar_entries;
create trigger ensure_booking_reservation_financial_trigger
  after insert or update of status on public.calendar_entries
  for each row execute procedure public.ensure_booking_reservation_financial();

insert into public.booking_reservation_financials (calendar_entry_id, business_id, reservation_number)
select e.id, e.business_id,
  'RES-' || to_char(e.created_at, 'YYYY') || '-' || upper(substr(replace(e.id::text, '-', ''), 1, 10))
from public.calendar_entries e
where e.status = 'confirmed'
  and e.source = 'website_form'
  and coalesce(e.metadata->>'source', '') = 'booking_engine'
on conflict (calendar_entry_id) do nothing;

create or replace function public.next_booking_document_number(
  p_business_id uuid,
  p_document_type text,
  p_issued_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_year integer := extract(year from p_issued_at)::integer;
  selected_prefix text;
  selected_value bigint;
begin
  if p_document_type not in ('invoice', 'credit_note') then raise exception 'Invalid document type'; end if;
  select case when p_document_type = 'credit_note' then credit_note_prefix else invoice_prefix end
  into selected_prefix
  from public.booking_invoice_profiles where business_id = p_business_id;
  selected_prefix := coalesce(selected_prefix, case when p_document_type = 'credit_note' then 'CR' else 'F' end);

  insert into public.booking_document_counters (business_id, document_type, document_year, last_value)
  values (p_business_id, p_document_type, selected_year, 1)
  on conflict (business_id, document_type, document_year)
  do update set last_value = booking_document_counters.last_value + 1, updated_at = now()
  returning last_value into selected_value;

  return selected_prefix || '-' || selected_year::text || '-' || lpad(selected_value::text, 6, '0');
end;
$$;

create or replace function public.issue_booking_invoice(p_invoice_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_invoice public.booking_invoices%rowtype;
  generated_number text;
  issue_time timestamptz := now();
begin
  select * into selected_invoice from public.booking_invoices where id = p_invoice_id for update;
  if not found or selected_invoice.status <> 'draft' then raise exception 'Invoice is not an editable draft'; end if;
  if selected_invoice.currency <> 'EUR' then raise exception 'Only EUR invoices are supported'; end if;
  if selected_invoice.document_type = 'invoice' and selected_invoice.due_date < issue_time::date then
    raise exception 'Invoice due date cannot precede its issue date';
  end if;
  if jsonb_array_length(selected_invoice.line_items) = 0
    or coalesce(selected_invoice.seller_details->>'legal_name', '') = ''
    or coalesce(selected_invoice.seller_details->>'address_line1', '') = ''
    or coalesce(selected_invoice.seller_details->>'postal_code', '') = ''
    or coalesce(selected_invoice.seller_details->>'city', '') = ''
    or coalesce(selected_invoice.seller_details->>'vat_id', '') = ''
    or coalesce(selected_invoice.customer_details->>'name', '') = ''
    or coalesce(selected_invoice.customer_details->>'address_line1', '') = ''
    or coalesce(selected_invoice.customer_details->>'postal_code', '') = ''
    or coalesce(selected_invoice.customer_details->>'city', '') = ''
  then raise exception 'Invoice configuration is incomplete'; end if;

  generated_number := public.next_booking_document_number(
    selected_invoice.business_id, selected_invoice.document_type, issue_time
  );
  update public.booking_invoices
  set status = 'issued', invoice_number = generated_number, issued_at = issue_time
  where id = selected_invoice.id;

  if selected_invoice.document_type = 'credit_note' then
    update public.booking_invoices
    set status = 'credited'
    where id = selected_invoice.corrects_invoice_id and status = 'issued';
  end if;
  return generated_number;
end;
$$;

create or replace function public.protect_issued_booking_invoice()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' and (
    new.business_id is distinct from old.business_id
    or new.calendar_entry_id is distinct from old.calendar_entry_id
    or new.document_type is distinct from old.document_type
    or new.invoice_number is distinct from old.invoice_number
    or new.reservation_number is distinct from old.reservation_number
    or new.currency is distinct from old.currency
    or new.seller_details is distinct from old.seller_details
    or new.customer_details is distinct from old.customer_details
    or new.line_items is distinct from old.line_items
    or new.subtotal_minor is distinct from old.subtotal_minor
    or new.vat_total_minor is distinct from old.vat_total_minor
    or new.total_minor is distinct from old.total_minor
    or new.service_date is distinct from old.service_date
    or new.due_date is distinct from old.due_date
    or new.issued_at is distinct from old.issued_at
    or new.corrects_invoice_id is distinct from old.corrects_invoice_id
  ) then
    raise exception 'Issued invoice values are immutable';
  end if;
  if old.status = 'credited' and new.status <> 'credited' then raise exception 'Credited invoice status is immutable'; end if;
  if old.status = 'void' and new.status <> 'void' then raise exception 'Void invoice status is immutable'; end if;
  if old.pdf_storage_path is not null and (
    new.pdf_storage_path is distinct from old.pdf_storage_path
    or new.pdf_sha256 is distinct from old.pdf_sha256
    or new.pdf_size_bytes is distinct from old.pdf_size_bytes
  ) then raise exception 'Stored invoice PDF is immutable'; end if;
  return new;
end;
$$;

drop trigger if exists protect_issued_booking_invoice_trigger on public.booking_invoices;
create trigger protect_issued_booking_invoice_trigger
  before update on public.booking_invoices
  for each row execute procedure public.protect_issued_booking_invoice();

revoke all on function public.next_booking_document_number(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.issue_booking_invoice(uuid) from public, anon, authenticated;
grant execute on function public.issue_booking_invoice(uuid) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('booking-invoices', 'booking-invoices', false, 5242880, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.booking_reservation_financials is
  'Owner-managed reservation price snapshot and manual settlement status; no payment provider integration.';
comment on table public.booking_invoices is
  'Draft and immutable issued invoice/credit-note snapshots with private PDF storage references.';
comment on column public.booking_invoices.corrects_invoice_id is
  'A credit note performs a full reversal of an issued invoice; issued values are never edited in place.';

commit;
