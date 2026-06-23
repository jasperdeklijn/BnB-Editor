"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { Section, SectionStyles, Transition } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import websiteSections from "@/lib/supabase/websiteSections"
import {
  Trash2,
  Type,
  Palette,
  Wand2,
  Plus,
  ImageIcon,
  Mail,
  MapPin,
  Phone,
  Navigation,
  Pin,
  Eye,
  EyeOff,
  AlignCenter,
  LayoutPanelLeft,
  Maximize,
  LayoutGrid,
  Minimize,
  Square,
  PanelRight,
  Grid3x3,
  Columns,
  Rows,
  Briefcase,
  List,
  Newspaper,
  GalleryHorizontal,
  AlignJustify,
  Loader2,
  ExternalLink,
  Check,
} from "lucide-react"
import type { HeroLayout } from "@/components/sections/hero-section"
import type { GalleryLayout } from "@/components/sections/gallery-section"
import type { ServicesLayout } from "@/components/sections/services-section"
import type { ContactLayout } from "@/components/sections/contact-section"
import type { SectionType } from "@/lib/types"

interface AvailableRoom {
  id: string
  name: string
  images: string[]
  price: string | null
}

interface SelectionEditorProps {
  selectedSection: Section | null
  sections: Section[]
  transitions: Transition[]
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onStyleUpdate: (styles: SectionStyles) => void
  onDelete: (id: string) => void
  onTransitionUpdate: (fromSectionId: string, toSectionId: string, transitionType: string) => void
  websiteId?: string | null
  businessId?: string | null
}

export function SelectionEditor({
  selectedSection,
  sections,
  transitions,
  onUpdate,
  onStyleUpdate,
  onDelete,
  onTransitionUpdate,
  websiteId,
  businessId,
}: SelectionEditorProps) {
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // Rooms selector state
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutId) clearTimeout(saveTimeoutId)
    }
  }, [])

  // Fetch available offerings whenever a services section is selected.
  useEffect(() => {
    if (selectedSection?.type !== "rooms" && selectedSection?.type !== "services") return

    let cancelled = false
    setLoadingRooms(true)

    const fetchRooms = async () => {
      try {
        const supabase = createClient()

        // Use bnbId prop if available; otherwise fall back to user→bnb lookup
        let resolvedBusinessId: string | null = businessId ?? null

        if (!resolvedBusinessId) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user || cancelled) { setLoadingRooms(false); return }

          const { data: business } = await supabase
            .from("businesses")
            .select("id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle()

          if (!business || cancelled) { setLoadingRooms(false); return }
          resolvedBusinessId = business.id
        }

        if (cancelled) return

        const { data: serviceRows } = await supabase
          .from("services")
          .select("id, title, image_urls, price")
          .eq("business_id", resolvedBusinessId)
          .order("position", { ascending: true })

        if (!cancelled) {
          setAvailableRooms(
            (serviceRows ?? []).map((service) => ({
              id: service.id,
              name: service.title,
              images: Array.isArray(service.image_urls) ? service.image_urls : [],
              price: service.price,
            }))
          )
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoadingRooms(false)
    }

    fetchRooms()
    return () => { cancelled = true }
  }, [businessId, selectedSection?.id, selectedSection?.type])

  // Save to database with debouncing
  const saveToDatabase = async (updatedData: any) => {
    if (!websiteId || !selectedSection || selectedSection.id.startsWith("section-")) return

    try {
      const supabase = createClient()
      const payload = {
        type: selectedSection.type,
        content: updatedData,
        styles: selectedSection.styles ?? {},
        position: sections.findIndex((s) => s.id === selectedSection.id) + 1,
      }

      await websiteSections.updateSection(selectedSection.id, payload as any, supabase)
    } catch (err) {
      console.error("Error saving to database:", err)
    }
  }

  // Save styles to database
  const saveStylesToDatabase = async (styles: any) => {
    if (!websiteId || !selectedSection || selectedSection.id.startsWith("section-")) return

    try {
      const supabase = createClient()
      const payload = {
        type: selectedSection.type,
        content: selectedSection.data ?? {},
        styles: styles,
        position: sections.findIndex((s) => s.id === selectedSection.id) + 1,
      }

      await websiteSections.updateSection(selectedSection.id, payload as any, supabase)
    } catch (err) {
      console.error("Error saving styles to database:", err)
    }
  }

  if (!selectedSection) {
    return (
      <div className="w-full md:w-80 border-border bg-[var(--editor-panel)] p-4 md:border-l md:p-6">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4">
            <Wand2 className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Geen sectie geselecteerd</p>
          <p className="mt-2 text-xs text-muted-foreground">Klik op een sectie om aan te passen</p>
        </div>
      </div>
    )
  }

  const updateField = (field: string, value: any) => {
    onUpdate(selectedSection.id, { [field]: value })

    if (saveTimeoutId) clearTimeout(saveTimeoutId)

    const timeout = setTimeout(async () => {
      const updatedData = { ...selectedSection.data, [field]: value }
      await saveToDatabase(updatedData)

      toast.success("Opgeslagen in database", {
        position: "bottom-right",
        duration: 2000,
        style: { background: "#10b981", color: "white" },
      })
    }, 800)

    setSaveTimeoutId(timeout)
  }

  const handleTransitionChange = (newType: string) => {
    const nextSectionIdx = sections.findIndex((s) => s.id === selectedSection.id) + 1

    if (nextSectionIdx >= 0 && nextSectionIdx < sections.length) {
      const nextSection = sections[nextSectionIdx]

      onTransitionUpdate(selectedSection.id, nextSection.id, newType)

      if (saveTimeoutId) clearTimeout(saveTimeoutId)
      const timeout = setTimeout(() => {
        toast.success("Overgang opgeslagen", {
          position: "bottom-right",
          duration: 2000,
          style: { background: "#10b981", color: "white" },
        })
      }, 800)
      setSaveTimeoutId(timeout)
    }
  }

  // Toggle a service while keeping the legacy roomIds key in sync.
  const toggleRoomId = (roomId: string) => {
    const current =
      (((selectedSection.data as any).serviceIds ?? (selectedSection.data as any).roomIds) as string[]) ?? []
    const next = current.includes(roomId)
      ? current.filter((id) => id !== roomId)
      : [...current, roomId]
    onUpdate(selectedSection.id, { roomIds: next, serviceIds: next })

    if (saveTimeoutId) clearTimeout(saveTimeoutId)
    const timeout = setTimeout(async () => {
      await saveToDatabase({ ...selectedSection.data, roomIds: next, serviceIds: next })
      toast.success("Opgeslagen in database", {
        position: "bottom-right",
        duration: 2000,
        style: { background: "#10b981", color: "white" },
      })
    }, 800)
    setSaveTimeoutId(timeout)
  }

  return (
    <div className="w-full md:w-80 border-border bg-[var(--editor-panel)] p-4 md:border-l md:p-6 overflow-auto animate-in slide-in-from-right duration-300">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <Type className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold capitalize">{selectedSection.type}</h2>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10 transition-all hover:scale-110"
                aria-label="Sectie verwijderen"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Sectie verwijderen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Weet je zeker dat je deze sectie wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => onDelete(selectedSection.id)}
                >
                  Verwijderen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="text-xs text-muted-foreground">Inhoud en styling aanpassen</p>
      </div>

      <div className="space-y-4">
        {selectedSection.type === "hero" && (
          <>
            {/* Hero Layout Selector */}
            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">
                <LayoutGrid className="h-3.5 w-3.5" />
                Layoutstijl
              </Label>
              <p className="text-xs text-muted-foreground">
                Kies hoe je hero-sectie wordt weergegeven
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { layout: "centered" as HeroLayout, label: "Eenvoudig", icon: AlignCenter },
                  { layout: "split" as HeroLayout, label: "Gesplitst", icon: LayoutPanelLeft },
                  { layout: "fullwidth" as HeroLayout, label: "Volledige afbeelding", icon: Maximize },
                  { layout: "minimal" as HeroLayout, label: "Minimaal", icon: Minimize },
                  { layout: "card" as HeroLayout, label: "Kaart", icon: Square },
                  { layout: "split-reverse" as HeroLayout, label: "Gesplitst omgekeerd", icon: PanelRight },
                ].map(({ layout, label, icon: Icon }) => {
                  const currentLayout =
                    ((selectedSection.data as any).layout as HeroLayout) || "centered"
                  const isActive = currentLayout === layout
                  return (
                    <button
                      key={layout}
                      onClick={() => updateField("layout", layout)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-all hover:scale-105 ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-ring/30"
                          : "border-border bg-background hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                {((selectedSection.data as any).layout as HeroLayout) === "split" &&
                  "Afbeelding aan linkerkant, tekst aan rechterkant"}
                {((selectedSection.data as any).layout as HeroLayout) === "fullwidth" &&
                  "Volledige achtergrondafbeelding met overlay"}
                {((selectedSection.data as any).layout as HeroLayout) === "centered" &&
                  "Schoon tekst-gecentreerd ontwerp"}
                {((selectedSection.data as any).layout as HeroLayout) === "minimal" &&
                  "Minimaal tekst-only ontwerp"}
                {((selectedSection.data as any).layout as HeroLayout) === "card" &&
                  "Achtergrondafbeelding met tekstkaart"}
                {((selectedSection.data as any).layout as HeroLayout) === "split-reverse" &&
                  "Tekst aan linkerkant, afbeelding aan rechterkant"}
              </p>
            </Card>

            {/* Hero Content */}
            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">
                <Type className="h-3.5 w-3.5" />
                Inhoud
              </Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Titel</Label>
                  <Input
                    placeholder="bijv., Welkom bij ons bedrijf"
                    value={(selectedSection.data as any).title || ""}
                    onChange={(e) => updateField("title", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Ondertitel</Label>
                  <Input
                    placeholder="bijv., Ervaar comfort en gastvrijheid"
                    value={(selectedSection.data as any).subtitle || ""}
                    onChange={(e) => updateField("subtitle", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">CTA-knoptekst</Label>
                  <Input
                    placeholder="bijv., Nu boeken"
                    value={(selectedSection.data as any).ctaText || ""}
                    onChange={(e) => updateField("ctaText", e.target.value)}
                  />
                </div>
              </div>
            </Card>
          </>
        )}

        {selectedSection.type === "about" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Titel
            </Label>
            <Input
              placeholder="Over Ons"
              value={(selectedSection.data as any).title || ""}
              onChange={(e) => updateField("title", e.target.value)}
            />
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Beschrijving
            </Label>
            <textarea
              placeholder="Beschrijf je bedrijf..."
              value={(selectedSection.data as any).description || ""}
              onChange={(e) => updateField("description", e.target.value)}
              className="w-full min-h-24 p-2 border rounded-lg resize-none"
            />
          </Card>
        )}

        {(selectedSection.type === "rooms" || selectedSection.type === "services") && (
          <>
            {/* Rooms Layout Selector */}
            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">
                <LayoutGrid className="h-3.5 w-3.5" />
                Layoutstijl
              </Label>
              <p className="text-xs text-muted-foreground">
                Kies hoe de dienstkaarten worden weergegeven
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { layout: "grid" as ServicesLayout, label: "Raster", icon: LayoutGrid },
                  { layout: "list" as ServicesLayout, label: "Lijst", icon: List },
                  { layout: "featured" as ServicesLayout, label: "Uitgelicht", icon: Maximize },
                  { layout: "magazine" as ServicesLayout, label: "Magazine", icon: Newspaper },
                  { layout: "minimal" as ServicesLayout, label: "Minimaal", icon: AlignJustify },
                  { layout: "carousel" as ServicesLayout, label: "Carrousel", icon: GalleryHorizontal },
                ].map(({ layout, label, icon: Icon }) => {
                  const currentLayout =
                    ((selectedSection.data as any).layout as ServicesLayout) || "grid"
                  const isActive = currentLayout === layout
                  return (
                    <button
                      key={layout}
                      onClick={() => updateField("layout", layout)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-all hover:scale-105 ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-ring/30"
                          : "border-border bg-background hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                {((selectedSection.data as any).layout as ServicesLayout) === "grid" &&
                  "Klassieke 3-koloms kaartweergave"}
                {((selectedSection.data as any).layout as ServicesLayout) === "list" &&
                  "Horizontale lijstkaarten met afbeelding links"}
                {((selectedSection.data as any).layout as ServicesLayout) === "featured" &&
                  "Eerste dienst groot uitgelicht, rest in raster"}
                {((selectedSection.data as any).layout as ServicesLayout) === "magazine" &&
                  "Afwisselend links/rechts met grote afbeeldingen"}
                {((selectedSection.data as any).layout as ServicesLayout) === "minimal" &&
                  "Strakke tekstlijst met prijs"}
                {((selectedSection.data as any).layout as ServicesLayout) === "carousel" &&
                  "Horizontaal schuivende kaarten"}
              </p>
            </Card>

            {/* Rooms Title + selector */}
            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">
                <Type className="h-3.5 w-3.5" />
                Titel
              </Label>
              <Input
                placeholder="Onze diensten"
                value={(selectedSection.data as any).title || ""}
                onChange={(e) => updateField("title", e.target.value)}
              />

              <div className="pt-1 border-t border-border space-y-2">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5" />
                  Diensten selecteren
                </Label>
                <p className="text-xs text-muted-foreground">
                  Laat leeg om alle diensten te tonen, of selecteer specifieke diensten.
                </p>

                {loadingRooms ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : availableRooms.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-6 text-center">
                    <Briefcase className="h-8 w-8 text-muted-foreground/40" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Nog geen diensten aangemaakt
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        Maak diensten aan en keer hier terug
                      </p>
                    </div>
                    <Link
                      href="/editor/rooms"
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ga naar diensten
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {availableRooms.map((room) => {
                      const selectedIds =
                        ((selectedSection.data as any).roomIds as string[]) ?? []
                      const isSelected =
                        selectedIds.length === 0 || selectedIds.includes(room.id)
                      const isExplicitlySelected = selectedIds.includes(room.id)

                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => toggleRoomId(room.id)}
                          className={`w-full flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all hover:scale-[1.01] ${
                            isExplicitlySelected
                              ? "border-primary bg-primary/5"
                              : selectedIds.length === 0
                              ? "border-border bg-muted/30"
                              : "border-border bg-background opacity-50"
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-amber-100">
                            {room.images.length > 0 ? (
                              <img
                                src={room.images[0]}
                                alt={room.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Briefcase className="h-4 w-4 text-amber-400" />
                              </div>
                            )}
                          </div>

                          {/* Name + price */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{room.name}</p>
                            {room.price && (
                              <p className="text-[10px] text-muted-foreground">{room.price}</p>
                            )}
                          </div>

                          {/* Check indicator */}
                          <div
                            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                              isExplicitlySelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background"
                            }`}
                          >
                            {isExplicitlySelected && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      )
                    })}

                    {/* Show "all rooms" reset option */}
                    {((selectedSection.data as any).roomIds as string[] | undefined)?.length ? (
                      <button
                        type="button"
                        onClick={() => updateField("roomIds", [])}
                        className="w-full rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                      >
                        Selectie wissen (alle diensten tonen)
                      </button>
                    ) : null}

                    <Link
                      href="/editor/rooms"
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Diensten beheren
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {selectedSection.type === "gallery" && (
          <>
            {/* Gallery Layout Selector */}
            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">
                <LayoutGrid className="h-3.5 w-3.5" />
                Layoutstijl
              </Label>
              <p className="text-xs text-muted-foreground">
                Kies hoe je galerij wordt weergegeven
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { layout: "grid" as GalleryLayout, label: "Raster", icon: LayoutGrid },
                  {
                    layout: "vertical-carousel" as GalleryLayout,
                    label: "Carrousel V",
                    icon: Columns,
                  },
                  {
                    layout: "horizontal-carousel" as GalleryLayout,
                    label: "Carrousel H",
                    icon: Rows,
                  },
                  { layout: "masonry" as GalleryLayout, label: "Metselwerk", icon: Grid3x3 },
                  {
                    layout: "single-with-thumbs" as GalleryLayout,
                    label: "Focus",
                    icon: ImageIcon,
                  },
                  {
                    layout: "full-slider" as GalleryLayout,
                    label: "Schuifregelaar",
                    icon: Maximize,
                  },
                ].map(({ layout, label, icon: Icon }) => {
                  const currentLayout =
                    ((selectedSection.data as any).layout as GalleryLayout) || "grid"
                  const isActive = currentLayout === layout
                  return (
                    <button
                      key={layout}
                      onClick={() => updateField("layout", layout)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-all hover:scale-105 ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-ring/30"
                          : "border-border bg-background hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                {((selectedSection.data as any).layout as GalleryLayout) === "grid" &&
                  "Klassieke rasterlayout"}
                {((selectedSection.data as any).layout as GalleryLayout) ===
                  "vertical-carousel" && "Verticale scroll met tekst aan linkerkant"}
                {((selectedSection.data as any).layout as GalleryLayout) ===
                  "horizontal-carousel" && "Horizontaal scrollende afbeeldingen"}
                {((selectedSection.data as any).layout as GalleryLayout) === "masonry" &&
                  "Pinterest-stijl metselwerk layout"}
                {((selectedSection.data as any).layout as GalleryLayout) ===
                  "single-with-thumbs" && "Grote afbeelding met miniaturen"}
                {((selectedSection.data as any).layout as GalleryLayout) === "full-slider" &&
                  "Volledig scherm afbeelding slider"}
              </p>
            </Card>

            {/* Gallery Content */}
            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">
                <Type className="h-3.5 w-3.5" />
                Inhoud
              </Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Titel</Label>
                  <Input
                    placeholder="Galerijtitel"
                    value={(selectedSection.data as any).title || ""}
                    onChange={(e) => updateField("title", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Ondertitel</Label>
                  <Input
                    placeholder="Galerijondertitel"
                    value={(selectedSection.data as any).subtitle || ""}
                    onChange={(e) => updateField("subtitle", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Aantal afbeeldingen</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={(selectedSection.data as any).image_count || 6}
                    onChange={(e) => updateField("image_count", Number(e.target.value))}
                  />
                </div>
              </div>
            </Card>
          </>
        )}

        {(selectedSection.type === "amenities" || selectedSection.type === "features") && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Titel
            </Label>
            <Input
              placeholder="Kenmerken"
              value={(selectedSection.data as any).title || ""}
              onChange={(e) => updateField("title", e.target.value)}
            />
            <Label className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" />
              Kenmerken (kommagescheiden)
            </Label>
            <Input
              placeholder="Persoonlijke service, Heldere afspraken, Vakmanschap"
              value={((selectedSection.data as any).items || []).join(", ")}
              onChange={(e) =>
                updateField(
                  "items",
                  e.target.value.split(",").map((s) => s.trim())
                )
              }
            />
          </Card>
        )}

        {selectedSection.type === "contact" && (
          <>
            {/* Contact Layout Selector */}
            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">
                <LayoutGrid className="h-3.5 w-3.5" />
                Layoutstijl
              </Label>
              <p className="text-xs text-muted-foreground">
                Kies hoe je contactsectie wordt weergegeven
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { layout: "classic" as ContactLayout, label: "Klassiek", icon: AlignCenter },
                  { layout: "split" as ContactLayout, label: "Gesplitst", icon: LayoutPanelLeft },
                  { layout: "minimal" as ContactLayout, label: "Minimaal", icon: Minimize },
                  { layout: "card" as ContactLayout, label: "Kaart", icon: Square },
                  { layout: "fullwidth" as ContactLayout, label: "Volledig", icon: Maximize },
                  { layout: "centered" as ContactLayout, label: "Gecentreerd", icon: PanelRight },
                ].map(({ layout, label, icon: Icon }) => {
                  const currentLayout =
                    ((selectedSection.data as any).layout as ContactLayout) || "classic"
                  const isActive = currentLayout === layout
                  return (
                    <button
                      key={layout}
                      onClick={() => updateField("layout", layout)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-all hover:scale-105 ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-ring/30"
                          : "border-border bg-background hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                {((selectedSection.data as any).layout as ContactLayout) === "classic" &&
                  "Info links, formulier rechts"}
                {((selectedSection.data as any).layout as ContactLayout) === "split" &&
                  "Donker paneel links, formulier rechts"}
                {((selectedSection.data as any).layout as ContactLayout) === "minimal" &&
                  "Tekst-gecentreerd met compact formulier"}
                {((selectedSection.data as any).layout as ContactLayout) === "card" &&
                  "Kaartontwerp met gekleurde sidebar"}
                {((selectedSection.data as any).layout as ContactLayout) === "fullwidth" &&
                  "Hero-banner met formulier eronder"}
                {((selectedSection.data as any).layout as ContactLayout) === "centered" &&
                  "Symmetrisch met info-kaarten bovenaan"}
                {!((selectedSection.data as any).layout as ContactLayout) &&
                  "Info links, formulier rechts"}
              </p>
            </Card>

            {/* Contact Content */}
            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">
                <Type className="h-3.5 w-3.5" />
                Inhoud
              </Label>
              <div>
                <Label className="text-xs mb-1.5 block">Titel</Label>
                <Input
                  placeholder="Neem Contact Op"
                  value={(selectedSection.data as any).title || ""}
                  onChange={(e) => updateField("title", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Ondertitel</Label>
                <Input
                  placeholder="Neem gerust contact met ons op."
                  value={(selectedSection.data as any).subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-xs mb-1.5">
                  <MapPin className="h-3 w-3" />
                  Adres
                </Label>
                <Input
                  placeholder="Dorpsstraat 1, 1234 AB Amsterdam"
                  value={(selectedSection.data as any).address || ""}
                  onChange={(e) => updateField("address", e.target.value)}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-xs mb-1.5">
                  <Phone className="h-3 w-3" />
                  Telefoon
                </Label>
                <Input
                  placeholder="+31 6 00000000"
                  value={(selectedSection.data as any).phone || ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-xs mb-1.5">
                  <Mail className="h-3 w-3" />
                  E-mail (weergave)
                </Label>
                <Input
                  placeholder="info@mijnbnb.nl"
                  value={(selectedSection.data as any).email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
            </Card>

            {/* Recipient Email */}
            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Formulier ontvanger
              </Label>
              <p className="text-xs text-muted-foreground">
                Contactformulieren worden verzonden naar dit e-mailadres. Laat leeg om naar het standaard adres te sturen.
              </p>
              <Input
                type="email"
                placeholder="jouw@email.nl"
                value={(selectedSection.data as any).recipientEmail || ""}
                onChange={(e) => updateField("recipientEmail", e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Verzonden vanaf: info@bnbwebsitemaken.nl
              </p>
            </Card>
          </>
        )}

        {selectedSection.type === "nav" && (
          <Card className="p-4 space-y-4">
            <Label className="flex items-center gap-2">
              <Navigation className="h-3.5 w-3.5" />
              Navigatie-instellingen
            </Label>

            {/* Brand Name */}
            <div className="space-y-2">
              <Label className="text-xs">Merknaam</Label>
              <Input
                value={(selectedSection.data as any).brandName || "Mijn bedrijf"}
                onChange={(e) => updateField("brandName", e.target.value)}
                placeholder="Je merknaam"
              />
            </div>

            {/* Sticky Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pin className="h-3.5 w-3.5" />
                <Label className="text-xs">Vaste navigatie</Label>
              </div>
              <button
                onClick={() =>
                  updateField(
                    "isSticky",
                    !((selectedSection.data as any).isSticky ?? true)
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  ((selectedSection.data as any).isSticky ?? true) ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    ((selectedSection.data as any).isSticky ?? true)
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {((selectedSection.data as any).isSticky ?? true)
                ? "Navbar blijft bovenaan tijdens scrollen"
                : "Navbar scrolt met pagina"}
            </p>

            {/* Section Links */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-xs">
                <Type className="h-3.5 w-3.5" />
                Navigatielinks
              </Label>
              <p className="text-xs text-muted-foreground">
                Kies welke secties in de navigatie verschijnen en pas de labels aan
              </p>

              {(() => {
                const navigableSectionTypes: SectionType[] = [
                  "hero",
                  "about",
                  "services",
                  "rooms",
                  "gallery",
                  "features",
                  "amenities",
                  "contact",
                  "testimonials",
                  "faq",
                  "opening_hours",
                  "pricing",
                  "map",
                  "cta",
                  "request_form",
                ]
                const defaultLabels: Record<SectionType, string> = {
                  hero: "Home",
                  about: "Over",
                  services: "Diensten",
                  rooms: "Diensten",
                  gallery: "Galerij",
                  features: "Kenmerken",
                  amenities: "Kenmerken",
                  contact: "Contact",
                  nav: "Navigation",
                  footer: "Footer",
                  testimonials: "Recensies",
                  faq: "FAQ",
                  opening_hours: "Openingstijden",
                  pricing: "Tarieven",
                  map: "Locatie",
                  cta: "Actie",
                  request_form: "Aanvraag",
                }

                const navigableSections = sections.filter((s) =>
                  navigableSectionTypes.includes(s.type)
                )
                const navLinks =
                  ((selectedSection.data as any).navLinks as Array<{
                    sectionId: string
                    label: string
                    enabled: boolean
                  }>) || []

                const getNavLinkConfig = (
                  sectionId: string,
                  sectionType: SectionType,
                  sectionData: Record<string, unknown>
                ) => {
                  const existing = navLinks.find((nl) => nl.sectionId === sectionId)
                  if (existing) return existing
                  return {
                    sectionId,
                    label: (sectionData?.title as string) || defaultLabels[sectionType],
                    enabled: true,
                  }
                }

                const updateNavLink = (
                  sectionId: string,
                  field: "label" | "enabled",
                  value: string | boolean
                ) => {
                  const currentLinks = [...navLinks]
                  const existingIndex = currentLinks.findIndex(
                    (nl) => nl.sectionId === sectionId
                  )
                  const section = navigableSections.find((s) => s.id === sectionId)

                  if (existingIndex >= 0) {
                    currentLinks[existingIndex] = {
                      ...currentLinks[existingIndex],
                      [field]: value,
                    }
                  } else {
                    currentLinks.push({
                      sectionId,
                      label:
                        (section?.data?.title as string) ||
                        defaultLabels[section?.type || "hero"],
                      enabled: true,
                      [field]: value,
                    })
                  }

                  updateField("navLinks", currentLinks)
                }

                return (
                  <div className="space-y-2">
                    {navigableSections.map((section) => {
                      const config = getNavLinkConfig(
                        section.id,
                        section.type,
                        section.data
                      )
                      return (
                        <div
                          key={section.id}
                          className="flex items-center gap-2 p-2 rounded border bg-muted/20"
                        >
                          <button
                            onClick={() =>
                              updateNavLink(section.id, "enabled", !config.enabled)
                            }
                            className="flex-shrink-0"
                            title={
                              config.enabled ? "Verbergen uit nav" : "Tonen in nav"
                            }
                          >
                            {config.enabled ? (
                              <Eye className="h-4 w-4 text-primary" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                          <Input
                            value={config.label}
                            onChange={(e) =>
                              updateNavLink(section.id, "label", e.target.value)
                            }
                            className={`flex-1 h-8 text-sm ${
                              !config.enabled ? "opacity-50" : ""
                            }`}
                            disabled={!config.enabled}
                            placeholder={defaultLabels[section.type]}
                          />
                          <span className="text-xs text-muted-foreground capitalize w-16 text-right">
                            {section.type}
                          </span>
                        </div>
                      )
                    })}
                    {navigableSections.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        Voeg secties toe aan je pagina om navigatielinks te maken
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>
          </Card>
        )}

        {selectedSection.type === "testimonials" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Inhoud
            </Label>
            <div>
              <Label className="text-xs mb-1.5 block">Titel</Label>
              <Input
                placeholder="Wat klanten zeggen"
                value={(selectedSection.data as any).title || ""}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Ondertitel</Label>
              <Input
                placeholder="Lees ervaringen van onze klanten"
                value={(selectedSection.data as any).subtitle || ""}
                onChange={(e) => updateField("subtitle", e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Recensies worden automatisch weergegeven vanuit de standaardinhoud. Koppeling aan een live database volgt in een volgende stap.
            </p>
          </Card>
        )}

        {selectedSection.type === "faq" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Inhoud
            </Label>
            <div>
              <Label className="text-xs mb-1.5 block">Titel</Label>
              <Input
                placeholder="Veelgestelde vragen"
                value={(selectedSection.data as any).title || ""}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Ondertitel</Label>
              <Input
                placeholder="Alles wat je wil weten"
                value={(selectedSection.data as any).subtitle || ""}
                onChange={(e) => updateField("subtitle", e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              FAQ-items worden automatisch weergegeven vanuit de standaardinhoud. Beheer items via je bedrijfsprofiel.
            </p>
          </Card>
        )}

        {selectedSection.type === "opening_hours" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Inhoud
            </Label>
            <div>
              <Label className="text-xs mb-1.5 block">Titel</Label>
              <Input
                placeholder="Openingstijden"
                value={(selectedSection.data as any).title || ""}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Ondertitel</Label>
              <Input
                placeholder="Wanneer je ons kunt bereiken"
                value={(selectedSection.data as any).subtitle || ""}
                onChange={(e) => updateField("subtitle", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Opmerking (optioneel)</Label>
              <Input
                placeholder="bijv. Op feestdagen gesloten"
                value={(selectedSection.data as any).note || ""}
                onChange={(e) => updateField("note", e.target.value)}
              />
            </div>
            {(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const).map((day) => {
              const labels: Record<string, string> = {
                monday: "Maandag", tuesday: "Dinsdag", wednesday: "Woensdag",
                thursday: "Donderdag", friday: "Vrijdag", saturday: "Zaterdag", sunday: "Zondag",
              }
              const val = (selectedSection.data as any)[day] as { hours?: string; closed?: boolean } | undefined
              const closed = val?.closed ?? (day === "sunday")
              const hours = val?.hours ?? (day === "sunday" ? "" : "09:00 – 17:00")
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-24 text-xs text-muted-foreground flex-shrink-0">{labels[day]}</span>
                  <button
                    type="button"
                    onClick={() => updateField(day, { hours, closed: !closed })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full flex-shrink-0 transition-colors ${closed ? "bg-muted" : "bg-primary"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${closed ? "translate-x-0.5" : "translate-x-4"}`} />
                  </button>
                  {!closed && (
                    <Input
                      className="h-7 text-xs flex-1"
                      placeholder="09:00 – 17:00"
                      value={hours}
                      onChange={(e) => updateField(day, { hours: e.target.value, closed: false })}
                    />
                  )}
                  {closed && <span className="text-xs text-muted-foreground italic">Gesloten</span>}
                </div>
              )
            })}
          </Card>
        )}

        {selectedSection.type === "pricing" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Inhoud
            </Label>
            <div>
              <Label className="text-xs mb-1.5 block">Titel</Label>
              <Input
                placeholder="Onze tarieven"
                value={(selectedSection.data as any).title || ""}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Ondertitel</Label>
              <Input
                placeholder="Transparante tarieven zonder verrassingen"
                value={(selectedSection.data as any).subtitle || ""}
                onChange={(e) => updateField("subtitle", e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Prijskaarten worden automatisch weergegeven vanuit de standaardinhoud. Individuele pakketten zijn aanpasbaar via de API.
            </p>
          </Card>
        )}

        {selectedSection.type === "map" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              Locatiegegevens
            </Label>
            <div>
              <Label className="text-xs mb-1.5 block">Titel</Label>
              <Input
                placeholder="Onze locatie"
                value={(selectedSection.data as any).title || ""}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Adres</Label>
              <Input
                placeholder="Dorpsstraat 1, 1234 AB Amsterdam"
                value={(selectedSection.data as any).address || ""}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 text-xs mb-1.5">
                <Phone className="h-3 w-3" />
                Telefoon
              </Label>
              <Input
                placeholder="+31 6 00000000"
                value={(selectedSection.data as any).phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 text-xs mb-1.5">
                <Mail className="h-3 w-3" />
                E-mail
              </Label>
              <Input
                placeholder="info@mijnbedrijf.nl"
                value={(selectedSection.data as any).email || ""}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Google Maps embed-URL (optioneel)</Label>
              <Input
                placeholder="https://maps.google.com/maps?q=..."
                value={(selectedSection.data as any).embedUrl || ""}
                onChange={(e) => updateField("embedUrl", e.target.value)}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Laat leeg om automatisch te genereren vanuit het adres.
              </p>
            </div>
          </Card>
        )}

        {selectedSection.type === "cta" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Inhoud
            </Label>
            <div>
              <Label className="text-xs mb-1.5 block">Titel</Label>
              <Input
                placeholder="Klaar om te beginnen?"
                value={(selectedSection.data as any).title || ""}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Ondertitel</Label>
              <Input
                placeholder="Neem vandaag nog contact op"
                value={(selectedSection.data as any).subtitle || ""}
                onChange={(e) => updateField("subtitle", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Knoptekst (primair)</Label>
              <Input
                placeholder="Neem contact op"
                value={(selectedSection.data as any).primaryCtaText || ""}
                onChange={(e) => updateField("primaryCtaText", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Knoplink (primair)</Label>
              <Input
                placeholder="#contact"
                value={(selectedSection.data as any).primaryCtaHref || ""}
                onChange={(e) => updateField("primaryCtaHref", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Knoptekst (secundair, optioneel)</Label>
              <Input
                placeholder="Meer weten"
                value={(selectedSection.data as any).secondaryCtaText || ""}
                onChange={(e) => updateField("secondaryCtaText", e.target.value)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 text-xs mb-1.5">
                <Phone className="h-3 w-3" />
                Telefoonnummer (optioneel)
              </Label>
              <Input
                placeholder="+31 6 00000000"
                value={(selectedSection.data as any).phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Lay-out</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["centered", "split", "banner"] as const).map((layout) => {
                  const isActive = ((selectedSection.data as any).layout || "centered") === layout
                  const labels = { centered: "Gecentreerd", split: "Gesplitst", banner: "Banner" }
                  return (
                    <button
                      key={layout}
                      type="button"
                      onClick={() => updateField("layout", layout)}
                      className={`rounded-lg border p-2 text-xs font-medium transition-all ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {labels[layout]}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        )}

        {selectedSection.type === "request_form" && (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Inhoud
            </Label>
            <div>
              <Label className="text-xs mb-1.5 block">Titel</Label>
              <Input
                placeholder="Stuur een aanvraag"
                value={(selectedSection.data as any).title || ""}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Ondertitel</Label>
              <Input
                placeholder="Vul het formulier in, wij nemen contact op"
                value={(selectedSection.data as any).subtitle || ""}
                onChange={(e) => updateField("subtitle", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Type aanvraag</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["contact", "appointment", "quote", "whatsapp"] as const).map((type) => {
                  const isActive = ((selectedSection.data as any).requestType || "contact") === type
                  const labels = {
                    contact: "Bericht",
                    appointment: "Afspraak",
                    quote: "Offerte",
                    whatsapp: "WhatsApp",
                  }
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateField("requestType", type)}
                      className={`rounded-lg border p-2 text-xs font-medium transition-all ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {labels[type]}
                    </button>
                  )
                })}
              </div>
            </div>
            {((selectedSection.data as any).requestType === "whatsapp") && (
              <div>
                <Label className="text-xs mb-1.5 block">WhatsApp-nummer</Label>
                <Input
                  placeholder="31612345678"
                  value={(selectedSection.data as any).whatsappNumber || ""}
                  onChange={(e) => updateField("whatsappNumber", e.target.value)}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">Zonder + of spaties, bijv. 31612345678</p>
              </div>
            )}
            <div>
              <Label className="flex items-center gap-2 text-xs mb-1.5">
                <Mail className="h-3 w-3" />
                Ontvanger e-mail
              </Label>
              <Input
                type="email"
                placeholder="jouw@email.nl"
                value={(selectedSection.data as any).recipientEmail || ""}
                onChange={(e) => updateField("recipientEmail", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Formuliervelden</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["name", "email", "phone", "date", "service", "budget", "message"] as const).map((field) => {
                  const fieldLabels = {
                    name: "Naam", email: "E-mail", phone: "Telefoon",
                    date: "Datum", service: "Dienst", budget: "Budget", message: "Bericht",
                  }
                  const currentFields: string[] = (selectedSection.data as any).fields || ["name", "email", "phone", "message"]
                  const isActive = currentFields.includes(field)
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => {
                        const next = isActive
                          ? currentFields.filter((f) => f !== field)
                          : [...currentFields, field]
                        updateField("fields", next)
                      }}
                      className={`rounded-lg border p-2 text-xs font-medium transition-all ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 opacity-50"
                      }`}
                    >
                      {fieldLabels[field]}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4 space-y-3">
          <Label className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5" />
            Stijlen
          </Label>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 text-xs">Lettertypefamilie</Label>
              <Input
                placeholder="bijv., font-serif"
                value={(selectedSection.styles as any)?.fontFamily || ""}
                onChange={(e) => {
                  const newStyles = {
                    ...(selectedSection.styles || {}),
                    fontFamily: e.target.value,
                  }
                  onStyleUpdate(newStyles)
                  if (saveTimeoutId) clearTimeout(saveTimeoutId)
                  const timeout = setTimeout(async () => {
                    await saveStylesToDatabase(newStyles)
                    toast.success("Stijl opgeslagen", {
                      position: "bottom-right",
                      duration: 2000,
                      style: { background: "#10b981", color: "white" },
                    })
                  }, 800)
                  setSaveTimeoutId(timeout)
                }}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="mb-2 flex items-center gap-1 text-xs">
                  <div className="h-3 w-3 rounded border bg-muted" />
                  Achtergrond
                </Label>
                <input
                  type="color"
                  aria-label="Achtergrondkleur"
                  value={(selectedSection.styles as any)?.backgroundColor || "#ffffff"}
                  onChange={(e) => {
                    const newStyles = {
                      ...(selectedSection.styles || {}),
                      backgroundColor: e.target.value,
                    }
                    onStyleUpdate(newStyles)
                    if (saveTimeoutId) clearTimeout(saveTimeoutId)
                    const timeout = setTimeout(async () => {
                      await saveStylesToDatabase(newStyles)
                      toast.success("Stijl opgeslagen", {
                        position: "bottom-right",
                        duration: 2000,
                        style: { background: "#10b981", color: "white" },
                      })
                    }, 800)
                    setSaveTimeoutId(timeout)
                  }}
                  className="h-9 w-full cursor-pointer rounded border"
                />
              </div>
              <div className="flex-1">
                <Label className="mb-2 flex items-center gap-1 text-xs">
                  <Type className="h-3 w-3" />
                  Tekst
                </Label>
                <input
                  type="color"
                  aria-label="Tekstkleur"
                  value={(selectedSection.styles as any)?.textColor || "#000000"}
                  onChange={(e) => {
                    const newStyles = {
                      ...(selectedSection.styles || {}),
                      textColor: e.target.value,
                    }
                    onStyleUpdate(newStyles)
                    if (saveTimeoutId) clearTimeout(saveTimeoutId)
                    const timeout = setTimeout(async () => {
                      await saveStylesToDatabase(newStyles)
                      toast.success("Stijl opgeslagen", {
                        position: "bottom-right",
                        duration: 2000,
                        style: { background: "#10b981", color: "white" },
                      })
                    }, 800)
                    setSaveTimeoutId(timeout)
                  }}
                  className="h-9 w-full cursor-pointer rounded border"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Transition Editor */}
        {sections.length > 1 &&
          sections.findIndex((s) => s.id === selectedSection.id) < sections.length - 1 && (
            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">
                <Wand2 className="h-3.5 w-3.5" />
                Overgang naar volgende sectie
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecteer hoe deze sectie overgaat naar de volgende
              </p>
              {(() => {
                const nextSectionIdx =
                  sections.findIndex((s) => s.id === selectedSection.id) + 1
                const nextSection =
                  nextSectionIdx < sections.length ? sections[nextSectionIdx] : null
                const currentTransition = nextSection
                  ? transitions.find(
                      (t) =>
                        t.fromSectionId === selectedSection.id &&
                        t.toSectionId === nextSection.id
                    )
                  : null
                const currentType = currentTransition?.type || "none"

                return (
                  <>
                    <select
                      value={currentType}
                      onChange={(e) => handleTransitionChange(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent"
                    >
                      <option value="none">Geen</option>
                      <option value="fade">Vervagen</option>
                      <option value="gradient">Verloop</option>
                      <option value="slide">Schuiven</option>
                      <option value="wave">Golf</option>
                      <option value="curve">Kromme</option>
                      <option value="diagonal">Diagonaal</option>
                      <option value="zigzag">Zigzag</option>
                      <option value="split">Splitsen</option>
                    </select>
                    {currentType !== "none" && (
                      <div className="mt-3 p-2 rounded bg-muted border border-border">
                        <p className="text-xs text-muted-foreground">
                          Voorvertoning: Controleer het editorcanvas om de {currentType}{" "}
                          overgang te zien
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
            </Card>
          )}
      </div>
    </div>
  )
}

