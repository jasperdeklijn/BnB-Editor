# Review collection unavailable after publishing

## Confirmed cause (2026-09-15)

The affected website has a published review section in `collection` mode and the database grants its owner review access. However, `websites.business_id` is null while `live_snapshot.website.businessId` points to the business. Both localhost and the live review form remain unavailable.

The legacy fallback in `buildWebsiteLiveSnapshot` finds the owner's business for the snapshot without persisting the website's business link. The `review_collection_live` database function requires the stored link. Republish alone therefore did not repair the website.

## Repair

Apply `supabase/migrations/20260915160000_link_published_website_business.sql` to the configured Supabase database. It fills missing links only when the published snapshot points to an existing business belonging to the same owner. A trigger applies the same rule to future snapshot writes. Existing explicit business links, reviews, subscription records and published content remain unchanged.

Do not use the destructive `supabase/init.sql` on an existing database. That file includes the same repair for new/rebuilt databases.

After applying the migration, reload the public review form. No website republish is needed for repaired existing rows. Run the read-only diagnostic with:

```powershell
node scripts/check-review-access.mjs <website-uuid>
```

Expect `businessLinked`, `businessMatchesSnapshot`, `databaseGoldAccess` and `databaseCollectionLive` to be true, with `liveReviewModes` containing `collection`.

## Validation

An isolated PGlite test reproduces the failure, applies the migration twice, and verifies collection becomes available. It checks future authenticated snapshot updates, invalid/foreign business IDs, preservation of explicit links and unchanged snapshot content. The full schema rebuild test also passes.

The configured remote database has not been modified by this diagnostic. Submission, confirmation email and moderation still need an end-to-end check after applying the repair.

Localhost currently uses the platform default for generated review links. To keep test links on localhost, set `REVIEWS_BASE_URL=http://localhost:3000` in the local environment and restart the dev server. Use the production HTTPS origin in production.
