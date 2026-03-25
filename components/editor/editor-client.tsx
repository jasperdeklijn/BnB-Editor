"use client"

import { useState, useEffect } from "react"
import { SectionsSelector } from "./sections-selector"
import { EditorCanvas } from "./editor-canvas"
import { EditorHeader } from "./editor-header"
import { SelectionEditor } from "./section-editor"
import type { Section, SectionStyles, Transition } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import websiteSections from "@/lib/supabase/websiteSections"
import { useRouter } from "next/navigation"
import { Layers, Paintbrush, LayoutTemplate } from "lucide-react"

type MobilePanel = "canvas" | "sections" | "style"

interface EditorClientProps {
  userId: string
}

export function EditorClient({ userId }: EditorClientProps) {
  const [sections, setSections] = useState<Section[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [websiteId, setWebsiteId] = useState<string | null>(null)
  const [title, setTitle] = useState("My BnB Website")
  const [slug, setSlug] = useState("")
  const [isPreview, setIsPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("canvas")
  const router = useRouter()

  // Switch to canvas on mobile when a touch drag starts
  useEffect(() => {
    const onTouchDragStart = () => {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setMobilePanel("canvas")
      }
    }
    document.addEventListener("touchdragstart", onTouchDragStart)
    return () => document.removeEventListener("touchdragstart", onTouchDragStart)
  }, [])

  // Load or create website on mount
  useEffect(() => {
    loadWebsite()
  }, [])

  const loadWebsite = async () => {
    const supabase = createClient()

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
          title: "My BnB Website",
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
      for (const transition of transitions) {
        // Make sure both sections are persisted (not temp IDs)
        const persistedFromId = idMapping.get(transition.fromSectionId) || transition.fromSectionId
        const persistedToId = idMapping.get(transition.toSectionId) || transition.toSectionId
        
        if (!persistedFromId.startsWith('section-') && !persistedToId.startsWith('section-')) {
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

  const handlePublish = async () => {
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

    router.push(`/domains`)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

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
    setSections((prev) => prev.filter((s) => s.id !== id))
    if (selectedSectionId === id) setSelectedSectionId(null)
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
    <div className="flex h-[100dvh] flex-col bg-muted/30">
      <EditorHeader
        title={title}
        onTitleChange={setTitle}
        isPreview={isPreview}
        onPreviewToggle={() => setIsPreview(!isPreview)}
        onSave={handleSave}
        onPublish={handlePublish}
        onLogout={handleLogout}
        isSaving={isSaving}
        device={device}
        onDeviceChange={setDevice}
      />

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
          />
        )}
      </div>

      {/* Mobile layout: single panel with bottom tab bar */}
      <div className="flex md:hidden flex-1 overflow-hidden flex-col">
        {/* Panel content */}
        <div className="flex-1 overflow-auto min-h-0">
          {mobilePanel === "sections" && !isPreview && (
            <SectionsSelector
              userId={userId}
              className="w-full h-full border-r-0"
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
            />
          )}
        </div>

        {/* Bottom tab bar */}
        {!isPreview && (
          <nav className="flex border-t border-border bg-background">
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
              Sections
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
              Canvas
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
              Style
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
