"use client"

import { useState, useEffect, useCallback } from "react"
import { SectionsSelector } from "./sections-selector"
import { EditorCanvas } from "./editor-canvas"
import { SelectionEditor } from "./section-editor"
import { useEditorLayout } from "./editor-layout-context"
import type { Section, SectionStyles, SectionType, Transition } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import websiteSections from "@/lib/supabase/websiteSections"
import { useRouter } from "next/navigation"
import { Layers, Paintbrush, LayoutTemplate } from "lucide-react"

type MobilePanel = "canvas" | "sections" | "style"

const getDefaultSectionData = (type: SectionType, bnbId?: string | null): Record<string, unknown> => {
  switch (type) {
    case "hero":
      return {
        title: "Welkom bij onze Bed & Breakfast",
        subtitle: "Ervaar comfort en gastvrijheid",
        ctaText: "Nu boeken",
      }
    case "about":
      return {
        title: "Over Ons",
        description: "Leer ons verhaal kennen en wat ons bijzonder maakt.",
      }
    case "rooms":
      return {
        title: "Onze Kamers",
        layout: "grid",
        bnbId: bnbId ?? null,
        roomIds: [],
      }
    case "gallery":
      return {
        title: "Galerij",
        subtitle: "Ontdek onze mooie ruimtes",
        layout: "grid",
        images: [
          `/placeholder.svg?height=400&width=400&query=bed+and+breakfast+interior+1`,
          `/placeholder.svg?height=400&width=400&query=bed+and+breakfast+interior+2`,
          `/placeholder.svg?height=400&width=400&query=bed+and+breakfast+interior+3`,
          `/placeholder.svg?height=400&width=400&query=bed+and+breakfast+interior+4`,
          `/placeholder.svg?height=400&width=400&query=bed+and+breakfast+interior+5`,
          `/placeholder.svg?height=400&width=400&query=bed+and+breakfast+interior+6`,
        ],
      }
    case "amenities":
      return {
        title: "Voorzieningen",
        amenities: ["Gratis WiFi", "Ontbijt", "Parkeren", "Zwembad"],
      }
    case "contact":
      return {
        title: "Neem Contact Op",
        address: "123 Hoofdstraat, Stad, Provincie 12345",
        phone: "(555) 123-4567",
        email: "info@bnb.com",
      }
    case "nav":
      return {
        brandName: "Mijn B&B",
        isSticky: true,
        navLinks: [],
      }
    case "footer":
      return {
        brandName: "Mijn B&B",
        copyright: `© ${new Date().getFullYear()} Mijn B&B. Alle rechten voorbehouden.`,
      }
    default:
      return {}
  }
}

interface EditorClientProps {
  userId: string
}

export function EditorClient({ userId }: EditorClientProps) {
  const [sections, setSections] = useState<Section[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [websiteId, setWebsiteId] = useState<string | null>(null)
  const [bnbId, setBnbId] = useState<string | null>(null)
  const [title, setTitle] = useState("Mijn B&B Website")
  const [slug, setSlug] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("canvas")
  const [isMobileDraggingNewSection, setIsMobileDraggingNewSection] = useState(false)
  const [isMobileDraggingImage, setIsMobileDraggingImage] = useState(false)
  const router = useRouter()
  const { isPreview, setIsPreview, isSaving, setIsSaving, device, setDevice, setOnPublish, setOnLogout } = useEditorLayout()

  // Switch to canvas on mobile when a touch drag starts
  useEffect(() => {
    const onTouchDragStart = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setIsMobileDraggingNewSection(Boolean(detail?.sectionType))
        setIsMobileDraggingImage(Boolean(detail?.imageUrl))
        setMobilePanel("canvas")
      }
    }
    const onTouchDragEnd = () => {
      setIsMobileDraggingNewSection(false)
      setIsMobileDraggingImage(false)
    }

    document.addEventListener("touchdragstart", onTouchDragStart)
    document.addEventListener("touchdragend", onTouchDragEnd)
    document.addEventListener("touchdrop", onTouchDragEnd)
    return () => {
      document.removeEventListener("touchdragstart", onTouchDragStart)
      document.removeEventListener("touchdragend", onTouchDragEnd)
      document.removeEventListener("touchdrop", onTouchDragEnd)
    }
  }, [])

  // Load or create website on mount
  useEffect(() => {
    loadWebsite()
  }, [])

  const loadWebsite = async () => {
    const supabase = createClient()

    // Fetch the user's profile and BnB id for the rooms editor
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: bnb } = await supabase
        .from("bnbs")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
      if (bnb) setBnbId(bnb.id)
    }

    // Try to load existing website
    const { data: websites } = await supabase
      .from("websites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (websites && websites.length > 0) {
      const website = websites[0]
      setWebsiteId(website.id)
      setTitle(website.title)
      setSlug(website.slug)

      // Load normalized sections from website_sections
      const { data: rows, error: listErr } = await websiteSections.listSections(website.id, supabase)
      if (listErr) {
        console.error('Failed to load sections:', listErr)
        setSections([])
      } else {
        // Load transitions from separate table
        const { data: transitionRows } = await supabase
          .from("section_transitions")
          .select("from_section_id, to_section_id, transition")
          .eq("website_id", website.id)
        
        // Map transitions to Transition objects
        const mappedTransitions: Transition[] = (transitionRows || []).map((t: any) => ({
          id: `${t.from_section_id}-${t.to_section_id}`,
          fromSectionId: t.from_section_id,
          toSectionId: t.to_section_id,
          type: t.transition?.type || "none",
        }))
        setTransitions(mappedTransitions)
        
        const mapped = (rows || []).map((r: any) => ({
          id: r.id,
          type: r.type,
          data: r.content || {},
          styles: r.styles || {},
        }))
        setSections(mapped)
      }
    } else {
      // Create new website
      const newSlug = `bnb-${Date.now()}`
      const { data: newWebsite, error } = await supabase
        .from("websites")
        .insert({
          user_id: userId,
          title: "Mijn B&B Website",
          slug: newSlug,
        })
        .select()
        .single()

      if (newWebsite && !error) {
        setWebsiteId(newWebsite.id)
        setSlug(newSlug)
      }
    }
  }

  const handleSave = async () => {
    if (!websiteId) return

    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase.from("websites").update({ title }).eq("id", websiteId)

    setIsSaving(false)

    if (error) {
      console.error("Error saving:", error)
    }
  }

  // Persist sections immediately when updated from children
  const persistSections = async (newSections: Section[]) => {
    // Optimistically update UI
    const prevSections = sections
    setSections(newSections)

    if (!websiteId) return

    setIsSaving(true)
    const supabase = createClient()

    try {
      // Find removed sections and delete them in DB
      const prevIds = prevSections.map((s) => s.id)
      const newIds = newSections.map((s) => s.id)
      const removed = prevIds.filter((id) => !newIds.includes(id))
      for (const id of removed) {
        if (!id.startsWith('section-')) {
          await websiteSections.deleteSection(id, supabase)
        }
      }

      // Create or update sections in order
      const finalIds: string[] = []
      const idMapping = new Map<string, string>() // temp ID -> persisted ID
      
      for (let i = 0; i < newSections.length; i++) {
        const s = newSections[i]
        const payload = {
          type: s.type,
          content: s.data ?? {},
          styles: s.styles ?? {},
          position: i + 1,
        }

        if (s.id.startsWith('section-')) {
          const { data: created } = await websiteSections.createSection(websiteId, payload as any, supabase)
          if (created) {
            finalIds.push(created.id)
            idMapping.set(s.id, created.id)
            // replace temp id in local state
            setSections((prev) => prev.map((p) => (p.id === s.id ? { ...p, id: created.id } : p)))
          }
        } else {
          await websiteSections.updateSection(s.id, payload as any, supabase)
          finalIds.push(s.id)
          idMapping.set(s.id, s.id)
        }
      }

      // Ensure DB ordering
      await websiteSections.reorderSections(websiteId, finalIds, supabase)

      // Save all transitions from transitions state
      const persistedSectionIds = new Set(finalIds)
      for (const transition of transitions) {
        // Make sure both sections are persisted (not temp IDs)
        const persistedFromId = idMapping.get(transition.fromSectionId) || transition.fromSectionId
        const persistedToId = idMapping.get(transition.toSectionId) || transition.toSectionId
        
        if (
          persistedSectionIds.has(persistedFromId) &&
          persistedSectionIds.has(persistedToId) &&
          !persistedFromId.startsWith('section-') &&
          !persistedToId.startsWith('section-')
        ) {
          await websiteSections.setTransition(
            websiteId,
            persistedFromId,
            persistedToId,
            { type: transition.type },
            supabase
          ).catch(err => console.error('Error saving transition:', err))
        }
      }
    } catch (err) {
      console.error('Error persisting sections:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = useCallback(async () => {
    if (!websiteId) return

    setIsSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("websites")
      .update({ published: true })
      .eq("id", websiteId)
    setIsSaving(false)

    if (error) {
      console.error("Error publishing:", error)
      return
    }

    router.push(`/editor/domains`)
  }, [router, websiteId])

  const handleLogout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }, [router])

  useEffect(() => {
    setOnPublish(() => handlePublish)
    setOnLogout(() => handleLogout)
  }, [handlePublish, handleLogout, setOnPublish, setOnLogout])

  const handleStyleUpdate = (styles: SectionStyles) => {
    if (!selectedSectionId) return

    setSections((prev) =>
      prev.map((section) =>
        section.id === selectedSectionId ? { ...section, styles: { ...section.styles, ...styles } } : section,
      ),
    )
  }

  // Update section content fields (merged into `data`) or top-level metadata like transitions.
  const handleSectionUpdate = (id: string, data: Record<string, unknown>) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        return { ...s, data: { ...s.data, ...data } }
      }),
    )
  }

  const handleTransitionUpdate = async (fromSectionId: string, toSectionId: string, transitionType: string) => {
    // Update local state
    setTransitions((prev) => {
      // Remove existing transition between these sections
      const filtered = prev.filter(
        t => !(t.fromSectionId === fromSectionId && t.toSectionId === toSectionId)
      )
      
      // Add new transition if type is not "none"
      if (transitionType !== "none") {
        filtered.push({
          id: `${fromSectionId}-${toSectionId}`,
          fromSectionId,
          toSectionId,
          type: transitionType as any,
        })
      }
      
      return filtered
    })

    // Save to database
    if (!websiteId || fromSectionId.startsWith('section-') || toSectionId.startsWith('section-')) return

    try {
      const supabase = createClient()
      if (transitionType === "none") {
        // Delete transition
        await supabase
          .from("section_transitions")
          .delete()
          .eq("website_id", websiteId)
          .eq("from_section_id", fromSectionId)
          .eq("to_section_id", toSectionId)
      } else {
        // Create or update transition
        await websiteSections.setTransition(
          websiteId,
          fromSectionId,
          toSectionId,
          { type: transitionType },
          supabase
        )
      }
    } catch (err) {
      console.error('Error saving transition:', err)
    }
  }

  const handleDelete = (id: string) => {
    const nextSections = sections.filter((s) => s.id !== id)
    persistSections(nextSections)
    setTransitions((prev) =>
      prev.filter((t) => t.fromSectionId !== id && t.toSectionId !== id),
    )
    if (selectedSectionId === id) setSelectedSectionId(null)
    setMobilePanel("canvas")
  }

  const handleAddSection = (type: SectionType) => {
    const section: Section = {
      id: `section-${Date.now()}`,
      type,
      data: getDefaultSectionData(type, bnbId),
      styles: {},
    }

    persistSections([...sections, section])
    setSelectedSectionId(section.id)
    setMobilePanel("canvas")
  }

  const handleSectionSelect = (id: string | null) => {
    setSelectedSectionId(id)
    // On mobile, jump to the style panel when a section is tapped
    if (id && typeof window !== "undefined" && window.innerWidth < 768) {
      setMobilePanel("style")
    }
  }

  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/30">
      {/* Desktop layout: side-by-side panels */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {!isPreview && <SectionsSelector userId={userId} />}
        <EditorCanvas
          sections={sections}
          setSections={persistSections}
          transitions={transitions}
          isPreview={isPreview}
          selectedSectionId={selectedSectionId}
          onSectionSelect={handleSectionSelect}
          device={device}
          bnbId={bnbId}
          isDraggingNewSectionExternal={isMobileDraggingNewSection}
          isDraggingImageExternal={isMobileDraggingImage}
        />
        {!isPreview && (
          <SelectionEditor
            selectedSection={selectedSection}
            sections={sections}
            transitions={transitions}
            onUpdate={handleSectionUpdate}
            onStyleUpdate={handleStyleUpdate}
            onDelete={handleDelete}
            onTransitionUpdate={handleTransitionUpdate}
            websiteId={websiteId}
            bnbId={bnbId}
          />
        )}
      </div>

      {/* Mobile layout: single panel with bottom tab bar */}
      <div className="flex md:hidden flex-1 overflow-hidden flex-col">
        {/* Panel content */}
        <div className="flex min-h-0 flex-1 overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {mobilePanel === "sections" && !isPreview && (
            <SectionsSelector
              userId={userId}
              className="w-full h-full border-r-0"
              onAddSection={handleAddSection}
              onSectionAdded={() => setMobilePanel("canvas")}
            />
          )}
          {(mobilePanel === "canvas" || isPreview) && (
            <EditorCanvas
              sections={sections}
              setSections={persistSections}
              transitions={transitions}
              isPreview={isPreview}
              selectedSectionId={selectedSectionId}
              onSectionSelect={handleSectionSelect}
              device={device}
              bnbId={bnbId}
              isDraggingNewSectionExternal={isMobileDraggingNewSection}
              isDraggingImageExternal={isMobileDraggingImage}
            />
          )}
          {mobilePanel === "style" && !isPreview && (
            <SelectionEditor
              selectedSection={selectedSection}
              sections={sections}
              transitions={transitions}
              onUpdate={handleSectionUpdate}
              onStyleUpdate={handleStyleUpdate}
              onDelete={handleDelete}
              onTransitionUpdate={handleTransitionUpdate}
              websiteId={websiteId}
              bnbId={bnbId}
            />
          )}
        </div>

        {/* Bottom tab bar */}
        {!isPreview && (
          <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden">
            <button
              type="button"
              onClick={() => setMobilePanel("sections")}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                mobilePanel === "sections"
                  ? "text-primary border-t-2 border-primary -mt-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-5 w-5" />
              Secties
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("canvas")}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                mobilePanel === "canvas"
                  ? "text-primary border-t-2 border-primary -mt-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutTemplate className="h-5 w-5" />
              Doek
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("style")}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                mobilePanel === "style"
                  ? "text-primary border-t-2 border-primary -mt-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Paintbrush className="h-5 w-5" />
              Stijl
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
