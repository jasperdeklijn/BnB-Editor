"use client"

import type React from "react"
import { useState } from "react"
import type { Section, SectionStyles, SectionType } from "@/lib/types"
import { Menu, X } from "lucide-react"
import { EditableText } from "@/components/editor/inline-editable-text"
import { normalizeSectionLayout } from "@/lib/section-layouts"

interface NavLink {
  sectionId: string
  label: string
  enabled: boolean
}

interface NavSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
  allSections?: Section[]
  device?: "desktop" | "tablet" | "mobile"
}

// Default display names for section types
const defaultSectionLabels: Record<SectionType, string> = {
  hero: "Home",
  about: "Over",
  services: "Aanbod",
  gallery: "Galerij",
  features: "Kenmerken",
  contact: "Contact",
  nav: "Navigatie",
  footer: "Footer",
  testimonials: "Recensies",
  faq: "FAQ",
  opening_hours: "Openingstijden",
  pricing: "Prijzen",
  map: "Locatie",
  cta: "Actie",
  request_form: "Aanvraag",
}

// Sections that can appear in navigation
const navigableSectionTypes: SectionType[] = [
  "hero",
  "about",
  "services",
  "gallery",
  "features",
  "testimonials",
  "faq",
  "opening_hours",
  "pricing",
  "map",
  "cta",
  "request_form",
  "contact",
]

export function NavSection({ data, isPreview, styles, onUpdate, allSections, device }: NavSectionProps) {
  const brandName = (data.brandName as string) || "Mijn bedrijf"
  const logo = typeof styles?.logo === "string" ? styles.logo.trim() : ""
  const isSticky = (data.isSticky as boolean) ?? true
  const navLinks = data.navLinks as NavLink[] | undefined
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const layout = normalizeSectionLayout(data.layout)

  // Force mobile view when device is mobile or tablet
  const isMobileView = device === "mobile" || device === "tablet"

  // Generate navigation links from sections
  const getNavLinks = (): Array<{ label: string; href: string; sectionId: string }> => {
    if (!allSections) return []

    const navigableSections = allSections.filter((section) =>
      navigableSectionTypes.includes(section.type)
    )

    return navigableSections
      .map((section) => {
        // Check if this section has a custom config in navLinks
        const linkConfig = navLinks?.find((nl) => nl.sectionId === section.id)

        // If navLinks exists but this section is disabled, skip it
        if (navLinks && linkConfig && !linkConfig.enabled) {
          return null
        }

        // Use custom label if set, otherwise fall back to section title or default
        const label =
          linkConfig?.label ||
          (section.data?.title as string) ||
          defaultSectionLabels[section.type]

        return {
          label,
          href: `#section-${section.id}`,
          sectionId: section.id,
        }
      })
      .filter(Boolean) as Array<{ label: string; href: string; sectionId: string }>
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

  const sectionStyle: React.CSSProperties = {
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
              className="flex cursor-pointer items-center gap-3 text-2xl font-bold"
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
            {links.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="hover:opacity-75 transition font-medium"
              >
                <EditableText data={editableData} path={["navLinks", idx, "label"]} value={link.label} isPreview={isPreview} onUpdate={onUpdate} />
              </a>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className={isMobileView ? "block" : "md:hidden"}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-black/5 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
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
                className="px-3 py-3 rounded-md hover:bg-black/5 active:bg-black/10 transition font-medium text-base"
              >
                <EditableText data={editableData} path={["navLinks", idx, "label"]} value={link.label} isPreview={isPreview} onUpdate={onUpdate} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}


