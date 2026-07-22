import type { CSSProperties } from "react"
import type { SectionStyles } from "@/lib/types"

export const DEFAULT_SECTION_ACCENT = "#b45309"
export const DEFAULT_SECTION_SURFACE = "rgba(255,255,255,0.85)"

function getReadableTextColor(color: string | undefined, fallback: string) {
  const hex = color?.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (!hex) return fallback

  const normalized = hex.length === 3 ? hex.split("").map((character) => character + character).join("") : hex
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255)
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ))
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

  return luminance > 0.36 ? "#111827" : "#ffffff"
}

export function getSectionColorVars(
  styles?: SectionStyles,
  defaults: { accent?: string; surface?: string } = {},
): CSSProperties {
  const accent = styles?.accentColor || defaults.accent || DEFAULT_SECTION_ACCENT
  const surface = styles?.surfaceColor || defaults.surface || DEFAULT_SECTION_SURFACE

  return {
    ["--section-accent" as string]: accent,
    ["--section-accent-foreground" as string]: getReadableTextColor(accent, "#ffffff"),
    ["--section-surface" as string]: surface,
    ["--section-surface-foreground" as string]: getReadableTextColor(surface, styles?.textColor || "#111827"),
  }
}
