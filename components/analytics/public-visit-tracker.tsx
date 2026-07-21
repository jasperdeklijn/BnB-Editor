"use client"

import { useEffect } from "react"

export function PublicVisitTracker({ websiteId }: { websiteId: string }) {
  useEffect(() => {
    const storageKey = `flexpagina:visit:${websiteId}`

    try {
      if (window.sessionStorage.getItem(storageKey)) return
      window.sessionStorage.setItem(storageKey, "pending")
    } catch {
      // Tracking still works when session storage is unavailable.
    }

    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId }),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) throw new Error("Visit was not recorded")
      try {
        window.sessionStorage.setItem(storageKey, "recorded")
      } catch {
        // The visit is already recorded; storage is only used for deduplication.
      }
    }).catch(() => {
      try {
        window.sessionStorage.removeItem(storageKey)
      } catch {
        // A later page load may record the visit when storage becomes available.
      }
    })
  }, [websiteId])

  return null
}
