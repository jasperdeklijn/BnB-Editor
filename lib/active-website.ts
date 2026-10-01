const ACTIVE_WEBSITE_STORAGE_KEY = "flexpagina:active-website-id"

export function getActiveWebsiteId() {
  if (typeof window === "undefined") return null

  try {
    return window.localStorage.getItem(ACTIVE_WEBSITE_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setActiveWebsiteId(websiteId: string) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(ACTIVE_WEBSITE_STORAGE_KEY, websiteId)
  } catch {
    // The selection still works for this page when storage is unavailable.
  }
}

export function clearActiveWebsiteId() {
  if (typeof window === "undefined") return

  try {
    window.localStorage.removeItem(ACTIVE_WEBSITE_STORAGE_KEY)
  } catch {
    // The deleted selection is also cleared from in-memory editor state.
  }
}

export function getActiveWebsiteLocale(websiteId: string) {
  if (typeof window === "undefined") return null
  try { return window.localStorage.getItem(`flexpagina:website-locale:${websiteId}`) } catch { return null }
}

export function setActiveWebsiteLocale(websiteId: string, locale: string) {
  if (typeof window === "undefined") return
  try { window.localStorage.setItem(`flexpagina:website-locale:${websiteId}`, locale) } catch { /* Selection still works in memory. */ }
}
