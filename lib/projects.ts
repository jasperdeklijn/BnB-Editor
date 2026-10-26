export interface ProjectItem {
  id: string
  title: string
  description: string
  image: string
  imageAlt: string
  category: string
  location: string
  year: string
  ctaEnabled: boolean
  ctaText: string
  ctaHref: string
}

export function createProject(id: string): ProjectItem {
  return { id, title: "Nieuw project", description: "", image: "", imageAlt: "", category: "", location: "", year: "", ctaEnabled: false, ctaText: "", ctaHref: "" }
}

export function readProjects(value: unknown): ProjectItem[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))).map((item, index) => {
    const text = (key: string) => typeof item[key] === "string" ? item[key] : ""
    return { id: text("id") || `project-${index}`, title: text("title"), description: text("description"), image: text("image"), imageAlt: text("imageAlt"), category: text("category"), location: text("location"), year: text("year"), ctaEnabled: item.ctaEnabled === true, ctaText: text("ctaText"), ctaHref: text("ctaHref") }
  })
}
