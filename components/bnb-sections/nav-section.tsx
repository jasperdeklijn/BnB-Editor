"use client"

import type React from "react"
import Link from "next/link"
import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface NavSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void
  styles?: SectionStyles
}

export function NavSection({ data, isPreview, onUpdate, styles }: NavSectionProps) {
  const brandName = (data.brandName as string) || "BnB Editor"
  const links = (data.links as Array<{ label: string; href: string }>) || [
    { label: "Home", href: "/" },
    { label: "Editor", href: "/editor" },
    { label: "Login", href: "/auth/login" },
  ]

  const handleUpdate = (newData: Record<string, unknown>) => {
    if (onUpdate) {
      onUpdate(newData)
    }
  }

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor || "#ffffff",
    color: styles?.textColor,
  }

  return (
    <nav className="shadow-md" style={sectionStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            {isPreview ? (
              <span className="text-2xl font-bold">{brandName}</span>
            ) : (
              <EditableText
                value={brandName}
                onChange={(value) => handleUpdate({ brandName: value })}
                isPreview={isPreview}
                className="text-2xl font-bold hover:bg-gray-100 px-2 py-1 rounded cursor-text"
              />
            )}
          </div>

          <div className="hidden md:flex md:items-center md:space-x-8">
            {links.map((link, idx) => (
              <Link key={idx} href={link.href} className="hover:opacity-75 transition">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
