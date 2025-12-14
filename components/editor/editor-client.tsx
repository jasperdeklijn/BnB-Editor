"use client"

import { useState, useEffect } from "react"
import { SectionsSelector } from "./sections-selector"
import { EditorCanvas } from "./editor-canvas"
import { EditorHeader } from "./editor-header"
import { SelectionEditor } from "./section-editor"
import type { Section, SectionStyles } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
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
      setSections(website.sections || [])
    } else {
      // Create new website
      const newSlug = `bnb-${Date.now()}`
      const { data: newWebsite, error } = await supabase
        .from("websites")
        .insert({
          user_id: userId,
          title: "My BnB Website",
          slug: newSlug,
          sections: [],
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

    const { error } = await supabase
      .from("websites")
      .update({
        title,
        sections,
      })
      .eq("id", websiteId)

    setIsSaving(false)

    if (error) {
      console.error("Error saving:", error)
    }
  }

  // Persist sections immediately when updated from children
  const persistSections = async (newSections: Section[]) => {
    setSections(newSections)

    if (!websiteId) return

    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("websites")
      .update({
        sections: newSections,
      })
      .eq("id", websiteId)

    setIsSaving(false)

    if (error) {
      console.error("Error persisting sections:", error)
    }
  }

  const handlePublish = async () => {
    if (!websiteId) return

    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("websites")
      .update({
        title,
        sections,
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
