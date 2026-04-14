"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  createRoom as apiCreateRoom,
  updateRoom as apiUpdateRoom,
  deleteRoom as apiDeleteRoom,
  type Room,
  type RoomInput,
} from "@/lib/supabase/bnb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useTouchDrag } from "@/hooks/use-touch-drag"
import {
  ArrowLeft,
  BedDouble,
  Plus,
  Trash2,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
  Users,
  DollarSign,
  GripVertical,
} from "lucide-react"
import Link from "next/link"

interface RoomsClientProps {
  userId: string
  bnbId: string
  initialRooms: Room[]
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

// ---- Room card ----
interface RoomCardProps {
  room: Room
  onUpdate: (id: string, updates: Partial<RoomInput>) => void
  onDelete: (id: string) => void
  isSaving: boolean
}

function RoomCard({ room, onUpdate, onDelete, isSaving }: RoomCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [localName, setLocalName] = useState(room.name)
  const [localDescription, setLocalDescription] = useState(room.description ?? "")
  const [localPrice, setLocalPrice] = useState(room.price ?? "")
  const [localGuests, setLocalGuests] = useState(room.max_guests?.toString() ?? "")

  // Sync local state when room prop changes (e.g., after save)
  useEffect(() => {
    setLocalName(room.name)
    setLocalDescription(room.description ?? "")
    setLocalPrice(room.price ?? "")
    setLocalGuests(room.max_guests?.toString() ?? "")
  }, [room])

  const handleBlur = () => {
    onUpdate(room.id, {
      name: localName,
      description: localDescription,
      price: localPrice,
      max_guests: localGuests ? parseInt(localGuests, 10) : null,
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
    if (imageUrl && !room.images.includes(imageUrl)) {
      onUpdate(room.id, { images: [...room.images, imageUrl] })
    }
  }

  const removeImage = (imgUrl: string) => {
    onUpdate(room.id, { images: room.images.filter((u) => u !== imgUrl) })
  }

  // Touch drop support
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const handler = (e: Event) => {
      const custom = e as CustomEvent
      const imageUrl = custom.detail?.imageUrl
      if (imageUrl && !room.images.includes(imageUrl)) {
        onUpdate(room.id, { images: [...room.images, imageUrl] })
      }
    }
    el.addEventListener("touchdrop", handler)
    return () => el.removeEventListener("touchdrop", handler)
  }, [room.id, room.images, onUpdate])

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 bg-secondary/40 border-b border-border">
        <div className="flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground truncate max-w-[200px]">
            {room.name || "Naamloze kamer"}
          </span>
          <div className="relative group">
            {(() => {
              const missing = []
              if (!room.name) missing.push("naam")
              if (!room.description) missing.push("beschrijving")
              if (!room.price) missing.push("prijs")
              if (!room.max_guests) missing.push("max gasten")
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
          onClick={() => onDelete(room.id)}
          className="h-7 w-7 text-destructive hover:bg-destructive/10 flex-shrink-0"
          disabled={isSaving}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-5 space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label
            htmlFor={`name-${room.id}`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Kamernaam
          </Label>
          <Input
            id={`name-${room.id}`}
            placeholder="Luxe Suite"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleBlur}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label
            htmlFor={`desc-${room.id}`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Beschrijving
          </Label>
          <Textarea
            id={`desc-${room.id}`}
            placeholder="Ruime kamer met zeezicht en eigen badkamer..."
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            onBlur={handleBlur}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Price + guests row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor={`price-${room.id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              <DollarSign className="h-3 w-3 text-primary" />
              Prijs / Nacht
            </Label>
            <Input
              id={`price-${room.id}`}
              type="text"
              placeholder="120"
              value={localPrice}
              onChange={(e) => setLocalPrice(e.target.value)}
              onBlur={handleBlur}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor={`guests-${room.id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              <Users className="h-3 w-3 text-primary" />
              Max gasten
            </Label>
            <Input
              id={`guests-${room.id}`}
              type="number"
              min="1"
              placeholder="2"
              value={localGuests}
              onChange={(e) => setLocalGuests(e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        </div>

        {/* Images drop zone */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3 text-primary" />
            Foto's
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
            {room.images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-16 text-center gap-1">
                <ImageIcon className={`h-5 w-5 ${isDragOver ? "text-primary" : "text-muted-foreground/40"}`} />
                <p className={`text-xs ${isDragOver ? "text-primary font-medium" : "text-muted-foreground/60"}`}>
                  {isDragOver ? "Laat los om foto toe te voegen" : "Sleep afbeeldingen hierheen"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {room.images.map((url) => (
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
export function RoomsClient({ userId, bnbId, initialRooms }: RoomsClientProps) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [images, setImages] = useState<{ name: string; url: string }[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draggingImage, setDraggingImage] = useState<string | null>(null)

  // Load images from Supabase storage on mount
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

  const handleCreateRoom = async () => {
    setIsSaving(true)
    try {
      const newRoom = await apiCreateRoom(bnbId, {
        name: "Nieuwe kamer",
        description: "",
        price: "",
        max_guests: 2,
        images: [],
        position: rooms.length,
      })
      setRooms((prev) => [...prev, newRoom])
      toast.success("Kamer aangemaakt")
    } catch (err) {
      console.error(err)
      toast.error("Mislukt om kamer aan te maken")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateRoom = async (id: string, updates: Partial<RoomInput>) => {
    // Optimistic update
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    )

    try {
      const updated = await apiUpdateRoom(id, updates)
      setRooms((prev) => prev.map((r) => (r.id === id ? updated : r)))
    } catch (err) {
      console.error(err)
      toast.error("Mislukt om kamer bij te werken")
    }
  }

  const handleDeleteRoom = async (id: string) => {
    // Optimistic delete
    const prev = rooms
    setRooms((r) => r.filter((room) => room.id !== id))

    try {
      await apiDeleteRoom(id)
      toast.success("Kamer verwijderd")
    } catch (err) {
      console.error(err)
      setRooms(prev)
      toast.error("Mislukt om kamer te verwijderen")
    }
  }

  const handleImageDragStart = (e: React.DragEvent, url: string) => {
    e.dataTransfer.setData("imageUrl", url)
    e.dataTransfer.effectAllowed = "copy"
    setDraggingImage(url)
  }

  const handleImageDragEnd = () => setDraggingImage(null)

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--editor-header-accent)] bg-[var(--editor-header)] px-4 py-3 md:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-[var(--editor-header-fg)]/80 hover:bg-[var(--editor-header-fg)]/10 hover:text-[var(--editor-header-fg)]"
          >
            <Link href="/editor">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Editor
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-[var(--editor-header-fg)]" />
            <h1 className="text-lg font-semibold text-[var(--editor-header-fg)]">Kamers</h1>
            <span className="ml-1 rounded-full bg-[var(--editor-header-fg)]/15 px-2 py-0.5 text-xs font-medium text-[var(--editor-header-fg)]">
              {rooms.filter(room => room.name && room.description && room.price && room.max_guests).length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* auto-save indicator */}
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--editor-header-fg)]/70">
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Opslaan…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                Automatisch opgeslagen
              </>
            )}
          </span>
          <Button
            size="sm"
            onClick={handleCreateRoom}
            disabled={isSaving}
            className="bg-[var(--editor-header-fg)] text-[var(--editor-header)] hover:bg-[var(--editor-header-fg)]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Kamer toevoegen
          </Button>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Image sidebar */}
        <aside
          className={`flex-shrink-0 border-r border-border bg-[var(--editor-sidebar)] transition-all duration-300 overflow-y-auto ${
            sidebarCollapsed ? "w-12" : "w-56"
          } hidden md:flex flex-col`}
        >
          {/* sidebar header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-border sticky top-0 bg-[var(--editor-sidebar)] z-10">
            {!sidebarCollapsed && (
              <div>
                <p className="text-xs font-semibold text-foreground">Afbeeldingen</p>
                <p className="text-[10px] text-muted-foreground">Sleep naar kamers</p>
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

          {/* image list */}
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
                  <Link href="/images" className="text-xs text-primary hover:underline mt-1 block">
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

        {/* Main rooms canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-24 gap-4">
              <div className="rounded-full bg-primary/10 p-6">
                <BedDouble className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">Nog geen kamers</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click &ldquo;Kamer toevoegen&rdquo; to create your first room
                </p>
              </div>
              <Button onClick={handleCreateRoom} disabled={isSaving} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Eerste kamer toevoegen
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 max-w-7xl mx-auto">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onUpdate={handleUpdateRoom}
                  onDelete={handleDeleteRoom}
                  isSaving={isSaving}
                />
              ))}

              {/* Add room card */}
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={isSaving}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 min-h-[200px] text-muted-foreground hover:text-primary group disabled:opacity-50"
              >
                <div className="rounded-full bg-muted group-hover:bg-primary/10 p-3 transition-colors">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">Nog een kamer toevoegen</span>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
