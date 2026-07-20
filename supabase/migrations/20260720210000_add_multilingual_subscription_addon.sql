-- Gold includes multilingual websites. Bronze and Silver can unlock the
-- capability through a separately billed EUR 2.99 monthly add-on.

begin;

alter table public.subscriptions
  add column if not exists multilingual_addon_active boolean not null default false,
  add column if not exists multilingual_addon_price numeric(10, 2) not null default 2.99,
  add column if not exists stripe_multilingual_addon_item_id text;

alter table public.subscriptions
  drop constraint if exists subscriptions_multilingual_addon_price_check;

alter table public.subscriptions
  add constraint subscriptions_multilingual_addon_price_check
  check (multilingual_addon_price >= 0);

comment on column public.subscriptions.multilingual_addon_active is
  'Trusted billing state. Unlocks multilingual websites for active Bronze and Silver subscriptions; Gold includes the capability.';

comment on column public.subscriptions.multilingual_addon_price is
  'Current monthly multilingual add-on price in EUR, excluding VAT.';

commit;
