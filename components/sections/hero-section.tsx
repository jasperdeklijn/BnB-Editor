"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { normalizeSectionLayout } from "@/lib/section-layouts"
import { getSectionColorVars } from "@/lib/section-colors"
import { normalizeSectionStyleType } from "@/lib/section-style-types"

export type HeroLayout = "centered" | "split" | "fullwidth" | "minimal" | "card" | "split-reverse"

const heroLayoutMap = {
  classic: "centered",
  split: "split",
  showcase: "fullwidth",
  compact: "minimal",
  card: "card",
  banner: "split-reverse",
} as const

interface HeroSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

export function HeroSection({ data, isPreview, styles, onUpdate }: HeroSectionProps) {
  const title = data.title as string
  const subtitle = data.subtitle as string
  const ctaText = data.ctaText as string
  const ctaEnabled = data.ctaEnabled !== false && Boolean(ctaText)
  const ctaHref = (data.ctaHref as string) || "#contact"
  const layout = (heroLayoutMap[normalizeSectionLayout(data.layout)] ?? "centered") as HeroLayout
  const styleType = normalizeSectionStyleType(data.styleType)
  const colorVars = getSectionColorVars(styles)

  const styleTypeRootClass =
    styleType === "bold"
      ? "font-sans"
      : styleType === "elegant"
        ? "font-serif"
        : styleType === "soft"
          ? "[&_*]:transition-all"
          : styleType === "dark"
            ? "bg-slate-950 text-white"
            : styleType === "outline"
              ? "ring-4 ring-inset ring-current"
              : ""

  const styleTypeTitleClass =
    styleType === "bold"
      ? "!font-black uppercase !tracking-[-0.04em]"
      : styleType === "elegant"
        ? "!font-serif !font-medium !tracking-normal"
        : styleType === "soft"
          ? "!font-semibold !tracking-normal"
          : styleType === "dark"
            ? "!text-white"
            : styleType === "outline"
              ? "underline decoration-[var(--section-accent)] decoration-4 underline-offset-8"
              : ""

  const styleTypeBodyClass =
    styleType === "bold"
      ? "font-semibold"
      : styleType === "elegant"
        ? "font-serif italic"
        : styleType === "soft"
          ? "leading-relaxed"
          : styleType === "dark"
            ? "!text-white/80"
            : ""

  const styleTypeButtonClass =
    styleType === "bold"
      ? "!rounded-none font-black uppercase tracking-wide shadow-[6px_6px_0_rgba(0,0,0,0.25)]"
      : styleType === "elegant"
        ? "!rounded-full border border-current/20 font-serif"
        : styleType === "soft"
          ? "!rounded-full px-8 shadow-lg"
          : styleType === "dark"
            ? "border border-white/30 shadow-xl"
            : styleType === "outline"
              ? "!border-2 !border-[var(--section-accent)] !bg-transparent !text-[var(--section-accent)]"
              : ""

  const styleTypePanelClass =
    styleType === "bold"
      ? "border-l-8 border-[var(--section-accent)]"
      : styleType === "elegant"
        ? "border border-current/15"
        : styleType === "soft"
          ? "rounded-3xl"
          : styleType === "dark"
            ? "!bg-slate-950"
            : styleType === "outline"
              ? "border-4 border-current bg-transparent"
              : ""

  const styleBackgroundColor =
    styleType === "dark"
      ? "#111827"
      : styleType === "soft"
        ? "#fdf2f8"
        : styles?.backgroundColor

  const textStyle: React.CSSProperties = {
    color: styleType === "dark" ? "#ffffff" : styles?.textColor,
  }

  // Layout: Simple/Centered (clean, text-focused, no image)
  if (layout === "centered") {
    return (
      <section
        className={`relative flex min-h-[400px] items-center justify-center overflow-hidden px-4 py-12 sm:min-h-[500px] sm:px-6 sm:py-16 md:min-h-[600px] md:py-24 ${styles?.fontFamily || ""} ${styleTypeRootClass}`}
        style={{
          ...colorVars,
          backgroundColor: styleBackgroundColor || "#fffbeb",
          backgroundImage: styles?.backgroundImage ? `linear-gradient(to bottom right, rgba(255,251,235,0.9), rgba(254,243,199,0.9)), url(${styles.backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: styles?.backgroundPosition || "center",
        }}
      >
        {/* Subtle decorative element */}
        <div className={`absolute inset-0 ${styleType === "dark" ? "bg-gradient-to-br from-slate-950 to-slate-800 opacity-95" : styleType === "bold" ? "bg-[linear-gradient(135deg,transparent_65%,var(--section-accent)_65%)] opacity-30" : "bg-gradient-to-br from-amber-50 to-orange-100 opacity-80"}`} />
        <div className="relative z-10 max-w-3xl px-2 text-center">
          <EditableText
            as="h1"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className={`mb-4 text-balance text-3xl font-bold tracking-tight text-amber-950 sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl ${styleTypeTitleClass}`}
            style={textStyle}
          />
          <EditableText
            as="p"
            data={data}
            path={["subtitle"]}
            value={subtitle}
            isPreview={isPreview}
            onUpdate={onUpdate}
            multiline
            className={`mb-6 text-pretty text-base text-amber-900 sm:mb-8 sm:text-lg md:text-xl ${styleTypeBodyClass}`}
            style={textStyle}
          />
          {ctaEnabled ? <Button asChild size="lg" className={`bg-[var(--section-accent)] text-[var(--section-accent-foreground)] hover:brightness-90 ${styleTypeButtonClass}`}>
            <a href={ctaHref}><EditableText data={data} path={["ctaText"]} value={ctaText} isPreview={isPreview} onUpdate={onUpdate} /></a>
          </Button> : null}
        </div>
      </section>
    )
  }

  // Layout: Split (image on left half, text on right half)
  if (layout === "split") {
    return (
      <section
        className={`relative min-h-[400px] overflow-hidden sm:min-h-[500px] lg:min-h-[600px] ${styles?.fontFamily || ""} ${styleTypeRootClass}`}
        style={colorVars}
      >
        <div className="flex min-h-[inherit] flex-col md:flex-row">
          {/* Image Side - Full left half */}
          <div
            className="relative min-h-[280px] w-full sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] md:w-1/2"
            style={{
              backgroundImage: styles?.backgroundImage
                ? `url(${styles.backgroundImage})`
                : "url('/placeholder.svg?height=800&width=800')",
              backgroundSize: "cover",
              backgroundPosition: styles?.backgroundPosition || "center",
            }}
          >
            {/* Subtle overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5" />
          </div>

          {/* Text Side - Clean background */}
          <div
            className={`flex w-full flex-col justify-center px-8 py-12 md:w-1/2 md:px-12 lg:px-16 ${styleTypePanelClass}`}
            style={{ backgroundColor: styleBackgroundColor || "#fffbeb" }}
          >
            <EditableText
              as="h1"
              data={data}
              path={["title"]}
              value={title}
              isPreview={isPreview}
              onUpdate={onUpdate}
              className={`mb-4 text-balance text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl md:text-5xl ${styleTypeTitleClass}`}
              style={textStyle}
            />
            <EditableText
              as="p"
              data={data}
              path={["subtitle"]}
              value={subtitle}
              isPreview={isPreview}
              onUpdate={onUpdate}
              multiline
              className={`mb-6 text-pretty text-base text-amber-800 sm:text-lg md:text-xl ${styleTypeBodyClass}`}
              style={textStyle}
            />
            {ctaEnabled ? <div><Button asChild size="lg" className={`bg-[var(--section-accent)] text-[var(--section-accent-foreground)] hover:brightness-90 ${styleTypeButtonClass}`}><a href={ctaHref}><EditableText data={data} path={["ctaText"]} value={ctaText} isPreview={isPreview} onUpdate={onUpdate} /></a></Button></div> : null}
          </div>
        </div>
      </section>
    )
  }

  // Layout: Full Image (full background with elegant overlay)
  if (layout === "fullwidth") {
    return (
      <section
        className={`relative flex min-h-[500px] items-center justify-center overflow-hidden sm:min-h-[600px] md:min-h-[700px] ${styles?.fontFamily || ""} ${styleTypeRootClass}`}
        style={{
          ...colorVars,
          backgroundImage: styles?.backgroundImage
            ? `url(${styles.backgroundImage})`
            : "url('/placeholder.svg?height=900&width=1600')",
          backgroundSize: "cover",
          backgroundPosition: styles?.backgroundPosition || "center",
        }}
      >
        {/* Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60" />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <EditableText
            as="h1"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className={`mb-6 text-balance text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl ${styleTypeTitleClass}`}
            style={textStyle}
          />
          <EditableText
            as="p"
            data={data}
            path={["subtitle"]}
            value={subtitle}
            isPreview={isPreview}
            onUpdate={onUpdate}
            multiline
            className={`mb-8 text-pretty text-lg text-white/90 drop-shadow-md sm:text-xl md:text-2xl ${styleTypeBodyClass}`}
            style={textStyle}
          />
          {ctaEnabled ? <Button asChild size="lg" className={`bg-[var(--section-accent)] text-[var(--section-accent-foreground)] shadow-lg transition-all hover:brightness-90 hover:shadow-xl ${styleTypeButtonClass}`}><a href={ctaHref}><EditableText data={data} path={["ctaText"]} value={ctaText} isPreview={isPreview} onUpdate={onUpdate} /></a></Button> : null}
        </div>
      </section>
    )
  }

  // Layout: Minimal (text-only, no image)
  if (layout === "minimal") {
    return (
      <section
        className={`relative flex min-h-[400px] items-center justify-center px-4 py-12 sm:px-6 sm:py-16 md:py-24 ${styles?.fontFamily || ""} ${styleTypeRootClass}`}
        style={{
          ...colorVars,
          backgroundColor: styleBackgroundColor || "#ffffff",
        }}
      >
        <div className="max-w-3xl px-2 text-center">
          <EditableText
            as="h1"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className={`mb-4 text-balance text-3xl font-bold tracking-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl ${styleTypeTitleClass}`}
            style={textStyle}
          />
          <EditableText
            as="p"
            data={data}
            path={["subtitle"]}
            value={subtitle}
            isPreview={isPreview}
            onUpdate={onUpdate}
            multiline
            className={`mb-6 text-pretty text-base sm:mb-8 sm:text-lg md:text-xl ${styleTypeBodyClass}`}
            style={textStyle}
          />
          {ctaEnabled ? <Button asChild size="lg" className={`bg-[var(--section-accent)] text-[var(--section-accent-foreground)] hover:brightness-90 ${styleTypeButtonClass}`}><a href={ctaHref}><EditableText data={data} path={["ctaText"]} value={ctaText} isPreview={isPreview} onUpdate={onUpdate} /></a></Button> : null}
        </div>
      </section>
    )
  }

  // Layout: Card (image background with text card)
  if (layout === "card") {
    return (
      <section
        className={`relative flex min-h-[500px] items-center justify-center overflow-hidden sm:min-h-[600px] md:min-h-[700px] ${styles?.fontFamily || ""} ${styleTypeRootClass}`}
        style={{
          ...colorVars,
          backgroundImage: styles?.backgroundImage
            ? `url(${styles.backgroundImage})`
            : "url('/placeholder.svg?height=900&width=1600')",
          backgroundSize: "cover",
          backgroundPosition: styles?.backgroundPosition || "center",
        }}
      >
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Content Card */}
        <div className={`relative z-10 mx-auto max-w-lg rounded-lg bg-[var(--section-surface)] p-8 text-[var(--section-surface-foreground)] shadow-xl backdrop-blur-sm ${styleTypePanelClass}`}>
          <EditableText
            as="h1"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className={`mb-4 text-balance text-2xl font-bold tracking-tight text-amber-950 sm:text-3xl md:text-4xl ${styleTypeTitleClass}`}
            style={textStyle}
          />
          <EditableText
            as="p"
            data={data}
            path={["subtitle"]}
            value={subtitle}
            isPreview={isPreview}
            onUpdate={onUpdate}
            multiline
            className={`mb-6 text-pretty text-sm text-amber-800 sm:text-base ${styleTypeBodyClass}`}
            style={textStyle}
          />
          {ctaEnabled ? <Button asChild size="lg" className={`w-full bg-[var(--section-accent)] text-[var(--section-accent-foreground)] hover:brightness-90 ${styleTypeButtonClass}`}><a href={ctaHref}><EditableText data={data} path={["ctaText"]} value={ctaText} isPreview={isPreview} onUpdate={onUpdate} /></a></Button> : null}
        </div>
      </section>
    )
  }

  // Layout: Split Reverse (text on left, image on right)
  if (layout === "split-reverse") {
    return (
      <section
        className={`relative min-h-[400px] overflow-hidden sm:min-h-[500px] lg:min-h-[600px] ${styles?.fontFamily || ""} ${styleTypeRootClass}`}
        style={colorVars}
      >
        <div className="flex min-h-[inherit] flex-col md:flex-row">
          {/* Text Side - Clean background */}
          <div
            className={`flex w-full flex-col justify-center px-8 py-12 md:w-1/2 md:px-12 lg:px-16 ${styleTypePanelClass}`}
            style={{ backgroundColor: styleBackgroundColor || "#fffbeb" }}
          >
            <EditableText
              as="h1"
              data={data}
              path={["title"]}
              value={title}
              isPreview={isPreview}
              onUpdate={onUpdate}
              className={`mb-4 text-balance text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl md:text-5xl ${styleTypeTitleClass}`}
              style={textStyle}
            />
            <EditableText
              as="p"
              data={data}
              path={["subtitle"]}
              value={subtitle}
              isPreview={isPreview}
              onUpdate={onUpdate}
              multiline
              className={`mb-6 text-pretty text-base text-amber-800 sm:text-lg md:text-xl ${styleTypeBodyClass}`}
              style={textStyle}
            />
            {ctaEnabled ? <div><Button asChild size="lg" className={`bg-[var(--section-accent)] text-[var(--section-accent-foreground)] hover:brightness-90 ${styleTypeButtonClass}`}><a href={ctaHref}><EditableText data={data} path={["ctaText"]} value={ctaText} isPreview={isPreview} onUpdate={onUpdate} /></a></Button></div> : null}
          </div>

          {/* Image Side - Full right half */}
          <div
            className={`relative min-h-[280px] w-full sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] md:w-1/2`}
            style={{
              backgroundImage: styles?.backgroundImage
                ? `url(${styles.backgroundImage})`
                : "url('/placeholder.svg?height=800&width=800')",
              backgroundSize: "cover",
              backgroundPosition: styles?.backgroundPosition || "center",
            }}
          >
            {/* Subtle overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/5" />
          </div>
        </div>
      </section>
    )
  }

  // Fallback to centered
  return null
}
