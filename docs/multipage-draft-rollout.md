# Multipage rollout and recovery

Updated 6 October 2026. The local implementation is described in [the contract](multipage-contract.md) and [task checklist](multipage-editor-tasks.md).

## Current evidence and release boundary

The authenticated local `/editor` loads the existing Home and test pages and switches their independent sections. Responsive observations cover 320/390 px mobile, 768 px tablet and 1440 px desktop without horizontal document overflow. Screenshots are linked in the task file. This read-only session does not prove the new migration's create/copy/move/publish flows.

Read-only hosted inspection found the page foundation on the database currently used by the local app. The new page-translation table and movement RPC are absent. That project's sole branch is main, with a failed migration status; it is not an identified staging environment. No hosted migration, cleanup, publication or deployment was executed in this task. New page-management/publication actions are gated by `multipage_contract_version() = 3` and display an installation message instead of attempting the incomplete contract.

Local PGlite runs the actual SQL initialization, RLS role fixtures and operations. Repository tests, TypeScript, repository-wide ESLint and a Node 24 production build are recorded in `output/multipage-complete-*.log`. Local results do not establish hosted Auth/PostgREST, customer domains or non-home form delivery.

## Installation order

1. Identify a disposable staging project/branch and record its project ID, owners and domains. Back up that target, including the immutable snapshot, page/locale/section/translation/redirect records and business/form dependencies. Confirm restore in a separate target.
2. If the foundation is absent, review obsolete website IDs and run the scoped cleanup procedure below, then install `20261004194421_multipage_draft_pages.sql`. Old content is disposable; the migration deliberately refuses nonempty legacy content and version 2 snapshots instead of silently migrating them.
3. If the foundation is already present, **skip legacy cleanup**. Install the additive `20261006162718_multipage_operations_and_publication.sql`. Do not run `init.sql` on a hosted database. It is a fresh local database initializer, not a production repair.
4. Verify both migrations in migration history and inspect policies/grants/constraints with advisors. Confirm the authenticated contract-version RPC returns 3, anonymous draft access fails, and a second owner cannot access the first owner's pages, translations, redirects or RPCs.
5. Deploy a preview of the matching version 3 reader/routes and writers to that staging environment. Before the migration is available, new writes/publication remain gated. No version 2 live reader is retained. Only activate customer-facing release after the acceptance matrix below passes.
6. Repeat required release checks for the chosen production target and obtain release approval with reviewed scope and evidence. A successful local build is not deployment authorization.

## Scoped obsolete-content cleanup

The executable review template is [multipage-obsolete-content.sql](../supabase/maintenance/multipage-obsolete-content.sql). It requires explicit UUIDs, refuses unknown websites or an already installed foundation, and defaults to rollback. Review owners/domains and affected row counts, back up the target, then change rollback to commit only for the reviewed disposable target and exact IDs. It deletes selected sections (dependent translations/transitions cascade) and clears selected live snapshots/publication state. Accounts, businesses, services, billing, inquiries, reservations, quotes, transfers and domain records remain outside its scope. If any legacy website content remains outside the approved list, do not broaden the cleanup silently; resolve scope before installing the foundation.

Old template checkpoints are browser-local `template-checkpoint:<websiteId>` entries. Remove only the reviewed website keys through the relevant browser storage interface. Do not clear unrelated storage. The new version 3 checkpoint has an explicit website/page scope and old formats are rejected. No cloud cleanup has been executed here.

## Staging acceptance matrix

Use two authenticated owner accounts and an anonymous browser. Create Home/About/Services/Contact from the editor, change ordering/content, duplicate a page, move a linked contact section, replace Home, and create/replace/remove shared header/footer. Verify fresh UUIDs, retained translations, removed old transitions and repaired links; verify invalid cross-account calls roll back with no partial changes.

Test desktop, 768 px tablet and 390 px mobile, then narrow 320 px and keyboard-only management. Check tab focus restoration, direct `pageId` return, slow responses, failed/retried saves, rapid page/website/locale changes and history reset. Missing translations, excluded link targets and invalid redirects must block publication visibly. A draft edit during snapshot creation must return `draft_changed` and preserve the previous live snapshot.

Enable a second language, translate included pages/sections, and preview every included/excluded page as owner. Reject anonymous/foreign-owner preview. Publish once; inspect `/`, `/about`, `/en`, `/en/about`, direct refresh/back/forward, page-retaining language switching, nav active state and valid section anchors. Unknown/disabled locales/pages return 404. Excluded pages remain private draft previews and absent from live sitemap.

Repeat page URLs on platform paths, customer subdomain and verified custom domain. Check canonical/alternate/OG metadata, sitemap/robots, permanent old-slug redirects and Home replacement. Verify snapshot immutability after renaming/editing draft pages. Submit contact/request and booking from a non-home page to controlled staging recipients; verify private recipient values never appear in public content. Exercise review/inquiry lookups using aggregate snapshot sections.

Apply/restore a selected-page template and import the contract's version 2 example. Other pages, shared shell, SEO/translations/redirects/business data must remain intact. Check FlexStart review/import without bypassing human approval. Export the account and verify pages/overlays/scopes/redirects; delete disposable staging websites/accounts and verify cascades preserve unrelated records. Record actual host/account/browser results, not only fixture screenshots.

## Rollback and recovery

Keep a known working **multipage-compatible** application revision and a tested database backup before release. For a reader/UI defect, redeploy that compatible revision and suspend publication/new writes as necessary; preserve version 3 snapshots and draft records. For a faulty new migration, stop writers, take a current backup and apply a reviewed forward repair, or restore the staging/production backup into an isolated target and verify before cutover. Do not run the legacy one-page app against the new model, drop page tables in place, or restore discarded legacy website content. Do not treat a blind schema downgrade as a rollback.

Backups must include all page/locale/scope records, section translations and transitions, page translations, redirects and live snapshot together. Restore dependency order is documented in the contract. Re-run owner isolation, Home/slot/slug invariants, snapshot validation and public routes before resuming writes/publication.
