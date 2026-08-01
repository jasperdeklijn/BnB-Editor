# Product Improvements Backlog

This file preserves the remaining product projects from the August 2026 editor review. Editor completeness is being implemented separately; the customer workspace and Booking Engine 2.0 have their own implementation plans.

## Recommended order after the current work

1. Owner website analytics.
2. Multi-page websites and reusable global sections.
3. SEO and launch health centre.
4. Guided AI website setup and writing assistance.
5. Google company information and reviews integration.

## Owner website analytics

Build a per-website dashboard using the existing consent-gated, live-site-only visitor tracking.

First release:

- Visits and request submissions over time.
- Visitor-to-request conversion rate.
- Results by request type, website, and locale.
- Clear unavailable/insufficient-data states.
- No tracking in preview and no invented visitor identity.

Later, add privacy-conscious CTA click and form start/completion events after defining retention and consent behavior.

## Multi-page websites

Introduce pages above the existing section model so a website can have Home, Services, About, Contact, and campaign pages.

Key requirements:

- Page-specific slug, SEO, locale content, ordering, and publication validation.
- Shared navigation and footer/global sections.
- Internal link picker understands pages and sections.
- Default-locale and translated routes work on platform and custom domains.
- Live snapshots publish all pages atomically and retain rollback compatibility.
- Existing one-page websites migrate without URL or rendering changes.

This is the largest architectural project and should start only after a dedicated schema/routing/snapshot plan.

## SEO and launch health centre

Create an actionable pre-publish checklist for:

- Missing or duplicate title/description.
- Empty or example section content.
- Broken internal/CTA links.
- Missing image alt text.
- Incomplete or stale translations.
- Missing contact/business information.
- Mobile overflow and excessively large images where detectable.
- Canonical, `hreflang`, Open Graph, and structured-data readiness.

Checks should link directly to the affected setting or section. Separate blocking errors from recommendations.

## Guided AI website setup

Use AI at explicit workflow moments rather than adding a generic chat box:

- Propose an initial section set and business copy from a short intake.
- Rewrite selected copy in a chosen tone.
- Suggest FAQs from services.
- Draft SEO metadata.
- Draft translations and mark them unreviewed.
- Explain publish blockers and suggest fixes.

Generated content must be previewed, editable, and explicitly accepted. Never overwrite or publish silently. Keep business/customer data minimization and server-only credentials central to the design.

## Google company information and reviews

Start with Google Places for a per-website confirmed Place selection and explicit comparison/import of name, address, phone, website, opening hours, rating, review count, and the limited highlighted reviews returned by Place Details.

Requirements:

- Store the durable Place ID; keep the API key server-only.
- Do not silently overwrite owner-edited business information.
- Follow Google attribution, branding, linking, and caching/storage rules.
- Keep map/location, Places information, and Business Profile account management as separate concepts.
- Treat full review history, synchronization, and replies as a later Google Business Profile OAuth project.

## Intentionally postponed

- Full CRM and multi-user sales pipelines.
- Autonomous customer email or lead outreach.
- Blog/CMS before multi-page foundations exist.
- Booking payments before booking concurrency and lifecycle behavior are proven.
- Full Google Business Profile management in the first Places release.

