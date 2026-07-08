"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Layers,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import type { SectionType } from "@/lib/types"
import { selectableSectionDefinitions } from "@/components/editor/section-registry"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { useTouchDrag } from "@/hooks/use-touch-drag"

// ----- Sub-components so each draggable item can call the hook independently -----

interface SectionCardProps {
  type: SectionType
  label: string
  Icon: React.ComponentType<{ className?: string }>
  description: string
  collapsed: boolean
  isDragging: boolean
  onDragStart: (e: React.DragEvent, type: SectionType) => void
  onDragEnd: () => void
}

function SectionCard({ type, label, Icon, description, collapsed, isDragging, onDragStart, onDragEnd }: SectionCardProps) {
  const { onTouchStart, onTouchMove, onTouchEnd } = useTouchDrag({ payload: { sectionType: type } })
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      onDragEnd={onDragEnd}
      onTouchStart={(e) => onTouchStart(e, label)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: "none" }}
      className={`group relative flex cursor-grab items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary active:cursor-grabbing active:scale-95 select-none ${
        collapsed ? "justify-center px-2 py-3" : ""
      } ${isDragging ? "opacity-50 scale-95" : ""}`}
      title={`${label}: ${description}`}
    >
      <div className="flex-shrink-0 rounded-md bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      )}
      <div
        className={`absolute inset-0 rounded-lg bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100 ${
          collapsed ? "hidden" : ""
        }`}
      />
    </div>
  )
}

interface ImageCardProps {
  name: string
  url: string
  collapsed: boolean
  isDragging: boolean
  onDragStart: (e: React.DragEvent, url: string) => void
  onDragEnd: () => void
}

function ImageCard({ name, url, collapsed, isDragging, onDragStart, onDragEnd }: ImageCardProps) {
  const { onTouchStart, onTouchMove, onTouchEnd } = useTouchDrag({ payload: { imageUrl: url } })
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, url)}
      onDragEnd={onDragEnd}
      onTouchStart={(e) => onTouchStart(e, name)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: "none" }}
      className={`rounded-lg border border-border bg-card p-1 shadow-sm cursor-move hover:border-primary transition-all duration-200 select-none ${
        isDragging ? "ring-4 ring-primary shadow-xl scale-105 bg-secondary" : ""
      }`}
      title={name}
    >
      <img src={url} alt={name} className={`${collapsed ? "h-10" : "h-12"} w-full object-cover rounded`} />
      {!collapsed && (
        <div className="text-[10px] text-muted-foreground truncate text-center mt-1">{name}</div>
      )}
    </div>
  )
}

// ----- Main component -----

interface SectionsSelectorProps {
  className?: string
  userId?: string
  /** Called on mobile after a touch-drag drop so the parent can switch back to the canvas panel */
  onSectionAdded?: () => void
}

export function SectionsSelector({ className = "", userId, onSectionAdded }: SectionsSelectorProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [draggingType, setDraggingType] = useState<SectionType | null>(null)
  const [tab, setTab] = useState("sections")
  const [images, setImages] = useState<{ name: string; url: string }[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [draggingImage, setDraggingImage] = useState<string | null>(null)

  // Listen for touch drag drops so we can call onSectionAdded
  useEffect(() => {
    const handler = () => {
      if (onSectionAdded) onSectionAdded()
    }
    document.addEventListener("touchdrop", handler)
    return () => document.removeEventListener("touchdrop", handler)
  }, [onSectionAdded])

  // Fetch images from Supabase when switching to images tab
  useEffect(() => {
    if (tab === "images" && userId) {
      setIsLoadingImages(true)
      const supabase = createClient()
      supabase.storage
        .from("user-images")
        .list(userId, { limit: 100, sortBy: { column: "created_at", order: "desc" } })
        .then(({ data, error }) => {
          if (error) {
            setImages([])
            setIsLoadingImages(false)
            return
          }
          if (!data) {
            setImages([])
            setIsLoadingImages(false)
            return
          }
          const validFiles = data.filter((file) => file.name !== ".emptyFolderPlaceholder")
          if (validFiles.length === 0) {
            setImages([])
            setIsLoadingImages(false)
            return
          }

          const pics = validFiles
            .map((file) => {
              const { data: urlData } = supabase.storage
                .from("user-images")
                .getPublicUrl(`${userId}/${file.name}`)
              return {
                name: file.name,
                url: urlData.publicUrl || "",
              }
            })
            .filter((img) => img.url)

          setImages(pics)
          setIsLoadingImages(false)
        })
    }
  }, [tab, userId])

  const handleDragStart = (e: React.DragEvent, type: SectionType) => {
    e.dataTransfer.setData("sectionType", type)
    e.dataTransfer.effectAllowed = "copy"
    setDraggingType(type)
  }

  const handleDragEnd = () => {
    setDraggingType(null)
  }

  const handleImageDragStart = (e: React.DragEvent, url: string) => {
    e.dataTransfer.setData("imageUrl", url)
    e.dataTransfer.effectAllowed = "copy"

    const sourceImage = e.currentTarget.querySelector("img")
    if (sourceImage) {
      const dragImage = sourceImage.cloneNode(true) as HTMLImageElement
      dragImage.style.cssText = [
        "position:fixed",
        "top:-1000px",
        "left:-1000px",
        "width:56px",
        "height:42px",
        "object-fit:cover",
        "border-radius:8px",
        "border:2px solid white",
        "box-shadow:0 8px 24px rgba(0,0,0,0.28)",
      ].join(";")
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, 28, 21)
      window.setTimeout(() => dragImage.remove(), 0)
    }

    setDraggingImage(url)
  }

  const handleImageDragEnd = () => {
    setDraggingImage(null)
  }

  const collapsedTabButtonClass = (value: "sections" | "images") =>
    `flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-colors ${
      tab === value
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-secondary hover:text-primary"
    }`

  return (
    <aside
      data-collapsed={collapsed}
      className={`relative flex-shrink-0 transition-[width] duration-300 ease-in-out overflow-y-auto w-full ${
        collapsed ? "md:w-[4.5rem] md:min-w-[4.5rem] md:max-w-[4.5rem]" : "md:w-64 md:min-w-64 md:max-w-64"
      } border-border bg-[var(--editor-sidebar)] p-3 md:border-r ${collapsed ? "md:px-3 md:py-4" : "md:p-4"} ${className}`}
    >
      {/* Collapse toggle — desktop only */}
      <button
        aria-label={collapsed ? "Secties uitvouwen" : "Secties samenvouwen"}
        onClick={() => setCollapsed((s) => !s)}
        className="hidden md:inline-flex absolute right-2 top-2 z-10 h-7 w-7 items-center justify-center rounded-full border bg-card p-0 text-sm shadow-sm transition-all hover:scale-110 hover:bg-secondary"
        title={collapsed ? "Uitvouwen" : "Samenvouwen"}
        type="button"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <Tabs value={tab} onValueChange={setTab}>
        {collapsed ? (
          <div className="mb-4 mt-10 hidden flex-col items-center gap-2 md:flex" role="tablist" aria-label="Zijbalkweergave">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "sections"}
              aria-label="Secties"
              title="Secties"
              onClick={() => setTab("sections")}
              className={collapsedTabButtonClass("sections")}
            >
              <Layers className="h-4 w-4" />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "images"}
              aria-label="Afbeeldingen"
              title="Afbeeldingen"
              onClick={() => setTab("images")}
              className={collapsedTabButtonClass("images")}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <TabsList className="mb-4 w-full flex">
            <TabsTrigger value="sections" className="flex-1">
              Secties
            </TabsTrigger>
            <TabsTrigger value="images" className="flex-1">
              Afbeeldingen
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="sections">
          <div className={`mb-4 ${collapsed ? "sr-only" : "opacity-100 transition-opacity delay-100"}`}>
            <h3 className={`${collapsed ? "sr-only" : "mb-1 text-sm font-semibold"}`}>Secties toevoegen</h3>
            <p className={`${collapsed ? "sr-only" : "text-xs text-muted-foreground"}`}>
              Sleep een sectie naar de gewenste plek.
            </p>
          </div>

          <div className={`space-y-2 ${collapsed ? "flex flex-col items-center" : ""}`}>
            {selectableSectionDefinitions.map(({ type, label, icon: Icon, description }) => (
              <SectionCard
                key={type}
                type={type}
                label={label}
                Icon={Icon}
                description={description}
                collapsed={collapsed}
                isDragging={draggingType === type}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>

          {!collapsed && (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/70 p-3 text-center animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="text-xs text-muted-foreground">
                Op mobiel kunt u secties naar het canvas slepen.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="images">
          <div className={`mb-4 ${collapsed ? "sr-only" : "opacity-100 transition-opacity delay-100"}`}>
            <h3 className={`${collapsed ? "sr-only" : "mb-1 text-sm font-semibold"}`}>Afbeeldingen Slepen</h3>
            <p className={`${collapsed ? "sr-only" : "text-xs text-muted-foreground"}`}>
              Sleep afbeeldingen naar secties
            </p>
          </div>
          <Link
            href="/editor/images"
            aria-label="Afbeeldingen beheren"
            title="Afbeeldingen beheren"
            className={`flex items-center justify-center gap-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors ${
              collapsed ? "mb-3 h-10 w-10 p-0" : "py-2"
            }`}
          >
            <ExternalLink className="h-3 w-3" />
            {!collapsed && "Afbeeldingen beheren"}
          </Link>
          {isLoadingImages ? (
            <div className="text-xs text-muted-foreground text-center py-8" title="Afbeeldingen laden">
              {collapsed ? "..." : "Afbeeldingen laden..."}
            </div>
          ) : images.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8" title="Geen afbeeldingen gevonden">
              {collapsed ? "0" : "Geen afbeeldingen gevonden"}
            </div>
          ) : (
            <div className={`grid ${collapsed ? "grid-cols-1" : "grid-cols-2"} gap-2`}>
              {images.map((img) => (
                <ImageCard
                  key={img.name}
                  name={img.name}
                  url={img.url}
                  collapsed={collapsed}
                  isDragging={draggingImage === img.url}
                  onDragStart={handleImageDragStart}
                  onDragEnd={handleImageDragEnd}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  )
}
