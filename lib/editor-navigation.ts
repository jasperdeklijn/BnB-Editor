export const EDITOR_NAVIGATION = [
  { id: "website", label: "Website", href: "/editor", tabs: [], routes: ["/editor", "/editor/images", "/editor/import", "/editor/flexstart", "/editor/flexcheck", "/editor/seo"] },
  { id: "customers", label: "Klantzaken", href: "/editor/requests", tabs: [
    { href: "/editor/requests", label: "Aanvragen" },
    { href: "/editor/quotes", label: "Offertes" },
    { href: "/editor/reviews", label: "Recensies" },
  ], routes: [] },
  { id: "planning", label: "Planning", href: "/editor/calendar", tabs: [
    { href: "/editor/calendar", label: "Kalender" },
    { href: "/editor/reservations", label: "Reserveringen" },
  ], routes: [] },
  { id: "settings", label: "Instellingen", href: "/editor/business", tabs: [
    { href: "/editor/business", label: "Bedrijf" },
    { href: "/editor/services", label: "Diensten" },
    { href: "/editor/domains", label: "Domein" },
  ], routes: [] },
] as const

export function matchesEditorRoute(pathname: string | null, href: string) {
  return pathname === href || (href !== "/editor" && Boolean(pathname?.startsWith(`${href}/`)))
}

export function getEditorGroup(pathname: string | null) {
  return EDITOR_NAVIGATION.find((group) =>
    group.routes.some((href) => matchesEditorRoute(pathname, href)) ||
    group.tabs.some((tab) => matchesEditorRoute(pathname, tab.href)),
  )
}

export function withEditorWebsite(href: string, websiteId: string | null) {
  if (!websiteId || !["/editor", "/editor/flexcheck", "/editor/domains", "/editor/reviews", "/editor/seo"].includes(href)) return href
  return `${href}?${new URLSearchParams({ websiteId })}`
}
