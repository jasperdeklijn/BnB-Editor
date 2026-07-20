# Multilingual Website Editor Implementation Plan

Plan date: 2026-07-19

## Implementation status

Implemented in the repository on 2026-07-20: locale/translation schema and RLS, source-hash and safe overlay utilities, stable repeater ids, editor language management and translation panels, localized business/service copy, visitor message catalogs, locale-aware preview/live routes and middleware, navigation language selector, snapshot v2 publication with missing/stale preflight, localized SEO/structured data/document language, request-locale capture, template checkpoint/restore, section duplication, account export, feature flag, and focused automated tests.

Verified locally with `npx tsc --noEmit`, focused ESLint, snapshot tests, and multilingual unit/source-contract tests. Applying the migration to a real Supabase project, authenticated cross-account RLS tests, live form/email checks, and desktop/mobile browser smoke tests remain release-environment checks; they are intentionally not claimed as completed by source verification.

## Goal

Let a website owner maintain one website in multiple languages without duplicating the website, sections, styling, domains, or publication flow.

This plan covers languages for customer websites built in the editor. Translating the FlexPagina dashboard/editor interface itself is a separate project because it has different users, copy, routing, and release risks.

## Current state

- A visual, non-functional language placeholder is already present in `components/editor/editor-client.tsx`.
- On desktop it sits in the second editor header, directly after the website selector. That header must remain one row and use the full available width.
- On mobile it appears as `Taal van website` above the `Website beheren` disclosure.
- The placeholder currently shows `Nederlands` and `Binnenkort`; it does not read or save language data.
- No locale tables, translation editor, localized public routing, multilingual snapshot, or visitor language selector exist yet.

The implementation should replace this placeholder in place rather than add a third language control elsewhere in the editor.

## Product decisions

- Use the website's current content as the default/source language.
- Store locale codes as validated BCP 47 tags, for example `nl-NL`, `en-GB`, `de-DE`, and `fr-FR`.
- Keep one shared section tree. Section order, type, layout, styling, images, links, and feature configuration remain shared between languages.
- Store translated text as overlays for each non-default language; do not clone complete websites or complete section records.
- Serve the default language at `/` and translated languages at `/{locale}`, for example `/en` and `/de`.
- Use the same locale paths on platform subdomains and custom domains.
- Do not auto-redirect the root page based on browser language in the first release. The root remains a stable default-language URL; visitors choose another language through the site language switcher.
- A language must be explicitly enabled before it can appear on the public site.
- Publishing remains atomic: all enabled languages are resolved into one immutable live snapshot.
- Start with manual translation. Machine-assisted translation can be added later behind an explicit review step and must never publish automatically.
- Do not tie multilingual support to a paid plan until there is an explicit pricing decision. If it becomes gated later, enforce it in the publish API as well as the UI.

## Proposed data model

### `website_locales`

One row per configured website language:

- `id uuid primary key`
- `website_id uuid not null references websites(id) on delete cascade`
- `locale text not null`
- `path_segment text not null`
- `display_name text not null`
- `is_default boolean not null default false`
- `is_enabled boolean not null default false`
- `seo jsonb not null default '{}'`
- `created_at`, `updated_at`
- Unique constraint on `(website_id, locale)`
- Unique constraint on `(website_id, path_segment)`
- Partial unique index allowing one default locale per website
- Check constraint for normalized supported locale values

The default locale is always enabled and cannot be deleted. The `path_segment` is a short, URL-safe value such as `en` or `de`; keeping it separate from the full locale avoids putting `en-GB` in every URL. Two regional variants cannot use the same path segment on one website.

The default language can be changed before the first multilingual publication. Changing it after translated URLs have been published is out of scope for the first release because it changes canonical URLs and requires an explicit redirect/migration strategy.

### `website_section_translations`

One overlay per section and non-default locale:

- `website_id uuid not null references websites(id) on delete cascade`
- `section_id uuid not null references website_sections(id) on delete cascade`
- `locale text not null`
- `values jsonb not null default '{}'`
- `source_hash text not null`
- `created_at`, `updated_at`
- Primary key on `(section_id, locale)`
- Foreign-key/integrity rule ensuring the section belongs to `website_id`
- Foreign-key/integrity rule ensuring `(website_id, locale)` is configured in `website_locales`

`values` contains only fields declared translatable by that section type. `source_hash` records the source-language text used when the translation was last saved, so the editor can mark translations as stale after source copy changes.

Keeping `website_id` in this table makes ownership RLS, locale validation, export, and completeness queries explicit instead of depending on client-supplied joins.

### Shared business data translations

Sections currently resolve text from `businesses` and `services`, outside `website_sections`. Add:

- `business_translations (business_id, locale, name, description, opening_note, source_hash, ...)`
- `service_translations (service_id, locale, title, description, source_hash, ...)`

Addresses, phone numbers, email addresses, prices, durations, coordinates, availability, media, and other non-language data stay in their existing tables.

### Schema rules

- Add the schema to a new Supabase migration and mirror it in `supabase/init.sql`.
- Enable RLS on every translation table.
- Owners may read and edit translations only through ownership of the related website or business.
- Public reads continue to use the immutable live snapshot; draft translations must not leak through public RLS.
- Locale changes and translation writes must rotate `websites.draft_version`, just like other draft changes.
- Include the new tables in account export, account deletion/cascade behavior, template checkpoints, restore, and backup documentation.

## Translation contract in the section registry

Extend each `SectionDefinition` in `components/editor/section-registry.ts` with a `translatableFields` descriptor. Each descriptor should define:

- Stable field path or item key
- User-facing editor label
- Input type: single line, multiline, or rich/repeating item
- Whether the field is required for language completeness
- Optional character guidance

Examples include headings, body copy, button labels, navigation labels, FAQ questions/answers, testimonials, team biographies, pricing labels, and form-introduction copy.

Before translated repeaters are supported, ensure their items have stable IDs. This includes FAQ items, testimonials, feature items, footer columns/links, and pricing packages or tariffs. Translation records must reference an item ID, never an array index, so reordering does not attach copy to the wrong item.

Do not mark URLs, section targets, image URLs, colors, layout choices, booleans, recipient addresses, service IDs, or other behavior/configuration fields as translatable.

Add one shared utility layer that:

- Extracts the source-language text payload from a section
- Validates a translation overlay against the registry descriptor
- Applies an overlay without changing shared configuration
- Computes source hashes and completeness
- Rejects unknown or unsafe field paths

## Customer-site system copy

Some visible copy is currently hard-coded inside section components rather than stored in section content. Create a small customer-site message catalog separate from the editor UI, for example `lib/site-i18n/`.

It should cover:

- Contact/request form labels, placeholders, validation, success, and error messages
- Opening-hours weekday and closed/open labels
- Accessibility labels and navigation controls
- Language-switcher labels
- Any default CTA or empty-state copy visible on a published customer site

Provide a `WebsiteLocaleProvider` to section renderers. Avoid translating the entire FlexPagina application as part of this work.

## Owner language selector and editing flow

The editor control is for the website owner and replaces the existing `Nederlands / Binnenkort` placeholder.

- Desktop: keep it directly after the website selector in the second editor header. The control may collapse to a globe icon at narrower desktop widths, but it must not make the header wrap.
- Mobile: keep it as the full-width `Taal van website` row above `Website beheren`.
- The closed control shows the current editing language's native name and its status when relevant.
- The menu lists configured languages, marks the default language, and shows `Compleet`, `Ontbreekt`, or `Verouderd` status.
- The menu footer contains `Talen beheren`, which opens website language settings for add, enable, disable, URL segment, and removal actions.
- Selecting a language changes the editor content and preview language only; it does not publish or change the visitor's live default language.
- Shared controls such as layout, styling, images, section order, services, and links remain available but are visibly marked as applying to all languages.
- The owner can always return to the source language, and unsaved translation changes use the existing navbar save-state contract.

## Translation completeness and fallback

- The default language uses the existing source content and is always complete by definition after normal field validation.
- While editing a disabled language, missing translated fields may temporarily display source-language fallback text with a visible editor-only warning.
- A language cannot be enabled or published while any visitor-visible translatable field is missing. This prevents mixed-language public pages.
- A stale translation can remain enabled, but publishing requires a clear acknowledgement listing the affected sections.
- Customer-site system messages must have a complete reviewed catalog for every offered locale; they never fall back to Dutch on a published translated page.
- Disabled languages and draft-only translations are never publicly routable.

## Visitor language selector

The editor language selector is for the website owner. Published websites need a separate selector so visitors can choose their language.

- Show the visitor selector only when at least two languages are enabled and published.
- On desktop, place it at the right side of the generated website navigation, after the section links. Show a globe, the current language's native name, and a dropdown indicator.
- On mobile, place a compact globe/current-language button immediately before the hamburger menu. Opening it shows the available languages in a dropdown or bottom sheet.
- List languages by their native names, for example `Nederlands`, `English`, `Deutsch`, and `Français`; do not use flags as the only label.
- Mark the active language and make the control keyboard- and screen-reader-accessible.
- Selecting a language navigates to that language's canonical URL and retains the current section anchor where possible.
- The same selector is visible in owner preview so every language can be checked before publishing.
- If only one language is published, do not show an inactive or empty language control to visitors.

## Implementation map

### Database and security

- `supabase/migrations/<timestamp>_multilingual_websites.sql`
- `supabase/init.sql`
- RLS policies, locale/default constraints, indexes, `updated_at` triggers, and draft-version triggers

### Locale types and translation utilities

- `lib/types.ts`
- New `lib/i18n/locales.ts` for supported locale definitions and path validation
- New `lib/i18n/section-translations.ts` for extraction, validation, overlays, hashes, and completeness
- New `lib/site-i18n/` for visitor-facing system message catalogs and provider

### Editor

- `components/editor/editor-client.tsx` for the existing desktop/mobile selector placeholder
- `components/editor/section-registry.ts` for translatable-field descriptors
- `components/editor/section-editor.tsx` and co-located section editors for translated inputs
- New language-management UI under `/editor`, opened through `Talen beheren`
- Existing editor save-state context for saving, saved, and error feedback

### Public rendering and routing

- `components/sections/nav-section.tsx` for the visitor language selector
- `components/page-loader.tsx` for locale resolution and translated section composition
- `lib/supabase/middleware.ts` for preserving locale paths on subdomains and custom domains
- `app/site/[slug]/[[...path]]/page.tsx` and `app/preview/[slug]/[[...path]]/page.tsx` as the locale-capable routes replacing the exact-only pages

### Publishing, SEO, and requests

- `lib/website-snapshot.ts` for snapshot version 2
- `app/api/websites/publish/route.ts` for multilingual preflight and atomic promotion
- `lib/seo/metadata.ts` and public page metadata for localized canonical and alternate URLs
- `app/api/requests/route.ts` for validated submission locale recording

### Lifecycle coverage

- `app/api/templates/apply/route.ts`
- `app/api/templates/restore/route.ts`
- `app/api/account/export/route.ts`
- Website/section duplication and account deletion paths
- `tests/website-snapshot.test.mjs` plus new locale, translation, RLS, routing, and publication tests

## Tasks

### 1. Inventory all visitor-facing text

- [ ] List every visitor-visible field for all section types.
- [ ] Separate translatable content from shared configuration.
- [ ] Find hard-coded visitor copy in section components and form flows.
- [ ] Identify repeating content that needs stable IDs.
- [ ] Document the field contract in `docs/section-components-reference.md`.

Done when:

- Every current section type has an explicit translation-field definition or an explicit statement that it has no translatable fields.
- No visitor-facing form/system copy is left without an owning message catalog or content field.
- Reordering a repeated item cannot break its translation association.

### 2. Add locale and translation persistence

- [ ] Create `website_locales`, `website_section_translations`, `business_translations`, and `service_translations`.
- [ ] Add constraints, indexes, timestamps, RLS policies, and draft-version triggers.
- [ ] Backfill every existing website with one enabled default locale. Use `nl-NL` for existing sites unless a reliable existing setting says otherwise.
- [ ] Mirror the final schema in `supabase/init.sql`.
- [ ] Add locale validation and source-hash utilities.

Done when:

- Existing websites render exactly as before after migration.
- Each website has exactly one enabled default language.
- Cross-account reads and writes are rejected by RLS.
- Translation edits make the website draft newer without changing the current live snapshot.

### 3. Build language management in the editor

- [ ] Add a `Talen` area under website settings.
- [ ] Let an owner add a supported language, choose its URL segment and display label, enable/disable it, set it as default before the first multilingual publication, and remove it with confirmation.
- [ ] Replace the existing non-functional desktop/mobile language placeholder with the owner selector defined above.
- [ ] Keep shared layout/style controls clearly marked as applying to all languages.
- [ ] Show `Compleet`, `Ontbreekt`, and `Verouderd` status per language and section.
- [ ] Offer `Kopieer brontekst` and `Maak velden leeg`; do not silently translate content.
- [ ] Preserve the navbar saving/error contract for every language operation.

Done when:

- Switching editor language changes only editable translated text, not section order or styling.
- Mobile users can select a language, translate a section, preview it, and return to the source language without losing changes.
- The default language cannot be removed; changing it after the first multilingual publication is rejected until a redirect/migration workflow exists.

### 4. Make all content sources locale-aware

- [ ] Apply section translation overlays through the shared utility layer.
- [ ] Resolve localized business and service copy for services, about, contact, opening-hours, map, and other data-backed sections.
- [ ] Localize customer-site system messages through `WebsiteLocaleProvider`.
- [ ] Include the submitted locale in contact/request payloads and owner notifications.
- [ ] Keep phone, email, address, pricing values, schedules, images, and section links shared unless explicitly modeled otherwise.

Done when:

- A translated page contains no accidental Dutch UI copy for all supported sections and request flows.
- Disabled draft languages may show visibly flagged source fallback in the editor, but enabled public languages contain no missing visitor-facing translations.
- A form submission records which language the visitor used.

### 5. Add locale-aware preview and public routing

- [ ] Replace the exact-only site/preview pages with locale-capable optional catch-all routes.
- [ ] Preserve the incoming pathname in middleware rewrites for platform subdomains and custom domains.
- [ ] Resolve locale from the first path segment and return 404 for unsupported or disabled locales.
- [ ] Use `/` for the default locale and `/{short-locale}` for other enabled locales.
- [ ] Add the visitor language selector to the generated site's navigation using the placement and behavior defined above.
- [ ] Keep anchor links and section navigation within the active locale.
- [ ] Persist an optional visitor preference cookie only after an explicit language choice; do not make it the canonical routing source.

Done when:

- Default and translated URLs work on `/site/{slug}`, preview subdomains, platform live subdomains, and custom domains.
- Desktop and mobile visitors can discover the selector without opening an unrelated settings screen.
- Switching language retains the equivalent page/anchor where possible.
- Websites with only one published language do not show the visitor selector.
- Disabled and unknown locales never render draft or fallback-only pages publicly.

### 6. Publish multilingual snapshots atomically

- [ ] Introduce snapshot version 2 with configured locales and fully resolved content per enabled locale.
- [ ] Keep theme, shared structure, transitions, and non-language configuration deduplicated where practical.
- [ ] Resolve section, business, service, SEO, and system copy during snapshot construction.
- [ ] Extend publish preflight with per-language missing/stale counts.
- [ ] Block enabling/publishing a language when required fields are missing; treat stale translations as a clear warning requiring acknowledgement.
- [ ] Keep version 1 snapshots renderable during rollout and rollback.

Done when:

- One successful publish exposes all enabled languages from the same immutable revision.
- A failed locale build leaves the previous live snapshot untouched.
- Draft edits in any language cannot change the public site until publish succeeds.
- Rollback or template restore does not mix translations from different revisions.

### 7. Add multilingual SEO and accessibility

- [ ] Store localized SEO title and description in `website_locales.seo` while keeping shared images and analytics configuration shared.
- [ ] Emit a localized canonical URL plus `hreflang` alternates for every enabled language and `x-default` for the default language.
- [ ] Set the document `lang` value from the resolved website locale, including rewritten custom-domain requests.
- [ ] Localize Open Graph/Twitter title and description.
- [ ] Extend structured data with localized business text where supported.
- [ ] Decide whether generated customer-site URLs belong in the platform sitemap; do not mix custom-domain URLs into the platform sitemap.

Done when:

- Every public locale has a self-referencing canonical, correct alternates, and the correct document language.
- Preview routes remain `noindex` in every language.
- Search engines cannot index disabled or draft languages.

### 8. Cover templates, duplication, export, and restore

- [ ] Templates create source-language content only unless a template explicitly ships reviewed translations.
- [ ] Website/section duplication copies translation overlays and locale settings intentionally.
- [ ] Template checkpoints and restore include locale settings and translations.
- [ ] Account export contains all language data in a documented shape.
- [ ] Deletion cascades remove every translation row.

Done when:

- Apply, restore, duplicate, export, and delete operations do not silently lose or orphan translations.
- Restoring a checkpoint produces the same language completeness state it had when captured.

### 9. Test and release in stages

- [ ] Unit-test locale normalization, path parsing, overlay validation, source hashing, completeness, and fallback behavior.
- [ ] Test RLS ownership and default-locale database invariants.
- [ ] Test snapshot v1 compatibility and snapshot v2 atomic publication.
- [ ] Test middleware/routing for root, translated paths, assets, API routes, preview hosts, platform subdomains, and custom domains.
- [ ] Test every section and form in at least one longer-copy language.
- [ ] Run TypeScript, focused ESLint, snapshot/domain tests, and new multilingual tests.
- [ ] Perform authenticated desktop and mobile browser checks across editor, preview, publish, public switching, forms, and SEO metadata.

Done when:

- Existing single-language websites have no visual, routing, or publication regression.
- The full owner workflow works on desktop and mobile.
- The first production rollout can be disabled with a feature flag without corrupting stored translations.

## Recommended delivery sequence

1. Foundation: Tasks 1-2 behind a feature flag.
2. Editor MVP: Tasks 3-4 for the default language plus one additional language.
3. Public MVP: Tasks 5-6, including immutable publication and v1 compatibility.
4. Production readiness: Tasks 7-9, migration rehearsal, browser verification, and staged enablement.
5. Follow-up: optional reviewed machine-translation suggestions, translation import/export, and translating the FlexPagina dashboard itself.

## Release safeguards

- Rehearse the migration on a copy of production data and verify every existing website gets exactly one default locale.
- Keep the multilingual UI feature-flagged until routing, RLS, and snapshot v2 tests pass.
- Do not remove snapshot v1 support in the first multilingual release.
- Log locale add/remove/default changes and multilingual publish failures in the audit log.
- Measure language-switch usage, missing-translation publish blocks, and locale-specific form errors without storing translated content in analytics events.
- Roll out first to internal/test websites, then a small owner cohort, then all accounts.

## Out of scope for the first release

- Automatic AI translation or automatic publication
- Different section order, styling, images, services, domains, or themes per language
- Locale-specific pages beyond the current one-page website structure
- Translating the FlexPagina marketing site, dashboard, admin area, billing, or editor chrome
- Region-specific pricing, tax, legal documents, or scheduling behavior
- Right-to-left layout support; this needs a separate design and component audit before RTL locales are offered
