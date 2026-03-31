"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  ImageIcon,
  Home,
  Bed,
  Mail,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Plus,
  Menu,
  Layout,
} from "lucide-react"
import type { SectionType } from "@/lib/types"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { useTouchDrag } from "@/hooks/use-touch-drag"

const sectionTypes: { type: SectionType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: "nav", label: "Navigation", icon: <Menu className="h-5 w-5" />, description: "Top navbar" },
  { type: "hero", label: "Hero", icon: <Home className="h-5 w-5" />, description: "Main header section" },
  { type: "about", label: "About", icon: <Info className="h-5 w-5" />, description: "Tell your story" },
  { type: "rooms", label: "Rooms", icon: <Bed className="h-5 w-5" />, description: "Showcase rooms" },
  { type: "gallery", label: "Gallery", icon: <ImageIcon className="h-5 w-5" />, description: "Photo gallery" },
  { type: "amenities", label: "Amenities", icon: <Sparkles className="h-5 w-5" />, description: "List features" },
  { type: "contact", label: "Contact", icon: <Mail className="h-5 w-5" />, description: "Contact form" },
  { type: "footer", label: "Footer", icon: <Layout className="h-5 w-5" />, description: "Bottom footer" },
]

// ----- Sub-components so each draggable item can call the hook independently -----

interface SectionCardProps {
  type: SectionType
  label: string
  icon: React.ReactNode
  description: string
  collapsed: boolean
  isDragging: boolean
  onDragStart: (e: React.DragEvent, type: SectionType) => void
  onDragEnd: () => void
}

function SectionCard({ type, label, icon, description, collapsed, isDragging, onDragStart, onDragEnd }: SectionCardProps) {
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
      className={`group relative flex cursor-move items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md hover:border-primary active:scale-95 select-none ${
        collapsed ? "justify-center px-2 py-3" : ""
      } ${isDragging ? "opacity-50 scale-95" : ""}`}
      title={collapsed ? `${label}: ${description}` : label}
    >
      <div className="flex-shrink-0 rounded-md bg-secondary p-2 text-secondary-foreground transition-colors group-hover:bg-accent">
        {icon}
      </div>
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">{label}</span>
            <Plus className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
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
      className={`rounded-lg border bg-card p-1 shadow-sm cursor-move transition-all duration-200 select-none ${
        isDragging
          ? "border-primary ring-2 ring-primary/40 scale-95 opacity-60 shadow-none"
          : "border-border hover:border-primary hover:shadow-md hover:scale-105"
      }`}
      title={name}
    >
      <img
        src={url}
        alt={name}
        className={`w-full h-16 object-cover rounded transition-all duration-200 ${isDragging ? "blur-[1px]" : ""}`}
      />
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
      setDraggingImage(null)
      setDraggingType(null)
    }
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent).detail as { imageUrl?: string; sectionType?: string }
      if (detail?.imageUrl) setDraggingImage(detail.imageUrl)
      if (detail?.sectionType) setDraggingType(detail.sectionType as SectionType)
    }
    const onEnd = () => {
      setDraggingImage(null)
      setDraggingType(null)
    }
    document.addEventListener("touchdrop", handler)
    document.addEventListener("touchdragstart", onStart)
    document.addEventListener("touchdragend", onEnd)
    return () => {
      document.removeEventListener("touchdrop", handler)
      document.removeEventListener("touchdragstart", onStart)
      document.removeEventListener("touchdragend", onEnd)
    }
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
    setDraggingImage(url)
  }

  const handleImageDragEnd = () => {
    setDraggingImage(null)
  }

  return (
    <aside
      className={`relative flex-shrink-0 transition-all duration-300 ease-in-out overflow-y-auto w-full ${
        collapsed ? "md:w-16" : "md:w-64"
      } border-r border-border bg-background p-4 ${className}`}
    >
      {/* Collapse toggle — desktop only */}
      <button
        aria-label={collapsed ? "Expand sections" : "Collapse sections"}
        onClick={() => setCollapsed((s) => !s)}
        className="hidden md:inline-flex absolute right-2 top-2 z-10 h-7 w-7 items-center justify-center rounded-md border bg-card p-0 text-sm shadow-sm transition-all hover:scale-110 hover:bg-accent"
        title={collapsed ? "Expand" : "Collapse"}
        type="button"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 w-full flex">
          <TabsTrigger value="sections" className="flex-1">
            Sections
          </TabsTrigger>
          <TabsTrigger value="images" className="flex-1">
            Images
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sections">
          <div className={`mb-4 ${collapsed ? "opacity-0" : "opacity-100 transition-opacity delay-100"}`}>
            <h3 className={`${collapsed ? "sr-only" : "mb-1 text-sm font-semibold"}`}>Add Sections</h3>
            <p className={`${collapsed ? "sr-only" : "text-xs text-muted-foreground"}`}>
              Drag or tap to add
            </p>
          </div>

          <div className={`space-y-2 ${collapsed ? "mt-12 flex flex-col items-center" : ""}`}>
            {sectionTypes.map(({ type, label, icon, description }) => (
              <SectionCard
                key={type}
                type={type}
                label={label}
                icon={icon}
                description={description}
                collapsed={collapsed}
                isDragging={draggingType === type}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>

          {!collapsed && (
            <div className="mt-6 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-center animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="text-xs text-muted-foreground">
                Drag sections to the canvas to build your site
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="images">
          <div className={`mb-4 ${collapsed ? "opacity-0" : "opacity-100 transition-opacity delay-100"}`}>
            <h3 className={`${collapsed ? "sr-only" : "mb-1 text-sm font-semibold"}`}>Drag Images</h3>
            <p className={`${collapsed ? "sr-only" : "text-xs text-muted-foreground"}`}>
              Drag images to sections
            </p>
          </div>
          {isLoadingImages ? (
            <div className="text-xs text-muted-foreground text-center py-8">Loading images...</div>
          ) : images.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">No images found</div>
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
