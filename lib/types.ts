export type SectionType =
  | "projects"
  | "freeform"
  | "hero"
  | "gallery"
  | "services"
  | "contact"
  | "features"
  | "about"
  | "nav"
  | "footer"
  | "testimonials"
  | "faq"
  | "opening_hours"
  | "pricing"
  | "team"
  | "map"
  | "cta"
  | "request_form"

export type TransitionType =
  | "none"
  | "fade"
  | "gradient"
  | "slide"
  | "wave"
  | "curve"
  | "diagonal"
  | "zigzag"
  | "split"
  | "paint"

export interface SectionStyles {
  fontFamily?: string
  textColor?: string
  backgroundColor?: string
  backgroundImage?: string
  backgroundPosition?: string
  backgroundImageAlt?: string
  logo?: string
  logoAlt?: string
  accentColor?: string
  surfaceColor?: string
}

export interface Transition {
  id: string
  fromSectionId: string
  toSectionId: string
  type: TransitionType
}

export interface Section {
  scope?: "page" | "site_header" | "site_footer"
  id: string
  type: SectionType
  data: Record<string, unknown>
  styles?: SectionStyles
}

export interface Website {
  id: string
  user_id: string
  title: string
  slug: string
  custom_domain?: string | null
  sections: Section[]
  transitions: Transition[]
  published: boolean
  created_at: string
  updated_at: string
}
