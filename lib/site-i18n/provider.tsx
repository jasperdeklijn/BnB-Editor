"use client"

import { createContext, useContext } from "react"

import { DEFAULT_WEBSITE_LOCALE, type SupportedWebsiteLocale } from "@/lib/i18n/locales"
import { getSiteMessages, type SiteMessages } from "@/lib/site-i18n/messages"

const WebsiteLocaleContext = createContext({
  locale: DEFAULT_WEBSITE_LOCALE,
  messages: getSiteMessages(DEFAULT_WEBSITE_LOCALE),
})

export function WebsiteLocaleProvider({ locale, children }: { locale: SupportedWebsiteLocale; children: React.ReactNode }) {
  return (
    <WebsiteLocaleContext.Provider value={{ locale, messages: getSiteMessages(locale) }}>
      {children}
    </WebsiteLocaleContext.Provider>
  )
}

export function useWebsiteLocale(): { locale: SupportedWebsiteLocale; messages: SiteMessages } {
  return useContext(WebsiteLocaleContext)
}
