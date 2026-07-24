"use client"

import { useEffect, useState } from "react"
import { Cookie, Settings2 } from "lucide-react"

import { PublicVisitTracker } from "@/components/analytics/public-visit-tracker"
import { useWebsiteLocale } from "@/lib/site-i18n/provider"

type ConsentChoice = "analytics" | "necessary"
type ConsentState = "loading" | "pending" | ConsentChoice

export function SiteCookieConsent({
  websiteId,
  policyUrl,
  enableTracking,
}: {
  websiteId: string
  policyUrl: string
  enableTracking: boolean
}) {
  const { messages } = useWebsiteLocale()
  const [consent, setConsent] = useState<ConsentState>("loading")
  const storageKey = `flexpagina:cookie-consent:${websiteId}:v1`

  useEffect(() => {
    try {
      const storedChoice = window.localStorage.getItem(storageKey)
      setConsent(storedChoice === "analytics" || storedChoice === "necessary" ? storedChoice : "pending")
    } catch {
      setConsent("pending")
    }
  }, [storageKey])

  const saveChoice = (choice: ConsentChoice) => {
    try {
      window.localStorage.setItem(storageKey, choice)
    } catch {
      // The choice still applies for this page view when storage is unavailable.
    }
    setConsent(choice)
  }

  if (consent === "loading") return null

  return (
    <>
      {enableTracking && consent === "analytics" ? <PublicVisitTracker websiteId={websiteId} /> : null}

      {consent === "pending" ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[1100] p-3 sm:p-5"
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-description"
        >
          <div className="website-theme-scope mx-auto max-w-4xl rounded-2xl border border-border bg-background p-4 text-foreground shadow-2xl sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-12 sm:w-12">
                <Cookie className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="cookie-consent-title" className="text-base font-bold sm:text-lg">
                  {messages.cookieTitle}
                </h2>
                <p id="cookie-consent-description" className="mt-1 text-sm leading-6 text-muted-foreground">
                  {messages.cookieDescription}{" "}
                  <a className="font-semibold text-primary underline underline-offset-2" href={policyUrl}>
                    {messages.cookiePolicy}
                  </a>
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:ml-16 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={() => saveChoice("necessary")}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {messages.cookieNecessary}
              </button>
              <button
                type="button"
                onClick={() => saveChoice("analytics")}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {messages.cookieAccept}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConsent("pending")}
          className="website-theme-scope fixed bottom-3 left-3 z-[1050] inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-lg transition-colors hover:bg-muted sm:bottom-4 sm:left-4"
          aria-label={messages.cookieSettings}
        >
          <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">{messages.cookieSettings}</span>
        </button>
      )}
    </>
  )
}
