# FlexPagina.nl Production Readiness Report

Audit date: 2026-09-07  
Scope: repository `BnB-Editor`, including application routes, server actions, Supabase schema/RLS, booking and invoice logic, configuration, dependencies, and local automated validation.  
Checklist source: `docs/Production Readiness Checklist.md`

## Executive summary

```text
Production readiness: NOT READY

Open critical issues: 0
Open high issues: 4
Open medium issues: 4
Open low issues: 1
Open score: 29
```

The source tree has strong booking, invoice, calendar, multilingual, entitlement, onboarding, and agent-workflow safeguards. The complete local suite passes, the production build succeeds, all application tables in the consolidated schema enable RLS, and the production dependency audit is clean after remediation.

The application is not ready for paying production customers. Stripe is deliberately still a placeholder; rate limiting is process-local and therefore bypassable across serverless instances; template apply/restore is destructive across multiple non-transactional requests; and backup/restore has documentation but no verified production backup or restore evidence. Live two-tenant RLS/authentication, SMTP, DNS/SSL, provider, deployment, and browser journeys were not performed because this audit did not use or mutate production systems.

## Audit basis

- 477 repository files inventoried (excluding dependencies/build output).
- 59 route files and 65 exported HTTP handlers inventoried.
- Server actions in editor calendar, requests, reservations, onboarding, and shared Supabase modules inspected.
- 574 database call sites (`from`, `rpc`, insert/update/delete/upsert patterns) inventoried; security-critical and service-role paths were reviewed in detail.
- 52 application tables found in `supabase/init.sql`; all 52 enable RLS. Service-owned operational tables intentionally have no browser policies.
- Local `.env` and `.env.local` were inspected by variable name only. Neither file is tracked, and `.env*` is ignored. Secret values are not reproduced here.
- No production credentials, customer data, Stripe operations, DNS changes, Supabase mutations, email delivery, or deployment changes were used.

## Open findings

### PAY-001

Severity: HIGH  
Category: Stripe and subscriptions  
Location: `lib/stripe-placeholder.ts`, `components/billing/*`, no `/api/webhooks/stripe` route  
Status: FAIL

Problem: Stripe checkout, portal, subscription mutation, payment retry, and webhook processing are placeholders. The billing UI correctly disables plan/add-on changes, and this audit also disabled the remaining mock management/payment buttons, but no real payment lifecycle exists.

Why it matters: paid subscription state cannot be created or reconciled with a payment provider. A launch that promises automated paid subscriptions would create billing and entitlement inconsistencies.

How to reproduce:

1. Open the account billing page.
2. Observe that plan/add-on changes are marked unavailable.
3. Search for `stripe` and `/api/webhooks/stripe`; only placeholder functions exist and no signed webhook handler exists.

Recommended fix: make an explicit product decision: either launch without automated payments and remove payment claims, or implement Stripe Checkout/Portal, server-only price mapping, signed idempotent webhooks, event storage, reconciliation, failed-payment policy, and end-to-end test-mode validation.

### SEC-002

Severity: HIGH  
Category: Rate limiting and abuse protection  
Location: `lib/rate-limit.ts`  
Status: FAIL

Problem: public and authentication endpoints use an in-memory `Map`. Each serverless instance has a separate bucket and restarts clear state.

Why it matters: an attacker can spread requests across instances/restarts and bypass limits on login, password reset, contact requests, booking availability/holds/confirmation, analytics, customer links, and iCal export.

How to reproduce:

1. Run two application instances.
2. Send requests with the same action/IP until instance A returns 429.
3. Send the same request to instance B; its independent bucket still allows it.

Recommended fix: use a shared atomic store (for example a database RPC or managed Redis), define trusted proxy/IP handling, fail safely when the limiter is unavailable, and add distributed/concurrency tests.

### DATA-001

Severity: HIGH  
Category: Data integrity  
Location: `app/api/templates/apply/route.ts`, `app/api/templates/restore/route.ts`  
Status: FAIL

Problem: template apply and restore delete sections/services before subsequent inserts and related upserts complete. The operations span multiple database requests without one transaction.

Why it matters: a constraint error, schema mismatch, database interruption, or failed later insert can leave a customer's website partially or completely cleared.

How to reproduce:

1. Start a template restore with a valid owned website and an invalid later payload row, or inject a database failure after the delete.
2. The existing sections are deleted.
3. A later insert fails and the earlier delete is not rolled back.

Recommended fix: move apply/restore to owner-authorized transactional RPCs, validate the complete payload before mutation, use optimistic draft-version checks, and return one atomic result.

### OPS-001

Severity: HIGH  
Category: Backup and disaster recovery  
Location: `docs/backup-strategy.md`, production provider configuration  
Status: NOT TESTED

Problem: a sound backup/restore procedure is documented, but this repository contains no evidence that production Supabase database and Storage backups are active or that an isolated restore has succeeded.

Why it matters: documented intent does not prove recoverability after data loss. The checklist treats missing recovery proof as a launch blocker.

Recommended fix: verify provider retention, create a separate Storage backup, run an isolated restore drill, validate authentication/booking/invoice/domain flows, record RPO/RTO and evidence, and schedule recurring restore tests.

### PRIV-001

Severity: MEDIUM  
Category: Privacy and public data  
Location: `lib/website-snapshot.ts`, public section props  
Status: PARTIAL

Problem: published snapshots can contain `ownerEmail` and section `recipientEmail` values so public forms can submit the configured recipient. These values can reach client-rendered data even though the request API re-resolves the destination server-side.

Why it matters: a private account or routing address may be unnecessarily exposed to scraping.

Recommended fix: publish an opaque form/section identifier and resolve the destination only on the server. Scrub legacy snapshots on republish or with a reviewed migration.

### UPLOAD-001

Severity: MEDIUM  
Category: File uploads  
Location: `lib/user-images.ts`, `components/images/*`, Storage configuration  
Status: PARTIAL

Problem: the bucket now rejects oversized and undocumented MIME types, including SVG, but the 50 MB per-user quota is enforced in the client and file signatures are not inspected server-side.

Why it matters: direct Storage API calls can bypass the aggregate quota and can label arbitrary bytes with an allowed MIME type.

Recommended fix: route uploads through a server-issued reservation/RPC, atomically enforce aggregate usage, inspect magic bytes and dimensions, and periodically reconcile orphaned objects.

### OBS-001

Severity: MEDIUM  
Category: Monitoring and logging  
Location: application configuration and dependencies  
Status: FAIL

Problem: analytics and structured console logging exist, but no error/uptime monitoring integration or alert routing was found for API, auth, database, booking, iCal, email, PDF, Stripe, domain, or SSL failures.

Why it matters: production failures may only be discovered through customer reports.

Recommended fix: add error tracking and uptime/synthetic checks, alert on cron/outbox failures, define PII redaction, and connect alerts to the incident runbook.

### ENV-001

Severity: MEDIUM  
Category: Environment configuration  
Location: repository root and deployment settings  
Status: PARTIAL

Problem: 38 environment variable names are referenced, but there is no committed `.env.example` or single deployment manifest describing required/optional scope, allowed environments, and rotation owner.

Why it matters: preview/production omissions or unsafe reuse are easy and build success does not prove runtime completeness.

Recommended fix: add a value-free environment contract and a startup/deployment validation step. Verify Vercel development, preview, and production values separately.

### PERF-001

Severity: LOW  
Category: Performance  
Location: deployed application  
Status: NOT TESTED

Problem: no Lighthouse/Web Vitals budget, load test, large-site fixture, or measured cold-start/query baseline was run.

Recommended fix: define budgets and test representative marketing, editor, public site, booking, image-heavy, and large-calendar journeys.

## Findings remediated in this audit

### SEC-R001 — tenant-consistent website ownership

Previous severity: HIGH  
Status: FIXED IN SOURCE; MIGRATION NOT APPLIED

`websites.business_id` could point at another user's business because RLS checked only `websites.user_id`. The new migration adds a composite `(business_id, user_id) -> businesses(id, user_id)` foreign key and validates existing data. The template apply route now verifies supplied website and business ownership before mutation.

### SEC-R002 — unpublished draft disclosure

Previous severity: HIGH  
Status: FIXED IN SOURCE; MIGRATION NOT APPLIED

Anonymous policies allowed direct reads of mutable business, service, section, and transition rows whenever a website was published. Public rendering now uses a security-definer `get_public_website` RPC returning only `id`, `slug`, `published`, and the immutable `live_snapshot`; the broad anonymous source-table policies are removed.

### DEP-R001 — vulnerable Browserslist transitive dependency

Previous severity: HIGH  
Status: FIXED AND LOCALLY VERIFIED

`pnpm audit` reported GHSA-c83g-rgw3-j3cx and GHSA-73wf-gq98-2v4g through `autoprefixer > browserslist <=4.28.6`. Both npm and pnpm overrides now pin `4.28.7`; both lockfiles were refreshed. The follow-up production audit reports zero known vulnerabilities.

### UPLOAD-R001 — bucket file restrictions

Previous severity: MEDIUM  
Status: FIXED IN SOURCE; MIGRATION NOT APPLIED

The public image bucket now enforces 5 MB per object and allows only JPEG, PNG, GIF, and WebP. SVG is not allowed.

### UX-R001 — mock payment controls

Previous severity: MEDIUM  
Status: FIXED

The remaining billing management and payment-method buttons no longer execute placeholder handlers or claim a mock success; they are disabled until real callbacks are supplied.

## Checklist disposition

This table covers all 46 top-level checklist sections. `PASS` means the checked scope is supported by current source and local tests; `PARTIAL` means meaningful coverage exists but at least one listed check is unproven or incomplete; `NOT TESTED` means the necessary external or interactive validation was not performed; `FAIL` is a known issue.

| # | Area | Result | Severity / evidence |
|---:|---|---|---|
| 1 | Architectuur & codebase | PARTIAL | Clear server/client split, ignored env files, security headers, clean lint/build/audit; environment contract and full unused/deprecated package review remain. |
| 2 | Multi-tenant security | PARTIAL | Owner filters/RLS and new composite ownership constraint; live two-account IDOR read/update/delete matrix not run. |
| 3 | Supabase security | PARTIAL | All 52 application tables enable RLS; critical policies/RPC grants reviewed; live anon/authenticated/service-role policy tests not run. |
| 4 | Account & onboarding | PARTIAL | Recovery and resumable onboarding tests pass; live signup, duplicate email, verification, expiry, and browser resume not run. |
| 5 | Website editor | PARTIAL | Save queue, retry, undo, publish flush and section tests pass; full interactive CRUD/responsive matrix not run. |
| 6 | Publieke websites | PARTIAL | Live snapshots, SEO, 404, anonymous RPC, and draft isolation are code-backed; deployed desktop/tablet/mobile checks not run. |
| 7 | Custom domains | PARTIAL | Normalization, idempotent add/remove, ownership and route logic are tested; DNS, Vercel, HTTPS, SSL and reclaim tests not run. |
| 8 | Booking system | PARTIAL | Availability, overlap, capacity, atomic holds/finalization, lifecycle and concurrency controls pass  tests; live concurrent requests were not run. |
| 9 | iCal / Booking.com / Google Calendar | PARTIAL | Parsing, recurrence, cancellation, privacy, SSRF, idempotency, service scope and cron tests pass; real providers/rate limits not exercised. |
| 10 | Facturatie | PARTIAL | Integer calculations, numbering, immutable issued invoices, correction trail, private PDFs and locale delivery pass tests; visual/live SMTP checks not run. |
| 11 | Stripe & payments | FAIL | PAY-001: provider integration and signed webhooks do not exist. |
| 12 | Pricing & feature enforcement | PARTIAL | Server/runtime/publish entitlement tests pass and enforcement fails closed; paid upgrade/downgrade reconciliation is unavailable. |
| 13 | Meertaligheid | PARTIAL | NL/EN/DE/FR routing, overlays, hashes, fallback and live/editor propagation pass tests; exhaustive visual/copy audit not run. |
| 14 | Contactformulier | PARTIAL | Server validation, escaping, honeypot, request limits and ownership resolution exist; shared limiter and 100-request test remain. |
| 15 | E-mail | NOT TESTED | SMTP/IMAP code and durable outbox behavior exist, but SPF/DKIM/DMARC, bounce, deliverability and live links were not checked. |
| 16 | File uploads & images | PARTIAL | Owner path RLS and per-file bucket limits are present; UPLOAD-001 remains. |
| 17 | Algemene web security | PARTIAL | Auth, admin guards, SSRF controls, token hashing, CSP and validation were reviewed; no full dynamic penetration/CSRF suite was run. |
| 18 | Rate limiting & abuse | FAIL | SEC-002: limits are not shared across instances. |
| 19 | Database integrity | PARTIAL | FKs, checks, unique keys, RLS, idempotency and booking locks are extensive; migration was not executed against a live clone. |
| 20 | Concurrency & race conditions | PARTIAL | Booking/publish/agent/outbox paths use locks, CAS or idempotency; DATA-001 remains for templates. |
| 21 | GDPR / AVG | PARTIAL | Export, deletion, legal docs, retention guidance and minimal analytics exist; live deletion/export and retention operations not verified. |
| 22 | Cookies & tracking | PASS | Analytics loads only after explicit consent; necessary-only choice and settings reopening are implemented. Deployment verification remains recommended. |
| 23 | SEO | PARTIAL | Metadata, canonical/hreflang, OG/Twitter, robots, sitemap and no-index preview behavior exist; deployed crawler validation not run. |
| 24 | Performance | NOT TESTED | PERF-001. |
| 25 | Mobile | PARTIAL | Responsive/touch/calendar tests exist; complete real-device/editor/public/booking/domain matrix not run. |
| 26 | Accessibility | PARTIAL | Semantic labels, keyboard affordances, named dialogs and focus states are present in tested areas; no full screen-reader/contrast audit. |
| 27 | Backup & disaster recovery | NOT TESTED | Procedure exists; OPS-001 remains. |
| 28 | Monitoring & logging | FAIL | OBS-001; logging avoids obvious secrets but provider alerting and redaction verification are incomplete. |
| 29 | Vercel / production deployment | PARTIAL | Production build and Vercel cron/config inspection pass; environment, domain, HTTPS, rollback and deployed error pages not verified. |
| 30 | Environment variables | PARTIAL | 38 names inventoried and secrets remain server-only; ENV-001 and deployed value verification remain. |
| 31 | API audit | PARTIAL | All 59 route files/65 handlers inventoried and critical paths reviewed; dynamic authenticated/tenant/provider tests remain. |
| 32 | Database query audit | PARTIAL | 574 call sites inventoried and service-role/public/booking/admin hotspots reviewed; live RLS evidence remains. |
| 33 | Dependency audit | PASS | Frozen pnpm install succeeds; production audit reports zero known vulnerabilities; lockfiles are consistent. |
| 34 | Automated testing | PARTIAL | 147 tests pass; no Stripe tests, live Supabase policy suite, or browser E2E suite. |
| 35 | End-to-end customer journey | NOT TESTED | No safe migrated test environment/account/provider set was supplied. |
| 36 | Failure testing | PARTIAL | Code-backed retry/failure tests cover editor, calendar, booking, outboxes and agents; database/SMTP/provider outage injection not run. |
| 37 | Data consistency | PARTIAL | Booking/invoice/publish/entitlement invariants are tested; Stripe reconciliation is absent and template transactionality remains. |
| 38 | Security headers | PARTIAL | CSP, HSTS, nosniff, referrer, frame and permissions headers are configured; deployed headers and CSP breakage not tested. |
| 39 | Public vs private data | PARTIAL | SEC-R002 closes draft-table exposure; private booking/invoice/customer tables are owner/service scoped; PRIV-001 remains. |
| 40 | Admin functionality | PARTIAL | Every admin page/API reviewed uses server-side admin authorization before service-role access; live non-admin browser checks not run. |
| 41 | Business logic | PARTIAL | Booking and invoice rules are well tested; Stripe subscription rules are not implemented. |
| 42 | Edge cases | PARTIAL | Booking, locale, empty snapshot, subscription and calendar cases have tests; large-data, deleted-user, provider and deployment cases remain. |
| 43 | Production launch blockers | FAIL | PAY-001, SEC-002, DATA-001, OPS-001 and unperformed live release gates prevent launch. |
| 44 | Codex audit output | PASS | This report contains verdict, findings, reproduction, recommendations, validation and changes. |
| 45 | Final score | NOT READY | 4×HIGH + 4×MEDIUM + 1×LOW = 29. |
| 46 | Final instructions | PASS | Static audit, tests, dependency audit, typecheck, lint and build were executed; unsafe production mutations were not. |

## API and server-action inventory

Boundary legend: `public` means intentionally anonymous with input/context checks; `user/RLS` means authenticated user plus owner-scoped RLS/filters; `admin` means authenticated `isAdmin` before service role; `cron` means exact bearer secret; `token` means signed/hashed unguessable customer/feed capability.

| Route | Methods | Boundary |
|---|---|---|
| `/api/account` | DELETE | user/RLS, rate limit, service-role cleanup scoped to user |
| `/api/account/export` | GET | user/RLS; service-role audit export scoped to user |
| `/api/admin/agents/approvals` | GET | admin |
| `/api/admin/agents/approvals/[approvalId]/approve` | POST | admin, UUID/schema, durable admin rate limit |
| `/api/admin/agents/approvals/[approvalId]/reject` | POST | admin, UUID/schema, durable admin rate limit |
| `/api/admin/agents/artifacts/[artifactId]/revise` | POST | admin, UUID/schema, durable admin rate limit |
| `/api/admin/agents/jobs` | GET | admin |
| `/api/admin/agents/jobs/[jobId]` | GET | admin, UUID |
| `/api/admin/agents/jobs/[jobId]/retry` | POST | admin, confirmation, durable admin rate limit |
| `/api/admin/agents/runs/[runId]` | GET | admin, UUID |
| `/api/admin/agents/settings` | GET, PATCH | admin, schema, durable admin rate limit |
| `/api/admin/leads/[id]` | PATCH | admin, schema |
| `/api/admin/leads/search` | POST | admin, schema, rate limit |
| `/api/admin/leads/settings` | PATCH | admin, schema |
| `/api/admin/mailbox/knowledge` | GET, POST | admin, schema |
| `/api/admin/mailbox/knowledge/[answerId]` | PATCH | admin, UUID/schema |
| `/api/admin/mailbox/sync` | POST | admin, configured mailbox |
| `/api/admin/mailbox/threads/[threadId]` | PATCH | admin, UUID/schema |
| `/api/admin/mailbox/threads/[threadId]/draft` | POST | admin, UUID/schema |
| `/api/admin/mailbox/threads/[threadId]/send` | POST | admin, UUID/schema, explicit confirmation/idempotency |
| `/api/analytics/visit` | POST | public, UUID, published website, rate limit |
| `/api/audit/billing` | POST | user/RLS, allow-listed event data |
| `/api/audit/entitlement` | POST | user/RLS, allow-listed event data |
| `/api/audit/language` | POST | user/RLS, allow-listed event data |
| `/api/audit/section` | POST | user/RLS, allow-listed event data |
| `/api/audit/website-created` | POST | user/RLS, allow-listed event data |
| `/api/auth/change-password` | POST | user, current-password verification, rate limit |
| `/api/auth/login` | POST | public, Supabase auth, rate limit |
| `/api/auth/login-event` | POST | user |
| `/api/auth/logout` | POST | user |
| `/api/auth/password-reset` | POST | public, safe redirect construction, rate limit |
| `/api/booking/availability` | GET | public published snapshot/service/entitlement, bounded dates, rate limit |
| `/api/booking/confirm` | POST | public hold token/context, atomic finalize, rate limit |
| `/api/booking/holds` | POST | public published context, atomic capacity lock, rate limit |
| `/api/booking/invoices/[invoiceId]/pdf` | GET | user/RLS owner check, rate limit |
| `/api/booking/manage/[token]` | GET, POST | signed expiring customer token, constant-time verification, rate limit |
| `/api/booking/manage/[token]/invoice` | GET | signed customer token/invoice relation, rate limit |
| `/api/calendar/ical/[token]` | GET | hashed feed token, privacy-safe export, rate limit |
| `/api/cron/agents/daily-summary` | GET | cron |
| `/api/cron/agents/dispatch` | GET | cron |
| `/api/cron/agents/reconcile` | GET | cron |
| `/api/cron/booking-notifications` | GET | cron |
| `/api/cron/calendar-sync` | GET | cron |
| `/api/cron/leads` | GET | cron |
| `/api/cron/mail-sync` | GET | cron |
| `/api/domain` | GET, POST | user/RLS, normalized input, rate limit |
| `/api/domain/[domainId]` | PATCH, DELETE | user/RLS ownership, rate limit |
| `/api/domain/verify` | GET | user/RLS ownership, rate limit |
| `/api/onboarding/event` | POST | user, allow-listed event, rate limit |
| `/api/onboarding/slug` | GET | user, normalized/reserved slug, rate limit |
| `/api/profile` | PATCH | user, schema/RLS |
| `/api/requests` | POST | public published context, validation/honeypot/escaping, rate limit |
| `/api/templates/apply` | POST | user/RLS plus explicit website/business ownership; DATA-001 |
| `/api/templates/restore` | POST | user/RLS plus explicit website/business ownership; DATA-001 |
| `/api/themes` | GET, POST | user/RLS; POST explicitly verifies owner |
| `/api/websites/delete` | DELETE | user/RLS, rate limit, scoped domain cleanup |
| `/api/websites/publish` | POST | user/RLS, entitlement, CAS snapshot promotion, rate limit |
| `/api/websites/rename` | POST | user/RLS |
| `/auth/callback` | GET | Supabase one-time code exchange, internal return path |

Server actions/modules reviewed:

- `app/editor/calendar/actions.ts`: authenticated business/service ownership and validated calendar operations.
- `app/editor/requests/actions.ts`: owned business/inquiry checks before state/reply/template changes.
- `app/editor/reservations/actions.ts`: owned reservation checks and compare-and-set lifecycle transitions.
- `lib/onboarding/actions.ts`: authenticated resumable RPC workflow.
- `lib/supabase/{admin,business,booking-settings,calendar,server,services}.ts`: server-only clients or owner-scoped shared actions.

## Environment variable inventory

Public configuration referenced by client/browser code:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PLATFORM_DOMAIN`
- `NEXT_PUBLIC_MULTILINGUAL_WEBSITES`
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` (development only)

Server-only authentication, authorization, feature and data configuration:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`
- `ONBOARDING_ENABLED`
- `PLAN_ENFORCEMENT_MODE`
- `BOOKING_LINK_SECRET`
- `CALENDAR_SECRET_KEY`
- `CRON_SECRET`

Mail configuration:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`
- `MAILBOX_USER`, `MAILBOX_PASSWORD`
- `MAIL_IMAP_HOST`, `MAIL_IMAP_PORT`, `MAIL_IMAP_SECURE`
- `MAIL_SMTP_HOST`, `MAIL_SMTP_PORT`, `MAIL_SMTP_SECURE`
- `MAIL_FROM_NAME`, `MAIL_SYNC_FOLDER`, `MAIL_SENT_FOLDER`

AI and external services:

- `AI_GATEWAY_API_KEY`, `OPENAI_API_KEY`, `VERCEL_OIDC_TOKEN`, `AGENT_SUPPORT_MODEL`
- `GOOGLE_PLACES_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`

Vercel domain management:

- `VERCEL_ACCESS_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`

`OPENAI_API_KEY` is present in the local environment inventory but no direct `process.env.OPENAI_API_KEY` reference was found; confirm whether it is injected for a runtime SDK or can be removed. No Stripe variables are present because Stripe is not implemented.

## Validation executed

| Command | Result |
|---|---|
| `pnpm test` | PASS — 147 tests, 0 failures |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS — optimized production build after final hardening |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm audit --prod --audit-level=moderate` | PASS — no known vulnerabilities after override |
| `npm install --package-lock-only --ignore-scripts` | PASS — secondary lockfile refreshed, npm audit output reported 0 vulnerabilities |
| `git diff --check` | PASS |

The new `pnpm test` command uses `scripts/run-tests.mjs` so Windows runs only `tests/*.test.mjs`; bare `node --test` previously traversed an unrelated unreadable artifact directory.

## Not executed

- Applying `20260907120000_production_security_hardening.sql` to Supabase.
- Two-account live cross-tenant read/update/delete/publish/storage tests.
- Live signup/login/logout/session-expiry/recovery/email-verification flows.
- Stripe test-mode lifecycle and webhook replay (implementation absent).
- SMTP/IMAP delivery, SPF, DKIM, DMARC, bounce and spam placement.
- Booking.com/Google Calendar real-feed synchronization and provider rate limits.
- Vercel custom-domain DNS/SSL provisioning and re-claim behavior.
- Authenticated desktop/tablet/390 px browser journey and assistive technology audit.
- Production/preview environment verification and rollback drill.
- Backup creation and isolated database/Storage restore drill.
- Load, Lighthouse, Web Vitals, cold-start and failure-injection tests.

## Required release gate

Do not admit paying production customers until all of the following are complete:

1. Decide and implement the payment scope; if payments are in scope, close PAY-001 with signed idempotent webhooks and test-mode E2E evidence.
2. Replace the process-local limiter and close SEC-002.
3. Make template apply/restore atomic and close DATA-001.
4. Apply the hardening migration to a safe target, investigate any validation failure, then execute the two-tenant RLS/IDOR matrix.
5. Verify production/preview environment separation, cron secrets, SMTP, domain/SSL, and provider configuration.
6. Complete and record a database plus Storage restore drill.
7. Add monitoring/alerting and run the full customer journey in a migrated non-production environment.

Final verdict: **NOT READY**.
