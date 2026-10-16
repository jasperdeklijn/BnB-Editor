# FlexPagina import v1 and multipage v2

## Multipage contract (v2)

Use `version: 2` and `pages` for URL-to-website conversions. Each page has a unique temporary `key`, `title`, `slug`, `isHome`, optional `showInNavigation`, `includeInPublication`, and optional `seo: {title, description}`. Exactly one Home has `isHome: true` and an empty slug. Other slugs are unique, flat, lowercase hyphenated paths; reserved locale/system routes are rejected. Page SEO is copied into the draft, including Home.

Each normal section has `pageKey` and `scope: "page"` (default). A shared navigation uses `scope: "site_header"`; a shared footer uses `scope: "site_footer"`; both omit `pageKey`. There can be at most one of each shared slot, and no conflicting page-local nav/footer. Empty shared `navLinks` activates native page navigation. Footer content accepts `companyName`, optional `companyDescription`, and `columns: [{title, links: [{label, href}]}]`.

Button/footer targets support `page:<page-key>` and `section:<page-key>:<section-key>`. Same-page `#section-key` remains supported. The parser checks ownership of all references and normalization replaces temporary keys with fresh native page/section UUIDs. Pages remain separate through preview, saving and normal canvas editing. Website creation never publishes; the URL converter initially excludes non-Home pages from publication so owners can review them.

The general import contract permits up to 40 pages and 40 total sections; automated URL conversion reads at most **8 selected pages** and uses at most 8 distinct images. Source URLs and AI provenance belong to the separate review report, never inside the strict import document. Saving v2 requires `multipage_contract_version() = 3`; otherwise the API returns 503 before asset uploads or design creation. The existing v1 fields below remain valid for single-page files.

The executable contract is `lib/import/schema.ts`. The browser, API and CLI use the same parser and normalizer. This is an external format, not a database dump.

## Root and validation
Required: `format: "flexpagina"`, `version: 1`, `title` (1–200 trimmed characters), and `sections` (1–40).
Optional: `theme`. All objects are strict: unknown fields are errors, including source URLs, generated-by metadata, HTML, scripts, CSS and user/database IDs. Plain text cannot contain angle brackets or control characters. Limits count JavaScript string characters; file limit is 2 MiB UTF-8, nesting limit 16. Future versions fail explicitly. Nothing is silently dropped.

Each section requires `key`, `type`, `content`; optional `styles`. Keys are unique, match `^[a-z][a-z0-9-]{0,47}$`, and are temporary link targets. Database section and repeating-item UUIDs are generated during normalization. Section order is array order.

## Theme
All theme fields are optional:
- `paletteId`: slate-modern, ocean-blue, forest-green (default), warm-earth, rose-elegant, midnight, charcoal, terracotta, burgundy, steel-blue, teal-fresh, pure-minimal, warm-neutral, electric, sunset.
- `fontPairId`: inter-system (default), poppins-inter, playfair-lato, montserrat-opensans, dm-sans, raleway-roboto, merriweather-source, space-grotesk, libre-baskerville, outfit-nunito, work-sans, cormorant-proza.
- `spacing`: compact, comfortable (default), spacious.
- `radius`: none, small, medium (default), large, full.

The validator looks up the actual theme catalogues. No custom font URL or arbitrary CSS is accepted. Locale is the existing default Dutch locale; translations are outside v1.

## Shared section fields
Inside every `content`:
- `layout`: classic (default), split, showcase, compact, card, banner.
- `styleType`: clean (default), bold, elegant, soft, dark, outline, paint (verfvlekken), pattern (patroon).

Optional `styles` fields:
- `backgroundColor`, `textColor`, `accentColor`, `surfaceColor`: six-digit hex colors such as #385344.
- `backgroundImage`: HTTPS image URL.
- `backgroundImageAlt`: plain text up to 500 characters.
- `backgroundPosition`: center, top, bottom, left, right.

These are native section overrides. Some layouts use fixed arrangements or overlays and may approximate a source site. Navigation only renders its applicable color styles; do not supply background image fields to navigation (rejected). Font classes, logo and custom style fields are not in v1.

## Content fields
Fields marked * are required. All others have the stated default or are absent.

| Type | Fields |
| --- | --- |
| nav | brandName* (1–200); isSticky (true); navLinks ([], max 20), each { sectionKey*, label* (1–80), enabled (true) } |
| hero | title* (1–200); subtitle ("", max 500); ctaText ("", max 80); ctaEnabled (false); ctaHref |
| about | title*; description* (1–10,000); images ([], max 8 URLs) |
| gallery | title*; subtitle ("", max 500); images* (1–8 URLs) |
| features | title*; features* (1–30 objects with text* of 1–500 characters) |
| faq | title*; subtitle ("", max 500); items* (1–30 objects with question* of 1–200 and answer* of 1–5,000 characters) |
| cta | title*; subtitle ("", max 500); primaryCtaText and secondaryCtaText ("", max 80); primaryCtaEnabled and secondaryCtaEnabled (false); primaryCtaHref and secondaryCtaHref |

Every title is 1–200 characters. Enabled buttons require both label and target. Targets are HTTPS URLs (no credentials, custom ports, spaces or unsafe characters) or `#section-key`, referring to an existing key. Fragment references and navigation section keys become native `#section-UUID` links. Relative, mailto, tel, data and javascript links are outside this v1 subset.

## Images
At most 8 unique URLs across all sections. Images must be public HTTPS on port 443. Browser preview loads source images only after the permission confirmation; failures are visible and prevent confirmation. The final import rechecks all images server-side; a successful browser preview is not a guarantee of ingestion.

The server validates all DNS answers, blocks private/local/link-local/metadata/reserved addresses, pins the chosen address to the TLS connection, and validates every redirect (at most 3). DNS/downloads have an 8-second per-image deadline, with an overall 45-second processing budget. Downloads run sequentially. Each source is at most 5 MiB, all sources at most 20 MiB. No compressed HTTP responses, cookies, credentials or caller-specified headers are forwarded.

Only still JPEG, PNG, GIF and WebP are supported. Magic bytes, dimensions (at most 8,000 per side and 25 million pixels), and actual decoding are checked. Animated images and SVG are rejected. Sharp strips metadata and re-encodes WebP, with a 480×320 thumbnail. Originals are at most 5 MiB and thumbnails 1 MiB. The existing 50 MiB account quota still applies.

Completed imports use the existing `user-images` bucket and `user_images` metadata. Source URLs are replaced; no source URL or uploaded JSON is persisted. The existing bucket is public, so image URLs can be read by someone who has the URL; draft designs remain private under existing RLS.

## Commands and preview
```sh
npm run validate-import -- docs/import/examples/bnb.json
npm run validate-import -- imports/my-website.json
npm run test:import
npm run dev
```
Open `/import-preview`, choose the file, confirm permission and check desktop/mobile. This route has no save action and needs no account. The file exists only in browser memory. Use **Import JSON** beside the editor's new-design action to save into your authenticated account.

Both examples contain original fictional copy and no downloaded assets. To add an image, use an authorized public HTTPS URL in `styles.backgroundImage` or an about/gallery `images` array.

## Persistence and deployment
Every website row is one design. `create_imported_design` inserts a new unpublished website, ordered native sections and asset metadata atomically, using the caller's `auth.uid()` and existing ownership RLS. It links the user's earliest existing business without changing that business. It creates no website versions, imports table, history, source fields, or upload records. Publishing remains a separate existing operation.

Apply the local `20260923133210_create_imported_design.sql` migration to a development/preview database before saving imports. Production application needs separate approval. Uploads happen before the transaction; failed work removes only newly allocated storage paths. If a commit response is lost, the service checks the newly allocated website ID before deleting anything. If the database is also unreachable, assets are retained rather than deleting potentially committed data; the server logs only the generated design ID for operator reconciliation. A process crash can similarly leave unreferenced storage objects, following the existing upload pipeline's cleanup limits. Do not add upload-history storage to solve this.

Ten confirmed requests per account per hour use the existing shared limiter (including failed requests/retries). Repeated confirmations of the same in-memory attempt reuse the new design ID. Reloading the page starts a new attempt. No preview writes occur, and the UI flushes existing editor changes before opening the import page.


Navigation follows native editor behavior: it lists navigable sections in document order. Unspecified links are enabled and use the section title; set enabled=false explicitly to hide one. Image URL parentheses must be percent encoded (%28/%29) to remain safe in native CSS backgrounds. The import function is also included in supabase/init.sql for fresh installations; do not run that destructive bootstrap against an existing database.
