# Small Business Platform Refactor

This project should evolve from a BnB-focused website builder into a generic website builder for small businesses, freelancers, and Dutch ZZP'ers. The current architecture already has useful primitives: an App Router editor, normalized `website_sections`, Supabase-backed publishing, section ordering, reusable UI components, image management, domains, billing, and public site rendering. The refactor should keep those strengths while removing accommodation-specific assumptions.

## Goals

- Support service-based businesses such as hairdressers, gardeners, electricians, photographers, coaches, restaurants, therapists, tattoo artists, car detailers, consultants, agencies, and handymen.
- Keep the editor beginner-friendly: section-based, visual, direct, and hard to break.
- Avoid webshop/catalog complexity. Services, portfolios, pricing, requests, appointments, testimonials, locations, and contact flows are in scope; carts, inventory, product variants, and checkout are out of scope.
- Make sections, templates, themes, and data models generic enough for future modules such as blog, appointment scheduling, invoicing, CRM, newsletter, advanced booking, and memberships.

## Current Coupling Hotspots

- `lib/supabase/bnb.ts` owns `bnbs` and `rooms` CRUD.
- `components/bnb` and `components/rooms` expose BnB details and room management screens.
- `components/bnb-sections` contains generic-looking section components but with BnB naming, copy, placeholder images, and `rooms` coupling.
- `components/editor/editor-client.tsx`, `components/editor/editor-canvas.tsx`, `components/editor/section-editor.tsx`, and `components/editor/sections-selector.tsx` hardcode `rooms`, BnB defaults, and BnB-specific labels.
- `components/page-loader.tsx` enriches public `rooms` sections by querying `bnbs` and `rooms`.
- `app/editor/bnb` and `app/editor/rooms` should become business and services editor routes.
- Marketing, auth, legal, domain, contact, sitemap, metadata, and email copy still reference `BnB Website Maken` and `bnbwebsitemaken.nl`.

## Naming Conventions

Use user-facing Dutch labels, but keep code identifiers English and generic.

| Old | New code term | New Dutch UI term | Notes |
| --- | --- | --- | --- |
| BnB | Business | Bedrijf | Top-level customer business profile. |
| Listing | Business / Site | Bedrijf / Website | Use `business` for owner data, `website` for published site. |
| Room | Service / Offering | Dienst / Aanbod | `service` is the primary model. `offering` can be copy only. |
| Rooms section | Services section | Diensten | Existing room layouts can be reused. |
| Amenities | Features / Highlights | Kenmerken / Pluspunten | Works for all businesses. |
| Guests | Capacity / Participants | Capaciteit / Deelnemers | Only show when relevant. |
| Host | Business owner | Eigenaar | Avoid accommodation language. |
| Property details | Business details | Bedrijfsgegevens | Address, category, description, channels. |
| Check-in/out | Opening hours / Appointment window | Openingstijden / Afspraaktijden | Move to optional booking/availability module. |
| Booking link | Booking/contact URL | Boekings- of contactlink | Optional CTA. |

Route renames:

- `/editor/bnb` -> `/editor/business`
- `/editor/rooms` -> `/editor/services`
- Keep backwards-compatible redirects during migration.

Database renames:

- `bnbs` -> `businesses`
- `rooms` -> `services`
- `rooms.bnb_id` -> `services.business_id`
- Keep compatibility views or migration helpers temporarily if production data exists.

## Target Folder Structure

```txt
app/
  editor/
    business/
      page.tsx
    services/
      page.tsx
    templates/
      page.tsx
    themes/
      page.tsx
    page.tsx
  preview/[slug]/page.tsx
  site/[slug]/page.tsx
  api/
    contact/route.ts
    requests/route.ts
    domain/route.ts

components/
  business/
    business-details-client.tsx
    services-client.tsx
    service-card-editor.tsx
    opening-hours-editor.tsx
  editor/
    editor-client.tsx
    editor-canvas.tsx
    editor-header.tsx
    section-editor.tsx
    section-registry.ts
    section-defaults.ts
    sections-selector.tsx
    template-selector.tsx
    theme-editor.tsx
  sections/
    hero-section.tsx
    about-section.tsx
    services-section.tsx
    gallery-section.tsx
    features-section.tsx
    testimonials-section.tsx
    faq-section.tsx
    contact-section.tsx
    opening-hours-section.tsx
    team-section.tsx
    pricing-section.tsx
    request-form-section.tsx
    reviews-section.tsx
    social-links-section.tsx
    map-section.tsx
    cta-section.tsx
    nav-section.tsx
    footer-section.tsx
  templates/
    category-presets.ts
    template-preview-card.tsx
  themes/
    palettes.ts
    fonts.ts
    theme-provider.tsx
  forms/
    contact-form.tsx
    request-form.tsx
    quote-form.tsx
  ui/
    ...

lib/
  business/
    categories.ts
    structured-data.ts
    template-factory.ts
  sections/
    schemas.ts
    registry.ts
    defaults.ts
  supabase/
    business.ts
    services.ts
    websites.ts
    websiteSections.ts
    media.ts
    requests.ts
  themes/
    theme-types.ts
    resolve-theme.ts
  types.ts
```

## Section Architecture

Move from switch-based rendering to a registry. The registry becomes the single source of truth for section label, icon, defaults, editor panel, renderer, allowed templates, and whether it uses shared business data.

```ts
export type SectionType =
  | "nav"
  | "hero"
  | "about"
  | "services"
  | "gallery"
  | "features"
  | "testimonials"
  | "faq"
  | "contact"
  | "opening_hours"
  | "team"
  | "pricing"
  | "request_form"
  | "reviews"
  | "social_links"
  | "map"
  | "cta"
  | "footer"

export interface SectionStyles {
  variant?: "default" | "minimal" | "bold" | "editorial" | "split"
  backgroundColor?: string
  textColor?: string
  accentColor?: string
  backgroundImage?: string
  fontFamily?: string
  spacing?: "compact" | "normal" | "spacious"
  radius?: "none" | "sm" | "md"
}

export interface WebsiteSection<TData = Record<string, unknown>> {
  id: string
  websiteId?: string
  type: SectionType
  data: TData
  styles?: SectionStyles
  position?: number
}

export interface SectionDefinition<TData = Record<string, unknown>> {
  type: SectionType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  defaultData: (context: SectionDefaultContext) => TData
  Renderer: React.ComponentType<SectionRenderProps<TData>>
  Editor: React.ComponentType<SectionEditorProps<TData>>
  category?: "structure" | "content" | "trust" | "conversion" | "business"
}
```

Example registry entry:

```ts
export const servicesSection: SectionDefinition<ServicesSectionData> = {
  type: "services",
  label: "Diensten",
  description: "Toon aanbod, prijzen of pakketten",
  icon: BriefcaseBusiness,
  category: "business",
  defaultData: ({ business }) => ({
    title: "Onze diensten",
    subtitle: "Kies wat bij je past.",
    layout: "grid",
    source: "business_services",
    serviceIds: [],
    fallbackItems: [
      { title: "Adviesgesprek", description: "Een korte kennismaking.", price: "Vanaf EUR 75" },
    ],
  }),
  Renderer: ServicesSection,
  Editor: ServicesSectionEditor,
}
```

Recommended section data interfaces:

```ts
export interface HeroSectionData {
  title: string
  subtitle?: string
  ctaText?: string
  ctaHref?: string
  secondaryCtaText?: string
  secondaryCtaHref?: string
  image?: string
  layout?: "centered" | "split" | "fullwidth" | "minimal" | "split_reverse"
}

export interface ServiceItem {
  id?: string
  title: string
  description?: string
  price?: string
  duration?: string
  image?: string
  tags?: string[]
  featured?: boolean
}

export interface ServicesSectionData {
  title: string
  subtitle?: string
  layout?: "grid" | "list" | "featured" | "magazine" | "minimal" | "carousel"
  source?: "business_services" | "manual"
  serviceIds?: string[]
  fallbackItems?: ServiceItem[]
}

export interface RequestFormSectionData {
  title: string
  subtitle?: string
  requestType: "contact" | "appointment" | "quote" | "booking" | "whatsapp"
  recipientEmail?: string
  whatsappNumber?: string
  fields: Array<"name" | "email" | "phone" | "date" | "service" | "message" | "budget">
}
```

## Business Categories And Templates

Store category presets in `components/templates/category-presets.ts` or `lib/business/categories.ts`. Templates should generate editable sections, theme defaults, and demo business data.

```ts
export type BusinessCategory =
  | "hairdresser"
  | "gardener"
  | "coach"
  | "restaurant"
  | "photographer"
  | "freelancer"
  | "construction"
  | "general_service"

export interface BusinessTemplatePreset {
  id: string
  category: BusinessCategory
  name: string
  description: string
  theme: ThemePreset
  businessDefaults: Partial<Business>
  services: ServiceItem[]
  sections: Array<Omit<WebsiteSection, "id">>
}
```

Suggested presets:

- Hairdresser: `nav`, `hero`, `services`, `gallery`, `opening_hours`, `testimonials`, `contact`, `map`, `footer`; warm neutral palette, elegant typography.
- Gardener: `hero`, `about`, `services`, `portfolio/gallery`, `reviews`, `request_form`, `contact`; green accent, image-led portfolio.
- Coach: `hero`, `about`, `services`, `testimonials`, `faq`, `booking/request_form`, `cta`; calm palette, trust-focused copy.
- Restaurant/cafe: `hero`, `opening_hours`, `gallery`, `services` as menu highlights, `reviews`, `map`, `contact`; strong imagery and hours.
- Photographer: `hero`, `portfolio/gallery`, `services/pricing`, `testimonials`, `contact`; minimal, image-first layout.
- Freelancer/consultant: `hero`, `about`, `services`, `case studies/gallery`, `testimonials`, `faq`, `request_form`; clean professional palette.
- Construction company/handyman: `hero`, `services`, `portfolio/gallery`, `features`, `reviews`, `quote_form`, `map`; practical trust signals.
- General service business: `hero`, `about`, `services`, `gallery`, `testimonials`, `faq`, `contact`, `footer`; safe default.

## Supabase Schema Proposal

Use `businesses` as the owner/business profile and keep `websites` as the publishable site. A user may eventually own multiple businesses, so avoid hardcoding one business per user in application logic even if the first release only creates one.

```sql
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  category text not null default 'general_service',
  tagline text not null default '',
  description text not null default '',
  email text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  website_url text not null default '',
  street text not null default '',
  city text not null default '',
  postal text not null default '',
  country text not null default 'NL',
  latitude numeric,
  longitude numeric,
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  title text not null default 'Mijn website',
  slug text not null unique,
  custom_domain text,
  theme_id uuid,
  seo jsonb not null default '{}'::jsonb,
  analytics jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  title text not null default 'Home',
  slug text not null default '',
  seo jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  is_home boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  page_id uuid references public.pages(id) on delete cascade,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  styles jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  price text not null default '',
  duration text not null default '',
  image_urls jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  url text not null,
  alt text not null default '',
  kind text not null default 'image',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null default '',
  role text not null default '',
  quote text not null default '',
  rating integer,
  image_url text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.opening_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  note text not null default ''
);

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  request_type text not null default 'contact',
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  message text not null default '',
  preferred_date date,
  selected_service_id uuid references public.services(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  tokens jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Keep existing `domains` and `section_transitions`, but update foreign keys and naming if needed. Existing `website_sections` can either be renamed to `sections` or retained behind a `lib/supabase/sections.ts` abstraction.

## Migration Strategy

Phase 1: Compatibility foundation

- Add generic TypeScript types while keeping old types as aliases: `BnbDetails -> Business`, `Room -> Service`.
- Add `lib/supabase/business.ts` and `lib/supabase/services.ts`.
- Keep `lib/supabase/bnb.ts` as a compatibility wrapper that delegates to the generic APIs.
- Add `services` as a section type while temporarily rendering old `rooms` sections with the same `ServicesSection` renderer.
- Introduce section registry and defaults. Replace direct switch imports in `section-renderer.tsx` after all current sections are registered.

Phase 2: Database migration

- Create `businesses`, `services`, and related generic tables.
- Backfill:
  - `bnbs.name` -> `businesses.name`
  - `bnbs.tagline` -> `businesses.tagline`
  - `bnbs.description` -> `businesses.description`
  - address fields -> matching business address fields
  - `rooms.name` -> `services.title`
  - `rooms.description` -> `services.description`
  - `rooms.price` -> `services.price`
  - `rooms.images` -> `services.image_urls`
  - `rooms.max_guests` -> `services.metadata.capacity` if capacity is still needed
- Add `websites.business_id` and populate it from the migrated business.
- Update section content:
  - `type = 'rooms'` -> `type = 'services'`
  - `content.bnbId` -> `content.businessId`
  - `content.roomIds` -> `content.serviceIds`
  - default titles from `Onze Kamers` to `Onze diensten`
- Keep a one-release compatibility read path for old `rooms` values.

Phase 3: UI and route migration

- Rename `/editor/bnb` to `/editor/business`.
- Rename `/editor/rooms` to `/editor/services`.
- Add redirects from old routes.
- Rename components and icons:
  - `BnbDetailsClient` -> `BusinessDetailsClient`
  - `RoomsClient` -> `ServicesClient`
  - `RoomCard` -> `ServiceCard`
  - `BedDouble` icon -> `BriefcaseBusiness`, `Scissors`, or category-aware icons where useful.
- Replace user-facing copy:
  - `Mijn B&B Website` -> `Mijn website`
  - `Kamers` -> `Diensten`
  - `Voorzieningen` -> `Kenmerken`
  - `Nu boeken` -> `Afspraak aanvragen` or `Neem contact op`

Phase 4: Templates and theme system

- Add template picker during onboarding or first editor load.
- Create category presets and demo content.
- Store selected category on `businesses.category`.
- Store theme tokens on `websites.theme` or `themes`.
- Allow templates to seed sections once, then all generated sections remain fully editable.

Phase 5: Cleanup

- Remove `components/bnb-sections` after imports are moved to `components/sections`.
- Remove old `bnbs` and `rooms` tables only after backup, production verification, and compatibility window.
- Update legal, marketing, domain, sitemap, email sender names, and platform constants.

## Editor UX Improvements

- Add a simple onboarding step: choose business category, enter business name, choose style, generate first site.
- Replace the section sidebar with grouped categories: Basis, Bedrijf, Vertrouwen, Conversie, Layout.
- Add section previews in the selector so non-technical users understand what they are adding.
- Add inline text editing for common text fields in preview/canvas mode, while keeping the right panel for advanced settings.
- Add theme tab with preset palettes, font pairs, corner radius, button style, and spacing density.
- Add business data bindings. Example: Contact section can use business email/phone automatically, but users can override it per section.
- Add reusable blocks: service card, testimonial, FAQ item, team member, pricing item.
- Add request type choices in forms: contact, quote, appointment, WhatsApp, booking request.
- Add mobile/desktop preview controls already present in the editor header to all section editing workflows.
- Add empty states written for many industries, not just accommodations.

## Multi-Template Rendering

Public rendering should be data-driven:

- Load website by slug/domain.
- Load business, theme, pages, sections, and related shared records needed by section source settings.
- Resolve theme tokens once at layout level.
- Render each section through the registry.
- Let each section decide whether it reads from manual section data or shared business records.

Avoid hardcoded enrichment like "if section type is rooms, fetch rooms." Replace it with a generic resolver:

```ts
export async function resolveSectionData(section: WebsiteSection, context: RenderContext) {
  const definition = sectionRegistry[section.type]
  if (!definition.resolveData) return section.data
  return definition.resolveData(section.data, context)
}
```

For `services`, the resolver loads `services` for the current `business_id`, optionally filtered by `serviceIds`.

## Booking And Contact Flexibility

Use `contact_requests` as the shared intake table. The form section decides the request type:

- `contact`: name, email, message.
- `quote`: name, email, phone, service, budget, message.
- `appointment`: name, email, phone, preferred date/time, service.
- `booking`: same as appointment but with date range if a future module needs it.
- `whatsapp`: renders a WhatsApp CTA and optionally logs click intent later.

Do not build scheduling inventory in this refactor. Keep advanced availability and appointment logic as a future module.

## SEO And Business Essentials

- Add `seo` JSON to websites/pages: title, description, image, noIndex, canonical.
- Generate OpenGraph and Twitter metadata from page SEO with business fallback.
- Add LocalBusiness structured data using category, address, phone, opening hours, geo, sameAs, and URL.
- Add category-aware schema subtype when obvious, such as `Restaurant`, `HairSalon`, `HomeAndConstructionBusiness`, or generic `LocalBusiness`.
- Keep Google Maps as a map/location section with address fallback and optional embed URL/API integration.
- Add analytics config on website: provider, measurement ID, consent mode.
- Preserve mobile-first rendering and optimize images with `next/image` wherever possible.

## Suggested Implementation Order

1. Add generic types, naming constants, and section registry.
2. Move current `components/bnb-sections/*` to `components/sections/*` with compatibility exports.
3. Rename `rooms` section to `services` in types, selector, renderer, editor, and canvas defaults while keeping old `rooms` render support.
4. Add `businesses` and `services` schema migration plus data backfill.
5. Rename editor routes and components.
6. Replace BnB UI copy across editor, public rendering, auth, marketing, legal, emails, and metadata.
7. Add template presets and onboarding/template picker.
8. Add richer section types: testimonials, FAQ, opening hours, pricing, map, CTA, request form.
9. Update public rendering to generic section data resolution.
10. Remove compatibility wrappers after production data is confirmed migrated.

## Smaller Implementation Tasks

Use these as ticket-sized tasks. Each task should leave the app buildable.

### Milestone 1: Generic Naming Foundation — 🟨 Partially done

- Create generic aliases in `lib/types.ts`: add `services` to `SectionType` while keeping `rooms` temporarily.
- Add a naming map/constants file for user-facing labels: business, services, features, contact, requests.
- Replace editor default copy in `editor-client.tsx` and `editor-canvas.tsx` from BnB wording to generic small-business wording.
- Update `sections-selector.tsx`: rename "Kamers" to "Diensten" and "Voorzieningen" to "Kenmerken".
- Keep old `rooms` behavior working while new sections use `services`.

Done when: a new section can be added as "Diensten" and no editor empty/default state says BnB.

Audit note 2026-06-23: generic naming constants and selectable "Diensten" exist, but editor internals still use `bnbId` and query `bnbs` in `components/editor/editor-client.tsx`. Finish by switching editor context to `businessId`/`businesses` and removing visible/default BnB leftovers from editor defaults.

### Milestone 1.5: Transition Type Cleanup — 🟨 Partially done

- Fix `lib/transitions/resolveTransition.ts` so it matches the current `Section` and `Transition` types.
- Decide whether transitions live only in the normalized `section_transitions` table or whether sections still carry a `transitionToNext` field.
- Remove or reintroduce `SectionTransition` consistently in `lib/types.ts`.
- Update callers to use one transition model only.
- Add a small regression check around transition resolution between two adjacent sections.

Done when: `npx tsc --noEmit` no longer reports transition-related type errors.

Audit note 2026-06-23: no transition-specific type error was found, but `npx tsc --noEmit` currently fails because `components/sections/nav-section.tsx` has an incomplete `Record<SectionType, string>` after the new generic section types were added.

### Milestone 2: Section Component Reorganization — ✅ Done

- Create `components/sections`.
- Move current generic sections from `components/bnb-sections` into `components/sections`.
- Rename `rooms-section.tsx` to `services-section.tsx`.
- Rename `amenities-section.tsx` to `features-section.tsx`.
- Add temporary compatibility exports from `components/bnb-sections/*` so old imports do not break immediately.
- Update `section-renderer.tsx` imports to use `components/sections`.

Done when: the app renders the same pages through generic section paths.

### Milestone 3: Section Registry — ✅ Done

- Add `components/editor/section-registry.ts`.
- Move section labels, icons, descriptions, default data, and renderer references into the registry.
- Replace the hardcoded `sectionTypes` array in `sections-selector.tsx` with registry data.
- Replace the switch in `section-renderer.tsx` with registry lookup.
- Add fallback handling for unknown old section types.

Done when: adding a new section only requires adding one registry entry plus its component/editor config.

### Milestone 4: Generic Business Data API — ✅ Done

- Add `lib/supabase/business.ts` with `Business`, `BusinessInput`, `getOrCreateBusiness`, and `updateBusiness`.
- Add `lib/supabase/services.ts` with `Service`, `ServiceInput`, CRUD, and reorder helpers.
- Keep `lib/supabase/bnb.ts` as a wrapper or compatibility layer.
- Rename server action comments and thrown messages to generic terms.

Done when: new code can call generic business/services APIs while old BnB pages still compile.

### Milestone 5: Editor Route Rename — ✅ Done

- Create `/app/editor/business/page.tsx` using `BusinessDetailsClient`.
- Create `/app/editor/services/page.tsx` using `ServicesClient`.
- Add redirects from `/editor/bnb` to `/editor/business`.
- Add redirects from `/editor/rooms` to `/editor/services`.
- Update editor navigation links and page metadata.

Done when: old URLs still work, but the visible editor uses Business and Services.

### Milestone 6: Business Details UI — ✅ Done

- Rename `components/bnb/bnb-details-client.tsx` to `components/business/business-details-client.tsx`.
- Replace fields:
  - `checkin_time` and `checkout_time` with optional opening/appointment copy.
  - `max_guests` with optional capacity/participants only if needed.
  - booking URL with contact/booking/WhatsApp URL.
- Add category selection: hairdresser, gardener, coach, restaurant, photographer, freelancer, construction, general service.
- Replace all BnB-specific placeholders and toast messages.

Done when: the business details page works for a non-BnB business without awkward fields.

### Milestone 7: Services UI — ✅ Done

- Rename `components/rooms/rooms-client.tsx` to `components/business/services-client.tsx`.
- Rename `RoomCard` to `ServiceCard`.
- Replace labels:
  - Kamernaam -> Dienstnaam
  - Prijs / Nacht -> Prijs
  - Max gasten -> Duur or optional capacity
  - Foto's -> Afbeeldingen
- Replace default new item "Nieuwe kamer" with "Nieuwe dienst".
- Update empty states and toast messages.

Done when: users can manage services/offerings without accommodation language.

### Milestone 8: Database Migration — ✅ Done

- Add migration for `businesses`.
- Add migration for `services`.
- Add `business_id`, `seo`, and `analytics` to `websites`.
- Backfill `bnbs` into `businesses`.
- Backfill `rooms` into `services`.
- Backfill `websites.business_id`.
- Convert section content from `rooms` to `services` where safe.
- Add indexes and RLS policies for new tables.

Done when: existing users have equivalent business and service records.

### Milestone 9: Public Site Data Resolver — ✅ Done

- Replace `components/page-loader.tsx` room-specific enrichment with a generic section resolver.
- Add `resolveSectionData(section, context)`.
- Add resolver for `services` that loads business services by `business_id`.
- Keep compatibility resolver for old `rooms` sections.
- Ensure public preview and published site routes use the same resolver.

Done when: public sites render services through generic business data.

### Milestone 10: Template Presets — 🟨 Partially done
 
- Add `lib/business/categories.ts`.
- Add `components/templates/category-presets.ts`.
- Define presets for hairdresser, gardener, coach, restaurant, photographer, freelancer, construction, and general service.
- Add demo services and default sections for each category.
- Add a simple template picker route or first-run modal.

Done when: selecting a category seeds a useful editable website.

Audit note 2026-06-23: `lib/business/categories.ts` exists with the target categories, but `components/templates/category-presets.ts`, demo service/section presets, and a template picker route or first-run modal are still missing.

### Milestone 11: Theme System — ⬜ Not done
 
- Add `components/themes/palettes.ts`.
- Add `components/themes/fonts.ts`.
- Add theme token type in `lib/themes/theme-types.ts`.
- Add basic editor controls for palette, font pair, radius, and spacing.
- Store selected theme tokens on website/theme data.
- Apply theme tokens to public rendering.

Done when: users can swap the look without changing section content.

### Milestone 12: New Generic Sections — 🟨 Partially done

- Add `testimonials-section`.
- Add `faq-section`.
- Add `opening-hours-section`.
- Add `pricing-section`.
- Add `map-section`.
- Add `cta-section`.
- Add `request-form-section`.
- Register each section and add editor controls for each.

Done when: the section picker covers common small-business websites beyond services/gallery/contact.

Audit note 2026-06-23: the new section components exist and are registered, including testimonials, FAQ, opening hours, pricing, map, CTA, and request form. This milestone is not fully done until the new section types compile cleanly and all editor controls are verified; `npx tsc --noEmit` currently fails in `components/sections/nav-section.tsx`.

### Milestone 13: Contact And Request Flexibility — ⬜ Not done

- Add or update `contact_requests` table.
- Update `/api/contact` into a generic request handler or add `/api/requests`.
- Support request types: contact, quote, appointment, booking request, WhatsApp CTA.
- Add recipient fallback from business email.
- Update email subject/body copy from BnB to generic business wording.

Done when: forms work for many service businesses and store structured requests.

Audit note 2026-06-23: request-form UI supports contact, appointment, quote, and WhatsApp, but `/api/requests`, a `contact_requests` table, structured request storage, business-email fallback, and generic email copy are still missing. `/api/contact` still uses `info@bnbwebsitemaken.nl` and BnB sender/body wording.

### Milestone 14: SEO And Business Essentials — 🟨 Partially done

- Add SEO fields to website/page editing.
- Generate OpenGraph metadata from SEO fields with business fallback.
- Add LocalBusiness structured data helper.
- Add Google Maps/map section support.
- Add social links fields and rendering.
- Add analytics configuration fields.

Done when: generated sites have business metadata, sharing cards, structured data, and analytics hooks.

Audit note 2026-06-23: the database migration adds `seo` and `analytics` columns to `websites`, and a map section exists. Editor fields, OpenGraph generation from SEO data, LocalBusiness structured data, social links rendering, and analytics configuration are not implemented yet.

### Milestone 15: Platform Copy Cleanup — ⬜ Not done

- Replace remaining `BnB Website Maken` product copy where this is no longer the intended brand.
- Update auth pages, account pages, billing pages, legal pages, email sender names, sitemap base URL, and domain placeholder text.
- Decide final platform brand/domain constants before changing production domain behavior.

Done when: `rg -n "BnB|bnb|B&B|rooms|kamer|gasten|property|host"` returns only intentional compatibility references.

Audit note 2026-06-23: broad BnB-specific platform copy remains in landing, legal, billing, email, sitemap/domain-related code, and compatibility files. This should stay open until final platform brand/domain constants are decided.

### Milestone 16: Cleanup And Removal — ⬜ Not done

- Remove old `components/bnb-sections` compatibility exports.
- Remove old `/editor/bnb` and `/editor/rooms` redirects only after a safe period.
- Remove or archive old `bnbs` and `rooms` tables after backup and verification.
- Delete deprecated types and compatibility wrappers.
- Add regression tests around section rendering, services resolver, and migration assumptions.

Done when: the codebase is generic by default and BnB exists only as one possible business category.

Audit note 2026-06-23: old BnB compatibility code remains intentionally present, including `components/bnb-sections`, `components/bnb`, `components/rooms`, `lib/supabase/bnb.ts`, old editor pages, `rooms`/`amenities` section types, and `bnbs`/`rooms` database compatibility references.

## Acceptance Criteria

- A new user can create a site for at least hairdresser, gardener, coach, restaurant, photographer, freelancer, construction, or general service business without seeing BnB-specific wording.
- Existing BnB users still render correctly during migration.
- The editor can add, remove, reorder, style, and configure all generic section types.
- Public pages render dynamically from section data and theme tokens.
- Contact, quote, appointment, WhatsApp, and booking request CTAs are supported without webshop behavior.
- SEO metadata, OpenGraph, structured data, maps, social links, and analytics configuration have generic business support.
