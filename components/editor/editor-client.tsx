"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { SectionsSelector } from "./sections-selector"
import { EditorCanvas } from "./editor-canvas"
import { EditorInspector } from "./editor-inspector"
import { useEditorLayout } from "./editor-layout-context"
import type { Section, SectionStyles, SectionType, Transition } from "@/lib/types"
import { DEFAULT_SITE_TITLE } from "@/lib/business-naming"
import { getDefaultSectionData as getRegistryDefaultSectionData, getSectionDefinition } from "@/components/editor/section-registry"
import { createClient } from "@/lib/supabase/client"
import websiteSections from "@/lib/supabase/websiteSections"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, ExternalLink, Eye, Globe2, Layers, LayoutTemplate, Loader2, Paintbrush, Plus, Sparkles } from "lucide-react"
import type { ThemeConfig } from "@/lib/themes"
import type { BusinessCategory } from "@/lib/business/categories"
import { Button } from "@/components/ui/button"
import { StatusMessage } from "@/components/ui/status-message"
import { PLATFORM_DOMAIN } from "@/lib/platform"
import type { PlanId } from "@/lib/types/pricing"
import { TierBadge } from "@/components/editor/tier-badge"
import { highestRequiredPlan, inspectWebsiteEntitlements, type EntitlementViolation } from "@/lib/entitlements"
import { getPlanDisplayName } from "@/lib/pricing"
import { toast } from "sonner"
import type { PlanEnforcementMode } from "@/lib/plan-enforcement"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type MobilePanel = "canvas" | "sections" | "style" | "site"

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

async function logWebsiteCreated(websiteId: string) {
  await fetch("/api/audit/website-created", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ websiteId }),
  }).catch(() => null)
}

async function logSectionAudit(action: "section.added" | "section.deleted", websiteId: string, section: Pick<Section, "id" | "type">) {
  await fetch("/api/audit/section", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      websiteId,
      sectionId: section.id,
      sectionType: section.type,
    }),
  }).catch(() => null)
}

async function logEntitlementMetric(
  action: "entitlement.warning_shown" | "entitlement.upgrade_clicked",
  metadata: Record<string, unknown>,
) {
  await fetch("/api/audit/entitlement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, metadata }),
  }).catch(() => null)
}

interface EditorClientProps {
  userId: string
  initialBusinessId?: string | null
  initialBusinessCategory?: BusinessCategory | null
  currentPlan: PlanId
  subscriptionNotice?: string | null
  enforcementMode: PlanEnforcementMode
}

export function EditorClient({
  userId,
  initialBusinessId = null,
  initialBusinessCategory = null,
  currentPlan,
  subscriptionNotice,
  enforcementMode,
}: EditorClientProps) {
  const [sections, setSections] = useState<Section[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [websites, setWebsites] = useState<WebsiteSummary[]>([])
  const [websiteId, setWebsiteId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(initialBusinessId)
  const [businessCategory] = useState<BusinessCategory | null>(initialBusinessCategory)
  const [title, setTitle] = useState(DEFAULT_SITE_TITLE)
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null)
  const [isCreatingWebsite, setIsCreatingWebsite] = useState(false)
  const [isRenamingWebsite, setIsRenamingWebsite] = useState(false)
  const [websiteMessage, setWebsiteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("canvas")
  const [pendingMobileSectionType, setPendingMobileSectionType] = useState<SectionType | null>(null)
  const [isMobileDraggingNewSection, setIsMobileDraggingNewSection] = useState(false)
  const [isMobileDraggingImage, setIsMobileDraggingImage] = useState(false)
  const [publishPreflightOpen, setPublishPreflightOpen] = useState(false)
  const [publishConfirmationOpen, setPublishConfirmationOpen] = useState(false)
  const [serverPublishViolations, setServerPublishViolations] = useState<EntitlementViolation[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isPreview, isSaving, setIsSaving, saveState, setSaveState, device, setOnPublish, setOnLogout } = useEditorLayout()
  const requestedWebsiteId = searchParams.get("websiteId")
  const previousEntitlementViolationKeys = useRef<Set<string>>(new Set())
  const sectionsRef = useRef<Section[]>([])
  const sectionSaveTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const sectionSaveChainsRef = useRef<Map<string, Promise<void>>>(new Map())
  const activeSectionSavesRef = useRef(0)

  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  useEffect(() => () => {
    sectionSaveTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    sectionSaveTimeoutsRef.current.clear()
  }, [])

  const entitlementResult = useMemo(
    () => inspectWebsiteEntitlements(currentPlan, { sections }),
    [currentPlan, sections],
  )
  const publishEnforcementActive = enforcementMode === "enforce"
  const canPublishDraft = !publishEnforcementActive || entitlementResult.allowed
  const activePreflightViolations = serverPublishViolations.length > 0
    ? serverPublishViolations
    : entitlementResult.violations
  const preflightGroups = useMemo(() => ({
    sections: activePreflightViolations.filter((violation) => violation.code === "section.requires_plan"),
    count: activePreflightViolations.filter((violation) => violation.code === "section.limit_exceeded"),
    features: activePreflightViolations.filter(
      (violation) => violation.code === "feature.requires_plan" && violation.capability !== "booking_system",
    ),
    booking: activePreflightViolations.filter(
      (violation) => violation.code === "feature.requires_plan" && violation.capability === "booking_system",
    ),
  }), [activePreflightViolations])
  const preflightGroupEntries = useMemo(() => [
    { title: "Secties waarvoor een hoger abonnement nodig is", violations: preflightGroups.sections },
    { title: "Maximum aantal secties", violations: preflightGroups.count },
    { title: "Functies binnen secties", violations: preflightGroups.features },
    { title: "Boeking en agenda", violations: preflightGroups.booking },
  ].filter((group) => group.violations.length > 0), [preflightGroups])

  const getViolationKey = useCallback((violation: EntitlementViolation) => (
    [violation.code, violation.sectionId ?? "website", violation.capability ?? "", violation.requiredPlan].join(":")
  ), [])

  useEffect(() => {
    const nextKeys = new Set(entitlementResult.violations.map(getViolationKey))
    const addedViolations = entitlementResult.violations.filter(
      (violation) => !previousEntitlementViolationKeys.current.has(getViolationKey(violation)),
    )
    previousEntitlementViolationKeys.current = nextKeys

    if (addedViolations.length === 0) return

    const requiredPlan = highestRequiredPlan(addedViolations.map((violation) => violation.requiredPlan))
    const labels = addedViolations.slice(0, 3).map((violation) => violation.label)
    const extraCount = addedViolations.length - labels.length
    const affectedLabel = `${labels.join(", ")}${extraCount > 0 ? ` en ${extraCount} meer` : ""}`

    void logEntitlementMetric("entitlement.warning_shown", {
      source: "editor_draft_change",
      requiredPlan,
      violationCodes: addedViolations.map((violation) => violation.code),
    })

    toast.warning(`${getPlanDisplayName(requiredPlan)}-functie toegevoegd`, {
      description: `${affectedLabel}. Je kunt dit blijven instellen en bekijken, maar deze versie kan pas live na een upgrade of wanneer je de functie verwijdert.`,
      duration: 8000,
      action: {
        label: "Bekijk abonnementen",
        onClick: () => {
          void logEntitlementMetric("entitlement.upgrade_clicked", {
            source: "editor_toast",
            requiredPlan,
            violationCodes: addedViolations.map((violation) => violation.code),
          })
          router.push("/editor/account/billing")
        },
      },
    })
  }, [entitlementResult.violations, getViolationKey, router])

  useEffect(() => {
    setServerPublishViolations([])
  }, [currentPlan, sections])

  useEffect(() => {
    if (activePreflightViolations.length === 0) setPublishPreflightOpen(false)
  }, [activePreflightViolations.length])

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

    const { data: websiteRows } = await supabase
      .from("websites")
      .select("id, title, slug, published, custom_domain, created_at, business_id, theme_config")
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
      setBusinessId(website.business_id ?? initialBusinessId)
      setThemeConfig((website.theme_config as ThemeConfig | null) ?? null)
      setSelectedSectionId(null)

      const [sectionResult, transitionResult] = await Promise.all([
        websiteSections.listSections(website.id, supabase),
        supabase
          .from("section_transitions")
          .select("from_section_id, to_section_id, transition")
          .eq("website_id", website.id),
      ])
      const { data: rows, error: listErr } = sectionResult
      if (listErr) {
        console.error('Failed to load sections:', listErr)
        setSections([])
      } else {
        const transitionRows = transitionResult.data
        
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
          business_id: initialBusinessId,
          title: DEFAULT_SITE_TITLE,
          slug: newSlug,
        })
        .select()
        .single()

      if (newWebsite && !error) {
        await logWebsiteCreated(newWebsite.id)
        setWebsiteId(newWebsite.id)
        setTitle(newWebsite.title || DEFAULT_SITE_TITLE)
        setThemeConfig(null)
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
  }, [initialBusinessId, userId])

  const handleTemplateApplied = useCallback(
    async (nextWebsiteId?: string | null) => {
      const resolvedWebsiteId = nextWebsiteId ?? websiteId
      if (resolvedWebsiteId && resolvedWebsiteId !== websiteId) {
        router.replace(`/editor?websiteId=${resolvedWebsiteId}`)
      }
      await loadWebsite(resolvedWebsiteId)
      setMobilePanel("canvas")
    },
    [loadWebsite, router, websiteId],
  )

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

    await logWebsiteCreated(newWebsite.id)

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
      if (result?.code === "ENTITLEMENT_VIOLATIONS" && Array.isArray(result?.violations)) {
        setServerPublishViolations(result.violations as EntitlementViolation[])
        setPublishConfirmationOpen(false)
        setPublishPreflightOpen(true)
        setWebsiteMessage({
          type: "error",
          text: result?.error || "Deze versie bevat onderdelen uit een hoger abonnement.",
        })
        return
      }
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
    setWebsiteMessage({
      type: "success",
      text: updatedWebsite.published
        ? `Websitenaam opgeslagen. De live link is bijgewerkt naar ${updatedWebsite.slug}.${PLATFORM_DOMAIN}.`
        : "Websitenaam opgeslagen. Deze website staat nog offline tot u hem live zet.",
    })
  }

  const updateLocalSections = useCallback((newSections: Section[]) => {
    sectionsRef.current = newSections
    setSections(newSections)
  }, [])

  // Structural changes only create/delete rows and persist the final order.
  const persistSections = useCallback(async (newSections: Section[]) => {
    const previousSections = sectionsRef.current
    updateLocalSections(newSections)

    if (!websiteId) return

    setIsSaving(true)
    const supabase = createClient()

    try {
      const nextIds = new Set(newSections.map((section) => section.id))
      const removedSections = previousSections.filter(
        (section) => !section.id.startsWith("section-") && !nextIds.has(section.id),
      )
      const temporarySections = newSections.filter((section) => section.id.startsWith("section-"))

      const [{ error: deleteError }, createdResults] = await Promise.all([
        websiteSections.deleteSections(removedSections.map((section) => section.id), supabase),
        Promise.all(
          temporarySections.map(async (section) => {
            const position = newSections.findIndex((candidate) => candidate.id === section.id) + 1
            const result = await websiteSections.createSection(
              websiteId,
              {
                type: section.type,
                content: section.data ?? {},
                styles: section.styles ?? {},
                position,
              },
              supabase,
            )
            if (result.error) throw result.error
            return { temporaryId: section.id, section, created: result.data }
          }),
        ),
      ])

      if (deleteError) throw deleteError

      const idMapping = new Map(
        createdResults
          .filter((result) => result.created?.id)
          .map((result) => [result.temporaryId, result.created!.id] as const),
      )
      await Promise.all(createdResults.map(async (result) => {
        if (!result.created?.id) return
        const latestTemporarySection = sectionsRef.current.find(
          (section) => section.id === result.temporaryId,
        )
        if (!latestTemporarySection || latestTemporarySection === result.section) return
        const latestPosition = sectionsRef.current.findIndex(
          (section) => section.id === result.temporaryId,
        ) + 1
        const { error } = await websiteSections.updateSection(
          result.created.id,
          {
            type: latestTemporarySection.type,
            content: latestTemporarySection.data ?? {},
            styles: latestTemporarySection.styles ?? {},
            position: latestPosition,
          },
          supabase,
        )
        if (error) throw error
      }))
      const latestSections = sectionsRef.current.map((section) => {
        const persistedId = idMapping.get(section.id)
        return persistedId ? { ...section, id: persistedId } : section
      })
      updateLocalSections(latestSections)
      setSelectedSectionId((current) => current ? idMapping.get(current) ?? current : current)
      setTransitions((current) => current.map((transition) => ({
        ...transition,
        id: `${idMapping.get(transition.fromSectionId) ?? transition.fromSectionId}-${idMapping.get(transition.toSectionId) ?? transition.toSectionId}`,
        fromSectionId: idMapping.get(transition.fromSectionId) ?? transition.fromSectionId,
        toSectionId: idMapping.get(transition.toSectionId) ?? transition.toSectionId,
      })))

      const { error: reorderError } = await websiteSections.reorderSections(
        websiteId,
        latestSections.map((section) => section.id),
        supabase,
      )
      if (reorderError) throw reorderError

      await Promise.all([
        ...removedSections.map((section) => logSectionAudit("section.deleted", websiteId, section)),
        ...createdResults
          .filter((result) => result.created?.id)
          .map((result) => logSectionAudit("section.added", websiteId, {
            id: result.created!.id,
            type: result.section.type,
          })),
      ])
    } catch (err) {
      console.error("Error persisting section structure:", err)
      setSaveState("error")
    } finally {
      setIsSaving(false)
    }
  }, [setIsSaving, setSaveState, updateLocalSections, websiteId])

  const handleCanvasSectionUpdate = useCallback((id: string, updates: Partial<Section>) => {
    const currentSections = sectionsRef.current
    const sectionIndex = currentSections.findIndex((section) => section.id === id)
    if (sectionIndex < 0) return

    const updatedSection = { ...currentSections[sectionIndex], ...updates }
    const nextSections = [...currentSections]
    nextSections[sectionIndex] = updatedSection
    updateLocalSections(nextSections)

    const previousTimeout = sectionSaveTimeoutsRef.current.get(id)
    if (previousTimeout) clearTimeout(previousTimeout)
    if (!websiteId || id.startsWith("section-")) return

    const timeout = setTimeout(() => {
      sectionSaveTimeoutsRef.current.delete(id)
      const previousSave = sectionSaveChainsRef.current.get(id) ?? Promise.resolve()
      const nextSave = previousSave
        .catch(() => undefined)
        .then(async () => {
          activeSectionSavesRef.current += 1
          setIsSaving(true)
          try {
            const latestSections = sectionsRef.current
            const latestIndex = latestSections.findIndex((section) => section.id === id)
            const latestSection = latestSections[latestIndex]
            if (!latestSection) return
            const { error } = await websiteSections.updateSection(
              id,
              {
                type: latestSection.type,
                content: latestSection.data ?? {},
                styles: latestSection.styles ?? {},
                position: latestIndex + 1,
              },
              createClient(),
            )
            if (error) throw error
          } catch (error) {
            console.error("Error saving section:", error)
            setSaveState("error")
          } finally {
            activeSectionSavesRef.current -= 1
            if (activeSectionSavesRef.current === 0) setIsSaving(false)
          }
        })
      sectionSaveChainsRef.current.set(id, nextSave)
    }, 800)

    sectionSaveTimeoutsRef.current.set(id, timeout)
  }, [setIsSaving, setSaveState, updateLocalSections, websiteId])

  const performPublish = useCallback(async () => {
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
    setPublishConfirmationOpen(false)

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
    setWebsiteMessage({ type: "success", text: "Deze website is live gezet. Opgeslagen wijzigingen zijn nu zichtbaar via de live link." })
    router.push("/editor")
  }, [router, setIsSaving, setSaveState, websiteId])

  const handlePublish = useCallback(() => {
    if (!websiteId) return
    if (!canPublishDraft) {
      setPublishPreflightOpen(true)
      return
    }
    setPublishConfirmationOpen(true)
  }, [canPublishDraft, websiteId])

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
    })
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

  const handleStartTutorial = () => {
    const starterTypes: SectionType[] = ["hero", "about", "services", "contact"]
    const starterSections: Section[] = starterTypes.map((type, index) => ({
      id: `section-${Date.now()}-${index}`,
      type,
      data: getDefaultSectionData(type, businessId),
      styles: {},
    }))

    persistSections(starterSections)
    const firstSectionId = starterSections[0]?.id ?? null
    setSelectedSectionId(firstSectionId)
    setMobilePanel(typeof window !== "undefined" && window.innerWidth < 768 ? "style" : "canvas")
  }

  const handlePreflightLocation = (violation: EntitlementViolation) => {
    setPublishPreflightOpen(false)
    if (violation.sectionId) {
      setSelectedSectionId(violation.sectionId)
      setMobilePanel("style")
      return
    }
    setMobilePanel("sections")
  }

  const handleDisablePreflightFeature = (violation: EntitlementViolation) => {
    if (!violation.sectionId) return
    const nextSections = sections.map((section) => {
      if (section.id !== violation.sectionId) return section
      if (section.type === "services" && violation.capability === "booking_system") {
        return { ...section, data: { ...section.data, bookingSpaceEnabled: false } }
      }
      if (section.type === "request_form") {
        return { ...section, data: { ...section.data, requestType: "contact" } }
      }
      return section
    })
    setPublishPreflightOpen(false)
    void persistSections(nextSections)
  }

  const addSectionAt = (type: SectionType, index: number) => {
    const tempId = `section-${Date.now()}`
    const newSection: Section = {
      id: tempId,
      type,
      data: getDefaultSectionData(type, businessId),
      styles: {},
    }
    const nextSections = [...sections]
    const safeIndex = Math.max(0, Math.min(index, nextSections.length))
    nextSections.splice(safeIndex, 0, newSection)
    persistSections(nextSections)
    setSelectedSectionId(tempId)
    setPendingMobileSectionType(null)
    setMobilePanel("canvas")
  }

  const handleSectionAddRequest = (type: SectionType) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setPendingMobileSectionType(type)
      setMobilePanel("canvas")
      return
    }

    const selectedIndex = selectedSectionId
      ? sections.findIndex((section) => section.id === selectedSectionId)
      : -1
    addSectionAt(type, selectedIndex >= 0 ? selectedIndex + 1 : sections.length)
  }

  const handleMobileSectionPlacement = (index: number) => {
    if (!pendingMobileSectionType) return
    addSectionAt(pendingMobileSectionType, index)
  }

  const handleSectionSelect = (id: string | null) => {
    setSelectedSectionId(id)
    // On mobile, jump to the style panel when a section is tapped
    if (id && typeof window !== "undefined" && window.innerWidth < 768) {
      setMobilePanel("style")
    }
  }

  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null
  const pendingMobileSectionLabel = pendingMobileSectionType
    ? getSectionDefinition(pendingMobileSectionType)?.label ?? pendingMobileSectionType
    : ""
  const selectedSectionIndex = selectedSectionId
    ? sections.findIndex((section) => section.id === selectedSectionId)
    : -1
  const selectedWebsite = websites.find((website) => website.id === websiteId)
  const selectedWebsiteLiveUrl = selectedWebsite
    ? selectedWebsite.customDomain || `${selectedWebsite.slug}.${PLATFORM_DOMAIN}`
    : ""
  const selectedWebsiteLiveHref = selectedWebsiteLiveUrl
    ? selectedWebsiteLiveUrl.startsWith("http")
      ? selectedWebsiteLiveUrl
      : `https://${selectedWebsiteLiveUrl}`
    : ""
  const selectedWebsitePreviewUrl = selectedWebsite
    ? `preview-${selectedWebsite.slug}.${PLATFORM_DOMAIN}`
    : ""
  const selectedWebsitePreviewHref = selectedWebsitePreviewUrl
    ? `https://${selectedWebsitePreviewUrl}`
    : ""
  const liveStatusDescription = selectedWebsite?.published
    ? "Online: wijzigingen blijven als concept bewaard totdat je opnieuw live zet."
    : "Offline: wijzigingen zijn alleen zichtbaar in de editor."
  const saveStatusLabel =
    isSaving || saveState === "saving" ? "Wijzigingen opslaan..." : saveState === "error" ? "Niet opgeslagen" : "Wijzigingen opgeslagen"
  const mobileSaveStatusLabel =
    isSaving || saveState === "saving" ? "Opslaan..." : saveState === "error" ? "Niet opgeslagen" : "Opgeslagen"
  const SaveStatusIcon = isSaving || saveState === "saving" ? Loader2 : saveState === "error" ? AlertCircle : CheckCircle2

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted">
      <div className="border-b border-border bg-background px-2 py-2 md:px-4">
        <div className="mx-auto hidden max-w-7xl flex-wrap items-center gap-2 md:flex">
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
            Naam opslaan
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={handleCreateWebsite} disabled={isCreatingWebsite}>
            {isCreatingWebsite ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Nieuw
          </Button>
          <TierBadge plan={currentPlan} prefix="Actief" className="border-primary/30 bg-primary/10 text-primary" />
          {selectedWebsite ? (
            <div className="ml-auto flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
              <a
                href={selectedWebsitePreviewHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded border border-border bg-background px-2 py-1 font-medium text-primary transition-colors hover:bg-accent"
                title={`Preview openen: ${selectedWebsitePreviewUrl}`}
                aria-label={`Preview openen: ${selectedWebsitePreviewUrl}`}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
                <ExternalLink className="h-3 w-3" />
              </a>
              <span
                className={`h-2.5 w-2.5 rounded-full ring-2 ${
                  selectedWebsite.published
                    ? "bg-emerald-500 ring-emerald-500/20"
                    : "bg-red-500 ring-red-500/20"
                }`}
                aria-hidden="true"
              />
              <span className="shrink-0 font-medium text-foreground">{selectedWebsite.published ? "Live" : "Offline"}</span>
              <span className="hidden text-muted-foreground lg:inline">{liveStatusDescription}</span>
              {selectedWebsite.published ? (
                <>
                  <a
                    href={selectedWebsiteLiveHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-w-0 items-center gap-1 rounded border border-border bg-background px-2 py-1 font-medium text-primary hover:bg-accent"
                    title={selectedWebsiteLiveUrl}
                  >
                    <Globe2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="max-w-[28vw] truncate font-mono">
                      {selectedWebsiteLiveUrl}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <Button type="button" size="xs" onClick={handlePublish} disabled={!websiteId || isSaving}>
                    {canPublishDraft ? "Nieuwe versie live" : "Bekijk blokkades"}
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button type="button" size="xs" disabled={!websiteId || isSaving || !canPublishDraft} onClick={handlePublish}>
                    Live zetten
                  </Button>
                  {!canPublishDraft ? (
                    <Button type="button" variant="outline" size="xs" onClick={() => setPublishPreflightOpen(true)}>
                      Bekijk blokkades
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor="website-selector-mobile" className="sr-only">
              Website
            </label>
            <select
              id="website-selector-mobile"
              value={websiteId ?? ""}
              onChange={(event) => handleWebsiteChange(event.target.value)}
              className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.title || DEFAULT_SITE_TITLE}
                </option>
              ))}
            </select>
            <div
              className={`flex h-11 max-w-[7.5rem] shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ${
                saveState === "error"
                  ? "border-warning/30 bg-warning/10 text-warning"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
              }`}
              aria-live="polite"
              title={saveStatusLabel}
            >
              <SaveStatusIcon className={`h-3.5 w-3.5 ${isSaving || saveState === "saving" ? "animate-spin" : ""}`} />
              <span className="truncate">{mobileSaveStatusLabel}</span>
            </div>
            {selectedWebsite ? (
              <Button
                type="button"
                size="default"
                variant={canPublishDraft ? "default" : "outline"}
                className="h-11 shrink-0 px-3 text-xs"
                onClick={handlePublish}
                disabled={!websiteId || isSaving}
                title={liveStatusDescription}
              >
                {canPublishDraft
                  ? selectedWebsite.published
                    ? "Nieuwe versie live"
                    : "Live zetten"
                  : "Blokkades"}
              </Button>
            ) : null}
          </div>

          <details className="group rounded-md border border-border bg-muted/30">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium text-foreground">
              <span>Website beheren</span>
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">Naam, links en nieuwe website</span>
              <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">Sluiten</span>
            </summary>
            <div className="space-y-2 border-t border-border p-2">
              <div className="flex min-w-0 items-center gap-2">
                <label htmlFor="website-name-mobile" className="sr-only">
                  Websitenaam
                </label>
                <input
                  id="website-name-mobile"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Websitenaam"
                />
                <Button
                  type="button"
                  size="default"
                  className="h-11 shrink-0 px-3 text-xs"
                  onClick={handleSave}
                  disabled={!websiteId || isRenamingWebsite}
                >
                  {isRenamingWebsite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Naam opslaan
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={handleCreateWebsite}
                  disabled={isCreatingWebsite}
                >
                  {isCreatingWebsite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Nieuwe website
                </Button>
                {selectedWebsite ? (
                  <a
                    href={selectedWebsitePreviewHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-primary shadow-sm"
                    title={`Preview openen: ${selectedWebsitePreviewUrl}`}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
              {selectedWebsite?.published ? (
                <a
                  href={selectedWebsiteLiveHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-primary shadow-sm"
                  title={selectedWebsiteLiveUrl}
                >
                  <Globe2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{selectedWebsiteLiveUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : null}
            </div>
          </details>
        </div>
        {websiteMessage ? (
          <StatusMessage tone={websiteMessage.type} className="mx-auto mt-2 max-w-7xl text-xs">
            {websiteMessage.text}
          </StatusMessage>
        ) : null}
      </div>
      {subscriptionNotice ? (
        <div className="border-b border-warning/40 bg-warning/10 px-3 py-2 text-center text-xs font-medium text-foreground" role="status">
          {subscriptionNotice}
        </div>
      ) : null}
      {!entitlementResult.allowed ? (
        <details className="group border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-950">
          <summary className="mx-auto flex max-w-7xl cursor-pointer list-none items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-semibold">
                {entitlementResult.violations.length} {entitlementResult.violations.length === 1 ? "onderdeel" : "onderdelen"} {publishEnforcementActive ? "blokkeren" : "overschrijden"} het huidige abonnement
              </span>
              <span className="hidden text-amber-900/80 sm:inline">
                Bewerken en bekijken blijft mogelijk.
              </span>
            </span>
            <span className="shrink-0 font-semibold group-open:hidden">Details bekijken</span>
            <span className="hidden shrink-0 font-semibold group-open:inline">Details sluiten</span>
          </summary>
          <div className="mx-auto mt-3 max-w-7xl rounded-lg border border-amber-500/30 bg-background p-3 text-foreground shadow-sm">
            <ul className="space-y-2 text-xs">
              {entitlementResult.violations.map((violation) => (
                <li key={getViolationKey(violation)} className="flex items-center justify-between gap-3 rounded-md bg-amber-500/5 px-3 py-2">
                  <span className="min-w-0 truncate">{violation.label}</span>
                  <TierBadge plan={violation.requiredPlan} prefix="Vereist" />
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">
                {publishEnforcementActive ? "Je concept wordt gewoon opgeslagen; alleen live zetten wordt tegengehouden." : `Uitrolmodus ${enforcementMode}: publicatie wordt nog niet geblokkeerd.`}
              </span>
              <a
                href="/editor/account/billing"
                onClick={() => void logEntitlementMetric("entitlement.upgrade_clicked", {
                  source: "editor_persistent_summary",
                  requiredPlan: entitlementResult.requiredPlan,
                  violationCodes: entitlementResult.violations.map((violation) => violation.code),
                })}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Bekijk abonnementen
              </a>
            </div>
          </div>
        </details>
      ) : null}
      {/* Desktop layout: side-by-side panels */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {!isPreview && (
          <SectionsSelector
            userId={userId}
            currentPlan={currentPlan}
            onSectionAddRequest={handleSectionAddRequest}
          />
        )}
        <EditorCanvas
          sections={sections}
          persistSections={persistSections}
          onSectionUpdate={handleCanvasSectionUpdate}
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
          <EditorInspector
            selectedSection={selectedSection}
            sections={sections}
            transitions={transitions}
            onSectionSelect={handleSectionSelect}
            onOpenCanvas={() => setMobilePanel("canvas")}
            onUpdate={handleSectionUpdate}
            onStyleUpdate={handleStyleUpdate}
            onDelete={handleDelete}
            onTransitionUpdate={handleTransitionUpdate}
            websiteId={websiteId}
            businessId={businessId}
            businessCategory={businessCategory}
            currentPlan={currentPlan}
            currentTheme={themeConfig}
            onThemeChange={setThemeConfig}
            onTemplateApplied={handleTemplateApplied}
            className="flex h-full w-80 shrink-0 flex-col border-l bg-background xl:w-96"
          />
        )}
      </div>

      {/* Mobile layout: single panel with bottom tab bar */}
      <div className="flex md:hidden flex-1 overflow-hidden flex-col">
        {/* Panel content */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {mobilePanel === "sections" && !isPreview && (
            <SectionsSelector
              userId={userId}
              currentPlan={currentPlan}
              className="w-full h-full border-r-0"
              onSectionAdded={() => setMobilePanel("canvas")}
              onSectionAddRequest={handleSectionAddRequest}
            />
          )}
          {(mobilePanel === "canvas" || isPreview) && (
            <EditorCanvas
              sections={sections}
              persistSections={persistSections}
              onSectionUpdate={handleCanvasSectionUpdate}
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
            <EditorInspector
              selectedSection={selectedSection}
              sections={sections}
              transitions={transitions}
              onSectionSelect={handleSectionSelect}
              onOpenCanvas={() => setMobilePanel("canvas")}
              onUpdate={handleSectionUpdate}
              onStyleUpdate={handleStyleUpdate}
              onDelete={handleDelete}
              onTransitionUpdate={handleTransitionUpdate}
              websiteId={websiteId}
              businessId={businessId}
              businessCategory={businessCategory}
              currentPlan={currentPlan}
              currentTheme={themeConfig}
              onThemeChange={setThemeConfig}
              onTemplateApplied={handleTemplateApplied}
              defaultTab="section"
              singlePanel="section"
              className="h-full w-full bg-background"
            />
          )}
          {mobilePanel === "site" && !isPreview && (
            <EditorInspector
              selectedSection={selectedSection}
              sections={sections}
              transitions={transitions}
              onSectionSelect={handleSectionSelect}
              onOpenCanvas={() => setMobilePanel("canvas")}
              onUpdate={handleSectionUpdate}
              onStyleUpdate={handleStyleUpdate}
              onDelete={handleDelete}
              onTransitionUpdate={handleTransitionUpdate}
              websiteId={websiteId}
              businessId={businessId}
              businessCategory={businessCategory}
              currentPlan={currentPlan}
              currentTheme={themeConfig}
              onThemeChange={setThemeConfig}
              onTemplateApplied={handleTemplateApplied}
              defaultTab="site"
              singlePanel="site"
              className="h-full w-full bg-background"
            />
          )}
          {pendingMobileSectionType ? (
            <div className="absolute inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 rounded-lg border border-border bg-background p-3 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    Waar wilt u {pendingMobileSectionLabel} plaatsen?
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Kies eerst de plek. Daarna zetten we de sectie op het doek.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {sections.length === 0 ? (
                  <Button type="button" onClick={() => handleMobileSectionPlacement(0)}>
                    Als eerste sectie plaatsen
                  </Button>
                ) : (
                  <>
                    <Button type="button" onClick={() => handleMobileSectionPlacement(0)}>
                      Bovenaan plaatsen
                    </Button>
                    {selectedSectionIndex >= 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleMobileSectionPlacement(selectedSectionIndex + 1)}
                      >
                        Na geselecteerde sectie plaatsen
                      </Button>
                    ) : null}
                    <Button type="button" variant="outline" onClick={() => handleMobileSectionPlacement(sections.length)}>
                      Onderaan plaatsen
                    </Button>
                  </>
                )}
                <Button type="button" variant="ghost" onClick={() => setPendingMobileSectionType(null)}>
                  Annuleren
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom tab bar */}
        {!isPreview && (
          <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(31,41,51,0.08)] md:hidden">
            <button
              type="button"
              onClick={() => setMobilePanel("sections")}
              aria-label="Secties toevoegen"
              title="Secties toevoegen"
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
              aria-label="Canvas bekijken"
              title="Canvas bekijken"
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                mobilePanel === "canvas"
                  ? "text-primary border-t-2 border-primary -mt-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutTemplate className="h-5 w-5" />
              Website
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("style")}
              aria-label="Sectie stijl aanpassen"
              title="Sectie stijl aanpassen"
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                mobilePanel === "style"
                  ? "text-primary border-t-2 border-primary -mt-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Paintbrush className="h-5 w-5" />
              Stijl
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("site")}
              aria-label="Site ontwerp aanpassen"
              title="Site ontwerp aanpassen"
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                mobilePanel === "site"
                  ? "text-primary border-t-2 border-primary -mt-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-5 w-5" />
              Site
            </button>
          </nav>
        )}
      </div>

      <AlertDialog open={publishPreflightOpen} onOpenChange={setPublishPreflightOpen}>
        <AlertDialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Deze versie kan nog niet live</AlertDialogTitle>
            <AlertDialogDescription>
              Je concept blijft opgeslagen en volledig bewerkbaar. Los de onderstaande onderdelen op of kies een abonnement dat ze ondersteunt.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
            {preflightGroupEntries.map((group) => (
              <section key={group.title} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h3>
                <div className="space-y-2">
                  {group.violations.map((violation) => {
                    const canDisable = Boolean(
                      violation.sectionId &&
                      (violation.sectionType === "request_form" ||
                        (violation.sectionType === "services" && violation.capability === "booking_system")),
                    )
                    return (
                      <div key={getViolationKey(violation)} className="rounded-lg border border-border bg-muted/40 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{violation.label}</p>
                            {violation.code === "section.limit_exceeded" ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Je gebruikt {violation.actualCount} secties; binnen {getPlanDisplayName(currentPlan)} zijn er maximaal {violation.allowedCount} toegestaan.
                              </p>
                            ) : null}
                          </div>
                          <TierBadge plan={violation.requiredPlan} prefix="Vereist" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="xs" onClick={() => handlePreflightLocation(violation)}>
                            {violation.sectionId ? "Ga naar sectie" : "Bekijk secties"}
                          </Button>
                          {canDisable ? (
                            <Button type="button" variant="outline" size="xs" onClick={() => handleDisablePreflightFeature(violation)}>
                              Functie uitschakelen
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Verder bewerken</AlertDialogCancel>
            <Button asChild>
              <a
                href="/editor/account/billing"
                onClick={() => void logEntitlementMetric("entitlement.upgrade_clicked", {
                  source: "editor_preflight",
                  requiredPlan: entitlementResult.requiredPlan,
                  violationCodes: activePreflightViolations.map((violation) => violation.code),
                })}
              >Bekijk abonnementen</a>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={publishConfirmationOpen} onOpenChange={setPublishConfirmationOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedWebsite?.published ? "Nieuwe versie live zetten?" : "Website live zetten?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              De huidige opgeslagen conceptversie wordt gecontroleerd en daarna als één nieuwe live versie gepubliceerd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => void performPublish()} disabled={isSaving}>
              {isSaving ? "Live zetten..." : "Bevestigen en live zetten"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}



