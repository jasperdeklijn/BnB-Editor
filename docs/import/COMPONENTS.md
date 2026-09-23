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

The preview uses SectionRenderer, the same theme resolver and section defaults as EditorCanvas, inside an iframe with its own responsive viewport. No editor-specific source HTML is generated. Preview links stay inside the preview; external destinations are disabled.

Native database mapping:
- root title → websites.title; theme → websites.theme_config; published=false and live_snapshot=null.
- section array → website_sections rows with 1-based position; content → content (exposed as section.data); styles → styles.
- external section keys → fresh native UUIDs; nav targets and CTA fragments remapped.
- features/FAQ items → fresh stable UUIDs for ordinary editing and future translations.
- images → managed library URLs; imported files and provenance are not stored.

Outside v1: services/booking, contact and request forms, prices, reviews, team, map, opening hours, footer, translations, transitions, logo uploads, arbitrary embedded widgets, custom CSS/HTML and external scripts. Use about/features/FAQ/CTA only where the meaning remains accurate. Add other native sections afterward in the editor. Never invent controls or silently replace a booking form with a functioning reservation system.

Known approximations: supported font pairs and layout presets only, native spacing/radius behavior, native image cropping, still images re-encoded as WebP, and Dutch system labels. Theme settings affect each component only where that renderer uses them. Record visual differences in the human handoff, not in extra JSON fields.

