# BnB-Editor

## Guided onboarding

Apply `supabase/migrations/20260821120000_add_guided_onboarding.sql` before enabling the feature. Then set the server-side environment flag:

```env
ONBOARDING_ENABLED=true
```

Existing accounts present when the migration runs are grandfathered. Accounts created afterward receive the three-step onboarding flow. Set the flag to `false` or remove it to disable route gating without removing stored onboarding data.

## Password recovery

Password reset emails return through `/auth/callback` and then open `/auth/update-password`. Before deploying, configure Supabase Auth with the production site URL and allow this callback URL:

```text
https://flexpagina.nl/auth/callback
```

For local email-flow testing, also allow `http://localhost:3000/auth/callback`. Configure custom SMTP in Supabase before production use; the built-in test mail service is rate-limited and best-effort.
