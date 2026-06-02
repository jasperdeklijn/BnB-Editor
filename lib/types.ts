export type SectionType =
  | "hero"
  | "gallery"
  | "services"
  | "rooms"
  | "contact"
  | "features"
  | "amenities"
  | "about"
  | "nav"
  | "footer"
  | "testimonials"
  | "faq"
  | "opening_hours"
  | "pricing"
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

export interface SectionStyles {
  fontFamily?: string
  textColor?: string
  backgroundColor?: string
  backgroundImage?: string
}

export interface Transition {
  id: string
  fromSectionId: string
  toSectionId: string
  type: TransitionType
}

export interface Section {
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
