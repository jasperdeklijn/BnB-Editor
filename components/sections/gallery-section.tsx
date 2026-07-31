"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "sonner"

import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { normalizeSectionLayout } from "@/lib/section-layouts"
import { getSectionColorVars } from "@/lib/section-colors"
import { DEFAULT_GALLERY_IMAGES } from "@/lib/business-naming"

export type GalleryLayout = "grid" | "vertical-carousel" | "horizontal-carousel" | "masonry" | "single-with-thumbs" | "full-slider"

const galleryLayoutMap = {
  classic: "grid",
  split: "vertical-carousel",
  showcase: "full-slider",
  compact: "horizontal-carousel",
  card: "single-with-thumbs",
  banner: "masonry",
} as const

interface GallerySectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

export function GallerySection({ data, isPreview, styles, onUpdate }: GallerySectionProps) {
  const title = data.title as string
  const subtitle = data.subtitle as string
  const layout = (galleryLayoutMap[normalizeSectionLayout(data.layout)] ?? "grid") as GalleryLayout

  const images = Array.isArray(data.images)
    ? data.images.filter((image): image is string => typeof image === "string")
    : DEFAULT_GALLERY_IMAGES

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)

  const sectionStyle: React.CSSProperties = {
    ...getSectionColorVars(styles),
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }

  const textStyle: React.CSSProperties = {
    color: styles?.textColor,
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Prevent section-level drag reordering from interfering with image reordering
    e.stopPropagation()

    if (isPreview) return

    setDraggedIndex(index)
    // Allow both copy and move, and ensure the browser allows dropping where possible
    e.dataTransfer.effectAllowed = "all"
    e.dataTransfer.setData("text/plain", index.toString())
    e.dataTransfer.setData("imageIndex", index.toString())
    e.dataTransfer.setData("imageurl", images[index] || "")

  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "copy"
    setDragOverIndex(index)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIndex(null)

    // Prefer drag index from dataTransfer (more reliable across render updates)
    const draggedIndexRaw = e.dataTransfer.getData("imageIndex") || e.dataTransfer.getData("text/plain")
    const draggedFromIndex = Number.isFinite(Number(draggedIndexRaw)) ? Number(draggedIndexRaw) : draggedIndex
    const draggedImageUrl = e.dataTransfer.getData("imageurl") || e.dataTransfer.getData("imageUrl")

    // Clear state after reading it
    setDraggedIndex(null)

    // If we're dragging from outside (no index), but have an image URL, set the target slot
    if ((draggedFromIndex === null || Number.isNaN(draggedFromIndex)) && draggedImageUrl) {
      const newImages = [...images]
      newImages[toIndex] = draggedImageUrl

      onUpdate?.({
        ...data,
        images: newImages,
      })

      toast.success("Image updated", {
        position: "bottom-right",
        duration: 2000,
      })
      return
    }

    if (!onUpdate || draggedFromIndex === null || Number.isNaN(draggedFromIndex)) {
      return
    }
    if (draggedFromIndex === toIndex) {
      return
    }

    // Reorder images
    const newImages = [...images]
    const [movedImage] = newImages.splice(draggedFromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)

    onUpdate({
      ...data,
      images: newImages,
    })

    toast.success("Images reordered", {
      position: "bottom-right",
      duration: 2000,
    })
  }

  // Layout: Grid (default)
  if (layout === "grid") {
    return (
      <section className={`bg-background px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
        <div className="mx-auto max-w-6xl">
          <EditableText
            as="h2"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
            style={textStyle}
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <div
                key={index}
                data-gallery-image-index={index}
                className={`aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 ring-1 ring-[var(--section-accent)] transition-all duration-200 ${
                  dragOverIndex === index ? "scale-95 shadow-lg ring-2 ring-[var(--section-accent)]" : ""
                } ${draggedIndex === index ? "opacity-50" : ""}`}
                draggable={!isPreview}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <img
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  draggable={!isPreview}
                  className={`h-full w-full object-cover ${!isPreview ? "cursor-move" : "cursor-default"}`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Layout: Vertical Carousel on Right with Text on Left
  if (layout === "vertical-carousel") {
    return (
      <section className={`bg-background px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Text Side */}
            <div className="flex-1">
              <EditableText
                as="h2"
                data={data}
                path={["title"]}
                value={title}
                isPreview={isPreview}
                onUpdate={onUpdate}
                className="mb-4 text-balance text-2xl font-bold text-amber-950 sm:text-3xl md:text-4xl"
                style={textStyle}
              />
              {subtitle && (
                <EditableText
                  as="p"
                  data={data}
                  path={["subtitle"]}
                  value={subtitle}
                  isPreview={isPreview}
                  onUpdate={onUpdate}
                  multiline
                  className="text-pretty text-base text-amber-800 sm:text-lg"
                  style={textStyle}
                />
              )}
            </div>
            {/* Carousel Side */}
            <div className="flex-1">
              <div className="relative h-96 overflow-hidden rounded-lg">
                <div className="flex flex-col space-y-2 h-full overflow-y-auto">
                  {images.map((image, index) => (
                    <div
                      key={index}
                      data-gallery-image-index={index}
                      className={`aspect-video flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 ring-1 ring-[var(--section-accent)] transition-all duration-200 ${
                        dragOverIndex === index ? "scale-95 shadow-lg ring-2 ring-[var(--section-accent)]" : ""
                      } ${draggedIndex === index ? "opacity-50" : ""}`}
                      draggable={!isPreview}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <img
                        src={image}
                        alt={`Gallery image ${index + 1}`}
                        draggable={!isPreview}
                        className={`h-full w-full object-cover ${!isPreview ? "cursor-move" : "cursor-default"}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Layout: Horizontal Carousel
  if (layout === "horizontal-carousel") {
    return (
      <section className={`bg-background px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
        <div className="mx-auto max-w-6xl">
          <EditableText
            as="h2"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
            style={textStyle}
          />
          <div className="overflow-x-auto">
            <div className="flex space-x-4 pb-4">
              {images.map((image, index) => (
                <div
                  key={index}
                  data-gallery-image-index={index}
                  className={`aspect-video w-80 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 ring-1 ring-[var(--section-accent)] transition-all duration-200 ${
                    dragOverIndex === index ? "scale-95 shadow-lg ring-2 ring-[var(--section-accent)]" : ""
                  } ${draggedIndex === index ? "opacity-50" : ""}`}
                  draggable={!isPreview}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <img
                    src={image}
                    alt={`Gallery image ${index + 1}`}
                    draggable={!isPreview}
                    className={`h-full w-full object-cover ${!isPreview ? "cursor-move" : "cursor-default"}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Layout: Masonry Grid
  if (layout === "masonry") {
    return (
      <section className={`bg-background px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
        <div className="mx-auto max-w-6xl">
          <EditableText
            as="h2"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
            style={textStyle}
          />
          <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 md:columns-4">
            {images.map((image, index) => (
              <div
                key={index}
                data-gallery-image-index={index}
                className={`mb-3 break-inside-avoid overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 ring-1 ring-[var(--section-accent)] transition-all duration-200 ${
                  dragOverIndex === index ? "scale-95 shadow-lg ring-2 ring-[var(--section-accent)]" : ""
                } ${draggedIndex === index ? "opacity-50" : ""}`}
                draggable={!isPreview}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <img
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  draggable={!isPreview}
                  className={`w-full object-cover h-auto ${!isPreview ? "cursor-move" : "cursor-default"}`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Layout: Single Large Image with Thumbnails
  if (layout === "single-with-thumbs") {
    return (
      <section className={`bg-background px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
        <div className="mx-auto max-w-6xl">
          <EditableText
            as="h2"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
            style={textStyle}
          />
          <div className="space-y-4">
            {/* Main Image */}
            <div
              data-gallery-image-index={activeIndex}
              className={`aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 ring-1 ring-[var(--section-accent)] transition-all duration-200 ${
                dragOverIndex === activeIndex ? "shadow-lg ring-2 ring-[var(--section-accent)]" : ""
              }`}
              onDragOver={!isPreview ? (e) => handleDragOver(e, activeIndex) : undefined}
              onDragLeave={!isPreview ? handleDragLeave : undefined}
              onDrop={!isPreview ? (e) => handleDrop(e, activeIndex) : undefined}
            >
              <img
                src={images[activeIndex]}
                alt={`Gallery image ${activeIndex + 1}`}
                draggable={!isPreview}
                className={`h-full w-full object-cover ${!isPreview ? "cursor-move" : "cursor-default"}`}
              />
            </div>
            {/* Thumbnails */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <div
                  key={index}
                  data-gallery-image-index={index}
                  className={`aspect-video w-20 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 ring-1 ring-[var(--section-accent)] transition-all duration-200 ${
                    index === activeIndex ? "ring-2 ring-[var(--section-accent)]" : ""
                  } ${dragOverIndex === index ? "scale-95 shadow-lg ring-2 ring-[var(--section-accent)]" : ""} ${
                    draggedIndex === index ? "opacity-50" : ""
                  }`}
                  onClick={() => setActiveIndex(index)}
                  onDragOver={!isPreview ? (e) => handleDragOver(e, index) : undefined}
                  onDragLeave={!isPreview ? handleDragLeave : undefined}
                  onDrop={!isPreview ? (e) => handleDrop(e, index) : undefined}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    draggable={!isPreview}
                    className={`h-full w-full object-cover ${!isPreview ? "cursor-move" : "cursor-default"}`}
                    onDragStart={!isPreview ? (e) => handleDragStart(e, index) : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Layout: Full Width Slider
  if (layout === "full-slider") {
    return (
      <section className={`relative overflow-hidden ${styles?.fontFamily || ""}`} style={sectionStyle}>
        <div className="relative h-96 sm:h-[500px] md:h-[600px]">
          {images.map((image, index) => (
            <div
              key={index}
              data-gallery-image-index={index}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={image}
                alt={`Gallery image ${index + 1}`}
                draggable={!isPreview}
                className={`h-full w-full object-cover ${!isPreview ? "cursor-move" : "cursor-default"}`}
              />
            </div>
          ))}
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30" />
          {/* Title */}
          <div className="absolute inset-0 flex items-center justify-center">
            <EditableText
              as="h2"
              data={data}
              path={["title"]}
              value={title}
              isPreview={isPreview}
              onUpdate={onUpdate}
              className="text-balance text-center text-3xl font-bold text-white drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl"
              style={styles?.textColor ? textStyle : undefined}
            />
          </div>
          {/* Navigation */}
          <button
            onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-[var(--section-accent)] p-2 text-[var(--section-accent-foreground)] backdrop-blur-sm transition-all hover:brightness-90"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-[var(--section-accent)] p-2 text-[var(--section-accent-foreground)] backdrop-blur-sm transition-all hover:brightness-90"
          >
            ›
          </button>
        </div>
      </section>
    )
  }

  // Fallback to grid
  return null
}
