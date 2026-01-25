export type SectionType =
  | "hero"
  | "gallery"
  | "rooms"
  | "contact"
  | "amenities"
  | "about"
  | "nav"
  | "footer"

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
  sections: Section[]
  transitions: Transition[]
  published: boolean
  created_at: string
  updated_at: string
}
