import { SECTION_ICON_IDS, type SectionIconId } from "./section-icon-ids"

export type { SectionIconId }
export interface IconFeature { id: string; text: string; icon: string | null }

const allowedIcons = new Set<string>(SECTION_ICON_IDS)
export const DEFAULT_FEATURE_ICON: SectionIconId = "tabler:check"
export const CONTACT_ICON_DEFAULTS = {
  address: "tabler:map-pin", phone: "tabler:phone", email: "tabler:mail",
} as const satisfies Record<string, SectionIconId>

/** Unknown content can never become a URL or arbitrary SVG markup. */
export function resolveSectionIcon(value: unknown, fallback: SectionIconId = DEFAULT_FEATURE_ICON): SectionIconId | null {
  if (value === null) return null
  return typeof value === "string" && allowedIcons.has(value) ? value as SectionIconId : fallback
}

export function sectionIconUrl(icon: SectionIconId) {
  return `/icons/tabler/${icon.slice("tabler:".length)}.svg`
}
