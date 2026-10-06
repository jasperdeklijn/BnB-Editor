# URL to editable FlexPagina pages

## Owner workflow

Open `/editor/import`, enter the final public HTTPS website URL and confirm ownership or permission to reuse the content and images, including processing the selected public pages through our AI provider. **Pagina's zoeken** reads Home and lists same-domain links. Select up to eight pages, including Home; add a missing same-domain address manually. **Gekozen pagina's omzetten** reads the selected pages and produces a validated FlexPagina v2 document.

Review the source-to-page mapping, warnings and actual component preview. Switch the page tabs and desktop/mobile preview. Download the generated JSON if desired. **Nieuw concept maken** uses the existing authenticated import flow, image library, quotas and atomic creation. It does not publish or replace a live website. Non-Home pages start excluded from publication; review and include them in the editor before publishing.

The source copy, headings, SEO and selected images are mapped to native nav, hero, about, gallery, features, FAQ, CTA and footer sections. Selected-page links use native page/section references. Forms, booking/payment widgets, translations, login areas and arbitrary JavaScript/CSS are not executable imports; warnings identify manual work. This is a content migration and visual approximation, not a pixel-perfect browser clone.

## Server configuration and boundaries

Use Node 24 to install dependencies and run/build the app (the AI SDK requires Node 22 or newer; the system Node 20 development process cannot run this endpoint). Configure server-only `AI_GATEWAY_API_KEY` (or Vercel OIDC); `AI_WEBSITE_IMPORT_MODEL` optionally overrides the default model. The provider receives only extracted public source data from selected pages. Discovery works without AI configuration; generation returns 503 when it is missing. Gateway authentication/quota failures return a safe error without credential-bearing provider diagnostics.

`POST /api/websites/import-url` requires authenticated ownership context, same-origin JSON requests and literal consent. Limits are ten discovery requests and three generations per user per hour; unavailable production rate limiting fails closed. HTML fetches require public HTTPS on port 443, validate all DNS answers, pin the resolved address to TLS, recheck redirects and reject cross-origin redirects. Fetches carry no source cookies or login credentials. robots.txt restrictions and crawl delays are respected, including redirected destinations. Sources are bounded to 1 MB HTML each, 16,000 extracted text characters each, eight pages, a 45-second crawl budget and a 110-second overall conversion deadline.

Only server-rendered public HTML is read. JavaScript-only websites, blocked crawlers, non-HTML URLs, excessive crawl delays or unsupported encodings require manual preparation. Discovery only sees links in the first page, not a recursive whole-site crawl. Static colors/fonts are hints; stylesheet-driven appearance and missing image formats may need editing. Nested paths become flat page slugs; old URL redirects must be reviewed separately.

Saving v2 also requires the complete multipage operations migration (`20261006162718_multipage_operations_and_publication.sql`, contract version 3). Missing migration returns a clear 503 before creating images or designs. Do not run destructive `supabase/init.sql` on hosted data. Roll out the migration through the documented staging/release process.

## Developer-operated fallback

Receive explicit source reuse authorization first. Read FORMAT.md, COMPONENTS.md and repository instructions. Inspect authorized public source pages and write a local `imports/<name>.json` with `version: 2`, separate page keys, one Home, shared navigation/footer and typed internal links. Report unsupported elements honestly. Never commit third-party content into repository examples.

Run `pnpm validate-import -- imports/<name>.json`. Preview it at `/import-preview` without saving; check each page, source image status, desktop/mobile and internal navigation. Make corrections and validate again. Deliver the JSON for an owner to create a new draft. A manual one-page v1 file is still accepted; multipage imports must use v2.

## Verification

Run `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm build` with Node 24. `tests/import-url.test.mjs` covers extraction, redirects/robots, selection boundaries, AI contract integrity, SEO, image provenance, consent/auth/origin/rate limits and read-only conversion results. The existing import/image/SQL tests cover safe image ingestion and atomic multipage saving; the SQL import test includes Home and non-Home SEO.

For an explicit controlled provider smoke, use `node --env-file=.env --env-file=.env.local scripts/smoke-website-ai.cjs`. It submits only synthetic fixture copy, writes a local validated JSON if successful and prints sanitized metadata. It does not crawl a third-party website or write a customer design. Provider availability, authenticated hosted draft creation and publication require separate recorded evidence; passing local mocks does not prove them.
