# BnB-Editor

## Guided onboarding

Apply `supabase/migrations/20260821120000_add_guided_onboarding.sql` before enabling the feature. Then set the server-side environment flag:

```env
ONBOARDING_ENABLED=true
```

Existing accounts present when the migration runs are grandfathered. Accounts created afterward receive the three-step onboarding flow. Set the flag to `false` or remove it to disable route gating without removing stored onboarding data.
