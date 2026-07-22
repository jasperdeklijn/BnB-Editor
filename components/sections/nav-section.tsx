"use client"

import type React from "react"
import { useState } from "react"
import type { Section, SectionStyles } from "@/lib/types"
import { Globe2, Menu, X } from "lucide-react"
import { EditableText } from "@/components/editor/inline-editable-text"
import { normalizeSectionLayout } from "@/lib/section-layouts"
import { resolveNavigationLinks } from "@/lib/i18n/section-translations"
import { getSectionColorVars } from "@/lib/section-colors"
import { normalizeLanguageSwitcherConfig } from "@/lib/i18n/language-switcher"

interface NavSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
  allSections?: Section[]
  device?: "desktop" | "tablet" | "mobile"
}

interface LocaleLink {
  locale: string
  label: string
  href: string
  isActive: boolean
}

export function NavSection({ data, isPreview, styles, onUpdate, allSections, device }: NavSectionProps) {
  const brandName = (data.brandName as string) || "Mijn bedrijf"
  const logo = typeof styles?.logo === "string" ? styles.logo.trim() : ""
  const isSticky = (data.isSticky as boolean) ?? true
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const layout = normalizeSectionLayout(data.layout)
  const localeLinks = Array.isArray(data.localeLinks) ? data.localeLinks as LocaleLink[] : []
  const activeLocaleLink = localeLinks.find((entry) => entry.isActive) ?? localeLinks[0]
  const languageLabel = ((data.siteMessages as { language?: string } | undefined)?.language) || "Taal"
  const languageSwitcher = normalizeLanguageSwitcherConfig(data.languageSwitcher)
  const isEditorLanguagePreview = data.languageSwitcherEditorPreview === true

  // Force mobile view when device is mobile or tablet
  const isMobileView = device === "mobile" || device === "tablet"

  // Generate navigation links from sections
  const getNavLinks = (): Array<{ label: string; href: string; sectionId: string }> => {
    if (!allSections) return []
    return resolveNavigationLinks(data, allSections)
      .filter((link) => link.enabled)
      .map((link) => ({ ...link, href: `#section-${link.sectionId}` }))
  }

  const links = getNavLinks()
  const editableData = {
    ...data,
    navLinks: links.map((link) => ({
      sectionId: link.sectionId,
      label: link.label,
      enabled: true,
    })),
  }

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const targetId = href.replace("#", "")
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setMobileMenuOpen(false)
  }

  const handleLocaleChange = (href: string) => {
    if (isEditorLanguagePreview) return
    const target = localeLinks.find((entry) => entry.href === href)
    if (target) document.cookie = `website_locale=${encodeURIComponent(target.locale)}; Path=/; Max-Age=31536000; SameSite=Lax`
    window.location.href = `${href}${window.location.hash}`
  }

  const rememberLocale = (locale: string) => {
    document.cookie = `website_locale=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`
  }

  const renderLanguageSwitcher = (floating = false) => {
    if (!(localeLinks.length > 1)) return null

    const shellClass = floating
      ? "border border-current/15 bg-[var(--section-surface)] text-[var(--section-surface-foreground)] shadow-xl backdrop-blur"
      : "border border-current/20 bg-transparent"

    if (languageSwitcher.style === "buttons") {
      return (
        <div className={`flex items-center gap-1 rounded-lg p-1 ${shellClass}`} role="group" aria-label={languageLabel}>
          <Globe2 className="mx-1 h-4 w-4 shrink-0 text-[var(--section-accent)]" aria-hidden="true" />
          {localeLinks.map((entry) => (
            <a
              key={entry.locale}
              href={entry.href}
              onClick={(event) => {
                if (isEditorLanguagePreview) {
                  event.preventDefault()
                  return
                }
                rememberLocale(entry.locale)
              }}
              aria-current={entry.isActive ? "page" : undefined}
              title={entry.label}
              className={`rounded-md px-2 py-1 text-xs font-semibold uppercase transition ${
                entry.isActive
                  ? "bg-[var(--section-accent)] text-[var(--section-accent-foreground)]"
                  : "hover:bg-black/5 hover:text-[var(--section-accent)]"
              }`}
            >
              {entry.locale.split("-")[0]}
            </a>
          ))}
        </div>
      )
    }

    if (languageSwitcher.style === "compact") {
      return (
        <label className={`relative flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 ${shellClass}`}>
          <Globe2 className="h-4 w-4 text-[var(--section-accent)]" aria-hidden="true" />
          <span className="text-xs font-bold uppercase">{activeLocaleLink?.locale.split("-")[0]}</span>
          <span className="sr-only">{languageLabel}</span>
          <select
            aria-label={languageLabel}
            value={activeLocaleLink?.href}
            onChange={(event) => handleLocaleChange(event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {localeLinks.map((entry) => (
              <option key={entry.locale} value={entry.href}>{entry.label}</option>
            ))}
          </select>
        </label>
      )
    }

    return (
      <label className={`relative flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm ${shellClass}`}>
        <Globe2 className="h-4 w-4 text-[var(--section-accent)]" aria-hidden="true" />
        <span className="sr-only">{languageLabel}</span>
        <select
          aria-label={languageLabel}
          value={activeLocaleLink?.href}
          onChange={(event) => handleLocaleChange(event.target.value)}
          className="cursor-pointer appearance-none bg-transparent pr-4 font-medium outline-none"
        >
          {localeLinks.map((entry) => (
            <option key={entry.locale} value={entry.href}>{entry.label}</option>
          ))}
        </select>
      </label>
    )
  }

  const sectionStyle: React.CSSProperties = {
    ...getSectionColorVars(styles),
    backgroundColor: styles?.backgroundColor || "#ffffff",
    color: styles?.textColor,
  }

  return (
    <nav
      className={`shadow-md ${isSticky ? "sticky top-0 z-50" : ""}`}
      style={sectionStyle}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex h-16 items-center ${layout === "split" ? "justify-start gap-10" : layout === "compact" ? "justify-between h-12" : layout === "banner" ? "justify-center gap-8" : "justify-between"}`}>
          <div className="flex-shrink-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className="flex cursor-pointer items-center gap-3 text-2xl font-bold text-[var(--section-accent)]"
            >
              {logo ? (
                <img
                  src={logo}
                  alt=""
                  className={`${layout === "compact" ? "h-7" : "h-9"} w-auto max-w-[9rem] flex-shrink-0 object-contain`}
                />
              ) : null}
              <EditableText data={data} path={["brandName"]} value={brandName} isPreview={isPreview} onUpdate={onUpdate} />
            </a>
          </div>

          {/* Desktop navigation */}
          <div className={`${isMobileView ? "hidden" : "hidden md:flex"} md:items-center ${layout === "compact" ? "md:space-x-4 text-sm" : "md:space-x-8"}`}>
            {languageSwitcher.position === "nav-left" ? renderLanguageSwitcher() : null}
            {links.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="font-medium transition hover:text-[var(--section-accent)]"
              >
                <EditableText data={editableData} path={["navLinks", idx, "label"]} value={link.label} isPreview={isPreview} onUpdate={onUpdate} />
              </a>
            ))}
            {languageSwitcher.position === "nav-right" ? renderLanguageSwitcher() : null}
          </div>

          {/* Mobile menu button */}
          <div className={`${isMobileView ? "flex" : "flex md:hidden"} items-center gap-1`}>
            {languageSwitcher.position === "nav-left" ? renderLanguageSwitcher() : null}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-black/5 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            {languageSwitcher.position === "nav-right" ? renderLanguageSwitcher() : null}
          </div>
        </div>

        {/* Mobile navigation */}
        <div
          className={`${isMobileView ? "block" : "md:hidden"} overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? "max-h-96 opacity-100 pb-4" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex flex-col gap-1 border-t border-black/10 pt-4">
            {links.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="rounded-md px-3 py-3 text-base font-medium transition hover:text-[var(--section-accent)] active:bg-black/10"
              >
                <EditableText data={editableData} path={["navLinks", idx, "label"]} value={link.label} isPreview={isPreview} onUpdate={onUpdate} />
              </a>
            ))}
          </div>
        </div>
      </div>
      {languageSwitcher.position === "bottom-left" || languageSwitcher.position === "bottom-right" ? (
        <div className={`fixed bottom-4 z-[60] ${languageSwitcher.position === "bottom-left" ? "left-4" : "right-4"}`}>
          {renderLanguageSwitcher(true)}
        </div>
      ) : null}
    </nav>
  )
}


