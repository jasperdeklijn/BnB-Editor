# FlexPagina onboarding runbook

## Release order

1. Back up the Supabase project.
2. Apply `supabase/migrations/20260821120000_add_guided_onboarding.sql`.
3. Verify that existing users have a non-null `profiles.onboarding_completed_at`.
4. Deploy the application with `ONBOARDING_ENABLED=false` or unset.
5. Test a newly created account in the target environment.
6. Set `ONBOARDING_ENABLED=true` for the test environment or selected deployment.
7. Monitor onboarding audit events and server errors before enabling the flag everywhere.

Do not enable the flag before the migration is present. The middleware deliberately fails open when the profile query itself errors, but onboarding forms cannot save without the database functions.

## Schema and ownership

- `profiles` contains private account-owner details and the server-owned onboarding state.
- `businesses` remains the public company-data source of truth.
- `websites` stores the draft title, slug, goal, owner, and linked business.
- `website_locales` stores the main website language.
- Existing users are grandfathered by the migration. The auth trigger creates future users at step 1.
- Step writes use `save_onboarding_personal`, `save_onboarding_business`, and `complete_onboarding`. The final function holds a per-user transaction lock and reuses stored onboarding record IDs.

## Routes

- `/onboarding`: server-rendered entry and resumable form.
- `/api/onboarding/slug`: authenticated, rate-limited availability check.
- `/api/onboarding/event`: authenticated funnel events without submitted values.
- `/api/profile`: authenticated profile-settings update.
- The proxy redirects incomplete signed-in users away from editor/admin routes and authentication entry pages.
- The editor layout repeats the completion check so middleware is not the only user-experience boundary.

## Support recovery

Inspect identifiers and state without copying submitted values into logs:

```sql
select id, onboarding_step, onboarding_business_id, onboarding_website_id,
       onboarding_completed_at, updated_at
from public.profiles
where id = '<user uuid>';
```

If the last step failed, leave `onboarding_completed_at` null and ask the user to retry. Earlier steps remain stored. If a support engineer must restart a test account, clear only the server-owned onboarding fields after confirming the exact user and preserving any business or website data; do not delete shared records as a shortcut.

## Disable and forward-fix

Set `ONBOARDING_ENABLED=false` to stop gating immediately. This is the preferred rollback because it preserves collected data and existing websites. Database changes are additive; use a forward-fix migration for schema defects. Do not drop `profiles`, business columns, or website columns after users have entered data.

If the auth trigger reports warnings, keep the feature flag disabled, fix the trigger with a new migration, and backfill missing profile rows before re-enabling onboarding.

