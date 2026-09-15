# Temporary free access

All existing and new accounts receive Gold capabilities and Booking & Facturatie while subscriptions cannot be purchased. The billing screen shows EUR 0 and included add-ons. This grants feature access; users still configure their own booking availability and website sections.

`DEFAULT_ALL_FEATURES_INCLUDED` in `lib/subscriptions.ts` controls the temporary application policy. Stored plans, subscription statuses, prices and paid add-on flags are preserved. Authentication, business ownership, booking availability and lifecycle checks remain enforced.

## Deployment

Apply `supabase/migrations/20260915140000_default_all_features.sql` to the existing database and deploy the application. This non-destructive migration aligns service and review database access with the application. Do not run `supabase/init.sql` on an existing database; it is only for rebuilds.

## Reintroducing paid plans

Before enabling purchases, change the temporary application policy and deploy a new migration restoring plan-based service and review checks together. Also explicitly decide the plan and add-on access for accounts without an active subscription: the older fallback remains Gold. Connect and validate payment handling before showing future charges. This change does not cancel any external provider subscriptions.
