# Codex task: FlexPagina JSON import and URL-to-JSON workflow

## Goal

Build a user-facing JSON import in the FlexPagina editor. An authenticated user uploads a compatible `.json` file, checks a preview, and saves the result as **a new editable website design** in that user's account. A user can already have multiple website designs. The import must not replace an existing design, create a website version, or publish anything automatically.

Also provide a **developer-operated Codex workflow**: I give Codex a URL for a website I am authorized to reuse, and Codex produces a validated FlexPagina import JSON file. The user-facing product does not need an automatic URL crawler in this task.

The uploaded JSON is only an input to the import. **Do not retain uploaded JSON files or create a `website_imports` table, import history, original JSON column, or other upload tracking.** Persist only the new design in the existing website/design model and its imported assets in the existing asset storage. A locally generated JSON file in the Codex workflow is the deliverable I can upload; this is distinct from retaining customer uploads on the server.

## Start by inspecting the repository

1. Read repository instructions (`AGENTS.md`, relevant docs, and `Style.md` if present). Follow the existing UI styling and design conventions.
2. Locate the editor, its supported section types and variants, the runtime section shape, theme/settings, images, create-design flow, preview renderer, authentication, authorization/RLS, and publish flow.
3. Determine whether "website" and "design" are separate entities or whether each website row is itself a design. Use the actual existing model. Do not assume a `website_versions` table or add one.
4. Inspect actual Supabase tables, storage conventions and policies with the Supabase plugin where access exists; inspect preview deployment and logs with the Vercel plugin when relevant. Never change production rows while investigating or generating examples.
5. Record a short implementation note in the PR/task summary describing the discovered model and how a new import appears alongside the user's other designs. If the data model cannot represent multiple designs today, implement the smallest coherent extension needed for **new designs**, with a migration and ownership policy; do not simulate this with website versions.

## Architecture and format

- Create one versioned external format with `format: "flexpagina"` and `version: 1`. The supported fields must derive from actual FlexPagina editor capabilities. The examples below are illustrative, **not** a claim about current property names.
- Separate external import data from internal stored section data: `untrusted JSON -> parse/validate -> normalize -> preview -> create new design`. Do not store the external payload as a redundant record.
- Define runtime validation for metadata, theme/settings and each supported section (Zod if it fits the existing stack); reject unsupported types, variants and unknown executable/custom HTML properties. Use the existing renderer and editor schema as the source of truth. Support only legitimate editor options. Keep a clear mapping from import schema to native design data.
- The first version can support a documented subset of sections; every accepted section must remain editable in the ordinary editor. Include realistic example JSON and documentation for supported types, variants, text limits, assets, theme settings and known approximations.
- Do not add generic raw HTML, scripts, arbitrary CSS, event handlers or JavaScript URLs. Reuse the application's existing text rendering and sanitization conventions.
- Define explicit v1 behavior for unsupported future versions: fail with a helpful message. Add migrations only if a later version is actually introduced.

## User flow in the editor

1. Provide an **Import JSON** action where a user creates/selects designs. Upload a `.json` file with a reasonable size cap (start with 2 MB; adjust to the app's real constraints).
2. Validate it and show actionable errors: invalid JSON, unsupported version, missing required field, unsupported section, excessive content, invalid URL, and so on. Do not echo full imported content in logs or error reports.
3. Show a preview using the real FlexPagina renderer. Display title, section count/order, any approximations or omitted unsupported items, and any missing/failed images. Preview must not modify an existing design or publish a site.
4. On confirmation, create a **new draft design**, owned by the authenticated user, using the existing create-design conventions (unique identifier/slug/title as appropriate). Navigate to that design in the regular editor. Keep all existing designs intact.
5. Provide a clear cancel path. If the user is about to import into a context that appears to target an existing design, explicitly use a new-design action; do not silently overwrite it.
6. Do not save uploaded JSON to Storage, the database, or an import-history service. A temporary in-memory/browser preview or short-lived server processing is fine. The final design and its usable images are normal product data, not upload tracking. Avoid persisting source URL, generated-by fields, confidence scores, or ownership-checkbox state unless an existing product requirement explicitly needs them.

## Image handling and safety

- Codex-generated JSON may contain image references from the authorized source site. Before the new design depends on an image, import it into the application's existing asset storage and replace the reference with a managed asset reference. If image import fails, show the failure and allow cancellation; never silently publish broken hotlinks.
- Implement remote-fetch safeguards if the server accepts image URLs: allow only `https` (or another narrowly justified scheme), reject localhost/private/link-local/metadata IP ranges, validate DNS results and redirects at every hop, cap redirects/time, response and decoded image sizes, image count and concurrent requests, and verify actual image type before processing. Do not let arbitrary URLs act as an open proxy. Fit these controls to the application's existing image pipeline.
- Validate file count and size, allowed formats and ownership. Keep drafts unlisted/unpublished. Enforce authorization server-side and with existing Supabase RLS/storage policies; never trust a client-provided user ID.
- Arrange operations so a failed import does not leave a partly usable design. Clean up new assets on failure where safe, or follow the application's existing orphan cleanup pattern. Avoid introducing an import-record table just for cleanup.
- The user must confirm that they own or have permission to reuse the source content and images. Word the UI for a user importing their own website; avoid a "clone any website" claim. This confirmation is a product gate, not a request to create an audit log in this task.
- Add reasonable abuse limits to file parsing and image downloads using the application's existing protections. Do not invent a background job system unless required by measured runtime limits.

## Codex URL-to-JSON workflow (developer operated)

Create repository documentation under `docs/import/` (adapt location to repo conventions):

- `FORMAT.md`: exact import-v1 format and constraints based on code.
- `COMPONENTS.md`: supported section types/variants and mapping to existing editor controls.
- `URL_TO_JSON.md`: repeatable Codex procedure and prompt; include ownership, source inspection, asset references, validation, preview and correction steps.
- `examples/`: at least one valid small B&B example and one other supported business example if relevant to the actual editor.

Provide a CLI command such as `npm run validate-import -- path/to/file.json` using the **same validation/normalization rules** as the product importer. It must exit nonzero with useful field-level errors. Document how Codex should run it and how to preview a generated file without saving it into a user's account. Avoid committing real third-party content or assets in examples.

Codex's documented URL workflow:

1. Receive a URL and confirmation that reuse of the site content/assets is authorized. Inspect the public site with browser tooling (desktop and mobile), read relevant content, section order, layout, colors, fonts and images. Observe crawl restrictions and avoid private/login-only content.
2. Read the actual component catalogue and import format. Map source elements to supported native sections; preserve meaningful content and branding without inventing unsupported editor controls. Record approximations separately in the human report, not as arbitrary rendered JSON fields.
3. Generate one local `imports/<descriptive-name>.json` file. This is a developer deliverable; it must **not** be written to the database, uploaded to customer storage, or published by Codex. Asset source URLs may be temporary import inputs subject to the application's safe image ingestion.
4. Run the validator, fix all errors, render via the import preview and check the page on desktop and mobile. Compare with the authorized source and make up to two useful correction passes. Report unsupported content, missing images and visual limitations.
5. Hand me the JSON file to import into my chosen account through the normal UI. Do not treat Codex's repository access as permission to write to a production customer design.

Example prompt to document (replace paths/commands with the implemented ones):

```text
Create a FlexPagina import JSON from https://example-bnb.nl.
I confirm I own this site or have permission to reuse its text and images.
Read docs/import/FORMAT.md, COMPONENTS.md and URL_TO_JSON.md.
Use only supported editor sections and settings. Match the original content,
section order and overall look on desktop and mobile as closely as the editor allows.
Save imports/example-bnb.json. Validate it with the repository command,
preview it without publishing, make up to two corrections, and report gaps.
Do not change any production website or customer account.
```

## Suggested execution order

1. Audit current model/components/renderer and define the import-v1 contract.
2. Implement validator, normalizer, example and CLI; make server/client validation consistent.
3. Add upload, nonpersistent preview, useful errors and create-new-design action.
4. Add safe image ingestion and transaction/failure handling with existing Supabase patterns.
5. Add Codex workflow docs, use browser preview and Vercel preview deployment for verification if available.

## Acceptance criteria

- A user with multiple existing designs can import a valid JSON file and receives one **additional**, editable, unpublished design; previous designs and any live site are unchanged.
- Canceling or rejecting an import creates no design. A malformed/unsupported file does not write design data or assets.
- Imported sections render in the standard preview and are editable with existing controls; invalid or unsupported fields cannot inject scripts/HTML.
- Images used by a completed import are stored under the app's asset handling and no longer depend on external hosts; failures are visible.
- No uploaded JSON or import-history record is retained. No `website_versions` mechanism is introduced for this feature.
- Authorization prevents importing into or viewing another user's designs; limits and remote-fetch protections work as designed.
- The shared validator accepts the documented example, rejects representative bad files, and the local Codex-generated JSON passes validation and visual review before handoff.
- Run the repository's relevant typecheck/lint/tests and verify the complete upload -> preview -> create new design -> edit flow on a Vercel preview or local environment. Summarize results, migration needs and any unresolved limitations.

## What Codex can and cannot do alone

Codex can implement this in the repository, use its Supabase and Vercel plugins where connected, generate/validate JSON, and check a preview. It **cannot infer the exact editor schema from this brief**: it must inspect the repository first. It also cannot guarantee a pixel-perfect match when the source uses unsupported layouts, secure rights to third-party text/images on my behalf, or complete steps blocked by missing repository access, credentials, deployment permissions or browser access. If blocked, finish the independent work and report the exact missing access/action. Ask before making a production migration, publishing, or modifying a live customer design if that step is not already authorized.
