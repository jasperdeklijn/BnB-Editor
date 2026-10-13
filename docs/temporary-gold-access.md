# Temporary Gold access

Restored 13 October 2026 while paid subscriptions and purchases are unavailable. This policy supersedes the stored-plan access described in `pricing-analytics-rollout.md` for the temporary period. The catalog and the paid-plan implementation remain in place for a coordinated return to paid subscriptions.

## Behavior

- Existing and new authenticated users receive effective Gold access, regardless of a missing, Bronze, Silver, Gold, inactive or expired stored subscription.
- Gold capabilities include unrestricted plan-based page publication, advanced SEO and GA4 configuration, detailed/advanced analytics, services and review collection. Booking & Facturatie and multilingual access are temporarily included too.
- The billing screen shows Gold with **Tijdelijke toegang** and **Tijdelijk gratis**, a displayed charge of EUR 0 and no next billing date. Purchase and plan-change controls remain disabled.
- Stored plan, status, price, provider identifiers, add-on flags and period dates are preserved. No subscription is purchased, changed or canceled and no payment-provider request is made.
- Authentication, website/business ownership, review moderation, booking availability, publication approvals, snapshot integrity, rate limits, storage limits and analytics consent remain in force. Feature access does not enable tracking or change website settings automatically.

## Implementation

Application switch: `DEFAULT_ALL_FEATURES_INCLUDED = true` in `lib/subscriptions.ts`. Effective plan resolution returns Gold, while preserving the stored plan and status. Capability helpers and billing presentation use the same temporary policy. The paid fallback stays Bronze for when the switch is disabled.

Database switch: `public.temporary_gold_access_enabled()` returns true. Migration `supabase/migrations/20261013171556_restore_temporary_gold_access.sql` aligns page-publication and SEO triggers, owner analytics reports, validated conversion recording, service-management access and server-only review access. The existing ownership checks and RPC privileges remain intact. Existing paid-plan logic remains in those functions for rollback. The function is a read-only policy value; customers cannot change it.

The migration is mirrored at the end of `supabase/init.sql` for fresh installations. Never run that destructive bootstrap against an existing database.

## Deployment order

- [ ] Confirm the intended environment and that the previous multipage and `20261013131134_pricing_visitor_analytics.sql` migrations are applied.
- [ ] Apply `20261013171556_restore_temporary_gold_access.sql` to staging, then the approved production target.
- [ ] Deploy the matching application with `DEFAULT_ALL_FEATURES_INCLUDED = true`. Changing the application alone leaves database restrictions active.
- [ ] With a missing-subscription account and a stored Bronze account, verify Gold billing presentation, publish more than ten reviewed pages, edit advanced SEO, manage services, enable review collection, view detailed analytics and use Booking/multilingual settings.
- [ ] Verify a second account cannot access the first account's website, services or analytics, and anonymous users cannot invoke owner/server RPCs.
- [ ] Check hosted security advisors and the actual authenticated browser-to-database flow. Local tests are not proof of a deployed rollout.

## Restore paid access later

Only restore paid gates when purchasing, reconciliation and the intended customer transition are ready. Confirm the change with the product owner first; do not rewrite existing agreements or choose/remove live pages automatically.

1. Prepare an additive migration replacing `public.temporary_gold_access_enabled()` with the same signature and security settings, returning `false`.
2. Set `DEFAULT_ALL_FEATURES_INCLUDED = false` and deploy together with that database change through staging. Apply the database migration and application in a coordinated release; either half alone gives inconsistent access.
3. Re-run the paid-plan acceptance matrix: Bronze three published pages, Silver ten, Gold unlimited; Booking requires its stored active add-on; advanced SEO/GA4 require Silver/Gold; review collection/advanced analytics require Gold.
4. Preserve existing live snapshots and drafts. Paid-through canceled subscriptions retain their rights until the end of the period. Existing grandfathering and publication checks remain implemented.

## Local verification

- [x] Existing/new/inactive-account application matrix: effective Gold, every registered capability, both add-ons, unlimited plan quota, EUR 0/no next billing date and unchanged billing records.
- [x] Real PostgreSQL tests reproduce the temporary policy for missing and inactive subscriptions, twelve-page publication, page/site SEO, full owner analytics and service access.
- [x] Database tests retain owner isolation, deny anonymous/raw-table/server-only access, preserve consent settings and verify deduplicated backend conversion successes.
- [x] Paid-plan regression tests explicitly disable the temporary policy and still check quotas, add-ons, cancellation behavior and gated reporting.
- [x] TypeScript and targeted ESLint passed.
- [x] Full test suite: 307 passed. Two pre-existing test mismatches were corrected: the Booking price expectation now matches the unchanged EUR 14.95 catalog, and bootstrap comparisons tolerate Windows line endings.
- [x] Production build passed with Node 24 and Next.js 16.3.2.
- [ ] Hosted migration application and authenticated production validation.

Test files: `tests/subscriptions.test.mjs`, `tests/temporary-gold-access.test.mjs`, `tests/analytics.test.mjs` and `tests/multipage-plan-access.test.mjs`. Full-suite and build results are recorded separately under `output/temporary-gold-*.log`.
