"use client"

import type React from "react"
import { useState } from "react"
import { EditableText } from "@/components/editor/editable-text"
import type { Section, SectionStyles, SectionType } from "@/lib/types"
import { Menu, X } from "lucide-react"

interface NavSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void
  styles?: SectionStyles
  allSections?: Section[]
}

// Default display names for section types
const defaultSectionLabels: Record<SectionType, string> = {
  hero: "Home",
  about: "About",
  rooms: "Rooms",
  gallery: "Gallery",
  amenities: "Amenities",
  contact: "Contact",
  nav: "Navigation",
  footer: "Footer",
}

// Sections that should appear in navigation
const navigableSections: SectionType[] = ["hero", "about", "rooms", "gallery", "amenities", "contact"]

export function NavSection({ data, isPreview, onUpdate, styles, allSections }: NavSectionProps) {
  const brandName = (data.brandName as string) || "BnB Editor"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleUpdate = (newData: Record<string, unknown>) => {
    if (onUpdate) {
      onUpdate(newData)
    }
  }

  // Generate navigation links from sections
  const navLinks = allSections
    ?.filter((section) => navigableSections.includes(section.type))
    .map((section) => {
      const sectionTitle = (section.data?.sectionTitle as string) || 
                          (section.data?.title as string) || 
                          defaultSectionLabels[section.type]
      return {
        label: sectionTitle,
        href: `#section-${section.id}`,
        sectionId: section.id,
      }
    }) || []

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
    <nav className="shadow-md sticky top-0 z-50" style={sectionStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            {isPreview ? (
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault()
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                className="text-2xl font-bold cursor-pointer"
              >
                {brandName}
              </a>
            ) : (
              <EditableText
                value={brandName}
                onChange={(value) => handleUpdate({ brandName: value })}
                isPreview={isPreview}
                className="text-2xl font-bold hover:bg-gray-100 px-2 py-1 rounded cursor-text"
              />
            )}
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="hover:opacity-75 transition font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
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
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="px-3 py-2 rounded-md hover:bg-black/5 transition font-medium"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
