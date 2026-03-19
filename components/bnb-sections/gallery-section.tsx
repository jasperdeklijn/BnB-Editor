"use client"

import type React from "react"
import { useState } from "react"

import type { SectionStyles } from "@/lib/types"

export type GalleryLayout = "grid" | "vertical-carousel" | "horizontal-carousel" | "masonry" | "single-with-thumbs" | "full-slider"

interface GallerySectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

export function GallerySection({ data, isPreview, styles, onUpdate }: GallerySectionProps) {
  const title = data.title as string
  const subtitle = data.subtitle as string
  const layout = (data.layout as GalleryLayout) || "grid"

  // Handle both array of images and legacy imageCount
  const images = Array.isArray(data.images)
    ? (data.images as string[])
    : Array.from({ length: (data.images as number) || 6 }, (_, index) =>
        `/placeholder.svg?height=400&width=400&query=bed+and+breakfast+interior+${index + 1}`
      )

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }

  const textStyle: React.CSSProperties = {
    color: styles?.textColor,
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("imageIndex", index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    setDraggedIndex(null)

    if (!onUpdate || draggedIndex === null) return
    if (draggedIndex === toIndex) return

    // Reorder images
    const newImages = [...images]
    const [movedImage] = newImages.splice(draggedIndex, 1)
    newImages.splice(toIndex, 0, movedImage)

    onUpdate({ images: newImages })
  }

  // Layout: Grid (default)
  if (layout === "grid") {
    return (
      <section className={`bg-background px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
        <div className="mx-auto max-w-6xl">
          <h2
            className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
            style={textStyle}
          >
            {title}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <div
                key={index}
                className={`aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 transition-all duration-200 ${
                  dragOverIndex === index ? "ring-4 ring-amber-500 ring-offset-2 scale-95" : ""
                } ${draggedIndex === index ? "opacity-50" : ""}`}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <img
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  className="h-full w-full object-cover cursor-move"
                  draggable={!isPreview}
                  onDragStart={(e) => handleDragStart(e, index)}
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
              <h2
                className="mb-4 text-balance text-2xl font-bold text-amber-950 sm:text-3xl md:text-4xl"
                style={textStyle}
              >
                {title}
              </h2>
              {subtitle && (
                <p
                  className="text-pretty text-base text-amber-800 sm:text-lg"
                  style={textStyle}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {/* Carousel Side */}
            <div className="flex-1">
              <div className="relative h-96 overflow-hidden rounded-lg">
                <div className="flex flex-col space-y-2 h-full overflow-y-auto">
                  {images.map((image, index) => (
                    <div
                      key={index}
                      className={`aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 transition-all duration-200 flex-shrink-0 ${
                        dragOverIndex === index ? "ring-4 ring-amber-500 ring-offset-2 scale-95" : ""
                      } ${draggedIndex === index ? "opacity-50" : ""}`}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <img
                        src={image}
                        alt={`Gallery image ${index + 1}`}
                        className="h-full w-full object-cover cursor-move"
                        draggable={!isPreview}
                        onDragStart={(e) => handleDragStart(e, index)}
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
          <h2
            className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
            style={textStyle}
          >
            {title}
          </h2>
          <div className="overflow-x-auto">
            <div className="flex space-x-4 pb-4">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 w-80 aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 transition-all duration-200 ${
                    dragOverIndex === index ? "ring-4 ring-amber-500 ring-offset-2 scale-95" : ""
                  } ${draggedIndex === index ? "opacity-50" : ""}`}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <img
                    src={image}
                    alt={`Gallery image ${index + 1}`}
                    className="h-full w-full object-cover cursor-move"
                    draggable={!isPreview}
                    onDragStart={(e) => handleDragStart(e, index)}
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
          <h2
            className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
            style={textStyle}
          >
            {title}
          </h2>
          <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 md:columns-4">
            {images.map((image, index) => (
              <div
                key={index}
                className={`mb-3 overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 break-inside-avoid transition-all duration-200 ${
                  dragOverIndex === index ? "ring-4 ring-amber-500 ring-offset-2 scale-95" : ""
                } ${draggedIndex === index ? "opacity-50" : ""}`}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <img
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full object-cover cursor-move h-auto"
                  draggable={!isPreview}
                  onDragStart={(e) => handleDragStart(e, index)}
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
    const [activeIndex, setActiveIndex] = useState(0)
    return (
      <section className={`bg-background px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
        <div className="mx-auto max-w-6xl">
          <h2
            className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
            style={textStyle}
          >
            {title}
          </h2>
          <div className="space-y-4">
            {/* Main Image */}
            <div
              className={`aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 transition-all duration-200 ${
                dragOverIndex === activeIndex ? "ring-4 ring-amber-500 ring-offset-2" : ""
              }`}
              onDragOver={(e) => handleDragOver(e, activeIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, activeIndex)}
            >
              <img
                src={images[activeIndex]}
                alt={`Gallery image ${activeIndex + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
            {/* Thumbnails */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 w-20 aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 cursor-pointer transition-all duration-200 ${
                    index === activeIndex ? "ring-2 ring-amber-500" : ""
                  } ${dragOverIndex === index ? "ring-4 ring-amber-500 ring-offset-2 scale-95" : ""} ${
                    draggedIndex === index ? "opacity-50" : ""
                  }`}
                  onClick={() => setActiveIndex(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="h-full w-full object-cover cursor-move"
                    draggable={!isPreview}
                    onDragStart={(e) => handleDragStart(e, index)}
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
    const [currentIndex, setCurrentIndex] = useState(0)
    return (
      <section className={`relative overflow-hidden ${styles?.fontFamily || ""}`} style={sectionStyle}>
        <div className="relative h-96 sm:h-[500px] md:h-[600px]">
          {images.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={image}
                alt={`Gallery image ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30" />
          {/* Title */}
          <div className="absolute inset-0 flex items-center justify-center">
            <h2
              className="text-balance text-center text-3xl font-bold text-white drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl"
              style={styles?.textColor ? textStyle : undefined}
            >
              {title}
            </h2>
          </div>
          {/* Navigation */}
          <button
            onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
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
