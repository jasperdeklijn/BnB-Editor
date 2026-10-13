# Pricing, publication quotas and visitor analytics

Implemented 13 October 2026. This runbook supersedes the onepage/six-section policy and the temporary free-feature rollout. The user explicitly chose stored-plan/add-on enforcement for all features. No hosted database, live Stripe product, subscription, or price was changed.

## Repository findings and scope

- `Style.md` was absent. `docs/style-guide.md` supplies the deep green, Tailwind/shadcn styling.
- Pricing and entitlements already live in `lib/pricing.ts`, `lib/entitlements.ts` and `lib/subscriptions.ts`. These remain the source of truth; no second billing engine was introduced.
- Multipage draft pages are stored separately from immutable live snapshots. Only included live snapshot pages are counted. Localized versions do not consume another page slot. The existing one-live-design-per-account rule is preserved; no new website/design quota was added.
- The previous Bronze database trigger blocked draft creation/import. The new migration removes that draft restriction and guards public snapshot activation instead.
- SEO title, description and OpenGraph fields were stored and published. Canonical overrides were stored but unused. GA4 provider, ID and consent-mode fields were stored but unused. Canonical overrides now reach metadata; optional GA4 collection starts after consent. A measurement ID never connects report-reading access.
- Billing, purchases and downgrades are placeholders, not a working Stripe integration. Purchase controls remain disabled. The old temporary Gold/Booking override has been disabled in TypeScript and the service/review database gates. Missing/inactive subscriptions receive Bronze; active/trial and paid-through canceled subscriptions receive the stored plan. Existing subscription rows/prices remain intact. New subscription defaults are Bronze/7.95.
- The previous tracker wrote one `website_visits` row per browser session. New collection uses daily aggregates; historical rows are not reinterpreted as pageviews. Administration combines legacy visitor counts with new daily estimates. Customer reports start from the new collector's deployment date.
- Branding removal and a delivered priority-support policy were not found; new public pricing makes no claims about them.

## Catalog

All prices are EUR per month excluding BTW/VAT, formatted `nl-NL` in the UI.

| Plan | Base | Published pages per website | Reports |
| --- | ---: | --- | --- |
| Bronze | 7.95 | 3 | Visitors/pageviews, date filters, up to 30 days |
| Silver | 14.95 | 10 | Bronze plus pages, sources, devices, daily/weekly trends, 30/90 days |
| Gold | 24.95 | Unlimited (fair-use) | Silver plus conversions, previous-calendar-month report, up to 366 days |

Booking & Facturatie is +19 on **every** plan, including Gold. It retains booking, calendars, iCal, confirmations and invoices/PDF functionality. Booking conversion counts require an active Booking add-on. Multilingual is +2.99 on Bronze/Silver and included at no additional charge in Gold. All core section types, unlimited sections, hosting, custom-domain connection, basic SEO and social links remain available on every plan. Enquiry management and advanced SEO/GA4 follow existing Silver/Gold capability gates.

Examples excluding VAT: Bronze + Booking 26.95; Silver + both add-ons 36.94; Gold + Booking 43.95. `current_price` remains the stored base subscription amount. Billing add-on totals are explicitly indicative catalog amounts because legacy Booking item prices are not stored in the current schema. Check the actual provider invoice for grandfathered prices.

Gold has no fixed publication-page cap. Page listings and publication page/section/translation/redirect reads are paginated using exact counts so a hosted Supabase row cap does not silently truncate a large site. Existing import safeguards remain: JSON at most 2 MB and 40 pages per file, remote images at most 5 MB each/20 MB total, and URL-import source selection at most eight pages per import job. These are import limits, not publication or draft-design quotas. Analytics safeguards are separate: 8 KB request bodies, at most 20 events/batch, 120 requests/session/minute and 1,000 requests/site/minute. Over-limit analytics may be skipped; website rendering remains available.

## Migration and environment

1. Back up the database and deploy to staging first. Apply the existing migration chain through `20261008184614`, then `supabase/migrations/20261013131134_pricing_visitor_analytics.sql`. Use normal migration tooling; **do not run `supabase/init.sql` on production** (it is the existing destructive bootstrap for fresh/test databases).
2. Configure a server-only random `ANALYTICS_SIGNING_SECRET` of at least 32 characters. Never prefix this with `NEXT_PUBLIC_`. Rotating it invalidates outstanding tracking/consent tokens, whose signed lifetime is one hour.
3. Keep existing `NEXT_PUBLIC_SUPABASE_URL`, public key and `SUPABASE_SERVICE_ROLE_KEY` configuration. Set existing `CRON_SECRET` for the authenticated cleanup endpoint. Keep `PLAN_ENFORCEMENT_MODE=enforce` in production. The old development warn/off switch still exists for existing feature checks; database publication, SEO, analytics and service restrictions remain enforced.
4. Deploy code and verify `/api/cron/analytics-cleanup` runs daily. `vercel.json` registers `17 3 * * *` (UTC). No new paid service was added. Monitor scheduler failures; retention depends on this existing scheduling infrastructure.
5. In `/editor/seo?websiteId=...`, explicitly enable first-party analytics. It defaults off for existing/missing settings; no bulk enablement or customer-data rewrite occurs. The off switch is rechecked in the database at ingestion/conversion time. Configure GA4 separately if desired on Silver/Gold.
6. The expanded consent description uses consent key version `v2`, so prior choices are not silently reused for the new collection.

The migration creates `public.website_analytics_daily` and two private, RLS-enabled deduplication/conversion tables. Public/anonymous write access is revoked. Ingestion/conversion/cleanup RPCs are service-role only. `website_analytics_report` is an invoker wrapper around an explicit owner-checked private function that strips premium fields and bounds historical access by effective plan. Authenticated users have no raw aggregate-table grants; an additional owner RLS policy protects against future accidental grants. There are no raw visitor IDs in report rows and no public function accepting an arbitrary client conversion event.

The migration is additive and preserves live snapshots, pages, designs, assets, bookings and billing rows. Fresh/bootstrap schema is updated too, including its reset list so foreign keys survive a rebuild.

## Tracker and metrics

Public rendering issues a short-lived HMAC token bound to website, stable page ID, visitor host and path. Preview/editor rendering receives no tracker or GA4 script. Ingestion validates token, origin/referrer host/path, body size/schema, public page membership, current privacy enablement, bot user agents, DNT/GPC and shared rate limits. Known bots/headless clients and obvious noise are discarded. Public tokens are not proof that a visitor is human: a determined caller can fetch a real public token and forge traffic within limits. This is basic abuse resistance, not perfect fraud prevention.

After explicit consent, an origin/site-scoped random browser session is stored in sessionStorage for at most 30 minutes and reset across UTC days. Storage failure disables collection. The server hashes it with website/day separation before short-lived deduplication. No fingerprint, raw IP, full referrer URL/query, precise location, email, name or user-agent string is stored by first-party analytics. Only source categories and coarse devices enter daily totals. Existing request/security infrastructure may process technical data independently of analytics.

`Geschatte bezoekers` means the sum of distinct consenting browser-session estimates per UTC day. It is not distinct people across a month. New sessions, browsers, tabs with independent session state, and different origins/domains can count the same person again. There is no cross-domain or cross-site identity. Public subdomains and custom domains resolve to the same website/page aggregates without counting editor/preview routes.

The browser defers collection for four seconds or flushes on page hide. The endpoint acknowledges promptly and uses Next.js `after()` for one bounded aggregate RPC. There are no new raw pageview rows. Daily upserts and atomic unique keys prevent duplicate batches and rapid same-session/page reloads (30-second buckets). This is a lean aggregate MVP, not a durable external queue: post-response failures, short visits, storage restrictions and rate limits can lose data. At higher traffic, measure throughput before adding a durable batch queue; do not silently add another paid dependency.

Contact conversions count successfully stored contact-form requests only when their backend request carries a valid site analytics-consent token. Booking success registers eligible pending bookings in the backend; a database confirmation trigger counts them once when confirmed. Confirmed instant bookings count immediately. The SQL function verifies the actual success row belongs to that website, Gold access and Booking entitlement; browser clicks never count. Quote/appointment preference forms are not contact conversions. Conversion rates are **measured backend completions / measured pageviews × 100**, not percentages of unique people. Delayed booking confirmations land on their confirmation date and can skew period comparisons. Only consented submissions are eligible; expired tokens can omit late submissions.

Gold's previous-calendar-month summary is computed in the dashboard. Scheduled report emails remain deferred; existing transactional mail infrastructure does not establish reliable monthly report delivery or consent handling.

## Privacy and deletion

The existing privacy/cookie documents are templates with provider placeholders; updated wording is an implementation disclosure, **not legal approval**. Before enabling collection, have the website owner/provider review AVG/GDPR roles, processing agreement, lawful basis and retention, consent copy/translations, technical/security logs and any optional Google transfers. Publish the appropriate customer-specific privacy/cookie notice.

We chose explicit opt-in for this implementation. First-party analytics are not assumed consent-exempt. Necessary-only and accept buttons remain equally accessible; cookie settings withdraw consent, delete the analytics consent marker/session, and propagate withdrawal to other same-origin tabs. DNT/GPC disable both collectors. Optional GA4 is independently consented, with advertising permissions denied and query parameters stripped from configured page location. Its collection/privacy policy is separate from first-party analytics; it does not provide OAuth/service-account report access.

References reviewed: [AP cookies](https://autoriteitpersoonsgegevens.nl/nl/onderwerpen/internet-telefoon-tv-en-post/cookies), [AP clear cookie banners](https://autoriteitpersoonsgegevens.nl/themas/internet-slimme-apparaten/cookies/heldere-cookiebanners), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase breaking-change changelog](https://supabase.com/changelog?types=breaking-change). No relevant RLS API migration was identified for these ordinary tables/RPCs. Local Next.js 16.3.2 guides for route handlers, asynchronous headers and `after()` were read.

Daily totals and success IDs have a maximum 366-day retention. Seen keys are cleaned after two UTC-day buckets; active-site ingestion also prunes expired seen keys. Daily cleanup deletes expired totals and success IDs. All three tables cascade on site deletion, and site ownership cascades on account deletion. Disabling stops new collection without deleting already anonymous totals; site/account deletion removes them. Consent preferences themselves remain site-local until changed/cleared. Privacy templates should state this separately from session lifetime.

## Downgrades: implemented preservation and proposed future workflow

There is no reliable scheduled downgrade/effective-date billing mechanism in this repository. Implementing automatic removal now would invent a billing policy. The implemented behavior preserves existing live snapshots on subscription changes and metadata-only edits. Re-publication and activation must satisfy the new plan quota; drafts remain editable and unlimited. The editor counts pages selected for publication, shows the limit and upgrade option, and lets the customer deselect pages in existing Page settings. Snapshot validation rejects navigation/redirects pointing at excluded pages, preserving the previous live version when publication fails.

For future real billing, propose: schedule the target plan at period end; show live/selected page counts and require the customer to choose pages, fix navigation/redirects and approve a complete replacement snapshot before the effective date. Apply the subscription change and validated snapshot atomically at that date. If no valid choice exists, retain live content and notify the customer/support according to a confirmed grace/exception policy. Never choose pages arbitrarily. Decisions still required before that billing work: effective date, proration, grace period and handling customers who do not make a selection. No destructive publication/downgrade change was made here.

## Manual Stripe steps

The repo contains `lib/stripe-placeholder.ts`, no working checkout/webhook or price-ID environment mapping. Do not treat local UI changes as a billing migration.

- In Stripe's dashboard, verify/create the intended recurring EUR **tax-exclusive** catalog prices: Bronze 795, Silver 1495, Gold 2495, Booking 1900, multilingual 299 cents. Gold must not acquire a multilingual item or a bundled Booking entitlement.
- Record the actual IDs for a future audited price mapping; no environment-variable names/IDs are invented in this task. Configure tax/VAT behavior and invoice disclosure in the actual checkout when that integration exists.
- Inventory current subscription/base/add-on item prices and preserve existing price IDs/agreements. For legacy Booking prices, decide grandfathering or a communicated, period-end migration; never overwrite `current_price`/price IDs or silently charge 19.
- Implement/test idempotent webhooks and subscription/add-on reconciliation before enabling purchase controls. Reconcile entitlement flags through trusted backend billing events only. Accounts previously relying on free Booking need an explicit active entitlement; existing reservations remain stored.

## Verification and hosted smoke test

Automated tests execute PostgreSQL via PGlite, including 3/10/unlimited caps, draft imports, downgrade preservation, activation/direct-write enforcement, cross-tenant report/aggregate isolation, disabled tracking, consent authenticity, bot/referrer/device filtering, deduplication, validated contact and pending/confirmed booking conversions, Booking requirement, active/inactive plan gates, basic/advanced SEO, VAT/catalog totals and schema rebuilds. The ingestion test verifies that the response precedes the aggregate write and that only a bounded batch is sent.

Logs are under `output/pricing-analytics-*.log`. Lint, typecheck and production build pass. The entire test suite passes: 304 tests. Existing tests depending on ignored customer imports were made self-contained with `tests/fixtures/flexstart-multipage.json`; SQL comparison tests normalize Windows line endings.

No `.env.local` or authenticated Supabase session exists in this checkout. Hosted RLS advisors, migration application and a real authenticated browser → Supabase smoke test therefore remain deployment checks, not claimed successes. On staging: enable analytics for owner A, visit the published custom domain and subdomain, refuse consent (no request/script), then accept (one eligible aggregate), navigate to another public page, and withdraw. Test preview/editor (no collector), DNT/GPC, loading/empty/error/disabled reports, Bronze premium locks, Silver 90-day trends, Gold monthly/contact conversion, Booking off/on including pending→confirmed, and owner B isolation. Verify deletion and the authenticated cleanup job. Inspect public SEO title/description, safe OpenGraph/canonical override and optional consented GA4. Confirm that no Google report access is implied.
