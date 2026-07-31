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
import { normalizeSectionStyleType } from "@/lib/section-style-types"

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
  const styleType = normalizeSectionStyleType(data.styleType)
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
    backgroundColor:
      styleType === "dark"
        ? "#111827"
        : styleType === "soft"
          ? "#f8fafc"
          : styles?.backgroundColor || "#ffffff",
    color: styleType === "dark" ? "#ffffff" : styles?.textColor,
  }

  const styleTypeClass =
    styleType === "bold"
      ? "border-b-8 border-[var(--section-accent)] font-sans uppercase tracking-wide"
      : styleType === "elegant"
        ? "border-b border-current/20 font-serif"
        : styleType === "soft"
          ? "border-b border-current/5"
          : styleType === "dark"
            ? "border-b border-white/15 shadow-xl"
            : styleType === "outline"
              ? "border-y-2 border-current/60 shadow-none"
              : ""

  const styleTypeBrandClass =
    styleType === "bold"
      ? "font-black uppercase tracking-tight"
      : styleType === "elegant"
        ? "font-serif font-medium italic tracking-wide"
        : styleType === "soft"
          ? "rounded-full bg-[var(--section-accent)]/10 px-4 py-2"
          : styleType === "outline"
            ? "border-2 border-current px-3 py-1"
            : ""

  const styleTypeLinkClass =
    styleType === "bold"
      ? "font-black uppercase tracking-wider"
      : styleType === "elegant"
        ? "font-serif tracking-wide"
        : styleType === "soft"
          ? "rounded-full px-4 py-2 hover:bg-[var(--section-accent)]/10"
          : styleType === "dark"
            ? "rounded-md px-3 py-2 hover:bg-white/10"
            : styleType === "outline"
              ? "border-b border-current/50 pb-1 hover:border-[var(--section-accent)]"
              : ""

  const navClass =
    layout === "card"
      ? ""
      : layout === "banner"
        ? "border-y-4 border-[var(--section-accent)] shadow-sm"
        : layout === "showcase"
          ? "border-b border-current/10 shadow-sm"
          : "shadow-md"

  const containerClass =
    layout === "card"
      ? "mx-auto max-w-7xl px-3 py-3 sm:px-6"
      : layout === "showcase"
        ? "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 md:py-2"
        : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"

  const barClass =
    layout === "split"
      ? "flex h-16 items-center justify-between md:justify-start md:gap-12"
      : layout === "showcase"
        ? "flex min-h-16 items-center justify-between md:flex-col md:justify-center md:gap-4 md:py-4"
        : layout === "compact"
          ? "flex h-12 items-center justify-between"
          : layout === "card"
            ? "flex h-16 items-center justify-between rounded-2xl border border-current/10 bg-[var(--section-surface)] px-4 text-[var(--section-surface-foreground)] shadow-xl sm:px-6"
            : layout === "banner"
              ? "flex h-20 items-center justify-between md:justify-center md:gap-12"
              : "flex h-16 items-center justify-between"

  const brandClass =
    layout === "compact"
      ? "text-lg"
      : layout === "showcase"
        ? "text-2xl md:text-3xl"
        : layout === "banner"
          ? "text-2xl"
          : "text-2xl"

  const desktopNavClass =
    layout === "showcase"
      ? "w-full justify-center gap-7 border-t border-current/10 pt-4"
      : layout === "compact"
        ? "gap-4 text-sm"
        : layout === "split"
          ? "gap-7"
          : layout === "banner"
            ? "gap-2"
            : "gap-8"

  const linkClass =
    layout === "banner"
      ? "rounded-full px-4 py-2 font-semibold transition hover:bg-[var(--section-accent)] hover:text-[var(--section-accent-foreground)]"
      : layout === "showcase"
        ? "border-b-2 border-transparent pb-1 font-medium transition hover:border-[var(--section-accent)] hover:text-[var(--section-accent)]"
        : "font-medium transition hover:text-[var(--section-accent)]"

  return (
    <nav
      className={`${navClass} ${styleTypeClass} ${isSticky ? "sticky top-0 z-50" : ""}`}
      style={sectionStyle}
    >
      <div className={containerClass}>
        <div className={barClass}>
          <div className="flex-shrink-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className={`flex cursor-pointer items-center gap-3 font-bold text-[var(--section-accent)] ${brandClass} ${styleTypeBrandClass}`}
            >
              {logo ? (
                <img
                  src={logo}
                  alt={styles?.logoAlt?.trim() || `${brandName} logo`}
                  className={`${layout === "compact" ? "h-6" : layout === "showcase" ? "h-10" : "h-9"} w-auto max-w-[9rem] flex-shrink-0 object-contain`}
                />
              ) : null}
              <EditableText data={data} path={["brandName"]} value={brandName} isPreview={isPreview} onUpdate={onUpdate} />
            </a>
          </div>

          {/* Desktop navigation */}
          <div className={`${isMobileView ? "hidden" : "hidden md:flex"} items-center ${desktopNavClass}`}>
            {languageSwitcher.position === "nav-left" ? renderLanguageSwitcher() : null}
            {links.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`${linkClass} ${styleTypeLinkClass}`}
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
              className="rounded-md p-2 transition hover:bg-black/5"
              aria-label={mobileMenuOpen ? "Menu sluiten" : "Menu openen"}
              aria-expanded={mobileMenuOpen}
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
                className={`rounded-md px-3 py-3 text-base font-medium transition hover:text-[var(--section-accent)] active:bg-black/10 ${styleTypeLinkClass}`}
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


