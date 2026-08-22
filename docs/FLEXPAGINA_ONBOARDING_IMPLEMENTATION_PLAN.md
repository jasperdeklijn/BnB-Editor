# FlexPagina onboarding — implementation plan

## 1. Goal

Add a guided onboarding flow that starts after a user's first successful login. The flow collects a small amount of personal, company, and website information, saves progress after every step, and uses the data to prepare the user's first website.

The user should finish onboarding in roughly two minutes and arrive in the dashboard with a useful draft website instead of an empty account.

## 2. Product decisions

- Show onboarding after the first verified login, not during registration.
- Use three short steps: **About you**, **Your company**, and **Your website**.
- Save each step independently so the user can leave and continue later.
- Only require information needed to personalize the account and first website.
- Keep KvK number, VAT number, full billing address, logo, social links, and opening hours optional. They can be completed later in Settings.
- Do not publish a website automatically. Create or update a draft only.
- Store personal data separately from company data.
- Let one company own one or more websites. This avoids tying company data to a single page and keeps future team access possible.
- Existing users must not unexpectedly lose access when this feature is released.

## 3. User flow

### Entry

1. The user registers and verifies their email.
2. The normal authentication callback creates or retrieves their profile.
3. If `onboarding_completed_at` is empty, redirect the user to `/onboarding`.
4. If onboarding is complete, redirect to the original requested page or `/dashboard`.

### Step 1 — About you

Required:

- First name
- Last name
- Preferred interface language, initially `nl-NL`, `en-GB`, `de-DE`, or `fr-FR`

Optional:

- Phone number
- Job title or role

Behavior:

- Prefill the name from trusted signup metadata when present.
- Prefill the email from Supabase Auth and show it as read-only.
- Explain that these details belong to the account owner and are not automatically displayed on the public website.

### Step 2 — Your company

Required:

- Company/trading name
- Business category, such as accommodation, hairdresser, gardener, consultant, or other
- Country, defaulting to the Netherlands
- Public contact email, defaulting to the account email

Optional:

- Public phone number
- City
- KvK number
- VAT number

Behavior:

- Clearly label contact details that may later be shown on the public website.
- Do not require legal identifiers to let a new user try the product.
- Validate Dutch KvK numbers as eight digits when supplied, but do not claim that format validation verifies the company.
- Normalize email and phone values before saving where practical.

### Step 3 — Your website

Required:

- Website name, prefilled from the company name
- Primary website goal: `bookings`, `contact_requests`, `showcase`, or `other`
- Main website language

Optional:

- Preferred slug/subdomain
- Short company description
- Existing website URL

Behavior:

- Check slug availability with a short debounce and again on final server submission.
- Suggest a safe slug generated from the company name.
- Create a draft website if the user does not have one yet.
- Use collected data to prefill the hero title, contact section, company details, default language, and relevant starter sections.
- For accommodation businesses, suggest booking/room sections. For other businesses, suggest services/contact sections. Do not make the category selection irreversible.

### Completion screen

Show a short success state with two actions:

- Primary: **Open website editor**
- Secondary: **Go to dashboard**

The completion action must be idempotent: double-clicking or retrying it may not create duplicate business or website records.

## 4. Route behavior

| Route type | Signed out | Signed in, incomplete | Signed in, complete |
| --- | --- | --- | --- |
| Public and legal pages | Allow | Allow | Allow |
| Authentication pages | Allow | Redirect to onboarding | Redirect to dashboard |
| `/onboarding` | Redirect to login | Allow | Redirect to dashboard |
| Dashboard/editor/settings | Redirect to login | Redirect to onboarding | Allow |
| Server actions/API mutations | Reject without session | Authorize per action | Authorize per action |

Preserve an approved relative `returnTo` path when possible. Never accept an arbitrary external redirect URL.

The route-level redirect is for user experience only. Every data read and mutation must still authenticate and authorize the user on the server.

## 5. Recommended data model

Use migrations rather than editing production tables manually. The repository already has `businesses`, `websites`, and `website_locales`; onboarding must extend and reuse those tables instead of introducing parallel `companies`, `company_id`, `websites.name`, or `websites.default_locale` sources of truth.

The account email remains in Supabase Auth. Do not copy it into `profiles`. The existing profile screen currently stores `full_name`, `phone`, `bio`, and `avatar_url` in Auth user metadata. Move the onboarding-owned personal fields to `profiles` and update the profile screen to use that table as part of the rollout; keep only a temporary read fallback for legacy metadata during backfill.

### `profiles`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | References `auth.users(id)` with `on delete cascade` |
| `first_name` | `text` | Required to complete onboarding |
| `last_name` | `text` | Required to complete onboarding |
| `phone` | `text null` | Personal phone number |
| `job_title` | `text null` | Optional |
| `locale` | `text` | Default `nl-NL`; constrain to supported values |
| `onboarding_step` | `smallint` | Default `1`; allowed range `1..3` |
| `onboarding_completed_at` | `timestamptz null` | Server-owned completion marker |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Updated automatically |

The read-only email shown in step 1 comes from the authenticated user. The existing optional profile biography and avatar remain profile settings, but they are not onboarding fields and do not need to block completion.

### Existing `businesses`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | Generated UUID |
| `user_id` | `uuid` | Existing owner reference to `auth.users(id)`; set only from the authenticated server session |
| `name` | `text` | Company/trading name |
| `category` | `text` | Use an existing value from `lib/business/categories.ts` |
| `country` | `text` | ISO 3166-1 alpha-2, default `NL` |
| `city` | `text null` | Optional during onboarding |
| `email` | `text` | Public contact email; may be shown on the website |
| `phone` | `text null` | Public phone number; may be shown on the website |
| `chamber_of_commerce_number` | `text null` | Keep as text to preserve leading zeros |
| `vat_number` | `text null` | Optional; country-dependent |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Updated automatically |

Keep the existing `tagline`, `description`, `street`, `postal`, `whatsapp`, `website_url`, `social_links`, and `opening_note` columns. They remain editable in **Bedrijfsgegevens** even when onboarding does not ask for all of them. Step 3's short company description maps to `businesses.description`, and the existing website URL maps to `businesses.website_url`.

### Existing `websites`

Add or confirm:

- `business_id uuid null references businesses(id)`
- `title text` for the onboarding website name
- `slug text` with a case-insensitive uniqueness strategy
- `primary_goal text`
- `published boolean default false`

Keep the existing `user_id` because current authorization depends on it. Set both `user_id` and `business_id` from server-owned records during onboarding. Do not add a second `company_id` relation.

### Existing `website_locales`

Store step 3's main website language in the existing locale model:

- Create or update exactly one enabled row for the selected locale.
- Mark it as `is_default = true` and clear `is_default` on the website's other locale rows in the same transaction.
- Derive the existing `path_segment` and `display_name` with the shared locale helpers.
- Do not add `websites.default_locale`; read the main language from the default `website_locales` row.

### Onboarding field-to-storage map

| Form field | Authoritative storage |
| --- | --- |
| Account email (read-only) | `auth.users.email` |
| First name, last name, personal phone, job title, interface language | `profiles` |
| Company name, category, country, city, public email, public phone, KvK, VAT | `businesses` |
| Website name, slug, primary goal | `websites.title`, `websites.slug`, `websites.primary_goal` |
| Main website language | Default row in `website_locales` |
| Short company description, existing website URL | `businesses.description`, `businesses.website_url` |

### Database protections

- Enable Row Level Security on every public user-data table.
- A profile is readable and writable only when `auth.uid() = profiles.id`.
- A business is accessible only when `auth.uid() = businesses.user_id`. If team accounts are introduced later, replace this with membership-based policies.
- A website and its locale rows are accessible only through the existing verified website owner relation.
- Do not let the client set `businesses.user_id`, `websites.user_id`, profile `id`, or `onboarding_completed_at` freely.
- Create/update the profile row safely after signup. Test any auth trigger carefully because a failing signup trigger can block registrations.
- Add `updated_at` triggers, foreign-key indexes, length constraints, and uniqueness constraints at database level.
- Make final completion transactional and idempotent. Reuse the user's existing business and draft website when present; do not create a second row on retries.

## 6. Application structure

Adjust paths to the repository's conventions:

```text
app/
  onboarding/
    page.tsx
    loading.tsx
  (dashboard)/
    layout.tsx
components/
  onboarding/
    onboarding-shell.tsx
    progress-indicator.tsx
    personal-details-step.tsx
    company-details-step.tsx
    website-setup-step.tsx
    onboarding-complete.tsx
lib/
  auth/
    require-user.ts
    require-onboarding.ts
  onboarding/
    actions.ts
    queries.ts
    schemas.ts
    types.ts
    website-starter.ts
supabase/
  migrations/
    <timestamp>_add_onboarding.sql
```

Implementation guidelines:

- Render the page shell and initial onboarding state on the server.
- Use client components only for interactive form controls and progress UI.
- Put session checks, authorization, database writes, and completion logic in a server-only data-access layer or server actions.
- Use one shared validation schema per step on both client and server, with the server result authoritative.
- Return typed field errors rather than a generic failure message.
- Use idempotent writes keyed by the authenticated user and existing business so retries are safe.
- Revalidate affected dashboard/editor paths after completion.

## 7. State and completion rules

- `onboarding_step` records the next unfinished step, not merely the last page viewed.
- The URL may contain `?step=2`, but the server decides the furthest allowed step.
- Users may go back and edit saved answers.
- A refresh or a new device resumes from persisted data.
- Optional fields can be skipped without storing fake placeholder values.
- Only the final server action sets `onboarding_completed_at`, after it verifies:
  - required profile fields exist;
  - a valid owned business exists;
  - the required website setup fields exist;
  - the draft website was created or linked successfully.
- If website creation fails, keep onboarding incomplete and show a retryable error without discarding earlier answers.

## 8. Validation

Apply validation on the server and mirror it in the UI:

- Trim all text values.
- Use practical maximum lengths, for example 100 characters for names, 160 for short labels, and 500 for the short description.
- Validate email syntax and lowercase email values for comparison.
- Accept international phone input; avoid Netherlands-only assumptions.
- Allow only explicitly supported locale, goal, country, and category values.
- Normalize slugs to lowercase ASCII with hyphens; reject reserved names such as `www`, `admin`, `api`, `dashboard`, `editor`, `login`, and `onboarding`.
- Check slug uniqueness in the database, not only in the browser.
- Treat empty optional strings as `null`.
- Escape output normally through React; never render onboarding text as raw HTML.

## 9. UX and visual requirements

- Reuse the FlexPagina design system and rules from `Style.md` when present.
- Use a centered card or focused panel with the FlexPagina logo, short heading, and visible progress (`Step 1 of 3`).
- One primary action per step: **Continue** or **Finish setup**.
- Include a **Back** action after the first step.
- Disable submission while saving and prevent duplicate clicks.
- Show inline errors next to fields and a concise form-level error for network/server failures.
- Keep entered values after an error.
- Clearly mark optional fields.
- Confirm successful autosave or step save without disruptive toast spam.
- Support mobile widths and keyboard-only navigation.
- Associate every input with a label; move focus to the first invalid field; announce step changes and errors for screen readers.
- Do not include a full skip-onboarding button. Optional fields may be skipped individually.

Suggested Dutch copy:

- Welcome: `Welkom bij FlexPagina, laten we je account instellen.`
- Personal step: `Vertel ons kort wie je bent.`
- Company step: `Vul de basisgegevens van je bedrijf in.`
- Website step: `Waarvoor wil je jouw website gebruiken?`
- Privacy note: `Je persoonlijke gegevens worden niet automatisch op je website getoond.`

## 10. Privacy and security

- Collect only data that has a clear product purpose.
- Distinguish personal contact details from public company contact details in labels and storage.
- Do not put company, tax, or personal data in authentication JWT metadata when normal tables are suitable.
- Never log submitted onboarding payloads, phone numbers, KvK numbers, VAT numbers, or addresses.
- Do not expose service-role credentials to the browser.
- Rate-limit slug availability and mutation endpoints where appropriate.
- Verify the current user inside every server action; never trust a posted user or business ID.
- Include onboarding data in the existing account export and account deletion flows.
- Link to the privacy policy where personal data is first requested.
- If acceptance of terms is not already captured at registration, store explicit versioned timestamps such as `terms_accepted_at` and `privacy_acknowledged_at`; never use a pre-checked box.

## 11. Existing-user rollout

Use a feature flag for the initial release.

1. Add nullable columns and new tables without changing current route behavior.
2. Backfill the existing `businesses` records from profile, billing, invoice, contact, or website data where reliable.
3. Link existing websites through `websites.business_id`.
4. Mark existing users complete only when enough valid data is already present.
5. For other existing users, prefer a dismissible **Complete your profile** dashboard prompt before enforcing onboarding. Do not suddenly block paying customers from their editor.
6. Enable mandatory onboarding for newly created accounts.
7. Monitor completion and error rates, then decide whether incomplete legacy accounts should be gated later.

All migrations must have a rollback or forward-fix procedure, and a backup should exist before the production backfill.

## 12. Analytics and observability

Track events without including entered personal/company values:

- `onboarding_started`
- `onboarding_step_viewed` with step number
- `onboarding_step_completed` with step number
- `onboarding_validation_failed` with field identifier and validation code only
- `onboarding_completed`
- `onboarding_abandoned` inferred from funnel data, not a client event

Also monitor server error count, p95 save duration, completion rate, completion time, and duplicate company/website creation. Add structured request/error IDs so support can investigate failures without logging the form payload.

## 13. Test plan

### Unit tests

- Validation accepts valid international data and rejects invalid/oversized values.
- Slug normalization and reserved-slug checks work.
- Starter website selection maps categories and goals correctly.
- Completion rules reject incomplete records.

### Database/RLS tests

- A user can read and update their own profile, company, and websites.
- A user cannot read or modify another user's records by changing an ID.
- Anonymous users cannot access onboarding data.
- Client requests cannot mark onboarding complete without satisfying server rules.
- Duplicate completion requests create only one company and one initial website.

### Integration tests

- Email/password and OAuth users reach onboarding after their first verified login.
- Every step saves and can be resumed after logout/login.
- Back navigation retains saved values.
- A slug conflict is handled when two users finish simultaneously.
- A database failure on the last step can be retried safely.
- Completed users cannot re-enter onboarding accidentally but can edit data in Settings.
- Existing-user rollout rules work as intended.

### End-to-end and accessibility tests

- New user completes all three steps and opens a personalized draft in the editor.
- Mobile and desktop layouts work.
- Keyboard-only completion works.
- Labels, focus order, error announcements, and color contrast meet WCAG 2.2 AA expectations.

## 14. Implementation phases and checklists

### Phase 1 — Discovery

- [x] Read the repository styling guidance and repository instructions.
- [x] Inspect current auth flow, middleware/proxy, editor layouts, profile/settings forms, `websites` schema, and RLS policies.
- [x] Identify existing company fields and avoid creating duplicate sources of truth.
- [x] Confirm supported languages, business categories, reserved routes, and starter website logic.
- [x] Decide how legacy users are grandfathered or prompted.

### Phase 2 — Database

- [x] Add or extend `profiles`.
- [x] Extend `businesses` with the missing onboarding fields and confirm the existing `websites.business_id` relation.
- [x] Add constraints, indexes, timestamps, and safe defaults.
- [x] Add RLS policies and source-level regression coverage.
- [x] Add an idempotent profile creation mechanism.
- [x] Write the existing-user backfill and source-level regression coverage.
- [x] Confirm this repository does not use generated Supabase database types; cover integration with application interfaces and `tsc`.

### Phase 3 — Server logic

- [x] Add centralized session and onboarding-state queries.
- [x] Add schemas and typed actions for every step.
- [x] Add safe relative-return-path handling.
- [x] Add idempotent business and draft-website creation or reuse.
- [x] Add server-side completion verification.
- [x] Add route gating without relying on it for authorization.

### Phase 4 — Interface

- [x] Build the responsive onboarding shell and progress indicator.
- [x] Build all three form steps with prefills and inline errors.
- [x] Add slug suggestion and availability feedback.
- [x] Add loading, retry, and completion states.
- [x] Apply FlexPagina styling from the repository style guide.
- [x] Add accessible focus and screen-reader behavior.
- [x] Add Settings links/forms so onboarding data remains editable later.

### Phase 5 — Verification and release

- [x] Run repository lint, explicit type checking, focused unit/regression tests, production build, and signed-in desktop/mobile render verification.
- [ ] Test email/password, magic-link, and enabled OAuth paths.
- [ ] Test RLS with two separate users and an anonymous client.
- [x] Verify from source that onboarding logs and analytics contain only event, step, field identifier, and request metadata—not submitted values.
- [ ] Verify production redirect URLs; no link may point to localhost.
- [x] Implement the release behind the server-side `ONBOARDING_ENABLED` feature flag; enabling it in a deployed environment remains an operations step.
- [ ] Monitor errors and funnel metrics before enabling it for all new users.
- [x] Document the schema, routes, release order, rollback, and support recovery procedure in `docs/FLEXPAGINA_ONBOARDING_RUNBOOK.md`.

## 15. Definition of done

The feature is complete when:

- A newly verified user is reliably sent to onboarding after first login.
- The user can complete the flow in three short steps and resume on another device.
- Personal and company details are stored separately and protected by RLS.
- Final completion creates or updates exactly one initial draft website and prefills useful content.
- Incomplete users cannot enter protected product routes through normal navigation, while server-side authorization still protects every operation.
- Existing customers are not unexpectedly locked out.
- Onboarding data can be edited later in account/company settings.
- Error, loading, mobile, accessibility, privacy, and retry behavior are tested.
- All checks pass and the feature can be disabled through a feature flag during rollout.

## 16. Notes for Codex

Before coding, inspect the actual repository and revise this plan where it conflicts with existing models or conventions. Reuse existing components, schemas, and settings fields. Do not introduce a second source of truth for company information. Keep changes in small, reviewable migrations and commits, preserve unrelated user changes, and report any schema or product assumption that cannot be confirmed from the codebase.

Useful implementation references:

- [Supabase user-data guidance](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)
- [Next.js data security guidance](https://nextjs.org/docs/app/guides/data-security)
