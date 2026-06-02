import type { ComponentType } from "react"
import {
  Briefcase,
  Home,
  ImageIcon,
  Info,
  Layout,
  Mail,
  Menu,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import type { Section, SectionStyles, SectionType } from "@/lib/types"
import {
  DEFAULT_BUSINESS_EMAIL,
  DEFAULT_BUSINESS_NAME,
  DEFAULT_FEATURES,
  DEFAULT_GALLERY_IMAGES,
  SECTION_COPY,
} from "@/lib/business-naming"
import { AboutSection } from "@/components/sections/about-section"
import { ContactSection } from "@/components/sections/contact-section"
import { FeaturesSection } from "@/components/sections/features-section"
import { FooterSection } from "@/components/sections/footer-section"
import { GallerySection } from "@/components/sections/gallery-section"
import { HeroSection } from "@/components/sections/hero-section"
import { NavSection } from "@/components/sections/nav-section"
import { ServicesSection } from "@/components/sections/services-section"

export interface SectionDefaultContext {
  businessId?: string | null
}

export interface SectionRenderProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void
  styles?: SectionStyles
  allSections?: Section[]
  device?: "desktop" | "tablet" | "mobile"
}

export interface SectionDefinition {
  type: SectionType
  label: string
  description: string
  icon: LucideIcon
  category: "structure" | "content" | "business" | "conversion"
  selectable?: boolean
  defaultData: (context: SectionDefaultContext) => Record<string, unknown>
  Renderer: ComponentType<SectionRenderProps>
}

const currentYear = new Date().getFullYear()

export const sectionDefinitions = {
  nav: {
    type: "nav",
    label: SECTION_COPY.nav.label,
    description: SECTION_COPY.nav.description,
    icon: Menu,
    category: "structure",
    defaultData: () => ({
      brandName: DEFAULT_BUSINESS_NAME,
      isSticky: true,
      navLinks: [],
    }),
    Renderer: NavSection,
  },
  hero: {
    type: "hero",
    label: SECTION_COPY.hero.label,
    description: SECTION_COPY.hero.description,
    icon: Home,
    category: "content",
    defaultData: () => ({
      title: SECTION_COPY.hero.defaultTitle,
      subtitle: "Professionele service, persoonlijk contact.",
      ctaText: "Neem contact op",
    }),
    Renderer: HeroSection,
  },
  about: {
    type: "about",
    label: SECTION_COPY.about.label,
    description: SECTION_COPY.about.description,
    icon: Info,
    category: "content",
    defaultData: () => ({
      title: SECTION_COPY.about.defaultTitle,
      description: "Vertel wie je bent, wat je doet en waarom klanten voor je kiezen.",
    }),
    Renderer: AboutSection,
  },
  services: {
    type: "services",
    label: SECTION_COPY.services.label,
    description: SECTION_COPY.services.description,
    icon: Briefcase,
    category: "business",
    defaultData: ({ businessId }) => ({
      title: SECTION_COPY.services.defaultTitle,
      layout: "grid",
      bnbId: businessId ?? null,
      businessId: businessId ?? null,
      roomIds: [],
      serviceIds: [],
    }),
    Renderer: ServicesSection,
  },
  rooms: {
    type: "rooms",
    label: SECTION_COPY.rooms.label,
    description: SECTION_COPY.rooms.description,
    icon: Briefcase,
    category: "business",
    selectable: false,
    defaultData: ({ businessId }) => ({
      title: SECTION_COPY.services.defaultTitle,
      layout: "grid",
      bnbId: businessId ?? null,
      businessId: businessId ?? null,
      roomIds: [],
      serviceIds: [],
    }),
    Renderer: ServicesSection,
  },
  gallery: {
    type: "gallery",
    label: SECTION_COPY.gallery.label,
    description: SECTION_COPY.gallery.description,
    icon: ImageIcon,
    category: "content",
    defaultData: () => ({
      title: SECTION_COPY.gallery.defaultTitle,
      subtitle: "Bekijk een selectie van ons werk",
      layout: "grid",
      images: DEFAULT_GALLERY_IMAGES,
    }),
    Renderer: GallerySection,
  },
  features: {
    type: "features",
    label: SECTION_COPY.features.label,
    description: SECTION_COPY.features.description,
    icon: Sparkles,
    category: "business",
    defaultData: () => ({
      title: SECTION_COPY.features.defaultTitle,
      amenities: DEFAULT_FEATURES,
      features: DEFAULT_FEATURES,
    }),
    Renderer: FeaturesSection,
  },
  amenities: {
    type: "amenities",
    label: SECTION_COPY.amenities.label,
    description: SECTION_COPY.amenities.description,
    icon: Sparkles,
    category: "business",
    selectable: false,
    defaultData: () => ({
      title: SECTION_COPY.features.defaultTitle,
      amenities: DEFAULT_FEATURES,
      features: DEFAULT_FEATURES,
    }),
    Renderer: FeaturesSection,
  },
  contact: {
    type: "contact",
    label: SECTION_COPY.contact.label,
    description: SECTION_COPY.contact.description,
    icon: Mail,
    category: "conversion",
    defaultData: () => ({
      title: SECTION_COPY.contact.defaultTitle,
      address: "Straatnaam 1, 1234 AB Plaats",
      phone: "+31 6 00000000",
      email: DEFAULT_BUSINESS_EMAIL,
    }),
    Renderer: ContactSection,
  },
  footer: {
    type: "footer",
    label: SECTION_COPY.footer.label,
    description: SECTION_COPY.footer.description,
    icon: Layout,
    category: "structure",
    defaultData: () => ({
      brandName: DEFAULT_BUSINESS_NAME,
      copyright: `© ${currentYear} ${DEFAULT_BUSINESS_NAME}. Alle rechten voorbehouden.`,
    }),
    Renderer: FooterSection,
  },
} satisfies Record<SectionType, SectionDefinition>

export const selectableSectionDefinitions = (Object.values(sectionDefinitions) as SectionDefinition[]).filter(
  (definition) => definition.selectable !== false,
)

export function getSectionDefinition(type: SectionType): SectionDefinition | undefined {
  return sectionDefinitions[type]
}

export function getDefaultSectionData(
  type: SectionType,
  context: SectionDefaultContext = {},
): Record<string, unknown> {
  return getSectionDefinition(type)?.defaultData(context) ?? {}
}
