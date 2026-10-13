"use client"
import { useEffect } from "react"
import { referrerCategory } from "@/lib/analytics/shared"

export function PublicVisitTracker({ websiteId, token }: { websiteId: string; token: string }) {
  useEffect(() => {
    if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return
    const sessionKey = "flexpagina:analytics-session:" + websiteId
    const day = new Date().toISOString().slice(0, 10)
    let session: { id: string; day: string; expires: number }
    try {
      session = JSON.parse(sessionStorage.getItem(sessionKey) ?? "null")
      if (!session || session.day !== day || session.expires < Date.now()) session = { id: crypto.randomUUID(), day, expires: Date.now() + 30 * 60 * 1000 }
      sessionStorage.setItem(sessionKey, JSON.stringify(session))
    } catch { return } // No identifier storage means no tracking.
    const cookieName = "fp_analytics_" + websiteId
    document.cookie = cookieName + "=" + token + "; Max-Age=1800; Path=/; SameSite=Strict" + (location.protocol === "https:" ? "; Secure" : "")
    const eventId = crypto.randomUUID()
    let sent = false
    const flush = () => {
      if (sent) return
      sent = true
      void fetch("/api/analytics/visit", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sessionId: session.id, events: [{ id: eventId, source: referrerCategory(document.referrer, location.hostname) }] }), keepalive: true }).catch(() => {})
    }
    const timer = window.setTimeout(flush, 4000)
    const visibility = () => { if (document.visibilityState === "hidden") flush() }
    document.addEventListener("visibilitychange", visibility)
    window.addEventListener("pagehide", flush)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", visibility)
      window.removeEventListener("pagehide", flush)
      document.cookie = cookieName + "=; Max-Age=0; Path=/; SameSite=Strict"
    }
  }, [websiteId, token])
  return null
}
