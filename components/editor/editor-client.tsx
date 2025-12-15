"use client"

import { useState, useEffect } from "react"
import { SectionsSelector } from "./sections-selector"
import { EditorCanvas } from "./editor-canvas"
import { EditorHeader } from "./editor-header"
import { SelectionEditor } from "./section-editor"
import type { Section, SectionStyles } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import websiteSections from "@/lib/supabase/websiteSections"
import { useRouter } from "next/navigation"

interface EditorClientProps {
  userId: string
}

export function EditorClient({ userId }: EditorClientProps) {
  const [sections, setSections] = useState<Section[]>([])
  const [websiteId, setWebsiteId] = useState<string | null>(null)
  const [title, setTitle] = useState("My BnB Website")
  const [slug, setSlug] = useState("")
  const [isPreview, setIsPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const router = useRouter()

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
        const mapped = (rows || []).map((r: any) => ({
          id: r.id,
          type: r.type,
          data: r.content || {},
          styles: r.styles || {},
          transitionFromPrev: r.transition || undefined,
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
      for (let i = 0; i < newSections.length; i++) {
        const s = newSections[i]
        const payload = {
          type: s.type,
          content: s.data ?? {},
          styles: s.styles ?? {},
          transition: s.transitionFromPrev ?? null,
          position: i + 1,
        }

        if (s.id.startsWith('section-')) {
          const { data: created } = await websiteSections.createSection(websiteId, payload as any, supabase)
          if (created) {
            finalIds.push(created.id)
            // replace temp id in local state
            setSections((prev) => prev.map((p) => (p.id === s.id ? { ...p, id: created.id } : p)))
          }
        } else {
          await websiteSections.updateSection(s.id, payload as any, supabase)
          finalIds.push(s.id)
        }
      }

      // Ensure DB ordering
      await websiteSections.reorderSections(websiteId, finalIds, supabase)
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

    // Ensure latest sections are persisted and ordered before publishing
    await persistSections(sections)

    const { error } = await supabase
      .from("websites")
      .update({
        title,
        published: true,
      })
      .eq("id", websiteId)

    setIsSaving(false)

    if (!error) {
      router.push(`/site/${slug}`)
    }
  }

  const handleStyleUpdate = (styles: SectionStyles) => {
    if (!selectedSectionId) return

    setSections((prev) =>
      prev.map((section) =>
        section.id === selectedSectionId ? { ...section, styles: { ...section.styles, ...styles } } : section,
      ),
    )
  }

  const handleContentUpdate = (id: string, data: Record<string, unknown>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, data: { ...s.data, ...data } } : s)))
  }

  const handleDelete = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id))
    if (selectedSectionId === id) setSelectedSectionId(null)
  }

  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      <EditorHeader
        title={title}
        onTitleChange={setTitle}
        isPreview={isPreview}
        onPreviewToggle={() => setIsPreview(!isPreview)}
        onSave={handleSave}
        onPublish={handlePublish}
        isSaving={isSaving}
        device={device}
        onDeviceChange={setDevice}
      />
      <div className="flex flex-1 overflow-hidden">
        {!isPreview && <SectionsSelector />}
        <EditorCanvas
          sections={sections}
          setSections={persistSections}
          isPreview={isPreview}
          selectedSectionId={selectedSectionId}
          onSectionSelect={setSelectedSectionId}
          device={device}
        />
        {!isPreview && (
          <SelectionEditor
            selectedSection={selectedSection}
            onUpdate={handleContentUpdate}
            onStyleUpdate={handleStyleUpdate}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}
