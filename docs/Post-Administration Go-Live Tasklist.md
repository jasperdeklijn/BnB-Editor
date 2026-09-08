# Post-administration go-live task list

Use this checklist after the KvK registration and business bank account are available. Do not accept paying customers until every launch-blocking item is checked with evidence.

## 1. Administrative prerequisites

- [ ] KvK registration is complete and the legal company name, KvK number, VAT number, address, and contact details are confirmed.
- [ ] Business bank account is active and can receive payouts and SEPA debits.
- [ ] The production domain and role-based addresses (support, privacy, billing, security) are controlled by the company.
- [ ] Replace placeholders in the legal pages, invoices, transactional email, privacy policy, terms, and processor agreement; obtain legal/accounting review.

## 2. Purchase and separate provider environments

- [ ] Upgrade the production Vercel project to Pro; keep Development, Preview, and Production variables separate.
- [ ] Upgrade the production Supabase project to Pro and confirm the selected region, spend cap, retention, point-in-time recovery options, and support contacts.
- [ ] Complete Stripe business verification, connect the business bank account, enable 2FA, and restrict team roles.
- [ ] Choose and configure the production SMTP/IMAP provider; publish SPF, DKIM, and DMARC records.
- [ ] Choose an error-monitoring/alerting destination and an uptime monitor for `/api/health`.

## 3. Database rollout before application deployment

- [ ] Create a restorable pre-migration database backup and a separate inventory/copy of Storage objects.
- [ ] Apply `20260907120000_production_security_hardening.sql` to a migrated non-production Supabase project.
- [ ] Apply `20260908120000_pre_administration_readiness.sql` to that same project.
- [ ] Investigate every migration warning or validation failure; never bypass the tenant ownership constraint to force deployment.
- [ ] Test `check_rate_limit`, `apply_template_transaction`, `restore_template_transaction`, the private form-destination trigger, snapshot scrub, and the image quota with authenticated test accounts.
- [ ] Run the two-account RLS/IDOR matrix for reads, updates, deletes, publishing, form destinations, and Storage.
- [ ] Repeat the migrations in Production only after the non-production evidence passes.

## 4. Stripe implementation and billing verification

- [ ] Create live and test Products/Prices for Bronze, Silver, Gold, and the multilingual add-on; record immutable price IDs per environment.
- [ ] Add server-only Stripe keys and webhook secrets to `.env.example`, environment validation, Vercel Preview, and Vercel Production.
- [ ] Implement authenticated Checkout and Customer Portal sessions with an owner-scoped Stripe customer mapping.
- [ ] Implement `/api/webhooks/stripe` with raw-body signature verification, durable event-id idempotency, safe event storage, and retryable processing.
- [ ] Reconcile subscription creation, upgrade, downgrade, cancellation, trial, past-due, unpaid, payment-failed, and refund states into server-owned entitlements.
- [ ] Ensure webhook events, not browser redirects, are the authority for paid access.
- [ ] Run Stripe test-mode end-to-end tests, webhook replay/out-of-order tests, and one reviewed low-value live transaction plus refund.
- [ ] Re-enable billing controls only after the lifecycle and entitlement tests pass.

## 5. Production environment and secrets

- [ ] Fill every required value from `.env.example`; use different secrets for Preview and Production.
- [ ] Generate at least 32 random bytes for `BOOKING_LINK_SECRET`, `CALENDAR_SECRET_KEY`, and `CRON_SECRET`; document rotation ownership.
- [ ] Set `PLAN_ENFORCEMENT_MODE=observe` for the controlled preview rollout, review logs, then explicitly approve `enforce` for launch.
- [ ] Confirm the production `/api/health` response is HTTP 200 and configure an alert for failures/latency.
- [ ] Verify no service-role, SMTP, Stripe, Vercel, mailbox, or AI secret appears in client bundles or logs.

## 6. Provider and communication tests

- [ ] Verify signup, email confirmation, login, logout, session expiry, password reset, and password change with real email delivery.
- [ ] Verify SMTP delivery, reply-to behavior, links, bounce handling, spam placement, and NL/EN/DE/FR templates.
- [ ] Verify IMAP mailbox synchronization and duplicate/retry behavior.
- [ ] Test Booking.com and Google Calendar feeds with recurrence, cancellations, time zones, provider delays, and rate limits.
- [ ] Test Vercel custom-domain add, verify, primary selection, HTTPS certificate, removal, failure recovery, and domain reclaim.

## 7. Monitoring, backups, and incident readiness

- [ ] Connect application errors and unhandled rejections to the selected monitoring provider with source maps and PII redaction.
- [ ] Alert on failed/late crons, growing outboxes, stale iCal sources, Stripe webhook failures, SMTP failures, database errors, domain/SSL failures, and `/api/health` downtime.
- [ ] Run an isolated database plus Storage restore drill; validate auth, editor, published sites, bookings, invoices, domains, and uploaded images.
- [ ] Record measured RPO/RTO, evidence links, owners, escalation contacts, and the next restore-drill date in the incident/backup runbooks.
- [ ] Test rollback to the previous Vercel deployment without rolling the database backward destructively.

## 8. Final quality and launch gate

- [ ] Run Lighthouse CI using `lighthouserc.json` against representative production-like pages and meet every configured budget.
- [ ] Run load/concurrency tests for login, forms, booking availability/holds/confirmation, publishing, images, and large calendars.
- [ ] Complete authenticated desktop, tablet, and 390 px mobile journeys for onboarding, editor, preview, publish, booking, requests, reservations, billing, and domains.
- [ ] Complete keyboard, screen-reader, focus, contrast, error-state, cookie-consent, metadata, sitemap, robots, canonical, and hreflang checks.
- [ ] Execute the full customer journey in a migrated Preview environment, then repeat the release smoke test in Production.
- [ ] Review `PRODUCTION_READINESS_REPORT.md`, attach evidence for every remaining item, and record an explicit go/no-go approval.
