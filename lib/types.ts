export type SectionType =
  | "hero"
  | "gallery"
  | "rooms"
  | "contact"
  | "amenities"
  | "about"

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

export interface SectionTransition {
  type: TransitionType
}

export interface Section {
  id: string
  type: SectionType
  data: Record<string, unknown>
  styles?: SectionStyles

  /**
   * Derived at runtime (never stored)
   */
  transitionFromPrev?: SectionTransition

  /**
   * Stored / editor-controlled
   */
  transitionToNext?: SectionTransition
}

export interface Website {
  id: string
  user_id: string
  title: string
  slug: string
  sections: Section[]
  published: boolean
  created_at: string
  updated_at: string
}
