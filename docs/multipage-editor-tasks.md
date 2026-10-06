# Multipage Website Editor Tasks — Option 2

Date: 2026-10-04

Status: Remaining local implementation completed on 2026-10-06: page operations, shared shell, version 3 publication/routing, SEO, redirects, translations, imports and scoped templates/checkpoints. Hosted migration/cleanup, authenticated write/publish workflows and customer-host release acceptance remain unchecked. See [final contract](multipage-contract.md) and rollout evidence.

Scope update: the old one-page websites are no longer needed. The full implementation targets the new multipage model; migrating or retaining old website content, version 2 snapshots, and old template checkpoints is not required. This task file update does not execute data cleanup.

## Initial UI prototype — verification history

- [x] Add page tabs at the top inside the canvas and a responsive Pages drawer to `/editor`. Keep the tabs within the canvas width and visible while scrolling; scroll the tab strip horizontally on narrow screens and support arrow keys plus Enter/Space to select a page.
- [x] Keep the mobile website toolbar to one row: website selection, publication, and a More menu. Put secondary actions and language selection in the menu, and add pages through the Pages drawer on mobile.
- [x] Verify the real header, toolbar, language controls, and page tabs with sample content at 320, 390, and 430 px, plus desktop. Check menu actions, language management, focus restoration, page creation, and preview action guards. At 390 px the toolbar alone shrinks from 228 px to 61 px. The separate mobile screenshot is no longer present; the retained prototype preview is linked below.
- [x] Support adding, naming, ordering, and removing extra pages in local preview state, with URL validation and menu/publication setting previews.
- [x] Show an isolated empty canvas for extra pages; Home currently shows the loaded website sections. This describes the prototype, not a legacy-retention requirement.
- [x] Disable Home editing/history/import/SEO/publication actions while viewing an extra preview page, and flush pending Home saves before switching.
- [x] Check the real components with sample content in a temporary browser fixture: page actions, reserved URL validation, save-failure handling, focus restoration, and desktop/390 px mobile/768 px tablet sizing. The fixture is removed after verification.
- [x] Run the existing editor navigation, save queue, inspector, reliability, and initial-loading tests: 19 tests passed.
- [x] Pass TypeScript, focused ESLint, and the production Turbopack build with the bundled Node 24 runtime. Clear the stale production Turbopack cache after its first attempt captured the system Node 20 child-process error; the existing dev server is retained.
- [x] Inspect the integrated UI in an authenticated local `/editor` session with an existing website: separate Home/test sections, migration gate and page-specific SEO return link. Check 320/390/768/1440 px widths without horizontal overflow and drawer focus restoration. No draft writes/publication were performed; full new-migration acceptance remains in Task 11.

The initial prototype used local preview state and hid the editor panels on extra pages. The draft foundation below replaces that behavior. The browser screenshots and prototype checks above describe the earlier UI fixture, not authenticated verification of the new database integration.

UI source: [EditorPagesWorkspace](../components/editor/editor-pages-workspace.tsx). [Browser preview with sample content](../output/editor-pages/pages-ui-preview.png).

## Draft foundation — implemented locally

- [x] Add persistent pages with owner RLS, stable IDs, validated paths, a mandatory Home page, and draft revision triggers.
- [x] Add transactional create/update/reorder/delete page operations, scoped section ordering, and atomic section structure changes with ID mapping.
- [x] Load page-specific sections and transitions through the canvas tabs, keeping section selection and editing panels available on every page.
- [x] Flush recoverable queued saves before switching pages and reset section selection/history. Restore the active page ID per website with Home fallback.
- [x] Persist page name/path/menu/publication settings. Confirm page deletion and protect Home.
- [x] Add page/section/URL target selection for custom navigation, hero/CTA/pricing/service buttons, and footer links. Store stable page/section references and resolve them against current page paths and locale paths; editor clicks switch tabs and locate the chosen section.
- [x] Preserve custom link targets, order, disabled items, and labels through navigation rendering and translation. Include immutable link-page metadata in new snapshots and reject missing/excluded page targets and invalid section ownership at publication.
- [x] Block publishing multiple pages until public routes/snapshots support them, and guard existing template/checkpoint transactions from replacing a multipage draft.
- [x] Mirror the generated migration in fresh initialization; add actual local SQL tests for owner isolation, constraints, ordering, deletion, revision changes, and transactional rollback.
- [ ] Install the migration on a reviewed staging target, complete the scoped obsolete-content cleanup, and verify authenticated desktop/mobile workflows. No hosted data has been changed.
- [x] Implement public routes/snapshots, shared sections, page duplication/Home replacement, cross-page moves, link-repair lists/redirects, page SEO and import/template/checkpoint contracts below. Hosted acceptance is separate.

See [deployment and cleanup procedure](multipage-draft-rollout.md). These checked increments do not mark the broader Tasks 1–11 complete.

### Latest local validation — navigation and links

- [x] Pass all 266 repository tests. [Test results](../output/website-links-full-tests.log).
- [x] Add six [link behavior tests](../tests/website-links.test.mjs), covering stable targets after path changes, locale/anchor resolution, URL validation, custom navigation and translations, editor clicks, publication validation, and server-rendered picker states.
- [x] Add six [page database tests](../tests/website-pages.test.mjs), exercising SQL constraints, owner/anonymous role isolation, page operations, section integrity, rollback, and retry behavior in local PGlite fixtures.
- [x] Pass TypeScript and focused ESLint for the changed files; pass the production build with Node 24. [Build results](../output/website-links-build.log).
- [ ] Verify authenticated integrated desktop/mobile workflows and hosted migration/public routes. Earlier prototype browser checks do not establish these results; no hosted migration or data cleanup has been executed.

### Latest local validation — 6 October 2026

- [x] Implement the remaining local page/scope/routing/publication/SEO/import/template requirements in the [final contract](multipage-contract.md); mirror both generated migrations in fresh initialization.
- [x] Pass 278 repository tests, including actual SQL owner/anonymous isolation, translations/redirect revisions, atomic shared replacement, Home swaps, fresh copy identities, movement, checkpoint rejection/rollback, import remapping, snapshot assembly/validation and stale-revision promotion rejection. [Full results](../output/multipage-complete-tests.log).
- [x] Pass repository-wide ESLint, TypeScript and the Node 24 production build. [Lint](../output/multipage-complete-lint.log), [build](../output/multipage-complete-build.log).
- [x] Inspect an authenticated existing local website at 320/390/768/1440 px: page isolation, drawer layout/focus return, missing-contract gate and selected-page SEO return. Width measurements equal viewport width without horizontal overflow. [Mobile](../output/editor-pages/multipage-mobile-authenticated.png), [tablet](../output/editor-pages/multipage-tablet-authenticated.png), [desktop](../output/editor-pages/multipage-desktop-authenticated.png).
- [ ] Install the new operations migration and run the complete write/publish/locale/domain/form acceptance matrix on a named staging target. Read-only inspection found the foundation installed in the local app's database, but no new page-translation table/move RPC and no staging branch. No hosted data or deployment was changed here.

## Goal

Let an owner create and manage multiple pages within one customer website, using the existing section canvas and inspector. Each page has its own public URL and SEO settings, while the website keeps one theme, business connection, language configuration, domain configuration, and publication flow.

Example: Home at `/`, About at `/about`, Services at `/services`, and Contact at `/contact`, with translated versions such as `/en/about`.

This is option 2 from the multipage research: a full page builder backed by a relational `website_pages` model. It concerns pages on customer websites, not the editor's existing Website, Klantzaken, Planning, and Instellingen navigation groups.

## First-release product decisions

- Start websites in the new multipage model with one Home page. Old one-page websites are disposable; no legacy backfill or backward-compatible rendering is required.
- Support flat pages. Nested folders, generated service/accommodation detail pages, and per-page publication are follow-up work.
- Add page tabs inside the top of the canvas and a Pages panel for page management. Reuse the canvas, section components, inspector, device preview, and existing website toolbar.
- Support adding, renaming, duplicating, reordering, deleting, and selecting pages, plus moving sections between pages.
- Maintain exactly one homepage per website. The homepage cannot be deleted or excluded from publication; changing the homepage is a transactional action.
- Publish the whole website atomically. A page can be excluded from the next publication, but hiding it from navigation is a separate setting and does not make it private.
- Newly added or duplicated non-home pages start excluded from publication. Their inclusion is explicit in page settings and publication preflight.
- Use one shared header and one shared footer when configured, with an explicit indication that editing them affects all pages. Configure these directly in the new model.
- Keep one shared page/section structure across languages. Translate page titles, navigation labels, SEO fields, and section text through locale overlays.
- Keep page slugs shared across languages in v1. Default-language pages use `/about`; translated pages use `/en/about`. Home uses `/` or `/en`.
- Reserve configured and supported language path segments, including `en`, `de`, and `fr`, to prevent page/language ambiguity. Derive the complete reserved list from the routing contract.
- Do not introduce page pricing or new subscription limits without a separate product decision. Preserve existing entitlements and enforce them server-side across the complete publishable website.
- Follow [the style guide](style-guide.md), reuse existing UI primitives, and write owner-facing labels in Dutch, such as `Pagina`, `Pagina's`, `Nieuwe pagina`, and `Pagina-instellingen`.

## Current repository foundation

- [Page persistence](../lib/supabase/websitePages.ts) provides page queries and transactional mutations. [Section persistence](../lib/supabase/websiteSections.ts) now uses website/page/scope context, with atomic page structure changes.
- [Editor client](../components/editor/editor-client.tsx) loads sections and transitions for the active page, restores page selection per website, and ignores stale responses.
- [Save queue](../lib/editor-save-queue.ts) flushes pending section changes before page switching, navigation, and publication. Queued structural saves capture their website/page identity and data.
- [Navigation](../components/sections/nav-section.tsx) and the shared [link picker](../components/editor/section-link-select.tsx) support page, section, and URL targets. [Link resolution](../lib/website-links.ts) uses stable IDs; editor clicks switch pages and locate sections.
- [Public loader](../components/page-loader.tsx) renders the requested page/locale with shared header/footer from the immutable version 3 snapshot.
- [Snapshot builder](../lib/website-snapshot.ts) produces and validates version 3 multipage snapshots. New publication requires the complete database contract.
- Public and preview optional catch-all routes resolve locale and flat page paths. [Domain middleware](../lib/supabase/middleware.ts) already carries visitor paths through to those routes.
- [SEO editor](../components/business/seo-essentials-client.tsx) and [metadata utilities](../lib/seo/metadata.ts) provide existing SEO behavior to extend.
- [Platform sitemap](../app/sitemap.ts) currently lists platform pages, not each customer's published pages.
- Page mutations and existing section/translation mutations participate in draft revision tracking. New website initialization creates Home; existing template/checkpoint transactions reject multipage drafts. Full page-aware templates, imports, exports, and checkpoints remain pending.

## Proposed data contract

### Pages

Add `website_pages` with stable `id`, `website_id`, source-language `title`, normalized `slug`, `position`, `is_home`, `include_in_publication`, `show_in_navigation`, source-language `seo`, and timestamps.

- Enforce uniqueness of `(website_id, slug)` and at most one homepage with a partial unique index. Enforce at least one homepage through transaction-safe mutation rules.
- Keep the homepage's stored slug stable, but resolve its canonical URL through `is_home` to the root. Define redirects when changing the homepage or a previously published slug.
- Give pages a composite unique key `(id, website_id)` so child records can enforce website membership.
- Add `website_page_translations`, keyed by page and locale, for translated title, navigation label, SEO fields, and source hash. Validate membership in both the website and its configured locales.

### Page sections and shared sections

Extend `website_sections` with `page_id` and a scope such as `page`, `site_header`, or `site_footer`.

- Page sections require `page_id`; shared header/footer sections have no `page_id`. Enforce this relationship with a database check.
- Use a composite foreign key `(page_id, website_id)` to prevent assigning sections to a page owned by another website.
- Allow at most one shared header and one shared footer per website in v1; enforce compatible section types.
- Scope ordering to the page. Shared sections are assembled around page sections by the renderer, not inserted into every page's persisted ordering.
- Keep section IDs stable when moving between pages; allocate new IDs when duplicating and remap related references and translations.
- Keep visual transitions between page-local sections on the same page. Do not introduce shared-shell boundary transitions in v1.

### Navigation, redirects, and publication

- Introduce typed link targets for page, section, and external URL. Resolve page/section targets by stable IDs instead of persisting their current URL as the source of truth.
- Model redirects for old published paths, scoped to the website, and include them in the published revision. Redirects activate with publication, never from an unpublished slug edit.
- Publish a new snapshot version containing pages, shared sections, page-local transitions, locale-specific page content/SEO, navigation, and redirects.
- Read and publish the new multipage snapshot contract only. Version 2 snapshots do not need a compatibility adapter.
- Changes to pages, page translations, shared sections, navigation, and redirects must participate in `websites.draft_version` tracking.

## Progress checklist

The implementation requirements are completed locally below. Overall Tasks 2–11 remain open until their hosted/authenticated acceptance criteria are demonstrated; a checked implementation item is not release proof.

- [x] Task 1 — Confirm contracts and affected integrations.
- [ ] Task 2 — Add schema, ownership rules, and new-model initialization.
- [ ] Task 3 — Add transactional page and section operations.
- [ ] Task 4 — Make editor state, saves, and history page-aware.
- [ ] Task 5 — Build page management and settings UI.
- [ ] Task 6 — Add shared header/footer and typed links.
- [ ] Task 7 — Add language-aware page routing and rendering.
- [ ] Task 8 — Extend atomic publication with multipage snapshots.
- [ ] Task 9 — Add page SEO, redirects, and customer sitemaps.
- [ ] Task 10 — Update templates, imports, onboarding, and exports.
- [ ] Task 11 — Complete verification and staged rollout.

## Task 1 — Confirm contracts and affected integrations

- [x] Read applicable `AGENTS.md` instructions and the installed guides in `node_modules/next/dist/docs/` for routing, metadata, proxy/rewrites, and sitemap conventions before writing application code.
- [x] Read the Next.js and Supabase skills and verify relevant current documentation before implementation. Follow the existing migration workflow and keep `supabase/init.sql` aligned.
- [x] Document final page, shared-section, typed-link, locale-overlay, redirect, and snapshot types, including defaults for newly created websites.
- [x] Trace all section writers, ordering operations, snapshot readers, draft-version triggers, template checkpoint/restore procedures, import paths, and public form lookups.
- [x] Specify behavior for replacing the homepage, excluding a page, deleting a linked page, moving a linked section, and creating or editing shared navigation.
- [x] Define the cleanup scope for disposable one-page website content and its dependent records in the [rollout procedure](multipage-draft-rollout.md). Business, account, billing, and other application data are outside that cleanup scope. Cleanup has not been executed.

Done when: the contracts cover the new multipage model, cleanup boundaries are documented, and all website-wide assumptions that need updating have an assigned task below.

## Task 2 — Add schema, ownership rules, and new-model initialization

- [x] Add page and section-scope schema, ownership foreign keys, and page/section ordering indexes in the [migration](../supabase/migrations/20261004194421_multipage_draft_pages.sql), mirrored in fresh initialization.
- [x] Add page-translation and redirect tables with their ownership rules and indexes.
- [x] Enable owner RLS on `website_pages`, validate resulting ownership, and deny anonymous draft access. Exercise the policies with local SQL role fixtures; hosted authentication checks remain in Task 11.
- [x] Create one included Home page for each new website through a database trigger; section inserts without an explicit page use Home.
- [x] Prepare the explicit-ID, fail-closed [cleanup transaction](../supabase/maintenance/multipage-obsolete-content.sql), browser-checkpoint removal procedure and backup boundaries. The transaction defaults to rollback and refuses an installed foundation.
- [ ] Execute reviewed obsolete-content cleanup only on a named target that still needs the foundation. Skip it where the foundation already exists; no hosted cleanup was executed.
- [x] Enforce page/website membership and section scope, keep transition endpoints on the same page, and keep shared slots outside page deletion cascades. Validate page/section link targets during snapshot creation.
- [x] Track page mutations in draft revisions, alongside existing section and section-translation changes.
- [x] Extend revision tracking and integrity checks to future page translations, redirects, shared-section conversion, and cross-page moves.

Done when: fresh database initialization matches migrations, new websites start with a valid Home page, cleanup respects its documented scope, malformed cross-website references fail, and authenticated cross-account access checks pass.

## Task 3 — Add transactional page and section operations

- [x] Add page queries and transactional create/update/reorder/delete operations, including navigation/publication settings and protected Home behavior. [Page utilities](../lib/supabase/websitePages.ts).
- [x] Add page duplication and transactional homepage replacement.
- [x] Validate slug normalization, duplicate slugs, reserved segments, and ownership on the server; expose Dutch validation errors.
- [x] Scope editor section loading and structural saves to the active page. Atomic structure saves validate section membership and return stable ID mappings; ordering cannot modify another page.
- [x] Add explicit cross-page section movement and shared-section conversion operations.
- [x] Make current page mutations and section structure saves atomic, with rollback and deterministic retry coverage in [database tests](../tests/website-pages.test.mjs).
- [x] Extend atomic operations to page copying, homepage replacement, and transition changes during cross-page moves.
- [x] Duplicate page sections with fresh IDs; copy locale overlays and remap internal section links, transition endpoints, and form destination identifiers where appropriate.
- [x] Moving a section preserves its ID and translations, removes invalid old-page transitions, and updates link resolution. Shared-section movement uses an explicit conversion action.
- [x] Reject missing/excluded page targets and invalid section membership before publication. Pickers warn when a selected page or section is missing.
- [x] List incoming links affected by exclusion/deletion and require an explicit repair, redirect, or removal choice before the next publication. Capture required old-path redirects when changing published URLs.

Done when: every operation is ownership-safe, transaction-safe, deterministic, and cannot leave a website with zero or multiple homepages.

## Task 4 — Make editor state, saves, and history page-aware

- [x] Introduce page list, active page ID, and page-scoped sections/transitions while preserving website and locale context.
- [x] Load and edit shared sections separately from the page state.
- [x] Persist the active page per website using stable IDs, with Home fallback; support explicit `pageId` editor URLs and section anchors.
- [x] Integrate selected-page return links into page SEO and public multipage preview flows.
- [x] Flush recoverable queued saves before page switching and page deletion, using existing navigation/publication protection. Capture the originating context before asynchronous operations.
- [x] Apply save flushing and origin-context protection to page duplication, Home replacement, moves and shared changes. Authenticated language-switch acceptance remains in Task 11.
- [x] Capture website/page/section identity and data for queued saves so late saves cannot use a new page's section list or ordering.
- [x] Reset page undo/redo and selection on page switches and structural actions, preventing stale history from modifying another page.
- [x] Define history for shared-section editing and duplication/movement actions.
- [x] Ignore stale load/mutation responses on rapid page/website switching; reset selection and preserve device preview settings.

Done when: rapid navigation, delayed responses, failed saves, and undo/redo cannot lose changes or apply them to a different page.

## Task 5 — Build page management and settings UI

- [x] Add compact canvas page tabs and a responsive Pages panel using the existing editor controls. [Page workspace](../components/editor/editor-pages-workspace.tsx).
- [x] Show active page, Home, navigation visibility, and publication inclusion as distinct states.
- [x] Provide persistent add, rename, reorder, settings, and confirmed deletion actions; protect Home.
- [x] Provide page duplication, set-homepage, and `Verplaatsen naar pagina` actions.
- [x] Provide page title/slug, navigation visibility, publication inclusion, and resolved URL settings.
- [x] Provide translated page title/navigation label and page SEO settings.
- [x] Display links affected by deletion, exclusion, or URL changes and provide the resolution actions defined in Task 3.
- [x] Reuse existing UI primitives and keyboard/focus patterns; verify the initial prototype at desktop, tablet, and mobile sizes as recorded above.
- [ ] Verify the integrated persistent-page and link controls in authenticated desktop/tablet/mobile sessions.

Done when: an owner can manage a four-page website entirely through the UI, identify the current page, and understand which pages will be public.

## Task 6 — Add shared header/footer and typed links

- [x] Add explicit shared-header/footer editing with a visible `Gedeeld op alle pagina's` indication, using the current nav/footer section components.
- [x] Add creation, replacement, and removal of shared header/footer slots directly in the new model. Explain that shared edits affect every page.
- [x] Render the shared header, active page sections, and shared footer in both editor and public modes without duplicated IDs, duplicate navs, or broken sticky behavior.
- [x] Add a reusable `Pagina` / `Sectie` / `Webadres` picker with page-specific section loading, URL validation, and missing-target warnings. Integrate navigation, footer, hero, CTA, pricing, and service links. [Link picker](../components/editor/section-link-select.tsx).
- [x] Store stable page/section IDs and resolve same-page anchors or other-page URLs plus anchors, including locale prefixes. Path changes do not invalidate the stored target. [Resolver and validation](../lib/website-links.ts).
- [x] Make editor clicks switch to the target tab and scroll/focus the chosen section, after flushing saves. Preserve modifier-click behavior and normal browser navigation for public links. [Link context](../components/editor/website-links-context.tsx).
- [x] Support custom navigation labels, add/duplicate/delete/reorder actions, and visibility settings. Preserve targets, order, and hidden items during inline editing and translation; translate labels without changing destinations.
- [x] Resolve editor URLs and preview base paths separately from customer-site paths; cover locale and anchor resolution in [link tests](../tests/website-links.test.mjs).
- [x] Implement the shared public route contract for platform/customer hosts and translated pages, including accessible active-page indication. Hosted verification remains in Task 11.

Done when: a header edit appears on every page after publication and all supported page, section-anchor, and external link types work.

## Task 7 — Add language-aware page routing and rendering

- [x] Replace the root/locale-only route arrangement with an unambiguous resolver, for example `/site/[slug]/[[...path]]` and the equivalent private preview route. Remove conflicting route definitions as part of the change.
- [x] Parse optional locale prefix and page slug through one shared contract. Resolve `/`, `/about`, `/en`, and `/en/about`; reject unknown or disabled locales and unknown pages with 404.
- [x] Reserve locale segments regardless of whether a particular website currently enables them. Resolve translated homepages through the new locale/page contract.
- [x] Extend the public loader to select the requested page, its locale overlay, and shared shell. Preserve theme application, business/service resolution, structured data, cookie consent, and analytics.
- [x] Preserve preview ownership/authentication checks for every page and locale. Excluded pages are owner-previewable but have no live route.
- [x] Carry full visitor paths through domain middleware and use the same resolver for platform, preview, subdomain, and custom-domain access.
- [x] Make language switching retain the active page and a valid section anchor. Keep page structure shared and missing/stale translation behavior consistent with current publication checks.

Done when: direct URLs, refresh, browser back/forward, and language switching work across every supported host without treating page names as languages.

## Task 8 — Extend atomic publication with multipage snapshots

- [x] Add the new multipage snapshot version and validate the complete page/scope/link contract rather than only the top-level version. Remove the requirement to read or adapt version 2 snapshots.
- [x] Replace the interim version 2 link metadata with version 3 page bundles and immutable navigation/redirect metadata. No live draft-page lookup or version 2 adapter remains.
- [x] Snapshot included pages, shared shell, page transitions, enabled locales, page SEO, resolved links, and redirects in the new contract. Live rendering must not consult current draft pages or redirects.
- [x] Reject broken page/section references, targets excluded from publication, unsafe URLs, and invalid section ownership during snapshot creation. [Link validation tests](../tests/website-links.test.mjs).
- [x] Replace the interim `MULTIPAGE_PUBLICATION_PENDING` guard with authenticated contract-version gating. Incomplete installations return `503 MULTIPAGE_MIGRATION_REQUIRED`; complete installations publish version 3.
- [x] Complete preflight for homepage validity, included page translations, and redirect collisions/loops. Excluded-page copy should not block publication unless an included page depends on it.
- [x] Preserve private recipient handling for forms and stable form destinations. Check inquiry, request-form, review, and booking endpoints for assumptions that sections only exist at the snapshot root.
- [x] Retain race-safe promotion using the expected draft version; page edits during snapshot creation must prevent promoting a stale revision.
- [x] Aggregate existing section/feature entitlements across all included pages and the shared shell, without adding a new page limit. Keep business, service, domain, and locale authorization unchanged.
- [x] Explain in publication UI that all included pages and shared content are published together.

Done when: editing any page leaves the live site unchanged until publication, and one atomic publish exposes a consistent revision across all included pages and languages.

## Task 9 — Add page SEO, redirects, and customer sitemaps

- [x] Separate website SEO defaults from page/locale SEO overrides. Update the SEO editor to target and return to the selected page.
- [x] Generate page-specific title, description, Open Graph data, canonical URL, and equivalent-page language alternates. Use the existing preferred-domain rules.
- [x] Add customer-site sitemap and robots handling per host. Keep the platform's sitemap separate and exclude private previews and pages absent from the live snapshot.
- [x] Resolve old published URLs through snapshot-backed redirects. Validate source/target collisions, unsupported locales, loops, and deletion targets; use permanent redirects only for intentional published URL changes.
- [x] Confirm homepage changes preserve the old page at its new canonical path and redirect obsolete aliases consistently.
- [x] Keep preview pages out of indexing and ensure structured data uses the correct website/page context.

Done when: published pages have correct metadata and sitemap entries, draft URLs are absent, and old URLs reach the intended live page after publication.

## Task 10 — Update templates, imports, onboarding, and exports

- [x] Add database initialization of exactly one Home page and default starter-section assignment to Home for new websites.
- [ ] Verify onboarding and every creation/import path against the installed new schema with authenticated data.
- [x] Define and implement imports for the new page/scope/link contract. Map newly imported single-page content to a Home page when applicable; retaining the old version 1 import format is not required.
- [x] Define template application scope explicitly. Applying a page template affects the selected page, and changing shared content requires an explicit separate scope.
- [x] Define template checkpoints and restore procedures for pages, scopes, page translations, links, redirects, and shared content transactionally. Old checkpoint formats do not need an adapter.
- [x] Guard existing template application and checkpoint restore transactions from flattening multipage drafts; test these guards locally. This does not implement page-aware template/checkpoint contracts.
- [x] Include new draft records in account export, website/account deletion, cascade handling, and backup/restore documentation.
- [x] Update FlexStart preparation/import, example websites, and any design duplication flows so they do not flatten pages or copy links to the original website.

Done when: creation and import flows produce the new model, restoring a new-format checkpoint preserves a complete multipage design, and exports/deletion cover the new model.

## Task 11 — Complete verification and staged rollout

- [x] Add local page SQL tests for initialization, Home invariants, slug reservation, ownership/page isolation, ordering, deletion, revision changes, atomic rollback/retries, and template guards. [Page tests](../tests/website-pages.test.mjs).
- [x] Add typed-link tests for page/section/URL targets, locale/path changes, editor navigation, translation preservation, picker states, and publication target validation. [Link tests](../tests/website-links.test.mjs).
- [x] Add coverage for page duplication, cross-page moves, full locale routing, multipage snapshot races, and redirects.
- [x] Exercise actual SQL constraints, RLS with owner/anonymous role fixtures, and structural transactions in local PGlite. This is local database evidence, not authenticated hosted Supabase proof.
- [ ] Repeat ownership and transaction checks on a reviewed Supabase staging target, including authenticated users from two accounts and anonymous visitors.
- [x] Pass TypeScript, repository-wide ESLint, the complete repository tests and production build with bundled Node 24. Current logs are linked in the 6 October evidence below.
- [x] Complete repository-wide lint and repeat required release checks after the remaining implementation.
- [ ] Verify an authenticated browser flow: create About/Services/Contact, edit and reorder sections, move and duplicate content, change the shared header, switch language, preview, publish, and follow every page link.
- [ ] Check mobile/tablet layouts, keyboard-only page management, focus restoration, direct-page refresh, save failures, slow page loads, missing translations, invalid links, and publish failure recovery.
- [ ] Verify a newly created multipage site on platform paths, subdomain, and custom domain. Exercise contact/request and booking flows from a non-home page.
- [ ] Roll out the schema and scoped cleanup, new multipage snapshot reader, then new writers/page-management UI. Gate new UI/writes until the complete contract is available; old websites are not a release-retention requirement.
- [x] Document rollback to a known working multipage-compatible revision. Returning to the old one-page model or restoring discarded old website data is outside the rollback requirement.
- [x] Record current local command results and clearly separate prototype UI checks, local SQL/test/build evidence, and pending authenticated/hosted checks in this file and the [rollout procedure](multipage-draft-rollout.md).
- [ ] Record authenticated staging and release evidence before marking the overall verification task complete.

Done when: automated checks and authenticated end-to-end checks pass for the new model, and the release has a documented multipage rollout/rollback path.

## Definition of done

- [ ] An owner can create and operate a four-page website through the existing editor without another editing engine.
- [ ] Every included page has a working direct URL, translated equivalent, page-specific SEO, and correct navigation.
- [ ] Shared header/footer changes are clearly scoped and consistent across pages.
- [ ] Page/website/language switches cannot lose edits or write to another page.
- [ ] Draft edits never become public until successful atomic publication.
- [ ] New websites, snapshots, imports, and checkpoints use the multipage contract; legacy website retention and compatibility are not required.
- [ ] Ownership, migration, publication, integration, and responsive browser verification are recorded as completed with evidence.

## Follow-up work outside v1

- Nested page folders and localized URL slugs.
- Generated service/accommodation detail pages using reusable content templates (option 3).
- Publishing or scheduling individual pages independently.
- General-purpose reusable global sections beyond header and footer.
- Page pricing/limits, password-protected pages, and advanced navigation trees.

## Research references

- [Next.js dynamic and optional catch-all routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes)
- [Webflow Pages panel](https://help.webflow.com/hc/en-us/articles/33961360067987-Pages-panel-overview)
- [Wix Studio global sections](https://support.wix.com/en/article/studio-editor-using-global-sections)
- [Supabase tables and relationships](https://supabase.com/docs/guides/database/tables)

Use these as product/architecture references. The installed Next.js guides and current Supabase documentation are authoritative for implementation details.
