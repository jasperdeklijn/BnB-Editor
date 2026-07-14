"use client"

import type React from "react"
import Link from "next/link"
import { Building2, Mail, MapPin, Phone } from "lucide-react"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { Section, SectionStyles, SectionType } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"

interface FooterLink { label: string; href: string }
interface FooterColumn { title: string; links: FooterLink[] }

const fallbackColumns: FooterColumn[] = [
  { title: "Snel naar", links: [{ label: "Over ons", href: "#over-ons" }, { label: "Diensten", href: "#diensten" }, { label: "Contact", href: "#contact" }] },
]

export function FooterSection({ data, isPreview, styles, onUpdate, allSections }: { data: Record<string, unknown>; isPreview: boolean; styles?: SectionStyles; onUpdate?: (newData: Record<string, unknown>) => void; allSections?: Section[] }) {
  const companyName = (data.companyName as string) || (data.brandName as string) || "Mijn bedrijf"
  const companyDescription = (data.companyDescription as string) || "Persoonlijke service en heldere afspraken."
  const columns = Array.isArray(data.columns) ? data.columns as FooterColumn[] : fallbackColumns
  const socialLinks = Array.isArray(data.socialLinks) ? data.socialLinks as FooterLink[] : []
  const showLinks = data.showLinks !== false && columns.some((column) => column.links.length > 0)
  const showSocialLinks = data.showSocialLinks === true && socialLinks.length > 0
  const showCompanyInfo = data.showCompanyInfo === true
  const address = data.address as string | undefined
  const phone = data.phone as string | undefined
  const email = data.email as string | undefined
  const registrationNumber = data.registrationNumber as string | undefined
  const vatNumber = data.vatNumber as string | undefined
  const hasCompanyInfo = showCompanyInfo && Boolean(address || phone || email || registrationNumber || vatNumber)
  const editableData = { ...data, columns, socialLinks, companyName, companyDescription }
  const currentYear = new Date().getFullYear()
  const layout = getLayoutClasses(data.layout)
  const sectionStyle: React.CSSProperties = { backgroundColor: styles?.backgroundColor || "#111827", color: styles?.textColor || "#f3f4f6" }
  const resolveHref = (href: string) => {
    if (href.startsWith("#section-")) return href
    const legacyTargets: Record<string, SectionType> = { "#over-ons": "about", "#about": "about", "#diensten": "services", "#services": "services", "#contact": "contact" }
    const targetType = legacyTargets[href]
    const target = targetType ? allSections?.find((section) => section.type === targetType) : undefined
    return target ? `#section-${target.id}` : href || "#"
  }

  return (
    <footer style={sectionStyle} className={styles?.fontFamily || ""}>
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${layout.section} ${layout.layout === "compact" ? "max-w-5xl" : "max-w-7xl"}`}>
        <div className={`mb-8 grid gap-8 ${showLinks || hasCompanyInfo ? "md:grid-cols-3" : ""}`}>
          <div className={layout.layout === "banner" ? "text-center md:col-span-3" : ""}>
            <EditableText as="h3" data={editableData} path={["companyName"]} value={companyName} isPreview={isPreview} onUpdate={onUpdate} className="mb-3 text-lg font-bold" />
            <EditableText as="p" data={editableData} path={["companyDescription"]} value={companyDescription} isPreview={isPreview} onUpdate={onUpdate} className="max-w-md text-sm leading-relaxed opacity-75" multiline />
          </div>

          {hasCompanyInfo ? <div>
            <h4 className="mb-4 text-sm font-semibold">Bedrijfsgegevens</h4>
            <ul className="space-y-2.5 text-sm opacity-80">
              {address ? <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><EditableText data={data} path={["address"]} value={address} isPreview={isPreview} onUpdate={onUpdate} multiline /></li> : null}
              {phone ? <li><a href={`tel:${phone}`} className="flex items-center gap-2 hover:opacity-100"><Phone className="h-4 w-4 shrink-0" /><EditableText data={data} path={["phone"]} value={phone} isPreview={isPreview} onUpdate={onUpdate} /></a></li> : null}
              {email ? <li><a href={`mailto:${email}`} className="flex items-center gap-2 hover:opacity-100"><Mail className="h-4 w-4 shrink-0" /><EditableText data={data} path={["email"]} value={email} isPreview={isPreview} onUpdate={onUpdate} /></a></li> : null}
              {registrationNumber ? <li className="flex items-center gap-2"><Building2 className="h-4 w-4 shrink-0" /><span>KvK: <EditableText data={data} path={["registrationNumber"]} value={registrationNumber} isPreview={isPreview} onUpdate={onUpdate} /></span></li> : null}
              {vatNumber ? <li className="pl-6">BTW: <EditableText data={data} path={["vatNumber"]} value={vatNumber} isPreview={isPreview} onUpdate={onUpdate} /></li> : null}
            </ul>
          </div> : null}

          {showLinks ? <div className={hasCompanyInfo ? "" : "md:col-span-2"}>
            {columns.map((column, columnIndex) => <div key={columnIndex}>
              <EditableText as="h4" data={editableData} path={["columns", columnIndex, "title"]} value={column.title} isPreview={isPreview} onUpdate={onUpdate} className="mb-4 text-sm font-semibold" />
              <ul className="flex flex-wrap gap-x-5 gap-y-2 md:flex-col">
                {column.links.map((link, linkIndex) => <li key={`${link.href}-${linkIndex}`}><Link href={resolveHref(link.href)} className="text-sm opacity-75 transition hover:opacity-100"><EditableText data={editableData} path={["columns", columnIndex, "links", linkIndex, "label"]} value={link.label} isPreview={isPreview} onUpdate={onUpdate} /></Link></li>)}
              </ul>
            </div>)}
          </div> : null}
        </div>

        <div className="border-t border-white/20 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <p className="text-sm opacity-75">&copy; {currentYear} <EditableText data={editableData} path={["companyName"]} value={companyName} isPreview={isPreview} onUpdate={onUpdate} />. Alle rechten voorbehouden.</p>
            {showSocialLinks ? <div className="flex flex-wrap justify-center gap-4">{socialLinks.map((link, index) => <a key={`${link.href}-${index}`} href={link.href} className="text-sm opacity-75 transition hover:opacity-100"><EditableText data={editableData} path={["socialLinks", index, "label"]} value={link.label} isPreview={isPreview} onUpdate={onUpdate} /></a>)}</div> : null}
          </div>
        </div>
      </div>
    </footer>
  )
}
