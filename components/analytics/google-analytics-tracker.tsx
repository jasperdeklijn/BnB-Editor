"use client"
import { useEffect } from "react"
interface AnalyticsWindow extends Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
/** A measurement ID enables collection only. It never grants report read access. */
export function GoogleAnalyticsTracker({ measurementId, consentMode }: { measurementId: string; consentMode: boolean }) {
  useEffect(() => {
    if (!/^G-[A-Z0-9]{4,20}$/.test(measurementId) || navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return
    const analyticsWindow = window as AnalyticsWindow
    const disableKey = "ga-disable-" + measurementId
    Reflect.set(window, disableKey, false)
    analyticsWindow.dataLayer ??= []
    // Google gtag expects an Arguments object in dataLayer.
    // eslint-disable-next-line prefer-rest-params
    analyticsWindow.gtag ??= function () { analyticsWindow.dataLayer!.push(arguments) }
    const gtag = analyticsWindow.gtag
    if (consentMode) gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" })
    gtag("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" })
    const id = "fp-ga4-" + measurementId
    if (!document.getElementById(id)) {
      const script = document.createElement("script")
      script.id = id; script.async = true; script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId
      document.head.appendChild(script)
      gtag("js", new Date())
    }
    gtag("config", measurementId, { send_page_view: false, page_location: location.origin + location.pathname, page_referrer: "", allow_google_signals: false, allow_ad_personalization_signals: false })
    gtag("event", "page_view", { page_location: location.origin + location.pathname, page_referrer: "", send_to: measurementId })
    return () => {
      Reflect.set(window, disableKey, true)
      gtag("consent", "update", { analytics_storage: "denied" })
      // Revoke site cookies, including domain cookies created by gtag.
      const domains = location.hostname.split(".")
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.trim().split("=")[0]
        if (!/^_ga(?:_|$)/.test(name)) continue
        document.cookie = name + "=; Max-Age=0; Path=/"
        for (let i=0; i<domains.length-1; i++) document.cookie = name + "=; Max-Age=0; Path=/; Domain=." + domains.slice(i).join(".")
      }
    }
  }, [measurementId, consentMode])
  return null
}
