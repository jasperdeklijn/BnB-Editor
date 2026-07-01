# Editable Section Text Tasks

Goal: make user-facing text in `components/sections` editable from the right sidebar and by double-clicking text in the main editor canvas.

## Tasks

- [x] Create a shared inline text editing helper for section renderers.
- [x] Wire double-click editing in the main canvas for simple text fields.
- [x] Expand right sidebar controls for section text that is currently renderer-only JSON.
- [x] Cover collection-based text such as footer links, FAQ items, testimonials, pricing plans, and opening hours.
- [x] Keep live service text behavior explicit because service cards come from `public.services`, not only `website_sections.content`.
- [x] Run `npx tsc --noEmit`.

## Completed

- Added `components/editor/inline-editable-text.tsx`.
- Added double-click inline editing for section-owned text in hero, about, gallery, features, contact, CTA, map, request form, nav, footer, testimonials, FAQ, opening hours, pricing, and the services section title.
- Added right sidebar controls for footer text/link labels, testimonial items, FAQ items, and pricing plan text.
- Fixed the features sidebar so edits write to `features`, matching the renderer.
- Preserved service card names/descriptions/prices as live `public.services` data instead of duplicating them into `website_sections.content`.
- Verified with `npx tsc --noEmit`.

## Still To Do

- Service card title, description, and price editing should be handled through the services manager or a dedicated service-record inline editor because those values live in `public.services`.
- Fixed UI/system labels inside forms and status states are still code-owned copy, not section JSON. Examples: request form field labels, success/error messages, and static eyebrow labels.
- If those fixed labels should become user-editable, add explicit content keys for them before wiring sidebar and inline editing.

## Progress Notes

- Task file created before implementation.
- `npx tsc --noEmit` passed after implementation.
