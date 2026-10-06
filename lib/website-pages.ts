/** Shared draft-page contract. Page identity is independent of its URL. */
export interface WebsitePage {
  id: string
  websiteId: string
  title: string
  slug: string
  position: number
  isHome: boolean
  showInNavigation: boolean
  includeInPublication: boolean
  seo: Record<string, unknown>
}

export type PageSettings = Pick<WebsitePage, "title" | "slug" | "showInNavigation" | "includeInPublication"> & { seo?: Record<string, unknown> }

export const RESERVED_PAGE_SLUGS = new Set([
  "en", "de", "fr", "nl", "api", "_next", "site", "preview", "robots.txt", "sitemap.xml",
])

interface WebsitePageRow {
  id: string
  website_id: string
  title: string
  slug: string
  position: number
  is_home: boolean
  show_in_navigation: boolean
  include_in_publication: boolean
  seo: Record<string, unknown> | null
}

export function mapWebsitePage(row: WebsitePageRow): WebsitePage {
  return {
    id: row.id, websiteId: row.website_id, title: row.title, slug: row.slug,
    position: row.position, isHome: row.is_home,
    showInNavigation: row.show_in_navigation, includeInPublication: row.include_in_publication,
    seo: row.seo ?? {},
  }
}

export function activePageStorageKey(websiteId: string) {
  return `flexpagina:active-page:${websiteId}`
}
