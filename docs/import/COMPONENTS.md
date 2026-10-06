# Native component mapping

See FORMAT.md for the exact accepted fields. Renderers live in `components/sections`; their normal inspector controls remain available after import.

| Import type | Editor component / controls | Layouts: classic / split / showcase / compact / card / banner |
| --- | --- | --- |
| nav | nav-section; brand name, sticky toggle, section links, layout and style | Standard / split / showcase / compact / card / banner native navigation |
| hero | hero-section; title, subtitle, CTA label, enabled/target, background image | Centered / image left / full image / minimal / text card / image right |
| about | about-section; title, description, images | Text / two columns / image-first columns / compact / card / band |
| gallery | gallery-section; title, subtitle, count, image picker and ordering | Grid / vertical carousel / slider / horizontal carousel / main image with thumbnails / masonry |
| features | features-section; heading, add/edit/reorder/delete feature items | Grid / columns / showcase / compact / cards / band |
| faq | faq-section; heading, subtitle, add/edit/reorder/delete questions | Native shared layout arrangement, with expandable questions |
| cta | cta-section; title, subtitle, primary/secondary buttons and destinations | Centered / split / banner / centered / split / banner |
| footer | footer-section; company copy and columns of page/section/external links | Shared footer or page-local footer, without conflicting shared slots |

The preview uses SectionRenderer, the same theme resolver and section defaults as EditorCanvas, inside an iframe with its own responsive viewport. No editor-specific source HTML is generated. Preview links stay inside the preview; external destinations are disabled.

Native database mapping:
- root title → websites.title; theme → websites.theme_config; published=false and live_snapshot=null.
- section array → website_sections rows with 1-based position; content → content (exposed as section.data); styles → styles.
- external section keys → fresh native UUIDs; nav targets and CTA fragments remapped.
- features/FAQ items → fresh stable UUIDs for ordinary editing and future translations.
- images → managed library URLs; imported files and provenance are not stored.

Outside the import subset: functional services/booking, contact and request forms, reviews, maps, translations, transitions, logo uploads, arbitrary embedded widgets, custom CSS/HTML and external scripts. Preserve factual service/contact/pricing/team/opening-hours copy with about/features/FAQ where accurate; report functional setup separately. Add native forms/booking afterward in the editor. Never invent controls or silently replace a booking form with a functioning reservation system.

For v2, `pages` become website_pages, section `pageKey` becomes page_id, and shared scopes have no page_id. Temporary page and section link keys are normalized together. The URL converter emits one shared native page menu and separate editable content per selected page; nested source paths are deliberately flattened and reported for redirect review.

Known approximations: supported font pairs and layout presets only, native spacing/radius behavior, native image cropping, still images re-encoded as WebP, and Dutch system labels. Theme settings affect each component only where that renderer uses them. Record visual differences in the human handoff, not in extra JSON fields.

