-- Temporary product default: new subscription records start on Gold.
-- Existing explicit subscription rows are intentionally left unchanged.

alter table public.subscriptions
  alter column plan_id set default 'gold',
  alter column current_price set default 24.95;
