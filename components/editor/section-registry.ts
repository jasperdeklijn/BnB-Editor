import type { ComponentType } from "react"
import type { SectionDataResolver } from "@/lib/supabase/section-resolver"
import { servicesResolver } from "@/lib/supabase/section-resolver"
import {
  Briefcase,
  Home,
  ImageIcon,
  Info,
  Layout,
  Mail,
  Menu,
  Sparkles,
  Star,
  HelpCircle,
  Clock,
  DollarSign,
  MapPin,
  Megaphone,
  ClipboardList,
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
import { TestimonialsSection } from "@/components/sections/testimonials-section"
import { FaqSection } from "@/components/sections/faq-section"
import { OpeningHoursSection } from "@/components/sections/opening-hours-section"
import { PricingSection } from "@/components/sections/pricing-section"
import { MapSection } from "@/components/sections/map-section"
import { CtaSection } from "@/components/sections/cta-section"
import { RequestFormSection } from "@/components/sections/request-form-section"
import { getDefaultLayoutForSection } from "@/lib/section-layouts"

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
  /** Optional server-side data resolver. When present, page-loader calls this
   *  before rendering to enrich section.data with live database content. */
  resolveData?: SectionDataResolver
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
      layout: getDefaultLayoutForSection("nav"),
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
      layout: getDefaultLayoutForSection("hero"),
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
      layout: getDefaultLayoutForSection("about"),
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
      layout: getDefaultLayoutForSection("services"),
      businessId: businessId ?? null,
      serviceIds: [],
      moreInfoButtonLabel: "Meer info",
      infoPopupEyebrow: "Aanbod",
      infoPopupTitle: "",
      infoPopupIntro: "",
      infoPopupCtaLabel: "Aanvragen",
      infoPopupCtaHref: "",
      infoPopupHelperText: "Neem contact op voor beschikbaarheid, planning en mogelijkheden.",
      infoPopupShowImage: true,
      infoPopupShowPrice: true,
      bookingSpaceEnabled: false,
      bookingSpaceMode: "inline",
      bookingSpaceHeading: "",
      bookingSpaceIntro: "",
      bookingSpaceButtonLabel: "",
      bookingSpaceSuccessText: "",
      bookingSpaceHelperText: "",
      bookingSpaceTargetHref: "",
      bookingSpaceRequestType: "appointment",
      bookingSpaceServiceIds: [],
      }),
    resolveData: servicesResolver,
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
      layout: getDefaultLayoutForSection("gallery"),
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
      features: DEFAULT_FEATURES,
      layout: getDefaultLayoutForSection("features"),
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
      layout: getDefaultLayoutForSection("contact"),
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
      layout: getDefaultLayoutForSection("footer"),
    }),
    Renderer: FooterSection,
  },
  testimonials: {
    type: "testimonials",
    label: SECTION_COPY.testimonials.label,
    description: SECTION_COPY.testimonials.description,
    icon: Star,
    category: "content",
    defaultData: () => ({
      title: SECTION_COPY.testimonials.defaultTitle,
      subtitle: "Lees wat onze klanten over ons zeggen.",
      items: [],
      layout: getDefaultLayoutForSection("testimonials"),
    }),
    Renderer: TestimonialsSection,
  },
  faq: {
    type: "faq",
    label: SECTION_COPY.faq.label,
    description: SECTION_COPY.faq.description,
    icon: HelpCircle,
    category: "content",
    defaultData: () => ({
      title: SECTION_COPY.faq.defaultTitle,
      subtitle: "Alles wat je wil weten.",
      items: [],
      layout: getDefaultLayoutForSection("faq"),
    }),
    Renderer: FaqSection,
  },
  opening_hours: {
    type: "opening_hours",
    label: SECTION_COPY.opening_hours.label,
    description: SECTION_COPY.opening_hours.description,
    icon: Clock,
    category: "business",
    defaultData: () => ({
      title: SECTION_COPY.opening_hours.defaultTitle,
      layout: getDefaultLayoutForSection("opening_hours"),
    }),
    Renderer: OpeningHoursSection,
  },
  pricing: {
    type: "pricing",
    label: SECTION_COPY.pricing.label,
    description: SECTION_COPY.pricing.description,
    icon: DollarSign,
    category: "business",
    defaultData: () => ({
      title: SECTION_COPY.pricing.defaultTitle,
      subtitle: "Transparante tarieven zonder verrassingen.",
      plans: [],
      layout: getDefaultLayoutForSection("pricing"),
    }),
    Renderer: PricingSection,
  },
  map: {
    type: "map",
    label: SECTION_COPY.map.label,
    description: SECTION_COPY.map.description,
    icon: MapPin,
    category: "business",
    defaultData: () => ({
      title: SECTION_COPY.map.defaultTitle,
      address: "",
      showMap: true,
      layout: getDefaultLayoutForSection("map"),
    }),
    Renderer: MapSection,
  },
  cta: {
    type: "cta",
    label: SECTION_COPY.cta.label,
    description: SECTION_COPY.cta.description,
    icon: Megaphone,
    category: "conversion",
    defaultData: () => ({
      title: SECTION_COPY.cta.defaultTitle,
      subtitle: "Neem vandaag nog contact op.",
      primaryCtaText: "Neem contact op",
      primaryCtaHref: "#contact",
      layout: getDefaultLayoutForSection("cta"),
    }),
    Renderer: CtaSection,
  },
  request_form: {
    type: "request_form",
    label: SECTION_COPY.request_form.label,
    description: SECTION_COPY.request_form.description,
    icon: ClipboardList,
    category: "conversion",
    defaultData: () => ({
      title: SECTION_COPY.request_form.defaultTitle,
      subtitle: "Vul het formulier in, wij nemen contact op.",
      requestType: "contact",
      fields: ["name", "email", "phone", "message"],
      layout: getDefaultLayoutForSection("request_form"),
    }),
    Renderer: RequestFormSection,
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
