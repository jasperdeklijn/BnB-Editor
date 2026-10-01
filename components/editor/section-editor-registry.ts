import type { SectionType } from "@/lib/types"
import dynamic from "next/dynamic"
import type { SectionEditorComponent, SectionEditorProps } from "@/components/editor/section-editor-types"
import { SectionLoadingIndicator } from "@/components/ui/page-loading-indicator"

const AboutSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/about-section.editor").then((module) => module.AboutSectionEditor), { loading: SectionLoadingIndicator })
const ContactSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/contact-section.editor").then((module) => module.ContactSectionEditor), { loading: SectionLoadingIndicator })
const CtaSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/cta-section.editor").then((module) => module.CtaSectionEditor), { loading: SectionLoadingIndicator })
const FaqSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/faq-section.editor").then((module) => module.FaqSectionEditor), { loading: SectionLoadingIndicator })
const FeaturesSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/features-section.editor").then((module) => module.FeaturesSectionEditor), { loading: SectionLoadingIndicator })
const FooterSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/footer-section.editor").then((module) => module.FooterSectionEditor), { loading: SectionLoadingIndicator })
const GallerySectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/gallery-section.editor").then((module) => module.GallerySectionEditor), { loading: SectionLoadingIndicator })
const HeroSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/hero-section.editor").then((module) => module.HeroSectionEditor), { loading: SectionLoadingIndicator })
const MapSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/map-section.editor").then((module) => module.MapSectionEditor), { loading: SectionLoadingIndicator })
const NavSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/nav-section.editor").then((module) => module.NavSectionEditor), { loading: SectionLoadingIndicator })
const OpeningHoursSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/opening-hours-section.editor").then((module) => module.OpeningHoursSectionEditor), { loading: SectionLoadingIndicator })
const PricingSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/pricing-section.editor").then((module) => module.PricingSectionEditor), { loading: SectionLoadingIndicator })
const RequestFormSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/request-form-section.editor").then((module) => module.RequestFormSectionEditor), { loading: SectionLoadingIndicator })
const ServicesSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/services-section.editor").then((module) => module.ServicesSectionEditor), { loading: SectionLoadingIndicator })
const TestimonialsSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/testimonials-section.editor").then((module) => module.TestimonialsSectionEditor), { loading: SectionLoadingIndicator })
const TeamSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/team-section.editor").then((module) => module.TeamSectionEditor), { loading: SectionLoadingIndicator })

const sectionEditors: Record<SectionType, SectionEditorComponent> = {
  hero: HeroSectionEditor,
  gallery: GallerySectionEditor,
  services: ServicesSectionEditor,
  contact: ContactSectionEditor,
  features: FeaturesSectionEditor,
  about: AboutSectionEditor,
  nav: NavSectionEditor,
  footer: FooterSectionEditor,
  testimonials: TestimonialsSectionEditor,
  faq: FaqSectionEditor,
  opening_hours: OpeningHoursSectionEditor,
  pricing: PricingSectionEditor,
  team: TeamSectionEditor,
  map: MapSectionEditor,
  cta: CtaSectionEditor,
  request_form: RequestFormSectionEditor,
}

export function getSectionEditor(type: SectionType): SectionEditorComponent {
  return sectionEditors[type]
}
