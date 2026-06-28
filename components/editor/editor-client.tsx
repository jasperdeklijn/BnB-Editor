"use client"

import { useState, useEffect, useCallback } from "react"
import { SectionsSelector } from "./sections-selector"
import { EditorCanvas } from "./editor-canvas"
import { SelectionEditor } from "./section-editor"
import { useEditorLayout } from "./editor-layout-context"
import type { Section, SectionStyles, SectionType, Transition } from "@/lib/types"
import { DEFAULT_SITE_TITLE } from "@/lib/business-naming"
import { getDefaultSectionData as getRegistryDefaultSectionData } from "@/components/editor/section-registry"
import { createClient } from "@/lib/supabase/client"
import websiteSections from "@/lib/supabase/websiteSections"
import { useRouter, useSearchParams } from "next/navigation"
import { Globe2, Layers, LayoutTemplate, Loader2, Paintbrush, Plus } from "lucide-react"
import type { ThemeConfig } from "@/lib/themes"
import { Button } from "@/components/ui/button"
import { StatusMessage } from "@/components/ui/status-message"
import { PLATFORM_DOMAIN } from "@/lib/platform"

type MobilePanel = "canvas" | "sections" | "style"

type WebsiteSummary = {
  id: string
  title: string
  slug: string
  published: boolean
  customDomain?: string | null
  created_at?: string
}

const getDefaultSectionData = (type: SectionType, businessId?: string | null): Record<string, unknown> =>
  getRegistryDefaultSectionData(type, { businessId })

interface EditorClientProps {
  userId: string
}

export function EditorClient({ userId }: EditorClientProps) {
  const [sections, setSections] = useState<Section[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [websites, setWebsites] = useState<WebsiteSummary[]>([])
  const [websiteId, setWebsiteId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [title, setTitle] = useState(DEFAULT_SITE_TITLE)
  const [slug, setSlug] = useState("")
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null)
  const [isCreatingWebsite, setIsCreatingWebsite] = useState(false)
  const [isRenamingWebsite, setIsRenamingWebsite] = useState(false)
  const [websiteMessage, setWebsiteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("canvas")
  const [isMobileDraggingNewSection, setIsMobileDraggingNewSection] = useState(false)
  const [isMobileDraggingImage, setIsMobileDraggingImage] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isPreview, setIsPreview, isSaving, setIsSaving, setSaveState, device, setDevice, setOnPublish, setOnLogout } = useEditorLayout()
  const requestedWebsiteId = searchParams.get("websiteId")

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

  const loadWebsite = useCallback(async (preferredWebsiteId?: string | null) => {
    const supabase = createClient()

    // Fetch the user's current business id for service-backed sections.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
      if (business) setBusinessId(business.id)
    }

    const { data: websiteRows } = await supabase
      .from("websites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (websiteRows && websiteRows.length > 0) {
      const summaries = websiteRows.map((website: any) => ({
        id: website.id,
        title: website.title || DEFAULT_SITE_TITLE,
        slug: website.slug,
        published: Boolean(website.published),
        customDomain: website.custom_domain ?? null,
        created_at: website.created_at,
      }))
      setWebsites(summaries)

      const website =
        websiteRows.find((row: any) => row.id === preferredWebsiteId) ||
        websiteRows.find((row: any) => row.published) ||
        websiteRows[0]
      setWebsiteId(website.id)
      setTitle(website.title)
      setSlug(website.slug)
      setThemeConfig((website.theme_config as ThemeConfig | null) ?? null)
      setSelectedSectionId(null)

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
      const newSlug = `site-${Date.now()}`
      const { data: newWebsite, error } = await supabase
        .from("websites")
        .insert({
          user_id: userId,
          title: DEFAULT_SITE_TITLE,
          slug: newSlug,
        })
        .select()
        .single()

      if (newWebsite && !error) {
        setWebsiteId(newWebsite.id)
        setTitle(newWebsite.title || DEFAULT_SITE_TITLE)
        setSlug(newSlug)
        setWebsites([
          {
            id: newWebsite.id,
            title: newWebsite.title || DEFAULT_SITE_TITLE,
            slug: newSlug,
            published: false,
            customDomain: newWebsite.custom_domain ?? null,
            created_at: newWebsite.created_at,
          },
        ])
      }
    }
  }, [userId])

  // Load or create website on mount and when a selected website is requested.
  useEffect(() => {
    loadWebsite(requestedWebsiteId)
  }, [loadWebsite, requestedWebsiteId])

  const handleWebsiteChange = (nextWebsiteId: string) => {
    setWebsiteMessage(null)
    router.replace(`/editor?websiteId=${nextWebsiteId}`)
  }

  const handleCreateWebsite = async () => {
    setIsCreatingWebsite(true)
    setIsSaving(true)
    setWebsiteMessage(null)

    const supabase = createClient()
    const nextNumber = websites.length + 1
    const newSlug = `site-${Date.now()}`
    const newTitle = `${DEFAULT_SITE_TITLE} ${nextNumber}`

    const { data: newWebsite, error } = await supabase
      .from("websites")
      .insert({
        user_id: userId,
        business_id: businessId,
        title: newTitle,
        slug: newSlug,
      })
      .select("id, title, slug, published, custom_domain, created_at")
      .single()

    setIsCreatingWebsite(false)
    setIsSaving(false)

    if (error || !newWebsite) {
      setSaveState("error")
      setWebsiteMessage({ type: "error", text: error?.message || "Nieuwe website kon niet worden aangemaakt." })
      return
    }

    setWebsites((current) => [
      {
        id: newWebsite.id,
        title: newWebsite.title || DEFAULT_SITE_TITLE,
        slug: newWebsite.slug,
        published: Boolean(newWebsite.published),
        customDomain: newWebsite.custom_domain ?? null,
        created_at: newWebsite.created_at,
      },
      ...current,
    ])
    setWebsiteMessage({ type: "success", text: "Nieuwe website aangemaakt. U bewerkt nu deze website." })
    router.replace(`/editor?websiteId=${newWebsite.id}`)
  }

  const handleSave = async () => {
    if (!websiteId) return

    setIsSaving(true)
    setIsRenamingWebsite(true)
    setWebsiteMessage(null)

    const response = await fetch("/api/websites/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId, title }),
    })
    const result = await response.json().catch(() => ({}))

    setIsSaving(false)
    setIsRenamingWebsite(false)

    if (!response.ok) {
      setSaveState("error")
      setWebsiteMessage({ type: "error", text: result?.error || "Websitenaam kon niet worden opgeslagen." })
      return
    }

    const updatedWebsite = result.website as {
      id: string
      title: string
      slug: string
      published: boolean
      custom_domain?: string | null
      created_at?: string
    }
    setTitle(updatedWebsite.title || DEFAULT_SITE_TITLE)
    setSlug(updatedWebsite.slug)
    setWebsites((current) =>
      current.map((website) =>
        website.id === updatedWebsite.id
          ? {
              ...website,
              title: updatedWebsite.title,
              slug: updatedWebsite.slug,
              published: Boolean(updatedWebsite.published),
              customDomain: updatedWebsite.custom_domain ?? website.customDomain ?? null,
              created_at: updatedWebsite.created_at,
            }
          : website,
      ),
    )
    setWebsiteMessage({ type: "success", text: `Websitenaam opgeslagen. Live URL: ${updatedWebsite.slug}.${PLATFORM_DOMAIN}.` })
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
      setSaveState("error")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = useCallback(async () => {
    if (!websiteId) return

    setIsSaving(true)
    setWebsiteMessage(null)
    const response = await fetch("/api/websites/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId }),
    })
    const result = await response.json().catch(() => ({}))
    setIsSaving(false)

    if (!response.ok) {
      setSaveState("error")
      setWebsiteMessage({
        type: "error",
        text:
          result?.error ||
          "Deze website kan niet live worden gezet. Zet eerst de huidige live website uit of wijzig de live website.",
      })
      return
    }

    setWebsites((current) =>
      current.map((website) => ({
        ...website,
        published: website.id === websiteId,
      })),
    )
    setWebsiteMessage({ type: "success", text: "Deze website is live gezet." })
    router.push("/editor")
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

    setIsSaving(true)
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
      setSaveState("error")
    } finally {
      setIsSaving(false)
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
      data: getDefaultSectionData(type, businessId),
      styles: {},
    }

    persistSections([...sections, section])
    setSelectedSectionId(section.id)
    setMobilePanel("canvas")
  }

  const handleStartTutorial = () => {
    const starterTypes: SectionType[] = ["hero", "about", "services", "contact"]
    const starterSections: Section[] = starterTypes.map((type, index) => ({
      id: `section-${Date.now()}-${index}`,
      type,
      data: getDefaultSectionData(type, businessId),
      styles: {},
    }))

    persistSections(starterSections)
    setSelectedSectionId(starterSections[0]?.id ?? null)
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
  const selectedWebsite = websites.find((website) => website.id === websiteId)
  const selectedWebsiteLiveUrl = selectedWebsite
    ? selectedWebsite.customDomain || `${selectedWebsite.slug}.${PLATFORM_DOMAIN}`
    : ""

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted">
      <div className="border-b border-border bg-background px-2 py-2 md:px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          <label htmlFor="website-selector" className="sr-only">
            Website
          </label>
          <select
            id="website-selector"
            value={websiteId ?? ""}
            onChange={(event) => handleWebsiteChange(event.target.value)}
            className="h-8 min-w-0 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-56"
          >
            {websites.map((website) => (
              <option key={website.id} value={website.id}>
                {website.title || DEFAULT_SITE_TITLE} ({website.slug})
              </option>
            ))}
          </select>
          <label htmlFor="website-name" className="sr-only">
            Websitenaam
          </label>
          <input
            id="website-name"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-64"
            placeholder="Websitenaam"
          />
          <Button type="button" size="xs" onClick={handleSave} disabled={!websiteId || isRenamingWebsite}>
            {isRenamingWebsite ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Opslaan
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={handleCreateWebsite} disabled={isCreatingWebsite}>
            {isCreatingWebsite ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Nieuw
          </Button>
          {selectedWebsite ? (
            <div className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs">
              <span
                className={`h-2.5 w-2.5 rounded-full ring-2 ${
                  selectedWebsite.published
                    ? "bg-emerald-500 ring-emerald-500/20"
                    : "bg-red-500 ring-red-500/20"
                }`}
                aria-hidden="true"
              />
              <span className="font-medium text-foreground">{selectedWebsite.published ? "Online" : "Offline"}</span>
              {selectedWebsite.published ? (
                <>
                  <span className="text-muted-foreground">/</span>
                  <Globe2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="max-w-[42vw] truncate font-mono text-muted-foreground sm:max-w-64">
                    {selectedWebsiteLiveUrl}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
        {websiteMessage ? (
          <StatusMessage tone={websiteMessage.type} className="mx-auto mt-2 max-w-7xl text-xs">
            {websiteMessage.text}
          </StatusMessage>
        ) : null}
      </div>
      {/* Desktop layout: side-by-side panels */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {!isPreview && <SectionsSelector userId={userId} />}
        <EditorCanvas
          sections={sections}
          setSections={persistSections}
          transitions={transitions}
          themeConfig={themeConfig}
          isPreview={isPreview}
          selectedSectionId={selectedSectionId}
          onSectionSelect={handleSectionSelect}
          device={device}
          businessId={businessId}
          isDraggingNewSectionExternal={isMobileDraggingNewSection}
          isDraggingImageExternal={isMobileDraggingImage}
          onStartTutorial={handleStartTutorial}
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
            businessId={businessId}
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
              themeConfig={themeConfig}
              isPreview={isPreview}
              selectedSectionId={selectedSectionId}
              onSectionSelect={handleSectionSelect}
              device={device}
              businessId={businessId}
              isDraggingNewSectionExternal={isMobileDraggingNewSection}
              isDraggingImageExternal={isMobileDraggingImage}
              onStartTutorial={handleStartTutorial}
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
              businessId={businessId}
            />
          )}
        </div>

        {/* Bottom tab bar */}
        {!isPreview && (
          <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(31,41,51,0.08)] md:hidden">
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



