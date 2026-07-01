"use client"

import type React from "react"
import Link from "next/link"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"

interface FooterSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

export function FooterSection({ data, isPreview, styles, onUpdate }: FooterSectionProps) {
  const companyName = (data.companyName as string) || "Mijn bedrijf"
  const companyDescription =
    (data.companyDescription as string) ||
    "A modern website editor for bed and breakfast properties."
  const columns = (data.columns as Array<{ title: string; links: Array<{ label: string; href: string }> }>) || [
    {
      title: "Product",
      links: [
        { label: "Editor", href: "/editor" },
        { label: "Features", href: "/" },
        { label: "Pricing", href: "/" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/" },
        { label: "Blog", href: "/" },
        { label: "Contact", href: "/" },
      ],
    },
  ]
  const socialLinks = (data.socialLinks as Array<{ label: string; href: string }>) || [
    { label: "Twitter", href: "#" },
    { label: "Facebook", href: "#" },
    { label: "Instagram", href: "#" },
  ]
  const editableData = {
    ...data,
    columns,
    socialLinks,
    companyName,
    companyDescription,
  }

  const currentYear = new Date().getFullYear()
  const layout = getLayoutClasses(data.layout)

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor || "#111827",
    color: styles?.textColor || "#f3f4f6",
  }

  return (
    <footer style={sectionStyle}>
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${layout.section} ${layout.layout === "compact" ? "max-w-5xl" : "max-w-7xl"}`}>
        <div className={`grid gap-6 mb-8 sm:gap-8 ${layout.layout === "compact" ? "md:grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
          <div className={`${layout.layout === "banner" ? "md:col-span-4 text-center" : "col-span-2 mb-4 sm:col-span-2 md:col-span-1 md:mb-0"}`}>
            <EditableText as="h3" data={editableData} path={["companyName"]} value={companyName} isPreview={isPreview} onUpdate={onUpdate} className="text-base font-bold mb-3 sm:text-lg sm:mb-4" />
            <EditableText as="p" data={editableData} path={["companyDescription"]} value={companyDescription} isPreview={isPreview} onUpdate={onUpdate} className="opacity-75 text-sm" multiline />
          </div>

          {columns.map((column, idx) => (
            <div key={idx}>
              <EditableText as="h4" data={editableData} path={["columns", idx, "title"]} value={column.title} isPreview={isPreview} onUpdate={onUpdate} className="text-sm font-semibold mb-3 sm:text-base md:text-lg sm:mb-4" />
              <ul className="space-y-2">
                {column.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link href={link.href} className="opacity-75 hover:opacity-100 transition">
                      <EditableText data={editableData} path={["columns", idx, "links", linkIdx, "label"]} value={link.label} isPreview={isPreview} onUpdate={onUpdate} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 pt-6 sm:pt-8">
          <div className={`flex flex-col items-center gap-4 text-center ${layout.layout === "split" ? "sm:flex-row-reverse sm:justify-between sm:text-left" : "sm:flex-row sm:justify-between sm:text-left"}`}>
            <p className="text-sm opacity-75 sm:text-base">
              &copy; {currentYear} <EditableText data={editableData} path={["companyName"]} value={companyName} isPreview={isPreview} onUpdate={onUpdate} />. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {socialLinks.map((link, idx) => (
                <a key={idx} href={link.href} className="opacity-75 hover:opacity-100 transition">
                  <EditableText data={editableData} path={["socialLinks", idx, "label"]} value={link.label} isPreview={isPreview} onUpdate={onUpdate} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

