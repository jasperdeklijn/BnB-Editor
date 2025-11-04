export type SectionType = "hero" | "gallery" | "rooms" | "contact" | "amenities" | "about"

export interface SectionStyles {
  fontFamily?: string
  textColor?: string
  backgroundColor?: string
  backgroundImage?: string
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
  published: boolean
  created_at: string
  updated_at: string
}
