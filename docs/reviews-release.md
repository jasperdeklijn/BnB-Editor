# Reviews: implementation and release

## Product behavior

- The existing testimonials section now has exactly two modes: a Google reviews link (Silver/Gold) and customer review collection (Gold). Bronze's section access is unchanged.
- Collection requires effective Gold, using the same subscription resolver as the account badge and other Gold features. This includes the application's temporary default Gold when no valid subscription applies. Active/trial plans and canceled plans with a future paid-through date use their stored plan; active Silver/Bronze cannot collect reviews. No Booking add-on is needed.
- Customers submit through the website's collection link, explicitly select 1–5 stars, give publication permission, and confirm their email. Confirmation establishes email control, not a verified purchase.
- Confirmed submissions wait for owner moderation at `/editor/reviews`. Original text and ratings are immutable. Publication, rejection, and unpublishing require a reason and produce audit events. Owner deletion and private exports remain available after downgrade.
- Google mode uses only a validated Google URL and a button. No Google API, scraping, imported ratings, or fabricated reviews are used.
- Public reviews come from a fresh server query with no-store responses, independently of saved website snapshots. The current subscription and published mode gate every public query and submission. No aggregate score is displayed.
- Switching the live section to Google or losing effective Gold hides collected reviews and pauses collection/confirmation. Stored data remains private. Withdrawal still works; a new withdrawal link can be requested even after downgrade or unpublishing.
- Confirmation links expire after 24 hours. Withdrawal links expire after one year and can be renewed. Only token hashes are stored; links use fragments so tokens are absent from server URL logs. Optional app analytics are omitted from review pages.
- Unconfirmed submissions expire after seven days; the daily cleanup job removes them. Failed email delivery is recorded and customers can request a new confirmation email without rewriting the original submission.

## Files and configuration

- Schema and direct database enforcement: `supabase/migrations/20260910120000_review_collection.sql`, followed by `20260915120000_align_review_gold_access.sql`, both mirrored in `supabase/init.sql`. The second migration corrects the original overly strict review gate without changing subscription records or review data.
- Public/owner endpoint: `/api/reviews`. Owner reads/export require an authenticated owner; mutations use service-only database functions after server authorization. Database RLS prevents direct customer-review writes from anonymous/authenticated clients.
- Customer pages: `/reviews/[websiteId]`, `/reviews/confirm`, `/reviews/withdraw`.
- Owner inbox: `/editor/reviews`, available from editor navigation and the section settings; honors the saved active website.
- Cleanup: `/api/cron/review-cleanup`, daily at 02:45 UTC via `vercel.json`, guarded by `CRON_SECRET`.
- Mail: existing `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Links: production defaults to the platform origin. Optional `REVIEWS_BASE_URL` selects a staging origin; HTTPS is required in production. For local email testing set `REVIEWS_BASE_URL=http://localhost:3000`. Never build email links from customer-supplied request hosts.
- Supabase service-role credentials and the existing shared rate limiter must be configured. Limiter/database outages return unavailable errors; they do not open collection access.

## Migration procedure

1. Take a database backup and test its restore process. Use an isolated staging project with a controlled test mailbox.
2. Run `supabase/operations/reviews-preflight.sql` in read-only mode. It reports draft, translated, live, and translated-live entries, distinguishing exact known examples from other content. Save the results for owner communication.
3. Review affected websites and notify their owners that manual testimonials will move to a private archive and they must configure one of the two new modes. No outbound notification was sent by this implementation.
4. Apply the review migration and then `20260915120000_align_review_gold_access.sql` to the existing database. If the first migration is already applied, apply only the corrective migration. Do not run destructive `supabase/init.sql` on a live project. Each migration is transactional and intended to run once through the normal migration runner.
5. The migration first stores original section rows, translation rows, and the complete prior live snapshot in `review_legacy_archive`. It then removes old `items` arrays from current drafts and live copies. Other content is archived, never silently converted to a customer-submitted review. Existing sections default to an unconfigured Google-link mode, so they remain hidden publicly until configured.
6. Deploy the matching application. Check RLS and function grants under real anonymous, authenticated, and service-role roles. Read-only review access and archive export must work for the owner after downgrade; other owners must see nothing.
7. Confirm staging SMTP delivery, link host, token expiry, spam/rate limits, and cleanup scheduling. Exercise submission -> confirmation -> moderation -> live publication -> withdrawal using controlled test data.
8. Exercise Silver/Gold and canceled/expired access, a published mode switch, and a custom-domain website. Draft mode changes must not affect the live collection until publication.
9. Apply the reviewed migration and deploy to production only after staging checks pass. Verify one real owned website and monitor mail failures and API errors.

## Recovery

- Migration failure rolls back the complete review migration transaction.
- Successful migration preserves original data in `review_legacy_archive`; owners can export section/translation data from the inbox. A database operator can retrieve the full recovery record with `select * from public.review_legacy_archive where website_id = '<affected website UUID>';` using an authorized database session.
- To recover content under the new product, export the archive and let the owner choose an appropriate mode. Do not insert historical text into `customer_reviews` or mark it email-confirmed.
- A full rollback to the old review implementation requires a coordinated application/database restore from the pre-migration backup in a tested maintenance window. The new guards intentionally reject manually re-inserting legacy `items`; do not disable those guards on a running new release to bypass that protection.
- An owner can explicitly delete their archive after export. This also removes that archive's recovery copy; the UI requires a separate confirmation.

## Validation evidence and remaining release gates

Gold access repair on 2026-09-15: all 191 tests, TypeScript checking, and targeted lint passed. The signed-in localhost editor now enables the collection radio for the displayed Gold account. A read-only check of that website found no stored subscription (the app grants temporary default Gold) while the connected database's original `review_gold_access` still returned false. Apply `20260915120000_align_review_gold_access.sql` to that database to complete the repair; it was tested locally but not applied remotely. This repair does not change billing records.

Local validation on 2026-09-15: all 189 automated tests passed; TypeScript checking and the production build passed. Tests cover the review lifecycle in an in-memory PostgreSQL database, original-content preservation, RLS/function permissions, cross-website access, immutable ratings/text, consent withdrawal, downgrade and re-upgrade, schema rebuild parity, migration preflight reporting, HTTP request boundaries, duplicate submissions, email failure/resend, and token hashing. Email tests use a mock transport and send no messages. The full suite includes the existing pricing and subscription tests.

Browser checks used an isolated local fixture that mocked review responses and email submission: Gold mode switch, Silver lock, no preselected rating, form success, moderation controls, and no horizontal overflow at 320px and 1440px. The fixture was removed from app routes after testing; a copy remains in ignored local artifacts for reproducing the check. This does not constitute authenticated Supabase or SMTP integration proof.

Release gates still requiring the target environment: applied staging/production migration, actual SMTP delivery, authenticated owner E2E, custom-domain E2E, scheduled cleanup execution, and production deployment. No production database changes, review invitations, or notification emails were performed during implementation.
