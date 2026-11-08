# Dependency replacement review — 8 November 2026

**Cleanup completed:** Removed 38 direct dependency declarations: the 12 unused packages listed below, 25 redundant individual Radix declarations, and `next-themes` together with its unreachable wrapper. Direct production dependencies decreased from 63 to 25. Both lockfiles were updated; the npm lockfile decreased from 560 to 461 package records. Version declarations for retained dependencies were unchanged. Active Radix primitives remain available through `radix-ui`; the directly used dialog and label packages remain declared.

Post-cleanup validation on Node.js 22: production build (including TypeScript) passed; the static import scan found no remaining unreferenced direct dependencies; the full suite reported 366 passed, 3 existing missing-import-fixture failures, and 1 skipped. Production dependency auditing reported 0 high, 0 critical, and the same 2 moderate alerts. No application deployment or hosted database changes were performed.

The rest of this document records the original review and remaining replacement options. CVA, `clsx`, and other actively used libraries have not been rewritten.

The best first step is removing unused dependencies. For active dependencies, owning a few small helpers makes sense; reimplementing email, calendar recurrence, authentication, image decoding, or accessible dialogs would add substantially more maintenance and risk.

This review examined the 63 direct production dependencies, TypeScript/JavaScript imports and re-exports, literal dynamic imports, CSS imports, the PostCSS configuration, and reachability from Next.js entry points. No application code, dependency declarations, or lockfiles were changed by this review. The previous security fixes remain in the working tree.

## Packages that appear removable without replacement

These **12 packages have no direct references** in the scanned source, tests, scripts, or active build configuration:

| Package | Current evidence |
| --- | --- |
| `@hookform/resolvers` | No resolver imports. |
| `react-hook-form` | No form-hook imports; forms use existing React/local code. |
| `date-fns` | No imports; date display already uses native `Intl` and local helpers. |
| `react-day-picker` | No imports. The application has its own calendar implementation. |
| `recharts` | No imports; retaining it does not support an active chart in this checkout. |
| `cmdk` | No imports. |
| `embla-carousel-react` | No imports. |
| `input-otp` | No imports. |
| `react-resizable-panels` | No imports. |
| `vaul` | No imports. |
| `autoprefixer` | Not configured. PostCSS uses `@tailwindcss/postcss`. |
| `tailwindcss-animate` | Not configured/imported. Global CSS imports the separate `tw-animate-css` package, which must remain. |

Another **25 individual `@radix-ui/react-*` declarations have no direct imports**. Several corresponding components are actively used through the `radix-ui` umbrella package. Remove the redundant direct declarations while retaining `radix-ui`; this does not mean removing those components or rewriting their behavior. The umbrella package continues to depend on primitives internally. Radix recommends the umbrella import strategy and documents tree shaking, so this cleanup should not be presented as a measured browser bundle reduction. [Radix installation guidance](https://www.radix-ui.com/primitives/docs/overview/introduction).

The only individual Radix packages imported directly are `@radix-ui/react-dialog` (three files) and `@radix-ui/react-label` (one wrapper). Those imports could be consolidated into `radix-ui` too, without writing custom equivalents.

`next-themes` is referenced only by `components/theme-provider.tsx`, which has no path from the application's entry points in the static graph. Remove that unused wrapper together with the dependency after confirming there are no external consumers. The application's separate `WebsiteThemeProvider` is active and must remain; it does not depend on `next-themes`.

## Active dependencies that could be replaced with local code

| Candidate | Evidence and proposed replacement | Recommendation |
| --- | --- | --- |
| `class-variance-authority` | Only `components/ui/button.tsx` and `components/ui/tabs.tsx` use `cva`. Their definitions use simple variant/default maps and no compound variants. Replace those uses with typed maps and small local class-selection functions. Preserve exported variant types and `className` overrides. | Best active-code candidate; small scope and low ongoing complexity. |
| `clsx` | Imported only by `lib/utils.ts`. Replace class flattening inside `cn` with a local helper supporting the actual string/conditional/array/object inputs, while retaining `twMerge`. | Reasonable together with the CVA removal. CVA itself depends on `clsx`, so replacing only the direct import does not remove the package from the dependency tree. The existing library is already about 239 bytes gzip, making this mainly a dependency-count decision. [clsx behavior and size](https://github.com/lukeed/clsx). |
| `@radix-ui/react-label` usage | `components/ui/label.tsx` wraps `LabelPrimitive.Root` with styling. A native `<label>` can cover the app's basic label use. Preserve `htmlFor`, React props/ref behavior, and activation semantics. | Technically simple, but consolidating the import into `radix-ui` offers a smaller change. Label activation and nested-control behavior need checks. The umbrella package will still include its own label dependency. |
| Radix `ScrollArea` usage | `components/ui/scroll-area.tsx` is used by the editor's section panel. A native scrolling container with `overflow-y: auto` could replace the custom viewport and scrollbar. | Reasonable if native scrollbars are acceptable. Verify flex sizing, touch scrolling, focus visibility, and editor navigation. This removes custom scrolling behavior, not the entire Radix dependency. |
| `ai` | The only import is `lib/import/ai-website.ts`, for one non-streaming JSON generation request. A server-only Gateway HTTP helper could replace this narrow use. Mail and lead generation already call Gateway via `fetch`. | Plausible second-stage replacement, with moderate effort. Preserve cancellation, timeout/error handling, output validation, model selection, token usage, and response IDs. Do not build a general AI SDK. Gateway exposes an HTTP API. [Gateway API documentation](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions). |
| `sonner` | Used by the root toaster and 14 other runtime files. Calls found use success, error, info, and warning messages. A small local toast store/viewport could cover that subset. | Possible, but lower priority: accessibility announcements, timers, rapid messages, dismissal, and unmount behavior become application responsibilities. Existing usage is broad enough to require UI regression checks. |

For CVA/clsx replacement, compare every button variant/size, tab-list variant, null/undefined handling, nested class inputs, and caller overrides. Avoid introducing a general-purpose styling framework to replace two small uses.

## Dependencies I would retain

- **`tailwind-merge`:** It resolves utility-class conflicts throughout the UI through `cn`; simple string joining is not equivalent. Keep it and align its version with the Tailwind major version. The installed merge version is 2.6.1, whose README targets Tailwind 3, while this app uses Tailwind 4. The current maintainer documentation distinguishes those supported versions. [tailwind-merge compatibility](https://github.com/dcastil/tailwind-merge).
- **Radix dialogs, dropdowns, tabs, and switches:** The app uses keyboard navigation, focus management, portals, and component composition. Those are substantial behaviors to maintain correctly. [Radix accessibility responsibilities](https://www.radix-ui.com/primitives/docs/overview/accessibility).
- **`nodemailer`, `mailparser`, and `imapflow`:** Active email composition, MIME parsing, attachments, Unicode, and mailbox synchronization. The existing MIME round-trip tests demonstrate requirements beyond plain text. Upgrade vulnerable releases rather than replacing protocol handling with handwritten code.
- **`ical.js`:** Imported calendar feeds use recurrence expansion, exceptions, all-day events, and timezone handling. A small ICS exporter is feasible, but it would not replace this import functionality.
- **`sharp`, `pdf-lib`, and `cheerio`:** They handle binary image decoding/re-encoding, PDF documents, and untrusted HTML parsing. The application uses meaningful parts of each.
- **`robots-parser`:** The website importer uses user-agent rules and crawl delays before fetching pages and redirects. Keep established parsing/matching behavior; the installed package has no runtime dependencies.
- **Supabase clients, Next.js/React, and `zod`:** These are active core infrastructure and validation boundaries. Replacing them would be a larger architecture project.
- **`lucide-react`:** There are 127 distinct imported names across 105 source files, including 101 reachable runtime files. The app already has local Tabler SVG assets, so consolidation is possible, but a full swap affects many files and can change appearance and icon props. Lucide tree-shakes imported icons; its installed package size is not its shipped browser size. [Lucide React documentation](https://lucide.dev/guide/react).
- **Vercel analytics integrations:** Removing these would remove product/diagnostic functionality, not merely replace a utility. A custom collector would also need its own backend and reporting behavior.

## Recommended sequence

1. Remove the 12 unused packages and the 25 redundant Radix declarations; update both lockfiles and validate the build, types, and affected UI flows.
2. Remove the unreachable `next-themes` wrapper/dependency and consolidate the remaining individual Radix imports.
3. Replace the two CVA definitions and the single `clsx` integration together; retain Tailwind conflict resolution and correct its version compatibility.
4. Consider the narrow `ai` HTTP replacement if reducing server-side dependencies remains a priority. Treat native scrolling and a custom toast implementation as separate UI decisions.

The static graph is evidence for candidates, not proof of behavior after removal. It does not measure browser bundles, provider behavior, or optional package resolution after a new installation. Dynamic test loaders were identified separately; no non-literal production dependency imports were found in the scanned application code. Dependency removal should be followed by an actual reinstall/build rather than assuming every removed direct entry disappears transitively.

Local analysis artifacts are in `tmp/dependency-review.mjs` and `tmp/dependency-review.json`; `tmp` is ignored by Git. No new application tests were run for this read-only review.
