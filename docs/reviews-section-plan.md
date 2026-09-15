# Reviews section: two modes

Status: approved and implemented locally. See [release notes](reviews-release.md) for validation evidence and staging/production gates. No production migration or deployment has been performed.

## 1. Establish the product rules

Keep the existing `testimonials` section with exactly two modes:

| Mode | Silver | Gold | Public experience |
| --- | --- | --- | --- |
| Link naar Google-recensies | Included | Included | A heading, optional introduction, and a button opening the business's Google reviews |
| Recensies verzamelen | Locked with Gold upgrade prompt | Included | Customer reviews and a Schrijf een recensie button |

Proposed default: preserve the current Silver minimum for the section; Bronze does not gain the section. Gold collection works without the Booking add-on. These are product assumptions for this proposal.

## 2. Replace the section settings

- Add two clearly labelled mode cards in the existing section editor, using shared controls, Dutch copy, and the existing style guide.
- Default new sections to Google-link mode, with an empty URL and setup guidance.
- Google mode exposes the Google URL, heading, introduction, and button text. Validate supported HTTPS Google Maps/review URL formats server-side; reject unsafe schemes and lookalike domains. Do not fetch arbitrary submitted URLs.
- Collection mode exposes heading, introduction, number of displayed reviews, and a link to Beheer recensies.
- Silver users can see the Gold option and its explanation but cannot activate it.
- Switching modes retains settings and collected data. Only the published mode determines which experience visitors see; a draft switch must not change the live site.

## 3. Implement Google-link mode

- Render a clear Lees onze recensies op Google button, opening safely in a new tab.
- Display no invented star rating, reviewer cards, or review count.
- Hide an unconfigured section publicly; show actionable guidance in the editor.
- This mode needs no Google account connection or review import.

## 4. Create storage and Gold enforcement

- Add a `review_collection` capability to the central entitlement model and enforce it using the resolved subscription, including expiry and cancellation rules.
- Check access during settings changes, publishing, collection-page access, submission, confirmation, moderation, and public review retrieval. UI locks and historical website snapshots must not bypass current access.
- Store reviews separately from section JSON, scoped to a business and source website. Sections only show reviews for their website in the first release; switching active websites must preserve isolation.
- Store reviewer display name, private email, rating, original text, consent timestamp, verification state, moderation state, and submission/publication dates. Keep verification secrets and moderation notes out of public responses.
- Use separate, hashed, expiring tokens for email confirmation and customer withdrawal. Add row-level security and server-owned submission/moderation operations.
- Add a non-destructive migration and mirror the schema in `supabase/init.sql`.

## 5. Build the customer collection flow

Proposed first-release flow: published section or shareable collection link -> review form -> email confirmation -> moderation -> publication.

- The owner copies a website-specific collection link to share with customers; the public section also offers Schrijf een recensie.
- Ask for display name, email, a deliberate 1–5 star selection, review text, and permission to publish the name and text. Do not preselect five stars. Keep email private.
- Require email confirmation before a review enters the moderation inbox. Explain that confirmation verifies control of an email address, not a purchase or customer relationship; do not show a verified-customer badge.
- Validate lengths and ratings on the server, render review text safely, rate-limit submissions and emails, use a honeypot, and prevent replay of confirmation tokens.
- Save submissions durably before email dispatch, track delivery failures, and provide a rate-limited resend path. Expire unconfirmed submissions under a documented retention rule.
- Provide a private withdrawal link so the reviewer can remove permission and unpublish their review.
- No automatic review invitations or booking dependency in this first release.

## 6. Build the owner's review inbox

- Add `/editor/reviews` using the shared editor shell, active website selection, responsive cards, and Dutch labels.
- Show pending, published, rejected, and withdrawn reviews with rating, text, author, and date.
- Allow publish, reject, and unpublish actions with recorded reasons and an audit trail. Review text and ratings remain the customer's original submission; owners cannot create, duplicate, or rewrite collected reviews.
- Explain moderation criteria such as spam, abuse, personal information, or irrelevant content. A low rating alone is not a rejection reason.
- Use a clear pending count in the inbox. Outbound owner notifications can be considered later.

## 7. Render authentic collected reviews

- Display published, confirmed, consented reviews with name/initials, date, stars, and original text; use newest-first ordering with a configured display limit.
- Label the display Gepubliceerde klantervaringen and explain that submissions are moderated, particularly when only a subset is visible.
- If showing an aggregate, calculate it from all currently published eligible reviews for that website, label that basis, and never calculate it from only the visible cards.
- With zero reviews, show Nog geen recensies plus the collection button. Never substitute samples.
- Resolve eligible public reviews separately from the published layout so approval, withdrawal, or unpublishing updates the live display without republishing the website. Invalidate caches on each change.

## 8. Handle existing content, mode changes, and downgrades

- Remove invented defaults from the editor, registry, renderer, and new-site generation.
- Audit existing sections, translations, and live snapshots. Identify known samples using exact content matches, not names alone.
- Preserve other existing testimonials privately as legacy content requiring attention; do not relabel them as customer-submitted or verified reviews, and do not create a third manual-entry mode.
- Produce a dry-run migration report and a recovery path before applying cleanup to saved or published customer content. Notify affected owners that they must choose/configure a mode; no fabricated Google URL or customer verification is inferred.
- When the published mode switches to Google, retain collection data and pause its submission and confirmation links. Customer withdrawal remains available.
- When effective Gold access ends, retain data privately, stop collection/publication, and hide collected reviews on the public site. Offer owners a deliberate switch to Google-link mode while their plan still supports the section; do not silently change their chosen mode.
- Keep read-only access, export/deletion, and customer withdrawal available after downgrade. Restore collection eligibility on re-upgrade, subject to the published mode and retained consent.

## 9. Update plan descriptions

- Describe Silver's feature as Google-recensielink and Gold's additional feature as Recensies verzamelen en beheren.
- Update central pricing features, comparison tables, upgrade prompts, and relevant documentation. Preserve existing prices and unrelated add-ons.

## 10. Verify and release

- Test Silver/Gold access, direct API bypass attempts, expired plans, downgrade/re-upgrade, and stale published snapshots.
- Test cross-business and cross-website access, duplicate submissions, confirmation expiry/replay, email failures/resend, spam controls, and private-data exposure.
- Test approval, rejection, unpublishing, withdrawal, accurate counts, empty states, and mode switching without data loss.
- Test exact sample cleanup against genuine legacy content, translations, and published copies; verify the migration recovery procedure.
- Run appropriate automated checks, then authenticated editor/public browser checks at mobile and desktop widths.
- Apply the migration in staging and verify real confirmation-email delivery and the full submit-to-publish flow before production rollout. Record local checks separately from staging/production proof.

## Review decisions

The proposed defaults are: Google-link mode on Silver and Gold; Gold collection without Booking; public/shareable collection link with email confirmation; owner moderation with original text preserved; collection pauses on downgrade while data remains accessible privately. Review these choices before implementation begins.
