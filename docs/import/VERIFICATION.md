# Implementation and verification

## Model and persistence
The linked Supabase project was inspected read-only. A row in `websites` is already one design; `website_sections` holds ordered editable content. The importer inserts one additional unpublished website, linked to the user's existing business, without updating previous designs or live snapshots. Existing owner RLS protects websites, sections and image metadata. Images use the existing public `user-images` bucket.

The new `create_imported_design` RPC is SECURITY INVOKER and derives ownership from auth.uid(). It atomically inserts native sections and asset metadata. No import-history table, retained uploaded JSON, source URL, or website-version mechanism was added.

## Implemented flow
Editor **Import JSON** → bounded shared validation → permission confirmation → native desktop/mobile preview → safe image ingestion → atomic new draft → normal editor.

The non-saving `/import-preview` route is available for the documented Codex URL-to-JSON workflow. The CLI uses the product schema and normalizer. The supplied task brief was copied unchanged; source and destination SHA-256 hashes match.

## Verification on 2026-09-23

| Check | Result |
| --- | --- |
| Full repository suite | 223 passed, 0 failed |
| Importer tests | 20 passed: schema, API, network restrictions, decoding, failure cleanup and database transaction |
| Actual SQL migration in isolated PGlite | Passed: two existing designs preserved; one additional editable unpublished draft; rollback; owner and anonymous access isolation |
| TypeScript and ESLint | Passed |
| Production Next.js build | Passed; import API, editor import and preview routes compiled |
| CLI examples | Both accepted; unsupported version returns exit code 1 with field-level error |
| Browser desktop/mobile | Real B&B sections rendered; iframe viewport 375 px; upload page at 390 px has no horizontal overflow |
| Browser failure/cancel paths | Unsupported-version error shown; failed-image state visible; cancel clears file and preview |
| HTTPS ingestion smoke check | Public httpbin PNG downloaded in memory and decoded to WebP plus 480×320 thumbnail; no storage/database writes |

Browser console had no application errors for the valid preview. Optional Vercel analytics development scripts were blocked by the environment. Expected missing-image requests fail visibly in the invalid-image test.

The initial node_modules did not match package.json and lacked installed Next.js docs. Dependencies were restored to the declared versions and the available local Next.js route/client-component guides were read. Sharp 0.35.3 is now a direct dependency. Both lockfiles are updated; existing pnpm security overrides are preserved.

## Release step still required
Apply `supabase/migrations/20260923133210_create_imported_design.sql` to an isolated test/preview database, then perform the signed-in upload → create → normal editor → save/reload flow against that environment. The migration is also included in the fresh-install bootstrap.

No production migration, deployment, customer account write, or publication was performed. The available configured database is the live project; a disposable authenticated Supabase test environment was not configured, so the signed-in browser-to-Supabase save flow and real storage persistence are not claimed as verified. API behavior, storage orchestration and SQL persistence were tested separately with mocks/isolated PostgreSQL.

## Operational limits
The existing storage bucket is public, while drafts stay private. If the process is killed or the transaction outcome cannot be checked because the database is unreachable, newly uploaded objects may remain unreferenced; the importer retains them rather than deleting possibly committed images. Reconcile using the logged generated design ID and the existing asset library. No upload-history service was introduced.

See FORMAT.md for exact limits, COMPONENTS.md for the supported subset and approximations, and URL_TO_JSON.md for the developer procedure and release checklist.

