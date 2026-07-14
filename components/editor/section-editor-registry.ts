import type { SectionType } from "@/lib/types"
import type { SectionEditorComponent } from "@/components/editor/section-editor-types"
import { AboutSectionEditor } from "@/components/sections/about-section.editor"
import { ContactSectionEditor } from "@/components/sections/contact-section.editor"
import { CtaSectionEditor } from "@/components/sections/cta-section.editor"
import { FaqSectionEditor } from "@/components/sections/faq-section.editor"
import { FeaturesSectionEditor } from "@/components/sections/features-section.editor"
import { FooterSectionEditor } from "@/components/sections/footer-section.editor"
import { GallerySectionEditor } from "@/components/sections/gallery-section.editor"
import { HeroSectionEditor } from "@/components/sections/hero-section.editor"
import { MapSectionEditor } from "@/components/sections/map-section.editor"
import { NavSectionEditor } from "@/components/sections/nav-section.editor"
import { OpeningHoursSectionEditor } from "@/components/sections/opening-hours-section.editor"
import { PricingSectionEditor } from "@/components/sections/pricing-section.editor"
import { RequestFormSectionEditor } from "@/components/sections/request-form-section.editor"
import { ServicesSectionEditor } from "@/components/sections/services-section.editor"
import { TestimonialsSectionEditor } from "@/components/sections/testimonials-section.editor"
import { TeamSectionEditor } from "@/components/sections/team-section.editor"

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
