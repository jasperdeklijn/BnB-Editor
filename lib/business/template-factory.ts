import type { BusinessCategory } from "./categories"
import type { Section } from "@/lib/types"
import { TEMPLATE_PRESETS } from "@/components/templates/category-presets"
import { getDefaultSectionData } from "@/components/editor/section-registry"

/**
 * Generates sections from a template preset
 * Each section is given a unique ID and the default data for its type
 */
export function generateSectionsFromTemplate(
  category: BusinessCategory,
  businessId?: string | null
): Section[] {
  const template = TEMPLATE_PRESETS[category]

  if (!template) {
    console.warn(`No template found for category: ${category}`)
    return []
  }

  return template.sections.map((sectionDef) => {
    const id = `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Get default data from registry, then override with template-specific data
    const defaultData = getDefaultSectionData(sectionDef.type, { businessId })
    const data = {
      ...defaultData,
      ...(sectionDef.data || {}),
    }

    return {
      id,
      type: sectionDef.type,
      data,
      styles: {},
    }
  })
}

/**
 * Prepares a business object with template defaults
 * Used when creating a new business from a template
 */
export function getBizDefaultsFromTemplate(category: BusinessCategory): Record<string, unknown> {
  const template = TEMPLATE_PRESETS[category]

  if (!template) {
    return {}
  }

  return {
    name: template.businessDefaults.name,
    tagline: template.businessDefaults.tagline,
    description: template.businessDefaults.description,
    phone: template.businessDefaults.phone || "",
    email: template.businessDefaults.email || "",
    category,
  }
}

/**
 * Prepares demo services from template
 * These can be stored in the services table for the business
 */
export function getDemoServicesFromTemplate(
  category: BusinessCategory,
  businessId: string
): Array<{
  business_id: string
  title: string
  description: string
  price: string
  duration?: string
  position: number
}> {
  const template = TEMPLATE_PRESETS[category]

  if (!template) {
    return []
  }

  return template.services.map((service, index) => ({
    business_id: businessId,
    title: service.title,
    description: service.description,
    price: service.price || "",
    duration: service.duration,
    position: index,
  }))
}

/**
 * Gets all available categories and their template descriptions
 */
export function getAvailableTemplateCategories() {
  return Object.entries(TEMPLATE_PRESETS).map(([key, template]) => ({
    id: key,
    name: template.name,
    description: template.description,
    servicesCount: template.services.length,
    sectionsCount: template.sections.length,
  }))
}
