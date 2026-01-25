"use client"

import type React from "react"
import Link from "next/link"
import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface FooterSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void
  styles?: SectionStyles
}

export function FooterSection({ data, isPreview, onUpdate, styles }: FooterSectionProps) {
  const companyName = (data.companyName as string) || "BnB Editor"
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

  const handleUpdate = (newData: Record<string, unknown>) => {
    if (onUpdate) {
      onUpdate(newData)
    }
  }

  const currentYear = new Date().getFullYear()

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor || "#111827",
    color: styles?.textColor || "#f3f4f6",
  }

  return (
    <footer style={sectionStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-4">
              {isPreview ? (
                companyName
              ) : (
                <EditableText
                  value={companyName}
                  onChange={(value) => handleUpdate({ companyName: value })}
                  isPreview={isPreview}
                  className="hover:bg-gray-700 px-2 py-1 rounded cursor-text"
                />
              )}
            </h3>
            <p className="opacity-75">
              {isPreview ? (
                companyDescription
              ) : (
                <EditableText
                  value={companyDescription}
                  onChange={(value) => handleUpdate({ companyDescription: value })}
                  isPreview={isPreview}
                  className="hover:bg-gray-700 px-2 py-1 rounded cursor-text text-sm"
                />
              )}
            </p>
          </div>

          {columns.map((column, idx) => (
            <div key={idx}>
              <h4 className="text-lg font-semibold mb-4">{column.title}</h4>
              <ul className="space-y-2">
                {column.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link href={link.href} className="opacity-75 hover:opacity-100 transition">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="opacity-75">
              &copy; {currentYear} {companyName}. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              {socialLinks.map((link, idx) => (
                <a key={idx} href={link.href} className="opacity-75 hover:opacity-100 transition">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
