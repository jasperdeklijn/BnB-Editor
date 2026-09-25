import { resolveSectionIcon, sectionIconUrl, type SectionIconId } from "@/lib/section-icons"

export function SectionIcon({ icon, fallback, className = "h-5 w-5", badgeClassName }: {
  icon: unknown
  fallback?: SectionIconId
  className?: string
  badgeClassName?: string
}) {
  const resolved = resolveSectionIcon(icon, fallback)
  if (resolved === null) return null
  const url = `url("${sectionIconUrl(resolved)}")`
  const glyph = <span aria-hidden="true" className={`inline-block shrink-0 ${className}`} style={{ backgroundColor: "currentColor", maskImage: url, WebkitMaskImage: url, maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskSize: "contain", WebkitMaskSize: "contain", maskPosition: "center", WebkitMaskPosition: "center" }} />
  return badgeClassName ? <span aria-hidden="true" className={badgeClassName}>{glyph}</span> : glyph
}
