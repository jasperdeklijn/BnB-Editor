import type { BusinessCategory } from "@/lib/business/categories"
import { generateSectionsFromTemplate } from "@/lib/business/template-factory"
import { getDefaultSectionData } from "@/components/editor/section-registry"
import type { Section, SectionType } from "@/lib/types"
import type { OnboardingGoal } from "@/lib/onboarding/types"

interface StarterInput {
  businessId: string
  businessName: string
  category: BusinessCategory
  goal: OnboardingGoal
  description: string | null
  email: string
  phone: string | null
  city: string | null
}

function ensureSection(sections: Section[], type: SectionType, businessId: string) {
  if (sections.some((section) => section.type === type)) return sections
  return [
    ...sections,
    {
      id: `onboarding-${type}`,
      type,
      data: getDefaultSectionData(type, { businessId }),
      styles: {},
    },
  ]
}

export function buildOnboardingStarterSections(input: StarterInput) {
  let sections = generateSectionsFromTemplate(input.category, input.businessId)

  if (input.goal === "bookings") {
    sections = ensureSection(sections, "services", input.businessId)
    sections = ensureSection(sections, "request_form", input.businessId)
  } else if (input.goal === "contact_requests") {
    sections = ensureSection(sections, "contact", input.businessId)
  } else if (input.goal === "showcase") {
    sections = ensureSection(sections, "about", input.businessId)
    sections = ensureSection(sections, "gallery", input.businessId)
  }

  const address = input.city ?? ""
  const description = input.description || `Welkom bij ${input.businessName}.` 

  return sections.map((section, position) => {
    const data = { ...section.data }

    if (section.type === "nav") data.brandName = input.businessName
    if (section.type === "hero") {
      data.title = input.businessName
      data.subtitle = description
    }
    if (section.type === "about") data.description = description
    if (section.type === "contact") {
      data.address = address
      data.phone = input.phone ?? ""
      data.email = input.email
    }
    if (section.type === "map") data.address = address
    if (section.type === "footer") {
      data.brandName = input.businessName
      data.companyName = input.businessName
      data.companyDescription = description
      data.phone = input.phone ?? ""
      data.email = input.email
    }
    if (section.type === "request_form" && input.goal === "bookings") {
      data.requestType = input.category === "bnb" ? "booking" : "appointment"
    }

    return { position, type: section.type, content: data, styles: section.styles ?? {} }
  })
}

