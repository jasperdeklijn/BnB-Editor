"use client"

import { Children, createContext, isValidElement, useContext, type ImgHTMLAttributes, type ReactNode } from "react"
import { contentAtPath, contentStyleKey, findContentPath, type ContentPath } from "@/lib/section-composition"

export const SectionContentContext = createContext<Record<string, unknown>>({})

/** Match a button's own copy, even when several buttons share a destination. */
export function linkCopyPath(children: ReactNode): ContentPath | null {
  for (const child of Children.toArray(children)) {
    if (!isValidElement<{ path?: unknown; children?: ReactNode }>(child)) continue
    const path = child.props.path
    if (Array.isArray(path) && path.every((part) => typeof part === "string" || typeof part === "number") && /Text$/.test(String(path.at(-1)))) return path
    const nested = linkCopyPath(child.props.children)
    if (nested) return nested
  }
  return null
}

/** Images use the same stored per-image settings in editor, preview and live site. */
export function SectionImage({ style, contentPath, ...props }: ImgHTMLAttributes<HTMLImageElement> & { contentPath?: ContentPath }) {
  const data = useContext(SectionContentContext)
  const path = contentPath && contentAtPath(data, contentPath) === props.src ? contentPath : typeof props.src === "string" ? findContentPath(data, props.src, "image") : null
  const allStyles = data.imageStyles as Record<string, Record<string, unknown>> | undefined
  const settings = path ? allStyles?.[contentStyleKey(data, path)] : undefined
  const width = typeof settings?.width === "number" && settings.width >= 25 && settings.width <= 100 ? settings.width : undefined
  const position = ["center", "top", "bottom", "left", "right"].includes(String(settings?.position)) ? String(settings?.position) : undefined
  const aspects: Record<string, string> = { square: "1", landscape: "4/3", portrait: "3/4" }
  const aspect = aspects[String(settings?.aspect)]
  const customAspect = Boolean(aspect) || settings?.aspect === "original"
  return <img {...props} data-custom-width={width !== undefined || undefined} data-custom-aspect={customAspect || undefined} data-custom-position={Boolean(position) || undefined} data-custom-image={Boolean(width || customAspect) || undefined} data-editor-image-path={path ? JSON.stringify(path) : undefined} style={{ ...style, ...(width !== undefined && { width: `${width}%`, height: "auto", marginInline: "auto" }), ...(customAspect && { aspectRatio: aspect ?? "auto", height: "auto", objectFit: "cover" }), ...(position && { objectPosition: position }) }} />
}
