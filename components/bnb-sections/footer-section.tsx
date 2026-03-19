"use client"

import type React from "react"
import Link from "next/link"
import type { SectionStyles } from "@/lib/types"

interface FooterSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

export function FooterSection({ data, styles }: FooterSectionProps) {
  const companyName = (data.companyName as string) || "BnB Website Maken"
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

  const currentYear = new Date().getFullYear()

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor || "#111827",
    color: styles?.textColor || "#f3f4f6",
  }

  return (
    <footer style={sectionStyle}>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="grid grid-cols-2 gap-6 mb-8 sm:gap-8 md:grid-cols-4">
          <div className="col-span-2 mb-4 sm:col-span-2 md:col-span-1 md:mb-0">
            <h3 className="text-base font-bold mb-3 sm:text-lg sm:mb-4">
              {companyName}
            </h3>
            <p className="opacity-75 text-sm">{companyDescription}</p>
          </div>

          {columns.map((column, idx) => (
            <div key={idx}>
              <h4 className="text-sm font-semibold mb-3 sm:text-base md:text-lg sm:mb-4">{column.title}</h4>
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

        <div className="border-t border-gray-700 pt-6 sm:pt-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm opacity-75 sm:text-base">
              &copy; {currentYear} {companyName}. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
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
