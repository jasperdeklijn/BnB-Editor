import type { ComponentType } from "react"
import dynamic from "next/dynamic"
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
  Users,
  type LucideIcon,
} from "lucide-react"
import type { Section, SectionStyles, SectionType } from "@/lib/types"
import type { BusinessCategory } from "@/lib/business/categories"
import {
  DEFAULT_BUSINESS_EMAIL,
  DEFAULT_BUSINESS_NAME,
  DEFAULT_FEATURES,
  DEFAULT_GALLERY_IMAGES,
  SECTION_COPY,
} from "@/lib/business-naming"
import { getDefaultLayoutForSection } from "@/lib/section-layouts"
import { SectionCanvasSkeleton } from "@/components/editor/editor-loading-skeleton"
import { SECTION_TRANSLATABLE_FIELDS, type TranslatableFieldDefinition } from "@/lib/i18n/section-translations"

const AboutSection = dynamic<SectionRenderProps>(() => import("@/components/sections/about-section").then((module) => module.AboutSection), { loading: () => SectionCanvasSkeleton({}) })
const ContactSection = dynamic<SectionRenderProps>(() => import("@/components/sections/contact-section").then((module) => module.ContactSection), { loading: () => SectionCanvasSkeleton({}) })
const FeaturesSection = dynamic<SectionRenderProps>(() => import("@/components/sections/features-section").then((module) => module.FeaturesSection), { loading: () => SectionCanvasSkeleton({}) })
const FooterSection = dynamic<SectionRenderProps>(() => import("@/components/sections/footer-section").then((module) => module.FooterSection), { loading: () => SectionCanvasSkeleton({}) })
const GallerySection = dynamic<SectionRenderProps>(() => import("@/components/sections/gallery-section").then((module) => module.GallerySection), { loading: () => SectionCanvasSkeleton({}) })
const HeroSection = dynamic<SectionRenderProps>(() => import("@/components/sections/hero-section").then((module) => module.HeroSection), { loading: () => SectionCanvasSkeleton({}) })
const NavSection = dynamic<SectionRenderProps>(() => import("@/components/sections/nav-section").then((module) => module.NavSection), { loading: () => SectionCanvasSkeleton({}) })
const ServicesSection = dynamic<SectionRenderProps>(() => import("@/components/sections/services-section").then((module) => module.ServicesSection), { loading: () => SectionCanvasSkeleton({}) })
const TestimonialsSection = dynamic<SectionRenderProps>(() => import("@/components/sections/testimonials-section").then((module) => module.TestimonialsSection), { loading: () => SectionCanvasSkeleton({}) })
const FaqSection = dynamic<SectionRenderProps>(() => import("@/components/sections/faq-section").then((module) => module.FaqSection), { loading: () => SectionCanvasSkeleton({}) })
const OpeningHoursSection = dynamic<SectionRenderProps>(() => import("@/components/sections/opening-hours-section").then((module) => module.OpeningHoursSection), { loading: () => SectionCanvasSkeleton({}) })
const PricingSection = dynamic<SectionRenderProps>(() => import("@/components/sections/pricing-section").then((module) => module.PricingSection), { loading: () => SectionCanvasSkeleton({}) })
const MapSection = dynamic<SectionRenderProps>(() => import("@/components/sections/map-section").then((module) => module.MapSection), { loading: () => SectionCanvasSkeleton({}) })
const CtaSection = dynamic<SectionRenderProps>(() => import("@/components/sections/cta-section").then((module) => module.CtaSection), { loading: () => SectionCanvasSkeleton({}) })
const RequestFormSection = dynamic<SectionRenderProps>(() => import("@/components/sections/request-form-section").then((module) => module.RequestFormSection), { loading: () => SectionCanvasSkeleton({}) })
const TeamSection = dynamic<SectionRenderProps>(() => import("@/components/sections/team-section").then((module) => module.TeamSection), { loading: () => SectionCanvasSkeleton({}) })

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
  websiteId?: string | null
  businessId?: string | null
  businessCategory?: BusinessCategory | null
  activeLocale?: string
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
  translatableFields?: TranslatableFieldDefinition[]
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
      styleType: "clean",
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
      ctaEnabled: true,
      ctaHref: "#contact",
      layout: getDefaultLayoutForSection("hero"),
      styleType: "clean",
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
      images: [],
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
      infoPopupButtonEnabled: true,
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
      subtitle: "Neem gerust contact met ons op. We helpen je graag verder.",
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
      companyName: DEFAULT_BUSINESS_NAME,
      companyDescription: "Persoonlijke service en heldere afspraken.",
      copyright: `© ${currentYear} ${DEFAULT_BUSINESS_NAME}. Alle rechten voorbehouden.`,
      showCompanyInfo: false,
      address: "",
      phone: "",
      email: "",
      registrationNumber: "",
      vatNumber: "",
      showLinks: true,
      columns: [
        {
          id: "footer-column-1",
          title: "Snel naar",
          links: [
            { id: "footer-link-1", label: "Over ons", href: "#about" },
            { id: "footer-link-2", label: "Diensten", href: "#services" },
            { id: "footer-link-3", label: "Contact", href: "#contact" },
          ],
        },
      ],
      showSocialLinks: false,
      socialLinks: [],
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
      items: [
        { id: "testimonial-1", name: "Anna de Vries", role: "Vaste klant", quote: "Uitstekende service! Ik ben heel tevreden met het resultaat en de persoonlijke aanpak.", rating: 5 },
        { id: "testimonial-2", name: "Mark Janssen", role: "Ondernemer", quote: "Professioneel, betrouwbaar en snel. Ik zou het iedereen aanraden.", rating: 5 },
        { id: "testimonial-3", name: "Sophie Bakker", role: "Particuliere klant", quote: "Fijn contact en top vakwerk. We zijn meer dan tevreden met het eindresultaat.", rating: 5 },
      ],
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
      items: [
        { id: "faq-1", question: "Hoe snel kan ik terecht?", answer: "In de meeste gevallen kunnen we binnen 1-3 werkdagen bij u terecht. Neem contact op voor een exacte planning." },
        { id: "faq-2", question: "Wat zijn de kosten?", answer: "De kosten zijn afhankelijk van het type dienst en de omvang van het werk. We brengen graag een vrijblijvende offerte uit." },
        { id: "faq-3", question: "Werken jullie met garantie?", answer: "Ja, op al ons werk geven wij garantie. De exacte voorwaarden bespreken we bij de opdrachtbevestiging." },
        { id: "faq-4", question: "Hoe kan ik een afspraak maken?", answer: "U kunt ons bellen, mailen of het contactformulier op deze pagina gebruiken. We reageren zo snel mogelijk." },
      ],
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
      displayMode: "packages",
      plans: [
        { id: "plan-1", name: "Basis", price: "€ 49", period: "per keer", description: "Ideaal om kennis te maken.", features: [{ id: "plan-1-feature-1", text: "Persoonlijk advies" }, { id: "plan-1-feature-2", text: "Heldere afspraken" }], showButton: true, ctaText: "Kies basis" },
        { id: "plan-2", name: "Compleet", price: "€ 99", period: "per maand", description: "Voor klanten die meer ondersteuning willen.", features: [{ id: "plan-2-feature-1", text: "Alles uit Basis" }, { id: "plan-2-feature-2", text: "Snellere service" }], highlighted: true, showButton: true, ctaText: "Kies compleet" },
      ],
      tariffs: [
        { id: "tariff-1", name: "Kennismakingsgesprek", description: "Vrijblijvend gesprek van 30 minuten", price: "Gratis" },
        { id: "tariff-2", name: "Uurtarief", description: "Voor losse werkzaamheden", price: "€ 75" },
      ],
      layout: getDefaultLayoutForSection("pricing"),
    }),
    Renderer: PricingSection,
  },
  team: {
    type: "team",
    label: SECTION_COPY.team.label,
    description: SECTION_COPY.team.description,
    icon: Users,
    category: "content",
    defaultData: () => ({
      title: SECTION_COPY.team.defaultTitle,
      subtitle: "De mensen achter ons bedrijf.",
      members: [
        { id: "member-1", name: "Sanne de Vries", title: "Oprichter", bio: "Vertel kort wat dit teamlid doet en waar diegene goed in is.", image: "" },
        { id: "member-2", name: "Noah Jansen", title: "Specialist", bio: "Een korte, persoonlijke introductie maakt je team herkenbaar.", image: "" },
      ],
      layout: getDefaultLayoutForSection("team"),
    }),
    Renderer: TeamSection,
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
      primaryCtaEnabled: true,
      secondaryCtaEnabled: false,
      secondaryCtaText: "",
      secondaryCtaHref: "",
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

for (const definition of Object.values(sectionDefinitions) as SectionDefinition[]) {
  definition.translatableFields = SECTION_TRANSLATABLE_FIELDS[definition.type]
}

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
