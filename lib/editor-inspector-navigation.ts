export type SiteDesignDetail = "theme" | "typography" | "templates" | "language"

export type InspectorRoute =
  | { mode: "section" }
  | { mode: "site-menu" }
  | { mode: "site-detail"; detail: SiteDesignDetail }

export type InspectorNavigationEvent =
  | { type: "OPEN_SECTION" }
  | { type: "OPEN_SITE_MENU" }
  | { type: "OPEN_SITE_DETAIL"; detail: SiteDesignDetail }

export function getInitialInspectorRoute(
  defaultTab: "section" | "site" = "section",
  singlePanel?: "section" | "site",
): InspectorRoute {
  return defaultTab === "site" || singlePanel === "site" ? { mode: "site-menu" } : { mode: "section" }
}

export function navigateInspector(
  _current: InspectorRoute,
  event: InspectorNavigationEvent,
): InspectorRoute {
  if (event.type === "OPEN_SECTION") return { mode: "section" }
  if (event.type === "OPEN_SITE_MENU") return { mode: "site-menu" }
  return { mode: "site-detail", detail: event.detail }
}
