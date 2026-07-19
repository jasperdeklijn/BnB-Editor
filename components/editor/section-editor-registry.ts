import type { SectionType } from "@/lib/types"
import dynamic from "next/dynamic"
import type { SectionEditorComponent, SectionEditorProps } from "@/components/editor/section-editor-types"

const AboutSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/about-section.editor").then((module) => module.AboutSectionEditor))
const ContactSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/contact-section.editor").then((module) => module.ContactSectionEditor))
const CtaSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/cta-section.editor").then((module) => module.CtaSectionEditor))
const FaqSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/faq-section.editor").then((module) => module.FaqSectionEditor))
const FeaturesSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/features-section.editor").then((module) => module.FeaturesSectionEditor))
const FooterSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/footer-section.editor").then((module) => module.FooterSectionEditor))
const GallerySectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/gallery-section.editor").then((module) => module.GallerySectionEditor))
const HeroSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/hero-section.editor").then((module) => module.HeroSectionEditor))
const MapSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/map-section.editor").then((module) => module.MapSectionEditor))
const NavSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/nav-section.editor").then((module) => module.NavSectionEditor))
const OpeningHoursSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/opening-hours-section.editor").then((module) => module.OpeningHoursSectionEditor))
const PricingSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/pricing-section.editor").then((module) => module.PricingSectionEditor))
const RequestFormSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/request-form-section.editor").then((module) => module.RequestFormSectionEditor))
const ServicesSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/services-section.editor").then((module) => module.ServicesSectionEditor))
const TestimonialsSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/testimonials-section.editor").then((module) => module.TestimonialsSectionEditor))
const TeamSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/team-section.editor").then((module) => module.TeamSectionEditor))

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
