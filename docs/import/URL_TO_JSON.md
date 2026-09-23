# Codex URL-to-JSON procedure

This is developer-operated, not a customer-facing crawler. Repository access does not grant permission to change customer accounts.

1. Receive the public URL and explicit confirmation that the requester owns the site or has permission to reuse its text and images. If missing, ask for it before copying content. Respect crawl restrictions; do not enter private or login-only areas.
2. Read FORMAT.md and COMPONENTS.md plus repository instructions. Inspect the source with browser tooling at desktop and mobile sizes. Record meaningful copy, section order, colors, font choices, layout, button destinations and authorized image URLs.
3. Map the content to supported native sections. Use stable human section keys and #key references. Keep approximations/unsupported content in a separate human report. Do not invent controls, reviews, prices, or booking behavior.
4. Write one local `imports/<descriptive-name>.json` file, with format flexpagina/version 1. This is the deliverable, not customer upload storage. Never write it to the database or customer storage and never publish it. Do not commit real third-party copy/assets into the repository examples.
5. Run `npm run validate-import -- imports/<descriptive-name>.json`. Fix every field error until exit status 0.
6. Start the local app with `npm run dev`; open `/import-preview`. Select the file and confirm authorized reuse to load the real renderer and source image previews. Check desktop and mobile, click internal navigation and FAQ controls. Check every image status. This route cannot save a design. External preview button navigation is intentionally disabled.
7. Compare with the authorized source. Make up to two useful correction passes, rerun validation and reload the file after each pass. Report all unsupported content, missing/failed images, font/layout/cropping differences and verification limitations.
8. Hand the requester a link to the local JSON. They choose an account and use **Import JSON** in the normal editor to create a new draft. Importing does not publish.

Example prompt:

```text
Create a FlexPagina import JSON from https://example-bnb.nl.
I confirm I own this site or have permission to reuse its text and images.
Read docs/import/FORMAT.md, COMPONENTS.md and URL_TO_JSON.md.
Use only supported editor sections and settings. Match the original content,
section order and overall look on desktop and mobile as closely as the editor allows.
Save imports/example-bnb.json. Validate it with npm run validate-import -- imports/example-bnb.json,
preview it at /import-preview without saving or publishing, make up to two corrections, and report gaps.
Do not change any production website or customer account.
```

## Verification before release
Use a local or isolated preview Supabase database with the import migration and existing ownership/quota policies. Never point a mutation test at a production customer account.

- Sign in as a test user with two designs. Import bnb.json, preview both sizes, create the draft, edit a title in the normal inspector, reload and confirm persistence.
- Verify exactly one additional website, published=false, live_snapshot=null; existing website/sections and live snapshot unchanged.
- Cancel and upload malformed/future-version/unsupported-field files: no API save, database or storage writes.
- Use a controlled authorized image fixture. Verify every stored image URL belongs to user-images, thumbnail and metadata appear in the normal library, and no source URLs remain.
- Reject private IP, mixed public/private DNS, redirect-to-private, oversized/truncated/animated images and excess images. Force upload/quota/RPC failures and check cleanup and no partial website.
- Retry the same confirmation after simulating a lost response: one new design only. Try an unauthenticated API call and verify 401; use a second user to verify draft/section isolation.
- Run npm run test:import, npm run typecheck, npm run lint and relevant existing tests. Report the distinction between local tests, browser preview checks, and any live authenticated flow that could not be performed.

