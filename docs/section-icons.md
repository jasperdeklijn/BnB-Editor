# Section icons

Users can choose icons for each Kenmerken item, each pricing package benefit, and the address, phone, and email in Contact. The picker offers 151 Tabler outline icons, Dutch/English search, categories, no icon, and reset to the default. Contact selections apply across all six layouts wherever the corresponding contact field is displayed.

## Additional sections

- Hero: optional main button icon (`ctaIcon`).
- CTA: primary, secondary, and phone icons (`primaryCtaIcon`, `secondaryCtaIcon`, `phoneIcon`).
- Footer: address, phone, email, and registration icons.
- Map: address, phone, and email icons.
- Opening hours: `headingIcon`, defaulting to a clock.
- Request form: `headingIcon`, with a default appropriate to the request type.
- FAQ: optional `icon` on each question; expand/collapse indicators remain functional.
- Services: `serviceIcons` maps stable service IDs to icon choices. Choices are section-specific and shared across languages. Selected icons appear beside names in all six layouts and replace the placeholder when a service has no photo. Existing photos remain visible.

Optional slots reset to no icon; existing icon slots reset to their default. These settings reuse the same picker and JSON save/publication flow. No new database fields are required.

## Content

Feature items and pricing benefits use `{ id: string, text: string, icon: string | null }`. Contact uses `addressIcon`, `phoneIcon`, and `emailIcon`. Identifiers look like `tabler:wifi`. `null` hides the icon and its badge. New features default to `tabler:check`; contact defaults are map-pin, phone, and mail. Unknown identifiers fall back to the section's default and cannot become arbitrary URLs or SVG markup.

The existing section JSON save and publication snapshot paths carry these fields. No database migration is needed. Translation overlays include text and stable item IDs only, so translated text cannot override icons. Defaults, marketing demos, and imported feature normalization produce object-based feature items.

## Assets and license

The SVGs are vendored from `@tabler/icons@3.48.0` into `public/icons/tabler`. Its MIT notice is included at `public/icons/tabler/LICENSE.txt`. Icons are served from the website's own origin, including customer domains. A CSS mask gives each icon the section's current colour. Only displayed SVGs are requested; no external icon service or runtime Tabler package is needed.

The search catalogue is loaded with the editor dialog and is not imported by public section renderers. The renderer uses a separate allowlist of IDs. To expand the catalogue, edit the groups in `scripts/vendor-section-icons.mjs`, obtain the official pinned npm package, then run:

```sh
node scripts/vendor-section-icons.mjs <extracted-package-directory>
```

Commit the regenerated IDs, catalogue, SVGs, and license together. Retain existing IDs when updating the library.

## Verification

`node --test tests/section-icons.test.mjs` checks asset coverage, safe fallback rendering, hidden badges, translation preservation, JSON round trips, and every Contact layout. The shared editor controls retain icon/text pairs when moving or duplicating items.

Browser checks were performed in a temporary local harness using the real editors/renderers: search, select, clear, reset, empty results, pricing duplication/reordering, a local save/reload round trip, and a 390px viewport. This harness does not verify authenticated database saving or deployment.

Additional verification: Hero and CTA render tests cover all six layout selections; footer, map, hours, request-form variants and FAQ translation tests cover selected/hidden icons. Browser checks covered Hero selection, FAQ selection and expansion, and service icons in all six layouts with fictional data. No authenticated database writes or publication were performed.
