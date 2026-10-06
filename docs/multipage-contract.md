# Multipage contract

Implemented locally on 6 October 2026. Hosted acceptance is tracked separately in [the task file](multipage-editor-tasks.md).

## Data and operations

`website_pages` belongs to one website. Stable UUIDs identify pages; slugs are flat, unique within the website and cannot use supported locale segments. Exactly one Home is required at transaction commit; it has an empty slug, position zero and publication inclusion. Other pages start excluded. Menu visibility does not change access or publication inclusion.

`website_sections` has `scope = page | site_header | site_footer`. Page sections require a page from the same website; shared sections have no page. At most one shared nav and one shared footer exist. They render before and after the selected page. Page deletion cascades its sections, translations and transitions, leaving shared sections intact. Shared creation/conversion replaces the previous slot and local nav/footer sections of the same type atomically, after an explicit UI confirmation. Database guards prohibit coexistence; selecting that section type in the palette edits the existing shared slot.

Page translations belong to a configured website locale and retain the same page ID/slug/structure. They override title, menu label and SEO. Missing included-page translations block publication. Source hashes warn about stale translations; the owner can explicitly acknowledge them before publishing. Redirects map a previous published slug to a stable page ID. Page translations, redirects, shared edits and page operations all change the draft revision.

Copying a page creates fresh page and section UUIDs, copies overlays, and remaps transitions, self-links and form destination identifiers. Its publication inclusion starts false. Moving a section retains its UUID and translations, removes former transitions, and rewrites typed links and section-ID anchors to the destination. Home replacement preserves the former Home at an explicitly chosen slug. Home deletion/exclusion and invalid swaps fail transactionally.

References are `page:<uuid>` or `section:<page-uuid>:<section-uuid>`; external/relative/contact URLs retain their URL value. The shared picker supplies explicit targets. Invalid or excluded targets block publication. Incoming-link lists identify the source sections for repair; owners can change/remove those links or remove conflicting redirects. Renaming a previously published page captures its published path, which becomes an active redirect only after publication.

## Editor and save boundaries

Canvas tabs load active-page sections/transitions plus shared sections. Structural saves contain only page sections; shared content uses its stable row identity. Shared placement is fixed. Page changes flush the recoverable save queue, reset selection and undo/redo, and retain device settings. Each queued operation captures its origin; late results cannot replace a newer context. Shared text/style changes use the same history within the current editor context. Page copy, movement, template changes and slot changes reset structural history; SQL transactions/checkpoints handle those actions.

The active page is stored per website and accepted through `pageId` editor URLs. SEO and private preview links carry that page. Page SEO settings override website/locale defaults; empty fields inherit defaults. Social links and analytics remain website-wide. Translated SEO is edited in the Pages manager. New management/publication actions require authenticated `multipage_contract_version() = 3`.

## Routes and immutable publication

Public and owner-preview routes use optional catch-all paths. `/` selects Home, `/about` selects a page, `/en` selects translated Home, and `/en/about` selects the translated page. Unknown/disabled locales, unsupported nested paths and missing pages return 404. The domain middleware retains the visitor path for platform, subdomain and custom-domain access. Private previews require website ownership on every route and are excluded from indexing.

Version 3 snapshots contain `website`, `business`, `services`, `availabilityWindows`, `pages`, `sharedSections`, `locales`, `redirects`, `sections`, `transitions`, `draftVersion` and publication time. Each included page carries its metadata, sections, page-local transitions and locale overlays. The aggregate root `sections` and each aggregate locale's `sections` contain **all included pages and shared content**: public contact, request, review and booking lookups continue to locate non-home forms without accessing draft rows. Recipient addresses stay outside public section content. The renderer selects a page bundle rather than rendering that aggregate.

The complete contract is validated before live rendering. Live page paths, locale content, navigation, SEO and redirects come from the snapshot. Draft/excluded-page copy cannot become live or block publication unless included content references it. Preflight checks Home, translations, ownership, links, unsafe URLs and redirect collisions. Redirects target page IDs rather than other redirects, preventing chains/loops. Publication aggregates existing feature entitlements across included content; no new page pricing is introduced. Promotion retains the existing expected-draft/subscription revision locks, rejecting concurrent edits. One publication exposes all included pages and the shared shell together. Version 2 snapshots have no compatibility adapter.

Canonical URLs use the verified preferred customer domain or the platform site path, with page-specific metadata and equivalent-page language alternates. Customer sitemap/robots routes enumerate only immutable published pages/locales; the platform sitemap remains separate. Preview hosts disallow indexing.

## Creation, imports, templates and retention

New website insertion creates one Home and starter sections are assigned there. Newly imported single-page documents become Home. Import JSON version 2 adds `pages`, section `pageKey`/`scope`, and source-key references (`page:about`, `section:about:team`). The normalizer assigns new IDs, and SQL atomically replaces source Home references with the generated Home ID. FlexStart uses the same pages/scope model with its existing service authorization and approval flow. Its preview selects a page and shared shell. Version 1 imports remain accepted as an optional single-page input; old snapshot/checkpoint retention is not required.

Example:

```json
{"format":"flexpagina","version":2,"title":"Company","pages":[{"key":"home","title":"Home","slug":"","isHome":true},{"key":"about","title":"About","slug":"about","includeInPublication":true}],"sections":[{"key":"header","type":"nav","scope":"site_header","content":{"brandName":"Company"}},{"key":"intro","type":"hero","pageKey":"home","content":{"title":"Welcome","ctaEnabled":true,"ctaText":"About","ctaHref":"page:about"}},{"key":"team","type":"about","pageKey":"about","content":{"title":"Our team","description":"Meet our team."}}]}
```

Applying a page template changes only the selected page's section structure. It explicitly excludes nav/footer template sections; shared replacement is a separate action. Checkpoint version 3 records website/page identity, sections, transitions and section translations in one transaction. Restore rejects foreign context/endpoints and restores exactly that page. Page settings/translations, redirects, other pages, shared sections and business/service/account data are preserved because application never changes them. Old whole-site checkpoints are rejected. Checkpoints remain in browser storage; losing that storage loses the local recovery payload.

Account export schema 3.0 includes page, page-translation and redirect records alongside scoped sections. Website/account deletion uses their cascading foreign keys. Backup must include all those records and the immutable live snapshot together; restore in dependency order (website/locales/pages, scoped sections, translations/transitions/redirects, snapshot) in an isolated database, then run integrity checks. Never run `init.sql` on a hosted database as a repair. [Rollout and cleanup](multipage-draft-rollout.md) describe the release boundary.
