-- Booking & Facturatie is an optional add-on for every base plan.
-- Do not enroll or charge existing customers automatically.
begin;

alter table public.subscriptions
  add column if not exists booking_addon_active boolean not null default false;

comment on column public.subscriptions.booking_addon_active is
  'Trusted billing state. Unlocks booking capabilities for active/trial or paid-through canceled subscriptions on any plan. Catalog price is defined in lib/pricing.ts.';

commit;
