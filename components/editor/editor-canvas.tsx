"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, CheckCircle2, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Section, SectionType, Transition } from "@/lib/types"
import {
  DEFAULT_GALLERY_IMAGES,
} from "@/lib/business-naming"
import { getDefaultSectionData as getRegistryDefaultSectionData, getSectionDefinition } from "@/components/editor/section-registry"
import { SectionRenderer, TransitionWrapper } from "./section-renderer"
import { applyThemeDefaultsToSection, resolveWebsiteTheme, type ResolvedTheme, type ThemeConfig } from "@/lib/themes"

interface EditorCanvasProps {
  sections: Section[]
  persistSections: (sections: Section[]) => void
  onSectionUpdate: (id: string, updates: Partial<Section>) => void
  transitions: Transition[]
  themeConfig?: ThemeConfig | null
  isPreview: boolean
  selectedSectionId: string | null
  onSectionSelect: (id: string | null) => void
  device: "desktop" | "tablet" | "mobile"
  businessId?: string | null
  isDraggingNewSectionExternal?: boolean
  isDraggingImageExternal?: boolean
  onStartTutorial?: () => void
}

export function EditorCanvas({
  sections,
  persistSections,
  onSectionUpdate,
  transitions,
  themeConfig,
  isPreview,
  selectedSectionId,
  onSectionSelect,
  device,
  businessId,
  isDraggingNewSectionExternal = false,
  isDraggingImageExternal = false,
  onStartTutorial,
}: EditorCanvasProps) {
  const [tutorialDismissed, setTutorialDismissed] = useState(false)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const canvasRef = useRef<HTMLElement | null>(null)
  const suppressNextSectionClickRef = useRef(false)
  const [hoverDropIndex, setHoverDropIndex] = useState<number | null>(null)
  const [draggingSectionIndex, setDraggingSectionIndex] = useState<number | null>(null)
  const [isDraggingNewSection, setIsDraggingNewSection] = useState(false)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const themedSectionCacheRef = useRef<Map<string, { source: Section; theme: ResolvedTheme; themed: Section }>>(new Map())
  const showNewSectionDropTargets = isDraggingNewSection || isDraggingNewSectionExternal
  const showImageDropTargets = isDraggingImage || isDraggingImageExternal
  const resolvedTheme = useMemo(() => resolveWebsiteTheme(themeConfig), [themeConfig])
  const themedSections = useMemo(() => {
    const nextCache = new Map<string, { source: Section; theme: ResolvedTheme; themed: Section }>()
    const nextSections = sections.map((section) => {
      const cached = themedSectionCacheRef.current.get(section.id)
      if (cached?.source === section && cached.theme === resolvedTheme) {
        nextCache.set(section.id, cached)
        return cached.themed
      }
      const themed = applyThemeDefaultsToSection(section, resolvedTheme)
      nextCache.set(section.id, { source: section, theme: resolvedTheme, themed })
      return themed
    })
    themedSectionCacheRef.current = nextCache
    return nextSections
  }, [resolvedTheme, sections])
  const transitionsByPair = useMemo(
    () => new Map(transitions.map((transition) => [`${transition.fromSectionId}:${transition.toSectionId}`, transition])),
    [transitions],
  )
  const themeScopeStyle = useMemo(
    () =>
      ({
        ...resolvedTheme.cssVariables,
        fontFamily: "var(--font-body)",
      }) as React.CSSProperties,
    [resolvedTheme],
  )

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setIsDraggingNewSection(false)
      setIsDraggingImage(false)
    }
    document.addEventListener('dragend', handleGlobalDragEnd)
    return () => document.removeEventListener('dragend', handleGlobalDragEnd)
  }, [])

  // Listen for touch drag events fired by useTouchDrag
  useEffect(() => {
    const onTouchDragStart = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.sectionType) setIsDraggingNewSection(true)
      if (detail?.imageUrl) setIsDraggingImage(true)
    }
    const onTouchDragEnd = () => {
      setIsDraggingNewSection(false)
      setIsDraggingImage(false)
      setHoverDropIndex(null)
      setDraggingSectionIndex(null)
    }
    const onTouchDrop = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        sectionType?: string
        imageUrl?: string
        sectionIndex?: number
        clientX: number
        clientY: number
      }

      const target = e.target as HTMLElement | null
      if (!target) return
      if (canvasRef.current && !canvasRef.current.contains(target)) return

      // Check if the target (or any ancestor) is a gap drop zone
      const gapEl = target.closest("[data-drop-gap]") as HTMLElement | null
      if (gapEl && detail.sectionType) {
        const gapIndex = Number(gapEl.dataset.dropGap)
        const sectionType = detail.sectionType as SectionType
        const tempId = `section-${Date.now()}`
        const newSection: Section = {
          id: tempId,
          type: sectionType,
          data: getDefaultSectionData(sectionType),
          styles: {},
        }
        const newSections = [...sections]
        newSections.splice(gapIndex, 0, newSection)
        persistSections(newSections)
        setHoverDropIndex(null)
        setIsDraggingNewSection(false)
        return
      }

      // Check if the target (or any ancestor) is a section container
      const sectionEl = target.closest("[data-section-id]") as HTMLElement | null
      if (sectionEl && detail.imageUrl) {
        const sectionId = sectionEl.dataset.sectionId!
        const section = sections.find((s) => s.id === sectionId)
        if (section) {
          suppressNextSectionClickRef.current = true
          const galleryImageEl = target.closest("[data-gallery-image-index]") as HTMLElement | null
          const galleryImageIndex = galleryImageEl
            ? Number(galleryImageEl.dataset.galleryImageIndex)
            : undefined
          const aboutImageEl = target.closest("[data-about-image-index]") as HTMLElement | null
          const aboutImageIndex = aboutImageEl
            ? Number(aboutImageEl.dataset.aboutImageIndex)
            : undefined

          if (section.type === "gallery") {
            updateGalleryImage(
              section,
              detail.imageUrl,
              Number.isFinite(galleryImageIndex) ? galleryImageIndex : undefined,
            )
          } else if (section.type === "about") {
            updateAboutImage(
              section,
              detail.imageUrl,
              Number.isFinite(aboutImageIndex) ? aboutImageIndex : undefined,
            )
          } else {
            updateSection(sectionId, {
              styles: { ...(section.styles ?? {}), backgroundImage: detail.imageUrl },
            })
          }
          window.setTimeout(() => {
            suppressNextSectionClickRef.current = false
          }, 350)
        }
        setIsDraggingImage(false)
        return
      }

      // Fallback: if it landed inside the canvas, append to end
      if (detail.sectionType) {
        const sectionType = detail.sectionType as SectionType
        const tempId = `section-${Date.now()}`
        const newSection: Section = {
          id: tempId,
          type: sectionType,
          data: getDefaultSectionData(sectionType),
          styles: {},
        }
        persistSections([...sections, newSection])
        setIsDraggingNewSection(false)
      }
    }

    document.addEventListener("touchdragstart", onTouchDragStart)
    document.addEventListener("touchdragend", onTouchDragEnd)
    document.addEventListener("touchdrop", onTouchDrop)
    return () => {
      document.removeEventListener("touchdragstart", onTouchDragStart)
      document.removeEventListener("touchdragend", onTouchDragEnd)
      document.removeEventListener("touchdrop", onTouchDrop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, onSectionSelect])

  /* -----------------------------
     Drag & Drop helpers
  ------------------------------ */

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString())
    e.dataTransfer.effectAllowed = "move"
    setDraggingSectionIndex(index)
  }

  const handleDragEnd = () => {
    setDraggingSectionIndex(null)
    setHoverDropIndex(null)
    setIsDraggingNewSection(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    const sectionType = e.dataTransfer.types.includes("sectiontype")  // Fixed typo: was "sectiontype"
    const imageUrl = e.dataTransfer.types.includes("imageurl")
    e.dataTransfer.dropEffect = sectionType ? "copy" : imageUrl ? "copy" : "move"
    if (sectionType) {
      setIsDraggingNewSection(true)
    }
    if (imageUrl) {
      setIsDraggingImage(true)
    }
  }

  const handleDragOverGap = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setHoverDropIndex(index)
  }

  const handleDragLeaveGap = () => {
    setHoverDropIndex(null)
  }

  const getGalleryImages = (section: Section) => {
    const images = section.data?.images
    if (Array.isArray(images)) return [...images] as string[]
    if (images && typeof images === "object") {
      const imageObject = images as Record<string, string>
      const count = (section.data.image_count as number) || Object.keys(imageObject).length
      return Array.from({ length: count }, (_, index) => imageObject[index.toString()] || "")
    }

    const count = (section.data?.image_count as number) || 6
    return DEFAULT_GALLERY_IMAGES.slice(0, count)
  }

  const updateGalleryImage = (section: Section, imageUrl: string, targetIndex?: number) => {
    const images = getGalleryImages(section)
    const fallbackIndex = images.findIndex((image) => !image || image.includes("/placeholder.svg"))
    const index = typeof targetIndex === "number" && targetIndex >= 0
      ? targetIndex
      : fallbackIndex >= 0
        ? fallbackIndex
        : images.length

    const nextImages = [...images]
    nextImages[index] = imageUrl

    updateSection(section.id, {
      data: {
        ...section.data,
        images: nextImages,
        image_count: nextImages.length,
      },
    })
  }

  const getDefaultSectionData = (type: SectionType): Record<string, unknown> =>
    getRegistryDefaultSectionData(type, { businessId })

  const selectSection = (id: string) => {
    if (isPreview) return
    onSectionSelect(id)
  }

  const updateAboutImage = (section: Section, imageUrl: string, targetIndex?: number) => {
    const currentImages = Array.isArray(section.data?.images)
      ? section.data.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
      : []
    const index = typeof targetIndex === "number" && targetIndex >= 0 ? targetIndex : currentImages.length
    const nextImages = [...currentImages]
    nextImages[index] = imageUrl

    updateSection(section.id, {
      data: {
        ...section.data,
        images: nextImages,
      },
    })
  }

  const handleDropOnGap = async (e: React.DragEvent, index: number) => {
    e.preventDefault()

    const sectionType = e.dataTransfer.getData("sectionType") as SectionType
    if (sectionType) {
      const tempId = `section-${Date.now()}`
      const newSection: Section = {
        id: tempId,
        type: sectionType,
        data: getDefaultSectionData(sectionType),
        styles: {},
      }

      const newSections = [...sections]
      newSections.splice(index, 0, newSection)
      persistSections(newSections)
      setHoverDropIndex(null)
      setIsDraggingNewSection(false)
      return
    }

    const draggedIndexData = e.dataTransfer.getData("text/plain")
    const draggedIndex = Number.parseInt(draggedIndexData)

    if (Number.isNaN(draggedIndex)) return
    if (draggedIndex === index || draggedIndex === index - 1) {
      setHoverDropIndex(null)
      setDraggingSectionIndex(null)
      return
    }

    const newSections = [...sections]
    const [removed] = newSections.splice(draggedIndex, 1)
    const targetIndex = draggedIndex < index ? index - 1 : index
    newSections.splice(targetIndex, 0, removed)

    persistSections(newSections)
    setHoverDropIndex(null)
    setDraggingSectionIndex(null)
  }

  const handleDragOverSection = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDropOnSection = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault()

    const imageUrl = e.dataTransfer.getData("imageUrl")
    if (imageUrl) {
      // Update the section's styles to set backgroundImage
      const section = sections.find(s => s.id === sectionId)
      if (section) {
        suppressNextSectionClickRef.current = true
        if (section.type === "gallery") {
          updateGalleryImage(section, imageUrl)
        } else if (section.type === "about") {
          const aboutImageEl = (e.target as HTMLElement).closest("[data-about-image-index]") as HTMLElement | null
          const aboutImageIndex = aboutImageEl ? Number(aboutImageEl.dataset.aboutImageIndex) : undefined
          updateAboutImage(section, imageUrl, Number.isFinite(aboutImageIndex) ? aboutImageIndex : undefined)
        } else {
          updateSection(sectionId, {
            styles: { ...section.styles, backgroundImage: imageUrl }
          })
        }
        window.setTimeout(() => {
          suppressNextSectionClickRef.current = false
        }, 350)
      }
    }

    setHoverDropIndex(null)
    setDraggingSectionIndex(null)
    setIsDraggingNewSection(false)
    setIsDraggingImage(false)
  }

  /* -----------------------------
     Section actions
  ------------------------------ */

  // Animate reordering using FLIP when triggered by up/down buttons
  const moveSectionAnimated = async (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return

    // capture before positions
    const beforeRects = new Map<string, DOMRect>()
    sectionRefs.current.forEach((el, id) => {
      if (el) beforeRects.set(id, el.getBoundingClientRect())
    })

    // perform the reorder in state
    const newSections = [...sections]
    const [item] = newSections.splice(from, 1)
    newSections.splice(to, 0, item)
    persistSections(newSections)

    // wait for DOM update
    await new Promise((res) => requestAnimationFrame(res))

    // capture after positions and apply inverse transforms
    sectionRefs.current.forEach((el, id) => {
      const before = beforeRects.get(id)
      const after = el?.getBoundingClientRect()
      if (!before || !after || !el) return
      const deltaY = before.top - after.top
      if (deltaY === 0) return

      // apply inverse transform instantly (no transition)
      el.style.transition = 'none'
      el.style.transform = `translateY(${deltaY}px)`

      // force reflow to make the transform take effect
       
      el.getBoundingClientRect()

      // then animate to natural position
      requestAnimationFrame(() => {
        el.style.transition = 'transform 220ms cubic-bezier(.2,.8,.2,1)'
        el.style.transform = 'translateY(0)'
      })

      const cleanup = () => {
        try {
          el.style.transition = ''
          el.style.transform = ''
        } catch {
          /* ignore */
        }
        el.removeEventListener('transitionend', cleanup)
      }

      el.addEventListener('transitionend', cleanup)
      // safety cleanup
      setTimeout(cleanup, 350)
    })
  }

  const handleDelete = (id: string) => {
    persistSections(sections.filter((s) => s.id !== id))
    if (selectedSectionId === id) {
      onSectionSelect(null)
    }
  }

  const updateSection = (id: string, newData: Partial<Section>) => {
    onSectionUpdate(id, newData)
  }

  /* -----------------------------
     Device width
  ------------------------------ */

  const getDeviceWidth = () => {
    switch (device) {
      case "mobile":
        return "max-w-[375px]"
      case "tablet":
        return "max-w-[768px]"
      default:
        return "max-w-7xl"
    }
  }

  /* -----------------------------
     Render
  ------------------------------ */

  return (
    <main
      ref={canvasRef}
      className="flex-1 overflow-auto bg-muted"
      onDragOver={handleDragOver}
    >
      <div className={isPreview ? "" : "p-3 sm:p-4 md:p-8"}>
        <div className={`mx-auto ${getDeviceWidth()} transition-all duration-300`}>
          {!isPreview && sections.length === 0 && !tutorialDismissed && (
            <div
              className={`flex ${showNewSectionDropTargets ? "min-h-[420px] md:min-h-[600px]" : "min-h-[360px] md:min-h-[500px]"} items-center justify-center rounded-lg border-2 border-dashed ${showNewSectionDropTargets ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-background/50"} animate-in fade-in slide-in-from-bottom-4 duration-500 transition-all`}
              onDragOver={(e) => handleDragOverGap(e, 0)}
              onDragLeave={handleDragLeaveGap}
              onDrop={(e) => handleDropOnGap(e, 0)}
            >
              <div className="mx-auto grid max-w-xl gap-5 px-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Start met een basisopzet</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Deze website heeft nog geen inhoud. Maak in een keer een duidelijke startpagina en pas daarna meteen de eerste tekst aan.
                  </p>
                </div>
                <div className="grid gap-2 rounded-md border border-border bg-muted/50 p-3 text-left text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>Voegt vier blokken toe: intro bovenaan, over ons, aanbod en contact.</span>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>Opent daarna direct de intro zodat u de titel en knoptekst kunt aanpassen.</span>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-2 sm:flex-row">
                  <Button type="button" onClick={onStartTutorial} disabled={!onStartTutorial}>
                    Basisopzet maken
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setTutorialDismissed(true)}>
                    Zelf secties kiezen
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isPreview && (
            <div
              data-drop-gap="0"
              className={`mb-4 transition-all duration-200 ${
                hoverDropIndex === 0 || showNewSectionDropTargets ? "h-16 opacity-100" : "h-2 opacity-0"
              }`}
              onDragOver={(e) => handleDragOverGap(e, 0)}
              onDragLeave={handleDragLeaveGap}
              onDrop={(e) => handleDropOnGap(e, 0)}
            >
              <div className="h-full rounded-lg border-2 border-dashed border-primary bg-primary/5 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">Hier neerzetten</span>
              </div>
            </div>
          )}

          <div className="website-theme-scope" style={themeScopeStyle}>
          {themedSections.map((section, i) => {
            const next = themedSections[i + 1]
            const transitionCandidate = next
              ? transitionsByPair.get(`${section.id}:${next.id}`) ?? null
              : null
            const transitionToNext = transitionCandidate?.type !== "none" ? transitionCandidate : null
            const sectionLabel = getSectionDefinition(section.type)?.label ?? section.type.replace("_", " ")
            const isSelected = selectedSectionId === section.id

            const content = (
              <React.Fragment>
                <div
                  ref={(el) => {
                    if (el) sectionRefs.current.set(section.id, el)
                    else sectionRefs.current.delete(section.id)
                  }}
                  data-section-id={section.id}
                  aria-label={`${sectionLabel} sectie${isSelected ? ", geselecteerd" : ""}`}
                  aria-selected={isSelected}
                  className={`group relative ${!isPreview ? "mb-4" : ""} ${
                    draggingSectionIndex === i ? "opacity-50" : ""
                  } ${showImageDropTargets ? "rounded-lg ring-2 ring-primary/50 ring-offset-2" : ""
                  } transition-all duration-200`}
                  draggable={!isPreview}
                  tabIndex={isPreview ? undefined : 0}
                  onClickCapture={(event) => {
                    if (isPreview) return
                    if (suppressNextSectionClickRef.current) {
                      suppressNextSectionClickRef.current = false
                      event.stopPropagation()
                      return
                    }
                    selectSection(section.id)
                  }}
                  onFocus={() => {
                    if (!isPreview && selectedSectionId !== section.id) {
                      onSectionSelect(section.id)
                    }
                  }}
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOverSection}
                  onDrop={(e) => handleDropOnSection(e, section.id)}
                >
                  {!isPreview && (
                    <div
                      className={`absolute section-actions left-1/2 top-0 z-10 flex -translate-x-1/2 gap-1 rounded-lg border bg-background p-1 shadow-lg transition-all ${
                        selectedSectionId === section.id
                          ? "-translate-y-full opacity-100"
                          : "-translate-y-2 opacity-0 pointer-events-none"
                      }`}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 cursor-grab active:cursor-grabbing popup-btn"
                        aria-label={`${sectionLabel} verslepen`}
                        title={`${sectionLabel} verslepen`}
                      >
                        <GripVertical className="h-4 w-4" />
                      </Button>
                      <div className="h-6 w-px bg-border" />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveSectionAnimated(i, i - 1)}
                        disabled={i === 0}
                        className="h-7 w-7 popup-btn"
                        aria-label={`${sectionLabel} omhoog verplaatsen`}
                        title={`${sectionLabel} omhoog verplaatsen`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveSectionAnimated(i, i + 1)}
                        disabled={i === sections.length - 1}
                        className="h-7 w-7 popup-btn"
                        aria-label={`${sectionLabel} omlaag verplaatsen`}
                        title={`${sectionLabel} omlaag verplaatsen`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <div className="h-6 w-px bg-border" />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 popup-btn"
                        onClick={() => handleDelete(section.id)}
                        aria-label={`${sectionLabel} verwijderen`}
                        title={`${sectionLabel} verwijderen`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {isSelected && !isPreview ? (
                    <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-sm">
                      Geselecteerd: {sectionLabel}
                    </div>
                  ) : null}

                  <div
                    id={isPreview && section.type !== "nav" && section.type !== "footer" ? `section-${section.id}` : undefined}
                    className={`${!isPreview ? "cursor-pointer rounded-lg border bg-background shadow-sm transition-all hover:shadow-md" : ""} ${
                      showImageDropTargets && !isPreview
                        ? "border-primary bg-primary/5 shadow-lg"
                        : ""
                    } ${
                      isSelected && !isPreview
                        ? "ring-2 ring-primary ring-offset-2 shadow-lg"
                        : ""
                    }`}
                    onClick={() => selectSection(section.id)}
                  >
                    <SectionRenderer
                      section={section}
                      isPreview={isPreview}
                      onUpdate={(data) => updateSection(section.id, { data })}
                      wrapTransition={false}
                      allSections={section.type === "nav" || section.type === "footer" ? sections : undefined}
                      device={device}
                    />
                  </div>
                </div>

                {!isPreview && (
                  <div
                    data-drop-gap={i + 1}
                    className={`transition-all duration-200 ${
                      hoverDropIndex === i + 1 || showNewSectionDropTargets ? "h-16 mb-4 opacity-100" : "h-2 mb-4 opacity-0"
                    }`}
                    onDragOver={(e) => handleDragOverGap(e, i + 1)}
                    onDragLeave={handleDragLeaveGap}
                    onDrop={(e) => handleDropOnGap(e, i + 1)}
                  >
 <div className="h-full rounded-lg border-2 border-dashed border-primary bg-primary/5 flex items-center justify-center">
 <span className="text-xs font-medium text-primary">Hier neerzetten</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            )

            // If there's a transition to the next section, render an explicit
            // visual separator between this section and the next
            if (transitionToNext && next) {
              const transitionLabels: Record<Transition["type"], string> = {
                none: "Geen",
                fade: "Vervagen",
                gradient: "Verloop",
                slide: "Schuiven",
                wave: "Golf",
                curve: "Kromme",
                diagonal: "Diagonaal",
                zigzag: "Zigzag",
                split: "Splitsen",
              }
              const fromColor = section.styles?.backgroundColor || "#ffffff"
              const toColor = next.styles?.backgroundColor || "#fafaf9"

              return (
                <React.Fragment key={section.id}>
                  {content}
                  <div
                    className={`relative overflow-hidden ${isPreview ? "" : "mb-4 rounded-lg border border-dashed border-primary/50 bg-background shadow-sm"}`}
                    aria-label={`Voorbeeld van overgang: ${transitionLabels[transitionToNext.type]}`}
                  >
                    {!isPreview ? (
                      <span className="absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-full border border-primary/20 bg-background/90 px-2 py-0.5 text-[10px] font-medium text-primary shadow-sm backdrop-blur">
                        Overgang: {transitionLabels[transitionToNext.type]}
                      </span>
                    ) : null}
                    <TransitionWrapper
                      key={`${section.id}-${next.id}-${transitionToNext.type}`}
                      type={transitionToNext.type}
                      position="center"
                      fromColor={fromColor}
                      toColor={toColor}
                    />
                  </div>
                </React.Fragment>
              )
            }

            return <React.Fragment key={section.id}>{content}</React.Fragment>
          })}
          </div>
        </div>
      </div>
    </main>
  )
}

