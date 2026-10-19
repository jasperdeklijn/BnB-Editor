import type { CSSProperties } from "react"
import { normalizeSectionStyleType } from "@/lib/section-style-types"

type DecorationType = "paint" | "pattern"

interface DecorationOption {
  value: string
  label: string
  file: string
}

export const SECTION_DECORATION_OPTIONS: Record<DecorationType, readonly DecorationOption[]> = {
  paint: [
    { value: "splatter", label: "Verfspetters", file: "paint-splatter.svg" },
    { value: "brush", label: "Penseelstreken", file: "paint-brush.svg" },
    { value: "watercolor", label: "Aquarel", file: "paint-watercolor.svg" },
    { value: "organic", label: "Organische vormen", file: "paint-organic.svg" },
  ],
  pattern: [
    { value: "arches", label: "Stippen en boogjes", file: "pattern.svg" },
    { value: "dots", label: "Stippen", file: "pattern-dots.svg" },
    { value: "grid", label: "Raster", file: "pattern-grid.svg" },
    { value: "diagonal", label: "Diagonale lijnen", file: "pattern-diagonal.svg" },
    { value: "waves", label: "Golven", file: "pattern-waves.svg" },
    { value: "diamonds", label: "Ruiten", file: "pattern-diamonds.svg" },
  ],
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

export function getSectionDecoration(data: Record<string, unknown>) {
  const type = normalizeSectionStyleType(data.styleType)
  if (type !== "paint" && type !== "pattern") return null
  const options = SECTION_DECORATION_OPTIONS[type]
  return {
    type,
    options,
    option: options.find((option) => option.value === data.decorationVariant) ?? options[0],
    scale: boundedNumber(data.decorationScale, 100, 50, 200),
    opacity: boundedNumber(data.decorationOpacity, type === "paint" ? 16 : 12, 0, 40),
  }
}

/** Shared by the public renderer, hero, navigation and editor swatches. */
export function getSectionDecorationVars(data: Record<string, unknown>): CSSProperties {
  const decoration = getSectionDecoration(data)
  if (!decoration) return {}
  const { type, option, scale, opacity } = decoration
  const factor = scale / 100
  const image = `url('/section-decorations/${option.file}')`
  return {
    "--section-decoration-image": type === "paint" ? `${image}, ${image}` : image,
    "--section-decoration-size": type === "paint"
      ? `clamp(${200 * factor}px, ${36 * factor}vw, ${480 * factor}px), clamp(${180 * factor}px, ${30 * factor}vw, ${400 * factor}px)`
      : `${48 * factor}px ${48 * factor}px`,
    "--section-decoration-position": type === "paint"
      ? `left ${-100 * factor}px top ${-100 * factor}px, right ${-80 * factor}px bottom ${-110 * factor}px`
      : "0 0",
    "--section-decoration-opacity": opacity / 100,
  } as CSSProperties
}
