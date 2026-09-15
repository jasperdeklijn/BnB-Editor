"use client"
import { usePathname } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
export function AppAnalytics() {
  const pathname = usePathname()
  // Private email links must not be observed by optional analytics integrations.
  if (pathname?.startsWith("/reviews/")) return null
  return <><Analytics /><SpeedInsights /></>
}
