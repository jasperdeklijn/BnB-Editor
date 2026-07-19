import type { SectionType } from "@/lib/types"
import dynamic from "next/dynamic"
import type { SectionEditorComponent, SectionEditorProps } from "@/components/editor/section-editor-types"
import { SectionEditorSkeleton } from "@/components/editor/editor-loading-skeleton"

const AboutSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/about-section.editor").then((module) => module.AboutSectionEditor), { loading: SectionEditorSkeleton })
const ContactSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/contact-section.editor").then((module) => module.ContactSectionEditor), { loading: SectionEditorSkeleton })
const CtaSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/cta-section.editor").then((module) => module.CtaSectionEditor), { loading: SectionEditorSkeleton })
const FaqSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/faq-section.editor").then((module) => module.FaqSectionEditor), { loading: SectionEditorSkeleton })
const FeaturesSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/features-section.editor").then((module) => module.FeaturesSectionEditor), { loading: SectionEditorSkeleton })
const FooterSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/footer-section.editor").then((module) => module.FooterSectionEditor), { loading: SectionEditorSkeleton })
const GallerySectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/gallery-section.editor").then((module) => module.GallerySectionEditor), { loading: SectionEditorSkeleton })
const HeroSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/hero-section.editor").then((module) => module.HeroSectionEditor), { loading: SectionEditorSkeleton })
const MapSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/map-section.editor").then((module) => module.MapSectionEditor), { loading: SectionEditorSkeleton })
const NavSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/nav-section.editor").then((module) => module.NavSectionEditor), { loading: SectionEditorSkeleton })
const OpeningHoursSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/opening-hours-section.editor").then((module) => module.OpeningHoursSectionEditor), { loading: SectionEditorSkeleton })
const PricingSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/pricing-section.editor").then((module) => module.PricingSectionEditor), { loading: SectionEditorSkeleton })
const RequestFormSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/request-form-section.editor").then((module) => module.RequestFormSectionEditor), { loading: SectionEditorSkeleton })
const ServicesSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/services-section.editor").then((module) => module.ServicesSectionEditor), { loading: SectionEditorSkeleton })
const TestimonialsSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/testimonials-section.editor").then((module) => module.TestimonialsSectionEditor), { loading: SectionEditorSkeleton })
const TeamSectionEditor = dynamic<SectionEditorProps>(() => import("@/components/sections/team-section.editor").then((module) => module.TeamSectionEditor), { loading: SectionEditorSkeleton })

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
