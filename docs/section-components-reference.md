# Section Components Reference

This document describes the website sections users can add from `components/sections`, what each section renders, what the editor exposes as editable content, and how a stored database entry looks.

## Storage model

All page sections are stored in `public.website_sections`.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Section row id. |
| `website_id` | `uuid` | Website that owns the section. |
| `position` | `integer` | Render order inside the page. |
| `type` | `text` | Section type, matching `SectionType` in `lib/types.ts`. |
| `content` | `jsonb` | Section-specific editable data. In React this is exposed as `section.data`. |
| `styles` | `jsonb` | Section-level visual overrides. In React this is exposed as `section.styles`. |
| `created_at` | `timestamptz` | Created timestamp. |
| `updated_at` | `timestamptz` | Updated timestamp. |

Shared `content` fields:

| Field | Meaning |
| --- | --- |
| `layout` | One of the canonical layout values: `classic`, `split`, `showcase`, `compact`, `card`, `banner`. Legacy values are normalized in `lib/section-layouts.ts`. |

Shared `styles` fields:

| Field | Meaning |
| --- | --- |
| `fontFamily` | Optional CSS utility/class used by most section wrappers. |
| `backgroundColor` | Optional section background color. |
| `textColor` | Optional section text color. |
| `backgroundImage` | Optional image URL used as a section background. |

The inspector exposes all four style fields for most sections. `nav` and `footer` expose only `backgroundColor` and `textColor`.

## Multilingual content contract

The source language remains in `website_sections.content`. Non-default languages store text-only overlays in `website_section_translations.values`; section structure, targets, media, prices, layout, styles, toggles, ids, and service selections stay shared. `components/editor/section-registry.ts` exposes the descriptor for every type through `translatableFields`, backed by `lib/i18n/section-translations.ts`.

| Section | Translatable fields |
| --- | --- |
| `nav` | `brandName`, navigation link labels |
| `hero` | `title`, `subtitle`, `ctaText` |
| `about` | `title`, `description` |
| `services` | section, popup, and booking-area headings/button/help copy; service titles/descriptions use `service_translations` |
| `gallery` | `title`, `subtitle` |
| `features` | `title`, feature text |
| `contact` | `title`; form system labels use the locale message catalog |
| `footer` | brand/company text, copyright, column titles, link labels |
| `testimonials` | `title`, `subtitle`, item name/role/quote |
| `faq` | `title`, `subtitle`, item question/answer |
| `opening_hours` | `title`, `subtitle`, note, custom day labels; weekdays/status labels use the locale catalog |
| `pricing` | `title`, `subtitle`, package/tariff text and CTA labels; numeric prices stay shared |
| `team` | `title`, `subtitle`, member name/title/bio |
| `map` | `title`; address and coordinates stay shared |
| `cta` | `title`, `subtitle`, CTA labels; targets stay shared |
| `request_form` | `title`, `subtitle`; labels, status, and errors use the locale message catalog |

Repeating visitor content carries stable item ids. Translation overlays are matched by those ids and merged back into source order, so reordering does not reassign copy. Unknown fields and behavioral keys nested into translation JSON are ignored. Business name/description/opening note use `business_translations`; service title/description use `service_translations`.

## Components

### `nav`

- Component: `components/sections/nav-section.tsx`
- Purpose: renders the top navigation bar and can generate links to other sections on the page.
- Editable in the inspector: `brandName`, `isSticky`, `navLinks`.
- Supported content JSON:
  - `brandName`: visible brand label.
  - `isSticky`: whether the nav stays fixed while scrolling.
  - `navLinks`: array of `{ sectionId, label, enabled }` entries.
  - `layout`: controls the nav arrangement.

### `hero`

- Component: `components/sections/hero-section.tsx`
- Purpose: renders the primary page introduction with a headline, subtitle, and call-to-action button.
- Editable in the inspector: `title`, `subtitle`, `ctaText`, `layout`.
- Supported content JSON:
  - `title`: main heading.
  - `subtitle`: supporting text.
  - `ctaText`: button label.
  - `layout`: maps to hero layouts such as centered, split image, full image, minimal, text card, or image right.

### `about`

- Component: `components/sections/about-section.tsx`
- Purpose: renders company or owner story content.
- Editable in the inspector: `title`, `description`, `layout`.
- Supported content JSON:
  - `title`: section heading.
  - `description`: body text.
  - `layout`: text block, two columns, large intro, compact text, info card, or intro band.

### `services`

- Component: `components/sections/services-section.tsx`
- Purpose: renders services or offerings from the `services` table, optionally filtered by selected ids.
- Editable in the inspector: `title`, `serviceIds`, more-info popup settings, booking-space settings, `layout`.
- Live data: this is the only section with a server-side resolver. `lib/supabase/section-resolver.ts` enriches `content` with live `services` rows for the current business before rendering.
- Supported content JSON:
  - `title`: section heading.
  - `businessId`: business used to fetch services.
  - `serviceIds`: optional array of service ids. Empty means show all services for the business.
  - `moreInfoButtonLabel`: label on each card's detail button.
  - `infoPopupEyebrow`, `infoPopupTitle`, `infoPopupIntro`, `infoPopupHelperText`: popup copy overrides.
  - `infoPopupCtaLabel`, `infoPopupCtaHref`: popup CTA label and target.
  - `infoPopupShowImage`, `infoPopupShowPrice`: popup display toggles.
  - `bookingSpaceEnabled`: whether the extra request/booking area is shown.
  - `bookingSpaceMode`: `inline`, `cta`, or `calendar`.
  - `bookingSpaceRequestType`: `appointment` or `booking_request`.
  - `bookingSpaceHeading`, `bookingSpaceIntro`, `bookingSpaceButtonLabel`, `bookingSpaceSuccessText`, `bookingSpaceHelperText`: booking area copy.
  - `bookingSpaceTargetHref`: target used when mode is `cta`.
  - `bookingSpaceServiceIds`: optional service filter for the booking area.
  - `layout`: service grid, list, featured item, compact list, magazine cards, or carousel.

### `gallery`

- Component: `components/sections/gallery-section.tsx`
- Purpose: renders a visual gallery or portfolio.
- Editable in the inspector: `title`, `subtitle`, `image_count`, `layout`.
- Supported content JSON:
  - `title`: section heading.
  - `subtitle`: supporting copy.
  - `images`: array of image URLs, object map of image URLs, or a number fallback.
  - `image_count`: numeric fallback count used when explicit images are not provided.
  - `layout`: image grid, side gallery, full slider, image rail, main image, or masonry.

### `features`

- Component: `components/sections/features-section.tsx`
- Purpose: renders a list of business strengths or benefits.
- Editable in the inspector: `title`, comma-separated feature text.
- Supported content JSON:
  - `title`: section heading.
  - `features`: array of strings rendered as feature rows/cards.
  - `layout`: feature grid, two columns, large cards, compact list, feature cards, or feature band.
- Note: the renderer reads `features`. The current inspector input displays `features` but writes the edited comma-separated value to `items`, so this field should be checked before relying on inspector edits.

### `contact`

- Component: `components/sections/contact-section.tsx`
- Purpose: renders contact details and a contact form.
- Editable in the inspector: `title`, `subtitle`, `address`, `phone`, `email`, `recipientEmail`, `layout`.
- Supported content JSON:
  - `title`: section heading.
  - `subtitle`: supporting copy.
  - `address`, `phone`, `email`: visible contact details.
  - `recipientEmail`: form recipient override.
  - `businessId`, `websiteId`: passed through for request storage.
  - `layout`: info plus form, split panel, compact form, contact card, contact hero, or contact cards.

### `footer`

- Component: `components/sections/footer-section.tsx`
- Purpose: renders the bottom footer with company copy, link columns, and social links.
- Editable in the inspector: only shared layout/style controls are currently exposed.
- Supported content JSON:
  - `companyName`: visible company name.
  - `companyDescription`: short footer description.
  - `columns`: array of `{ title, links }`, where links are `{ label, href }`.
  - `socialLinks`: array of `{ label, href }`.
  - `layout`: footer columns, reversed footer, large footer, compact footer, footer blocks, or centered footer.
- Note: registry defaults currently write `brandName` and `copyright`, while the renderer reads `companyName` and computes copyright from the current year.

### `testimonials`

- Component: `components/sections/testimonials-section.tsx`
- Purpose: renders customer quotes and ratings.
- Editable in the inspector: `title`, `subtitle`.
- Supported content JSON:
  - `title`: section heading.
  - `subtitle`: supporting copy.
  - `items`: array of `{ id, name, role, quote, rating, image }`.
  - `layout`: review grid, two columns, large reviews, compact reviews, review cards, or review band.
- Note: item editing is not exposed in the inspector yet. If `items` is empty, the renderer uses default testimonial examples.

### `faq`

- Component: `components/sections/faq-section.tsx`
- Purpose: renders an accordion of common questions and answers.
- Editable in the inspector: `title`, `subtitle`.
- Supported content JSON:
  - `title`: section heading.
  - `subtitle`: supporting copy.
  - `items`: array of `{ id, question, answer }`.
  - `layout`: FAQ list, two columns, wide FAQ, compact FAQ, FAQ card, or FAQ band.
- Note: item editing is not exposed in the inspector yet. If `items` is empty, the renderer uses default FAQ examples.

### `opening_hours`

- Component: `components/sections/opening-hours-section.tsx`
- Purpose: renders weekly availability/opening times.
- Editable in the inspector: `title`, `subtitle`, `note`, each weekday's open/closed state and hours.
- Supported content JSON:
  - `title`: section heading.
  - `subtitle`: supporting copy.
  - `note`: optional note below the hours.
  - `monday` through `sunday`: either a string or `{ hours, closed }`.
  - `items`: fallback array of `{ label, hours, closed }`.
  - `layout`: hours card, two columns, wide hours, compact hours, hours card, or hours band.

### `pricing`

- Component: `components/sections/pricing-section.tsx`
- Purpose: renders service packages or price cards.
- Editable in the inspector: `title`, `subtitle`.
- Supported content JSON:
  - `title`: section heading.
  - `subtitle`: supporting copy.
  - `plans`: array of `{ id, name, price, period, description, features, highlighted, ctaText, ctaHref }`.
  - `layout`: pricing grid, two columns, featured prices, compact prices, price cards, or price band.
- Note: individual plan editing is not exposed in the inspector yet. If `plans` is empty, the renderer uses default package examples.

### `map`

- Component: `components/sections/map-section.tsx`
- Purpose: renders location details and an embedded map.
- Editable in the inspector: `title`, `address`, `phone`, `email`, `embedUrl`.
- Supported content JSON:
  - `title`: section heading.
  - `subtitle`: optional supporting copy.
  - `address`, `phone`, `email`: visible location/contact details.
  - `embedUrl`: optional Google Maps embed URL. If empty, the renderer builds a maps URL from `address`.
  - `showMap`: set to `false` to hide the map.
  - `layout`: map plus info, split map, wide map, compact map, map card, or location band.

### `cta`

- Component: `components/sections/cta-section.tsx`
- Purpose: renders a call-to-action band with one or two links.
- Editable in the inspector: `title`, `subtitle`, `primaryCtaText`, `primaryCtaHref`, `secondaryCtaText`, `phone`, `layout`.
- Supported content JSON:
  - `title`: section heading.
  - `subtitle`: supporting copy.
  - `primaryCtaText`, `primaryCtaHref`: main CTA.
  - `secondaryCtaText`, `secondaryCtaHref`: optional second CTA.
  - `phone`: optional phone action/display.
  - `layout`: centered CTA, text plus buttons, CTA banner, compact CTA, CTA card, or wide CTA.
- Note: the inspector currently exposes `secondaryCtaText` and `phone`, but not `secondaryCtaHref`.

### `request_form`

- Component: `components/sections/request-form-section.tsx`
- Purpose: renders a configurable request form for contact, quotes, appointments, or WhatsApp handoff.
- Editable in the inspector: `title`, `subtitle`, `requestType`, `whatsappNumber`, `recipientEmail`, `fields`.
- Supported content JSON:
  - `title`: section heading.
  - `subtitle`: supporting copy.
  - `requestType`: `contact`, `quote`, `appointment`, `booking_request`, or `whatsapp`. The inspector exposes `contact`, `appointment`, `quote`, and `whatsapp`.
  - `fields`: array of enabled field keys: `name`, `email`, `phone`, `date`, `service`, `budget`, `message`.
  - `whatsappNumber`: used when `requestType` is `whatsapp`.
  - `recipientEmail`: form recipient override.
  - `businessId`, `websiteId`: passed through for request storage.
  - `layout`: form card, text plus form, large form, compact form, request card, or request band.

## Example database entries

### Basic hero section row

```json
{
  "id": "9a24b27d-0a6d-48e9-9388-2ab6e8db3d4f",
  "website_id": "4c8e41d2-29e8-4b9f-b7c7-7e5f8b0d8a11",
  "position": 1,
  "type": "hero",
  "content": {
    "title": "Welkom bij Studio Noord",
    "subtitle": "Professionele service, persoonlijk contact.",
    "ctaText": "Neem contact op",
    "layout": "classic"
  },
  "styles": {
    "fontFamily": "font-sans",
    "backgroundColor": "#fffbeb",
    "textColor": "#1c1917",
    "backgroundImage": "https://example.com/images/hero.jpg"
  },
  "created_at": "2026-07-01T19:30:00.000Z",
  "updated_at": "2026-07-01T19:30:00.000Z"
}
```

### Services section row with live service data

The stored section only needs configuration and selected ids. The actual service cards are fetched from `public.services` at render time.

```json
{
  "id": "f1466f2f-c94e-4a17-9214-50260bb31399",
  "website_id": "4c8e41d2-29e8-4b9f-b7c7-7e5f8b0d8a11",
  "position": 3,
  "type": "services",
  "content": {
    "title": "Onze diensten",
    "layout": "classic",
    "businessId": "7e19211b-e8d8-4c2d-945f-6753c63d2b47",
    "serviceIds": [
      "120f6ed1-7fb3-4c7c-8ad5-f9ef9f762e6f",
      "463f2832-4972-4356-97ac-85d51f8f5857"
    ],
    "moreInfoButtonLabel": "Meer info",
    "infoPopupEyebrow": "Aanbod",
    "infoPopupTitle": "",
    "infoPopupIntro": "",
    "infoPopupCtaLabel": "Aanvragen",
    "infoPopupCtaHref": "#request_form-f1466f2f",
    "infoPopupHelperText": "Neem contact op voor beschikbaarheid, planning en mogelijkheden.",
    "infoPopupShowImage": true,
    "infoPopupShowPrice": true,
    "bookingSpaceEnabled": true,
    "bookingSpaceMode": "inline",
    "bookingSpaceHeading": "Plan een afspraak",
    "bookingSpaceIntro": "Kies een dienst en stuur een aanvraag met je gewenste datum en tijd.",
    "bookingSpaceButtonLabel": "Afspraak aanvragen",
    "bookingSpaceSuccessText": "Aanvraag ontvangen. We nemen zo snel mogelijk contact met je op.",
    "bookingSpaceHelperText": "Je aanvraag wordt als voorlopige afspraak in de planning gezet.",
    "bookingSpaceTargetHref": "",
    "bookingSpaceRequestType": "appointment",
    "bookingSpaceServiceIds": []
  },
  "styles": {
    "backgroundColor": "#fefce8",
    "textColor": "#292524"
  },
  "created_at": "2026-07-01T19:35:00.000Z",
  "updated_at": "2026-07-01T19:35:00.000Z"
}
```

Example `public.services` row used by the `services` section resolver:

```json
{
  "id": "120f6ed1-7fb3-4c7c-8ad5-f9ef9f762e6f",
  "business_id": "7e19211b-e8d8-4c2d-945f-6753c63d2b47",
  "title": "Intakegesprek",
  "description": "Een persoonlijk gesprek om de opdracht en planning scherp te krijgen.",
  "price": "Vanaf EUR 75",
  "duration": "60 minuten",
  "capacity": 1,
  "image_urls": [
    "https://example.com/images/intake.jpg"
  ],
  "tags": [
    "advies"
  ],
  "position": 1,
  "is_featured": true,
  "created_at": "2026-07-01T19:00:00.000Z",
  "updated_at": "2026-07-01T19:00:00.000Z"
}
```
