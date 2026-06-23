# Template Presets - Milestone 10 Implementation

## Overview

Template Presets provide business category-specific starting points for new websites. Users can select their business type and get a pre-configured website with relevant sections, demo services, and industry-specific defaults.

## Implemented Features

### 1. Category Definitions (`lib/business/categories.ts`)

Eight business categories with Dutch labels and example services:

- **Hairdresser** (Kapper / Schoonheidsspecialist) - Salon and beauty services
- **Gardener** (Hovenier / Groenvoorziening) - Garden design and landscaping
- **Coach** (Coach / Therapeut / Trainer) - Coaching and wellness services
- **Restaurant** (Restaurant / Cafe / Horeca) - Food and beverage services
- **Photographer** (Fotograaf / Videograaf) - Photography and video services
- **Freelancer** (Freelancer / Consultant / ZZP'er) - Professional services and consulting
- **Construction** (Aannemer / Vakman / Klus) - Building and construction services
- **General Service** (Overige dienstverlening) - Catch-all for other services

### 2. Template Presets (`components/templates/category-presets.ts`)

Each template includes:
- **Business defaults**: Company name, tagline, description, contact info
- **Demo services**: 4-5 example services with descriptions and pricing
- **Section structure**: Pre-selected sections appropriate for the business type

#### Example - Hairdresser Template:
```typescript
{
  businessDefaults: {
    name: "Uw Kapperszaak",
    tagline: "Professionele service, persoonlijke aandacht",
  },
  services: [
    { title: "Heren Knippen", price: "€ 25" },
    { title: "Dames Knippen", price: "€ 35" },
    { title: "Haar Verven", price: "Vanaf € 50" },
    // ...
  ],
  sections: [
    "nav", "hero", "services", "gallery", 
    "testimonials", "opening_hours", "contact", "footer"
  ]
}
```

### 3. Template Selector Component (`components/templates/template-selector.tsx`)

User interface for choosing a business category:
- Grid layout showing all 8 categories
- Selection state with visual feedback
- Service preview for each template
- "Doorgaan" (Continue) button to apply template

### 4. Template Factory (`lib/business/template-factory.ts`)

Utility functions for applying templates:

- `generateSectionsFromTemplate()` - Creates Section objects with default data
- `getBizDefaultsFromTemplate()` - Prepares business data from template
- `getDemoServicesFromTemplate()` - Creates Service records with pricing
- `getAvailableTemplateCategories()` - Lists all templates with metadata

### 5. Template Application API (`app/api/templates/apply/route.ts`)

POST endpoint to apply a template to a website:

```typescript
POST /api/templates/apply
{
  "category": "hairdresser",
  "websiteId": "uuid",    // optional
  "businessId": "uuid"    // optional
}
```

Returns:
```json
{
  "success": true,
  "websiteId": "uuid",
  "sectionsCount": 8
}
```

### 6. Template Selector Page (`app/editor/templates/page.tsx`)

New route at `/editor/templates` for browsing and selecting templates.

### 7. Preview Card Component (`components/templates/template-preview-card.tsx`)

Detailed template preview showing:
- Template name and description
- Business defaults
- Sample services
- Section list
- Selection button

## Usage

### For End Users

1. Navigate to `/editor/templates`
2. Browse available business categories
3. Click a category to select it
4. Click "Doorgaan" to apply the template
5. Website is created with:
   - Pre-configured sections
   - Demo services
   - Business defaults

### For Developers

#### Apply template in code:

```typescript
import { generateSectionsFromTemplate, getBizDefaultsFromTemplate } from "@/lib/business/template-factory"

const category = "hairdresser"
const sections = generateSectionsFromTemplate(category, businessId)
const bizDefaults = getBizDefaultsFromTemplate(category)
```

#### Get template by category:

```typescript
import { getTemplatePreset } from "@/components/templates/category-presets"

const template = getTemplatePreset("photographer")
console.log(template.services) // Array of ServiceItem
```

#### List all templates:

```typescript
import { getAllTemplatePresets } from "@/components/templates/category-presets"

const presets = getAllTemplatePresets()
presets.forEach(preset => {
  console.log(preset.name, preset.sections)
})
```

## Section Coverage by Category

### Hairdresser
`nav` → `hero` → `services` → `gallery` → `testimonials` → `opening_hours` → `contact` → `footer`

Trust-focused with visual portfolio and appointment availability.

### Gardener
`nav` → `hero` → `gallery` → `about` → `services` → `testimonials` → `request_form` (quote) → `map` → `footer`

Portfolio-heavy with quote request and location map.

### Coach
`nav` → `hero` → `about` → `services` → `testimonials` → `faq` → `request_form` (appointment) → `footer`

Trust and clarity focused with FAQ and appointment booking.

### Restaurant
`nav` → `hero` → `gallery` → `opening_hours` → `services` → `testimonials` → `map` → `contact` → `footer`

Hours and location prominent with food gallery and reviews.

### Photographer
`nav` → `hero` → `gallery` → `about` → `services` → `testimonials` → `request_form` (quote) → `footer`

Image-first with portfolio and quote request.

### Freelancer
`nav` → `hero` → `about` → `services` → `features` → `testimonials` → `faq` → `cta` → `contact` → `footer`

Professional and comprehensive with case studies and FAQ.

### Construction
`nav` → `hero` → `gallery` → `about` → `services` → `features` → `testimonials` → `request_form` (quote) → `map` → `footer`

Trust and project showcase with quote request and location.

### General Service
`nav` → `hero` → `about` → `services` → `testimonials` → `contact` → `footer`

Minimal, versatile default suitable for any service.

## Integration with Existing Systems

### Compatibility

- ✅ Works with existing section registry
- ✅ Uses standard service data structure
- ✅ Compatible with business/services tables
- ✅ Supports both new and existing websites
- ✅ Works with all section types

### Database Tables Used

- `websites` - Stores the website record
- `website_sections` - Stores section definitions
- `services` - Stores demo services
- `businesses` - Stores business profile (optional)

## Future Enhancements

### Planned Additions

1. **Theme presets** - Each template could include color/font defaults
2. **Template customization** - UI to modify template before applying
3. **Multi-language** - Templates for different languages
4. **Template analytics** - Track which templates are most popular
5. **Template variations** - Multiple designs per category
6. **Content templates** - Pre-written copy for different sections

### Known Limitations

- Demo services are static - users should customize them
- Section order is fixed - can be changed in editor after creation
- No automatic content replacement (e.g., phone number) - user must update
- Template images use placeholder - should be replaced with real photos

## Testing

### Manual Testing Checklist

- [ ] Navigate to `/editor/templates` - see all 8 categories
- [ ] Click each category - selection highlights
- [ ] Select a template - "Doorgaan" button appears
- [ ] Click "Doorgaan" - redirects to editor
- [ ] Verify new website has correct sections
- [ ] Check demo services were created
- [ ] Verify business defaults were applied

### Testing Different Categories

```bash
# Test each category in sequence
curl -X POST http://localhost:3000/api/templates/apply \
  -H "Content-Type: application/json" \
  -d '{"category": "hairdresser"}'
```

## Related Milestones

- **Milestone 9** - Public Site Data Resolver (prerequisite)
- **Milestone 11** - Theme System (complementary)
- **Milestone 15** - Platform Copy Cleanup (dependent)

## Files Changed/Added

**New files:**
- `components/templates/category-presets.ts` - Template definitions
- `components/templates/template-selector.tsx` - Selection UI
- `components/templates/template-preview-card.tsx` - Preview component
- `lib/business/template-factory.ts` - Template application logic
- `app/editor/templates/page.tsx` - Template selector page
- `app/api/templates/apply/route.ts` - Template application API

**Modified files:**
- None - fully backward compatible

## Acceptance Criteria Met

✅ Template presets created for all 8 business categories
✅ Each template includes demo services and default sections
✅ Template picker UI at `/editor/templates`
✅ API route to apply templates to websites
✅ Integration with existing section registry
✅ Demo services properly positioned and typed
✅ Business defaults captured from templates
✅ All presets follow naming conventions from refactor

## Next Steps

1. Integrate template selector into onboarding flow
2. Add template application to `/editor` first-run experience
3. Create theme system (Milestone 11)
4. Add SEO and business essentials (Milestone 14)
