"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  createService as apiCreateService,
  updateService as apiUpdateService,
  deleteService as apiDeleteService,
  type Service,
  type ServiceInput,
} from "@/lib/supabase/services"
import { Button } from "@/components/ui/button"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useEditorLayout } from "@/components/editor/editor-layout-context"
import { useTouchDrag } from "@/hooks/use-touch-drag"
import {
  Briefcase,
  Plus,
  Trash2,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react"
import Link from "next/link"

interface ServicesClientProps {
  userId: string
  businessId: string
  initialServices: Service[]
}

// ---- Image card in the sidebar (draggable) ----
interface SidebarImageCardProps {
  name: string
  url: string
  isDragging: boolean
  onDragStart: (e: React.DragEvent, url: string) => void
  onDragEnd: () => void
}

function SidebarImageCard({ name, url, isDragging, onDragStart, onDragEnd }: SidebarImageCardProps) {
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
      title={name}
      className={`rounded-lg border border-border bg-card p-1 shadow-sm cursor-move hover:border-primary transition-all duration-200 select-none group ${
        isDragging ? "ring-2 ring-primary shadow-lg scale-105 opacity-70" : ""
      }`}
    >
      <img src={url} alt={name} className="w-full h-20 object-cover rounded" />
      <div className="text-[10px] text-muted-foreground truncate text-center mt-1 px-1">{name}</div>
    </div>
  )
}

// ---- Service card ----
interface ServiceCardProps {
  service: Service
  onUpdate: (id: string, updates: Partial<ServiceInput>) => void
  onDelete: (id: string) => void
  isSaving: boolean
}

function ServiceCard({ service, onUpdate, onDelete, isSaving }: ServiceCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [localTitle, setLocalTitle] = useState(service.title)
  const [localDescription, setLocalDescription] = useState(service.description ?? "")
  const [localPrice, setLocalPrice] = useState(service.price ?? "")
  const [localDuration, setLocalDuration] = useState(service.duration ?? "")

  useEffect(() => {
    setLocalTitle(service.title)
    setLocalDescription(service.description ?? "")
    setLocalPrice(service.price ?? "")
    setLocalDuration(service.duration ?? "")
  }, [service])

  const handleBlur = () => {
    onUpdate(service.id, {
      title: localTitle,
      description: localDescription,
      price: localPrice,
      duration: localDuration || null,
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const imageUrl = e.dataTransfer.getData("imageUrl")
    if (imageUrl && !service.image_urls.includes(imageUrl)) {
      onUpdate(service.id, { image_urls: [...service.image_urls, imageUrl] })
    }
  }

  const removeImage = (imgUrl: string) => {
    onUpdate(service.id, { image_urls: service.image_urls.filter((u) => u !== imgUrl) })
  }

  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const handler = (e: Event) => {
      const custom = e as CustomEvent
      const imageUrl = custom.detail?.imageUrl
      if (imageUrl && !service.image_urls.includes(imageUrl)) {
        onUpdate(service.id, { image_urls: [...service.image_urls, imageUrl] })
      }
    }
    el.addEventListener("touchdrop", handler)
    return () => el.removeEventListener("touchdrop", handler)
  }, [service.id, service.image_urls, onUpdate])

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 bg-secondary/40 border-b border-border">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground truncate max-w-[200px]">
            {service.title || "Naamloze dienst"}
          </span>
          <div className="relative group">
            {(() => {
              const missing = []
              if (!service.title) missing.push("naam")
              if (!service.description) missing.push("beschrijving")
              if (!service.price) missing.push("prijs")
              return (
                <>
                  {missing.length === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-2" />
                  ) : (
                    <X className="h-4 w-4 text-red-500 ml-2" />
                  )}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-card border border-border text-foreground text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-100">
                    {missing.length === 0 ? "Alle velden ingevuld" : `Ontbreekt: ${missing.join(", ")}`}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(service.id)}
          className="h-7 w-7 text-destructive hover:bg-destructive/10 flex-shrink-0"
          disabled={isSaving}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-5 space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <Label
            htmlFor={`title-${service.id}`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Dienstnaam
          </Label>
          <Input
            id={`title-${service.id}`}
            placeholder="Knipbeurt"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleBlur}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label
            htmlFor={`desc-${service.id}`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Beschrijving
          </Label>
          <Textarea
            id={`desc-${service.id}`}
            placeholder="Wat houdt deze dienst in..."
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            onBlur={handleBlur}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Price + duration row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor={`price-${service.id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              <DollarSign className="h-3 w-3 text-primary" />
              Prijs
            </Label>
            <Input
              id={`price-${service.id}`}
              type="text"
              placeholder="Vanaf € 45"
              value={localPrice}
              onChange={(e) => setLocalPrice(e.target.value)}
              onBlur={handleBlur}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor={`duration-${service.id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              <Clock className="h-3 w-3 text-primary" />
              Duur
            </Label>
            <Input
              id={`duration-${service.id}`}
              type="text"
              placeholder="30 min"
              value={localDuration}
              onChange={(e) => setLocalDuration(e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        </div>

        {/* Images drop zone */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3 text-primary" />
            Afbeeldingen
            <span className="ml-auto text-muted-foreground/60 normal-case font-normal">sleep van zijbalk</span>
          </Label>

          <div
            ref={cardRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`min-h-[80px] rounded-lg border-2 border-dashed transition-all duration-200 p-2 ${
              isDragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border/60 hover:border-primary/40 bg-muted/20"
            }`}
          >
            {service.image_urls.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-16 text-center gap-1">
                <ImageIcon className={`h-5 w-5 ${isDragOver ? "text-primary" : "text-muted-foreground/40"}`} />
                <p className={`text-xs ${isDragOver ? "text-primary font-medium" : "text-muted-foreground/60"}`}>
                  {isDragOver ? "Laat los om foto toe te voegen" : "Sleep afbeeldingen hierheen"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {service.image_urls.map((url) => (
                  <div key={url} className="relative group rounded overflow-hidden aspect-square">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Afbeelding verwijderen"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
                {isDragOver && (
                  <div className="flex items-center justify-center rounded border-2 border-dashed border-primary bg-primary/5 aspect-square">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Main client component ----
export function ServicesClient({ userId, businessId, initialServices }: ServicesClientProps) {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [images, setImages] = useState<{ name: string; url: string }[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draggingImage, setDraggingImage] = useState<string | null>(null)
  const { setIsSaving: setHeaderSaving, setSaveState, setActionLabel, setOnAction, setActionIcon, setActionLoading, setInfoText } =
    useEditorLayout()

  useEffect(() => {
    setIsLoadingImages(true)
    const supabase = createClient()
    supabase.storage
      .from("user-images")
      .list(userId, { limit: 100, sortBy: { column: "created_at", order: "desc" } })
      .then(({ data, error }) => {
        if (error || !data) {
          setIsLoadingImages(false)
          return
        }
        const validFiles = data.filter((f) => f.name !== ".emptyFolderPlaceholder")
        const pics = validFiles
          .map((file) => {
            const { data: urlData } = supabase.storage
              .from("user-images")
              .getPublicUrl(`${userId}/${file.name}`)
            return { name: file.name, url: urlData.publicUrl ?? "" }
          })
          .filter((img) => img.url)
        setImages(pics)
        setIsLoadingImages(false)
      })
  }, [userId])

  const handleCreateService = useCallback(async () => {
    setIsSaving(true)
    let failed = false
    try {
      const newService = await apiCreateService(businessId, {
        title: "Nieuwe dienst",
        description: "",
        price: "",
        duration: null,
        capacity: null,
        image_urls: [],
        position: services.length,
      })
      setServices((prev) => [...prev, newService])
      toast.success("Dienst aangemaakt")
    } catch (err) {
      console.error(err)
      failed = true
      toast.error("Aanmaken mislukt")
    } finally {
      setIsSaving(false)
      if (failed) setSaveState("error")
    }
  }, [businessId, services.length, setSaveState])

  useEffect(() => {
    setHeaderSaving(isSaving)
    setActionLoading(isSaving)
  }, [isSaving, setHeaderSaving, setActionLoading])

  useEffect(() => {
    setActionLabel("Dienst toevoegen")
    setActionIcon(<Plus className="mr-2 h-4 w-4" />)
    setOnAction(() => handleCreateService)
    setInfoText(`${services.length} ${services.length === 1 ? "dienst" : "diensten"}`)

    return () => {
      setActionLabel(undefined)
      setActionIcon(undefined)
      setOnAction(undefined)
      setActionLoading(false)
      setInfoText(undefined)
    }
  }, [services.length, handleCreateService, setActionLabel, setActionIcon, setActionLoading, setOnAction, setInfoText])

  const handleUpdateService = async (id: string, updates: Partial<ServiceInput>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    setIsSaving(true)
    let failed = false
    try {
      const updated = await apiUpdateService(id, updates)
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } catch (err) {
      console.error(err)
      failed = true
      toast.error("Bijwerken mislukt")
    } finally {
      setIsSaving(false)
      if (failed) setSaveState("error")
    }
  }

  const handleDeleteService = async (id: string) => {
    const prev = services
    setServices((s) => s.filter((service) => service.id !== id))
    setIsSaving(true)
    let failed = false
    try {
      await apiDeleteService(id)
      toast.success("Dienst verwijderd")
    } catch (err) {
      console.error(err)
      setServices(prev)
      failed = true
      toast.error("Verwijderen mislukt")
    } finally {
      setIsSaving(false)
      if (failed) setSaveState("error")
    }
  }

  const handleImageDragStart = (e: React.DragEvent, url: string) => {
    e.dataTransfer.setData("imageUrl", url)
    e.dataTransfer.effectAllowed = "copy"
    setDraggingImage(url)
  }

  const handleImageDragEnd = () => setDraggingImage(null)

  return (
    <EditorPageShell
      title="Diensten"
      description="Beheer diensten, prijzen, duur en afbeeldingen die op uw website worden getoond."
      maxWidth="full"
      scroll={false}
      contentClassName="h-full min-h-0"
    >
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        {/* Image sidebar */}
        <aside
          className={`flex-shrink-0 border-r border-border bg-[var(--editor-sidebar)] transition-all duration-300 overflow-y-auto ${
            sidebarCollapsed ? "w-12" : "w-56"
          } hidden md:flex flex-col`}
        >
          <div className="flex items-center justify-between px-3 py-3 border-b border-border sticky top-0 bg-[var(--editor-sidebar)] z-10">
            {!sidebarCollapsed && (
              <div>
                <p className="text-xs font-semibold text-foreground">Afbeeldingen</p>
                <p className="text-[10px] text-muted-foreground">Sleep naar diensten</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-accent transition-colors flex-shrink-0"
              aria-label={sidebarCollapsed ? "Zijbalk uitvouwen" : "Zijbalk samenvouwen"}
            >
              {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="p-2 space-y-1.5">
              {isLoadingImages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : images.length === 0 ? (
                <div className="py-8 text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Nog geen afbeeldingen</p>
                  <Link href="/editor/images" className="text-xs text-primary hover:underline mt-1 block">
                    Afbeeldingen uploaden
                  </Link>
                </div>
              ) : (
                images.map((img) => (
                  <SidebarImageCard
                    key={img.name}
                    name={img.name}
                    url={img.url}
                    isDragging={draggingImage === img.url}
                    onDragStart={handleImageDragStart}
                    onDragEnd={handleImageDragEnd}
                  />
                ))
              )}
            </div>
          )}
        </aside>

        {/* Main services canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-24 gap-4">
              <div className="rounded-full bg-primary/10 p-6">
                <Briefcase className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">Nog geen diensten</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Klik op &ldquo;Dienst toevoegen&rdquo; om uw eerste dienst aan te maken
                </p>
              </div>
              <Button onClick={handleCreateService} disabled={isSaving} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Eerste dienst toevoegen
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 max-w-7xl mx-auto">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onUpdate={handleUpdateService}
                  onDelete={handleDeleteService}
                  isSaving={isSaving}
                />
              ))}

              {/* Add service card */}
              <button
                type="button"
                onClick={handleCreateService}
                disabled={isSaving}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 min-h-[200px] text-muted-foreground hover:text-primary group disabled:opacity-50"
              >
                <div className="rounded-full bg-muted group-hover:bg-primary/10 p-3 transition-colors">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">Nog een dienst toevoegen</span>
              </button>
            </div>
          )}
        </main>
      </div>
    </EditorPageShell>
  )
}
