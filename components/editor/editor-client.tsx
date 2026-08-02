"use client"

import { useState, useEffect, useCallback, useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react"
import { SectionsSelector } from "./sections-selector"
import { EditorCanvas } from "./editor-canvas"
import { EditorInspector } from "./editor-inspector"
import { EditorWorkspaceSkeleton } from "./editor-loading-skeleton"
import { SectionTranslationPanel } from "./section-translation-panel"
import { WebsiteLanguageControl } from "./website-language-control"
import { useEditorLayout } from "./editor-layout-context"
import type { Section, SectionStyles, SectionType, Transition } from "@/lib/types"
import { DEFAULT_SITE_TITLE } from "@/lib/business-naming"
import { getDefaultSectionData as getRegistryDefaultSectionData, getSectionDefinition } from "@/components/editor/section-registry"
import { createClient } from "@/lib/supabase/client"
import websiteSections from "@/lib/supabase/websiteSections"
import {
  addWebsiteLocale,
  listSectionTranslations,
  listWebsiteLocales,
  removeWebsiteLocale,
  saveSectionTranslation,
  setWebsiteDefaultLocale,
  updateWebsiteLocale,
} from "@/lib/supabase/websiteLocales"
import { isMissingRelationError } from "@/lib/supabase/errors"
import {
  DEFAULT_WEBSITE_LOCALE,
  getSupportedLocale,
  type SupportedWebsiteLocale,
  type WebsiteLocale,
} from "@/lib/i18n/locales"
import {
  applySectionTranslation,
  getSectionSourceHash,
  getSectionTranslationStatus,
  getTranslationSourceHash,
  materializeNavigationTranslationSource,
} from "@/lib/i18n/section-translations"
import { isMultilingualWebsitesEnabled } from "@/lib/i18n/feature"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, CheckCircle2, ChevronDown, ExternalLink, Eye, Globe2, Layers, LayoutTemplate, Loader2, Paintbrush, Plus, Redo2, Save, Sparkles, Trash2, Undo2 } from "lucide-react"
import { getDefaultThemeConfig, type LanguageSwitcherConfig, type ThemeConfig } from "@/lib/themes"
import type { BusinessCategory } from "@/lib/business/categories"
import { Button } from "@/components/ui/button"
import { StatusMessage } from "@/components/ui/status-message"
import { PLATFORM_DOMAIN } from "@/lib/platform"
import type { PlanId } from "@/lib/types/pricing"
import { TierBadge } from "@/components/editor/tier-badge"
import { highestRequiredPlan, inspectWebsiteEntitlements, type EntitlementViolation } from "@/lib/entitlements"
import { getPlanDisplayName } from "@/lib/pricing"
import { clearActiveWebsiteId, getActiveWebsiteId, setActiveWebsiteId } from "@/lib/active-website"
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
import { EditorSaveQueue } from "@/lib/editor-save-queue"

type MobilePanel = "canvas" | "sections" | "style" | "site"

type SectionHistoryEntry = {
  before: Section[]
  after: Section[]
  key: string
  label: string
  recordedAt: number
}

type WebsiteSummary = {
  id: string
  title: string
  slug: string
  published: boolean
  customDomain?: string | null
  created_at?: string
}

async function loadSharedLocaleStatuses(businessId: string | null, locales: WebsiteLocale[]) {
  const statuses: Partial<Record<SupportedWebsiteLocale, "complete" | "missing" | "stale">> = {}
  for (const locale of locales) if (locale.is_default) statuses[locale.locale] = "complete"
  if (!businessId) return statuses
  const client = createClient()
  const [{ data: business }, { data: services }, { data: businessTranslations }] = await Promise.all([
    client.from("businesses").select("name, description, opening_note").eq("id", businessId).maybeSingle(),
    client.from("services").select("id, title, description").eq("business_id", businessId),
    client.from("business_translations").select("locale, name, description, opening_note, source_hash").eq("business_id", businessId),
  ])
  const serviceRows = services ?? []
  const { data: serviceTranslations } = serviceRows.length
    ? await client.from("service_translations").select("service_id, locale, title, description, source_hash").in("service_id", serviceRows.map((service) => service.id))
    : { data: [] }
  for (const locale of locales.filter((entry) => !entry.is_default)) {
    const businessTranslation = businessTranslations?.find((entry) => entry.locale === locale.locale)
    const missingBusiness = business && (["name", "description", "opening_note"] as const).some(
      (field) => Boolean(business[field]?.trim()) && !businessTranslation?.[field]?.trim(),
    )
    const missingService = serviceRows.some((service) => {
      const translation = serviceTranslations?.find((entry) => entry.locale === locale.locale && entry.service_id === service.id)
      return (Boolean(service.title?.trim()) && !translation?.title?.trim()) || (Boolean(service.description?.trim()) && !translation?.description?.trim())
    })
    if (missingBusiness || missingService) {
      statuses[locale.locale] = "missing"
      continue
    }
    const staleBusiness = Boolean(business && businessTranslation?.source_hash && businessTranslation.source_hash !== getTranslationSourceHash(business))
    const staleService = serviceRows.some((service) => {
      const translation = serviceTranslations?.find((entry) => entry.locale === locale.locale && entry.service_id === service.id)
      return Boolean(translation?.source_hash && translation.source_hash !== getTranslationSourceHash({ title: service.title, description: service.description }))
    })
    statuses[locale.locale] = staleBusiness || staleService ? "stale" : "complete"
  }
  return statuses
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

async function logLanguageAudit(action: "language.added" | "language.updated" | "language.removed" | "language.enabled" | "language.disabled", websiteId: string, locale: SupportedWebsiteLocale) {
  await fetch("/api/audit/language", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, websiteId, locale }),
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
  hasMultilingualAccess: boolean
  subscriptionNotice?: string | null
  enforcementMode: PlanEnforcementMode
}

export function EditorClient({
  userId,
  initialBusinessId = null,
  initialBusinessCategory = null,
  currentPlan,
  hasMultilingualAccess,
  subscriptionNotice,
  enforcementMode,
}: EditorClientProps) {
  const [sections, setSections] = useState<Section[]>([])
  const [websiteLocales, setWebsiteLocales] = useState<WebsiteLocale[]>([])
  const [activeLocale, setActiveLocale] = useState<SupportedWebsiteLocale>(DEFAULT_WEBSITE_LOCALE)
  const [sectionTranslations, setSectionTranslations] = useState(
    () => new Map<string, { values: Record<string, unknown>; sourceHash: string }>(),
  )
  const [sharedLocaleStatuses, setSharedLocaleStatuses] = useState<Partial<Record<SupportedWebsiteLocale, "complete" | "missing" | "stale">>>({})
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [websites, setWebsites] = useState<WebsiteSummary[]>([])
  const [websiteId, setWebsiteId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(initialBusinessId)
  const [businessCategory] = useState<BusinessCategory | null>(initialBusinessCategory)
  const [title, setTitle] = useState(DEFAULT_SITE_TITLE)
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null)
  const [isCreatingWebsite, setIsCreatingWebsite] = useState(false)
  const [isRenamingWebsite, setIsRenamingWebsite] = useState(false)
  const [isDeletingWebsite, setIsDeletingWebsite] = useState(false)
  const [deleteWebsiteConfirmationOpen, setDeleteWebsiteConfirmationOpen] = useState(false)
  const [websiteMessage, setWebsiteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("canvas")
  const [pendingMobileSectionType, setPendingMobileSectionType] = useState<SectionType | null>(null)
  const [isMobileDraggingNewSection, setIsMobileDraggingNewSection] = useState(false)
  const [isMobileDraggingImage, setIsMobileDraggingImage] = useState(false)
  const [publishPreflightOpen, setPublishPreflightOpen] = useState(false)
  const [publishConfirmationOpen, setPublishConfirmationOpen] = useState(false)
  const [staleTranslationWarnings, setStaleTranslationWarnings] = useState<Array<{ locale: string; source: string; label: string }>>([])
  const [serverPublishViolations, setServerPublishViolations] = useState<EntitlementViolation[]>([])
  const [isLoadingWebsite, setIsLoadingWebsite] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isPreview, isSaving, setIsSaving, saveState, setSaveState, device, setOnPublish, setOnLogout } = useEditorLayout()
  const requestedWebsiteId = searchParams.get("websiteId")
  const multilingualEnabled = isMultilingualWebsitesEnabled()
  const multilingualAvailable = multilingualEnabled && hasMultilingualAccess
  const previousEntitlementViolationKeys = useRef<Set<string>>(new Set())
  const sectionsRef = useRef<Section[]>([])
  const mountedRef = useRef(true)
  const historyRef = useRef<{ undo: SectionHistoryEntry[]; redo: SectionHistoryEntry[] }>({ undo: [], redo: [] })
  const [historyVersion, setHistoryVersion] = useState(0)
  const saveQueueRef = useRef<EditorSaveQueue | null>(null)

  if (!saveQueueRef.current) {
    saveQueueRef.current = new EditorSaveQueue({
      delay: 800,
      onPendingChange: (pending) => {
        if (!mountedRef.current) return
        setIsSaving(pending)
        if (pending) setSaveState("saving")
      },
      onError: (error) => {
        if (!mountedRef.current) return
        console.error("Error saving section:", error)
        setSaveState("error")
        toast.error("Wijzigingen konden niet worden opgeslagen", {
          description: error instanceof Error ? error.message : "Probeer het opnieuw.",
          action: {
            label: "Opnieuw proberen",
            onClick: () => {
              void saveQueueRef.current?.flush()
                .then(() => toast.success("Wijzigingen alsnog opgeslagen"))
                .catch(() => undefined)
            },
          },
        })
      },
    })
  }

  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  const entitlementResult = useMemo(() => inspectWebsiteEntitlements(currentPlan, {
    sections,
    enabledCapabilities: multilingualEnabled && websiteLocales.some(
      (locale) => !locale.is_default && locale.is_enabled,
    ) ? ["multilingual_websites"] : [],
    capabilityOverrides: hasMultilingualAccess ? ["multilingual_websites"] : [],
  }), [currentPlan, hasMultilingualAccess, multilingualEnabled, sections, websiteLocales])
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
    setIsLoadingWebsite(true)
    try {
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
      setActiveWebsiteId(website.id)
      setWebsiteId(website.id)
      setTitle(website.title)
      setBusinessId(website.business_id ?? initialBusinessId)
      setThemeConfig((website.theme_config as ThemeConfig | null) ?? null)
      setSelectedSectionId(null)

      const [sectionResult, transitionResult, localeResult, translationResult] = await Promise.all([
        websiteSections.listSections(website.id, supabase),
        supabase
          .from("section_transitions")
          .select("from_section_id, to_section_id, transition")
          .eq("website_id", website.id),
        listWebsiteLocales(supabase, website.id),
        listSectionTranslations(supabase, website.id),
      ])
      const fallbackLocale: WebsiteLocale = {
        website_id: website.id,
        locale: DEFAULT_WEBSITE_LOCALE,
        path_segment: "nl",
        display_name: "Nederlands",
        is_default: true,
        is_enabled: true,
        seo: {},
      }
      const loadedLocales = localeResult.data.length > 0 ? localeResult.data : [fallbackLocale]
      setWebsiteLocales(loadedLocales)
      setSharedLocaleStatuses(await loadSharedLocaleStatuses(website.business_id ?? initialBusinessId, loadedLocales))
      setActiveLocale(loadedLocales.find((locale) => locale.is_default)?.locale ?? DEFAULT_WEBSITE_LOCALE)
      setSectionTranslations(new Map(
        translationResult.data.map((translation) => [
          `${translation.section_id}:${translation.locale}`,
          { values: translation.values, sourceHash: translation.source_hash },
        ]),
      ))
      if (localeResult.error && !isMissingRelationError(localeResult.error)) {
        console.error("Failed to load website locales:", localeResult.error)
      }
      if (translationResult.error && !isMissingRelationError(translationResult.error)) {
        console.error("Failed to load section translations:", translationResult.error)
      }
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
        setActiveWebsiteId(newWebsite.id)
        setWebsiteId(newWebsite.id)
        setWebsiteLocales([{
          website_id: newWebsite.id,
          locale: DEFAULT_WEBSITE_LOCALE,
          path_segment: "nl",
          display_name: "Nederlands",
          is_default: true,
          is_enabled: true,
          seo: {},
        }])
        setActiveLocale(DEFAULT_WEBSITE_LOCALE)
        setSectionTranslations(new Map())
        setSharedLocaleStatuses({ [DEFAULT_WEBSITE_LOCALE]: "complete" })
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
    } finally {
      setIsLoadingWebsite(false)
    }
  }, [initialBusinessId, userId])

  const handleTemplateApplied = useCallback(
    async (nextWebsiteId?: string | null) => {
      try {
        await saveQueueRef.current?.flush()
      } catch {
        toast.error("Openstaande wijzigingen konden niet worden opgeslagen.")
        return
      }
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
    loadWebsite(requestedWebsiteId ?? getActiveWebsiteId())
  }, [loadWebsite, requestedWebsiteId])

  const handleWebsiteChange = async (nextWebsiteId: string) => {
    try {
      await saveQueueRef.current?.flush()
    } catch {
      toast.error("Sla de huidige wijzigingen eerst opnieuw op.")
      return
    }
    setWebsiteMessage(null)
    setActiveWebsiteId(nextWebsiteId)
    router.replace(`/editor?websiteId=${nextWebsiteId}`)
  }

  const handleCreateWebsite = async () => {
    try {
      await saveQueueRef.current?.flush()
    } catch {
      toast.error("De nieuwe website is niet aangemaakt omdat wijzigingen nog niet zijn opgeslagen.")
      return
    }
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
    setActiveWebsiteId(newWebsite.id)
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

  const handleDeleteWebsite = async () => {
    if (!websiteId) return

    setIsDeletingWebsite(true)
    setIsSaving(true)
    setWebsiteMessage(null)

    try {
      const response = await fetch("/api/websites/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Website kon niet worden verwijderd.")

      const remainingWebsites = websites.filter((website) => website.id !== websiteId)
      setWebsites(remainingWebsites)
      setDeleteWebsiteConfirmationOpen(false)
      setSaveState("saved")

      const nextWebsite = remainingWebsites.find((website) => website.published) || remainingWebsites[0]
      if (nextWebsite) {
        setActiveWebsiteId(nextWebsite.id)
        setWebsiteMessage({ type: "success", text: "Website verwijderd. U bewerkt nu de volgende website." })
        router.replace(`/editor?websiteId=${nextWebsite.id}`)
      } else {
        clearActiveWebsiteId()
        setWebsiteId(null)
        setSections([])
        setTransitions([])
        setWebsiteLocales([])
        setSectionTranslations(new Map())
        setSharedLocaleStatuses({})
        setSelectedSectionId(null)
        setTitle(DEFAULT_SITE_TITLE)
        setThemeConfig(null)
        window.history.replaceState(window.history.state, "", "/editor")
        setWebsiteMessage({ type: "success", text: "Website verwijderd. Maak een nieuwe website om verder te gaan." })
      }
    } catch (error) {
      setSaveState("error")
      setWebsiteMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Website kon niet worden verwijderd.",
      })
    } finally {
      setIsDeletingWebsite(false)
      setIsSaving(false)
    }
  }

  const updateLocalSections = useCallback((newSections: Section[]) => {
    sectionsRef.current = newSections
    setSections(newSections)
  }, [])

  const saveSectionNow = useCallback(async (id: string) => {
    if (!websiteId || id.startsWith("section-")) return
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
  }, [websiteId])

  const scheduleSectionSave = useCallback((id: string) => {
    if (!websiteId || id.startsWith("section-")) return
    saveQueueRef.current?.schedule(id, () => saveSectionNow(id))
  }, [saveSectionNow, websiteId])

  const flushPendingSectionSaves = useCallback(async () => {
    try {
      await saveQueueRef.current?.flush()
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!saveQueueRef.current?.pending) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [])

  const recordSectionHistory = useCallback((before: Section[], after: Section[], key: string, label: string) => {
    const history = historyRef.current
    const previous = history.undo[history.undo.length - 1]
    const now = Date.now()
    if (previous && previous.key === key && now - previous.recordedAt < 1200) {
      previous.after = after
      previous.recordedAt = now
    } else {
      history.undo.push({ before, after, key, label, recordedAt: now })
      if (history.undo.length > 50) history.undo.shift()
    }
    history.redo = []
    setHistoryVersion((version) => version + 1)
  }, [])

  const applyHistorySections = useCallback((nextSections: Section[]) => {
    updateLocalSections(nextSections)
    nextSections.forEach((section) => scheduleSectionSave(section.id))
  }, [scheduleSectionSave, updateLocalSections])

  const handleUndo = useCallback(() => {
    const entry = historyRef.current.undo.pop()
    if (!entry) return
    historyRef.current.redo.push(entry)
    applyHistorySections(entry.before)
    setHistoryVersion((version) => version + 1)
    toast.success(`${entry.label} ongedaan gemaakt`)
  }, [applyHistorySections])

  const handleRedo = useCallback(() => {
    const entry = historyRef.current.redo.pop()
    if (!entry) return
    historyRef.current.undo.push(entry)
    applyHistorySections(entry.after)
    setHistoryVersion((version) => version + 1)
    toast.success(`${entry.label} opnieuw toegepast`)
  }, [applyHistorySections])

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable) return
      event.preventDefault()
      if (event.shiftKey) handleRedo()
      else handleUndo()
    }
    window.addEventListener("keydown", handleHistoryShortcut)
    return () => window.removeEventListener("keydown", handleHistoryShortcut)
  }, [handleRedo, handleUndo])

  // Structural changes only create/delete rows and persist the final order.
  const persistSections = useCallback(async (newSections: Section[]) => {
    const previousSections = sectionsRef.current
    const structureChanged = previousSections.length !== newSections.length || previousSections.some(
      (section, index) => section.id !== newSections[index]?.id,
    )
    if (structureChanged) {
      historyRef.current = { undo: [], redo: [] }
      setHistoryVersion((version) => version + 1)
    }
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
    recordSectionHistory(currentSections, nextSections, `${id}:canvas`, "Tekstwijziging")
    updateLocalSections(nextSections)
    scheduleSectionSave(id)
  }, [recordSectionHistory, scheduleSectionSave, updateLocalSections])

  const performPublish = useCallback(async (acknowledgeStaleTranslations = false) => {
    if (!websiteId) return
    if (!(await flushPendingSectionSaves())) {
      toast.error("Publiceren gestopt", { description: "Niet alle wijzigingen konden worden opgeslagen." })
      return
    }
    setIsSaving(true)
    setWebsiteMessage(null)
    const response = await fetch("/api/websites/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId, acknowledgeStaleTranslations }),
    })
    const result = await response.json().catch(() => ({}))
    setIsSaving(false)

    if (!response.ok) {
      if (result?.code === "STALE_TRANSLATIONS" && Array.isArray(result.warnings)) {
        setStaleTranslationWarnings(result.warnings)
        setSaveState("saved")
        return
      }
      const publishErrorMessage =
        result?.error ||
        "Deze website kan niet live worden gezet. Zet eerst de huidige live website uit of wijzig de live website."
      setPublishConfirmationOpen(false)
      setSaveState("error")
      setWebsiteMessage({
        type: "error",
        text: publishErrorMessage,
      })
      toast.error("Publiceren niet mogelijk", {
        description: publishErrorMessage,
      })
      return
    }

    setPublishConfirmationOpen(false)
    setStaleTranslationWarnings([])

    setWebsites((current) =>
      current.map((website) => ({
        ...website,
        published: website.id === websiteId,
      })),
    )
    setWebsiteMessage({ type: "success", text: "Deze website is live gezet. Opgeslagen wijzigingen zijn nu zichtbaar via de live link." })
    router.push("/editor")
  }, [flushPendingSectionSaves, router, setIsSaving, setSaveState, websiteId])

  const handlePublish = useCallback(() => {
    if (!websiteId) return
    if (!canPublishDraft) {
      setPublishPreflightOpen(true)
      return
    }
    setStaleTranslationWarnings([])
    setPublishConfirmationOpen(true)
  }, [canPublishDraft, websiteId])

  const handleLogout = useCallback(async () => {
    if (!(await flushPendingSectionSaves())) {
      toast.error("Uitloggen gestopt", { description: "Niet alle wijzigingen konden worden opgeslagen." })
      return
    }
    await fetch("/api/auth/logout", { method: "POST" }).catch(async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
    })
    router.push("/auth/login")
  }, [flushPendingSectionSaves, router])

  useEffect(() => {
    setOnPublish(() => handlePublish)
    setOnLogout(() => handleLogout)
  }, [handlePublish, handleLogout, setOnPublish, setOnLogout])

  const handleStyleUpdate = (styles: SectionStyles) => {
    if (!selectedSectionId) return
    const currentSections = sectionsRef.current
    const nextSections = currentSections.map((section) =>
      section.id === selectedSectionId ? { ...section, styles } : section,
    )
    recordSectionHistory(currentSections, nextSections, `${selectedSectionId}:styles`, "Stijlwijziging")
    updateLocalSections(nextSections)
    scheduleSectionSave(selectedSectionId)
  }

  // Update section content fields (merged into `data`) or top-level metadata like transitions.
  const handleSectionUpdate = (id: string, data: Record<string, unknown>) => {
    const currentSections = sectionsRef.current
    const nextSections = currentSections.map((section) => {
      if (section.id !== id) return section
      return { ...section, data: { ...section.data, ...data } }
    })
    recordSectionHistory(currentSections, nextSections, `${id}:content`, "Inhoudswijziging")
    updateLocalSections(nextSections)
    scheduleSectionSave(id)
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
    const currentSections = sectionsRef.current
    const removedIndex = currentSections.findIndex((section) => section.id === id)
    const removedSection = currentSections[removedIndex]
    if (!removedSection) return
    const nextSections = currentSections.filter((section) => section.id !== id)
    void persistSections(nextSections)
    setTransitions((prev) =>
      prev.filter((t) => t.fromSectionId !== id && t.toSectionId !== id),
    )
    if (selectedSectionId === id) setSelectedSectionId(null)
    setMobilePanel("canvas")
    toast.success("Sectie verwijderd", {
      action: {
        label: "Ongedaan maken",
        onClick: () => {
          const restoredSection = { ...removedSection, id: `section-${Date.now()}-restore` }
          const restoredSections = [...sectionsRef.current]
          restoredSections.splice(Math.min(removedIndex, restoredSections.length), 0, restoredSection)
          void persistSections(restoredSections)
          setSelectedSectionId(restoredSection.id)
          toast.success("Sectie teruggezet")
        },
      },
    })
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

  const defaultWebsiteLocale = websiteLocales.find((locale) => locale.is_default)
  const activeWebsiteLocale = websiteLocales.find((locale) => locale.locale === activeLocale) ?? defaultWebsiteLocale
  const isTranslationMode = Boolean(activeWebsiteLocale && !activeWebsiteLocale.is_default)
  const translationSourceSections = useMemo(
    () => sections.map((section) => materializeNavigationTranslationSource(section, sections)),
    [sections],
  )
  const displayedSections = useMemo(
    () => {
      const localizedSections = isTranslationMode
      ? translationSourceSections.map((section) => applySectionTranslation(
          section,
          sectionTranslations.get(`${section.id}:${activeLocale}`)?.values,
        ))
        : sections
      const localeLinks = websiteLocales
        .filter((locale) => locale.is_default || locale.is_enabled)
        .map((locale) => ({
          locale: locale.locale,
          label: locale.display_name,
          href: locale.is_default ? "/" : `/${locale.path_segment}`,
          isActive: locale.locale === activeLocale,
        }))

      return localizedSections.map((section) => section.type !== "nav" ? section : ({
        ...section,
        data: {
          ...section.data,
          localeLinks,
          languageSwitcher: themeConfig?.languageSwitcher,
          languageSwitcherEditorPreview: true,
        },
      }))
    },
    [activeLocale, isTranslationMode, sectionTranslations, sections, themeConfig?.languageSwitcher, translationSourceSections, websiteLocales],
  )
  const localeStatuses = useMemo(() => Object.fromEntries(websiteLocales.map((locale) => {
    if (locale.is_default) return [locale.locale, "complete"]
    const statuses = translationSourceSections.map((section) => {
      const translation = sectionTranslations.get(`${section.id}:${locale.locale}`)
      return getSectionTranslationStatus(section, translation?.values, translation?.sourceHash).status
    })
    const sharedStatus = sharedLocaleStatuses[locale.locale]
    return [locale.locale, statuses.includes("missing") || sharedStatus === "missing" ? "missing" : statuses.includes("stale") || sharedStatus === "stale" ? "stale" : "complete"]
  })) as Partial<Record<SupportedWebsiteLocale, "complete" | "missing" | "stale">>, [sectionTranslations, sharedLocaleStatuses, translationSourceSections, websiteLocales])

  const handleLocaleChange = (locale: SupportedWebsiteLocale) => {
    if (!hasMultilingualAccess && locale !== defaultWebsiteLocale?.locale) {
      toast.error("Talen zijn inbegrepen bij Gold of beschikbaar als add-on.")
      return
    }
    setActiveLocale(locale)
    setMobilePanel("canvas")
    if (!selectedSectionId && sections.length > 0) setSelectedSectionId(sections[0].id)
  }

  const handleAddLocale = async (locale: SupportedWebsiteLocale) => {
    if (!hasMultilingualAccess) {
      toast.error("Talen zijn inbegrepen bij Gold of beschikbaar als add-on.")
      return
    }
    if (!websiteId) return
    setSaveState("saving")
    const result = await addWebsiteLocale(createClient(), websiteId, locale)
    if (result.error || !result.data) {
      setSaveState("error")
      toast.error(result.error?.message || "Taal toevoegen is niet gelukt.")
      return
    }
    setWebsiteLocales((current) => [...current, result.data as WebsiteLocale])
    setSharedLocaleStatuses((current) => ({ ...current, [locale]: "missing" }))
    setActiveLocale(locale)
    setSaveState("saved")
    void logLanguageAudit("language.added", websiteId, locale)
    toast.success(`${getSupportedLocale(locale)?.displayName ?? locale} is toegevoegd.`)
  }

  const handleToggleLocale = async (locale: SupportedWebsiteLocale, enabled: boolean) => {
    if (!hasMultilingualAccess) {
      toast.error("Talen zijn inbegrepen bij Gold of beschikbaar als add-on.")
      return
    }
    if (!websiteId) return
    setSaveState("saving")
    if (enabled) {
      const incomplete = translationSourceSections.filter((section) => {
        const translation = sectionTranslations.get(`${section.id}:${locale}`)
        return getSectionTranslationStatus(section, translation?.values, translation?.sourceHash).status === "missing"
      })
      if (incomplete.length > 0) {
        setSaveState("saved")
        toast.error(`Vertaal eerst alle ${incomplete.length} ontbrekende ${incomplete.length === 1 ? "sectie" : "secties"}.`)
        throw new Error("Translations incomplete")
      }
      if (businessId) {
        const client = createClient()
        const [{ data: business }, { data: services }, { data: businessTranslation }] = await Promise.all([
          client.from("businesses").select("name, description, opening_note").eq("id", businessId).maybeSingle(),
          client.from("services").select("id, title, description").eq("business_id", businessId),
          client.from("business_translations").select("name, description, opening_note").eq("business_id", businessId).eq("locale", locale).maybeSingle(),
        ])
        const missingBusiness = business && (["name", "description", "opening_note"] as const).some(
          (field) => Boolean(business[field]?.trim()) && !businessTranslation?.[field]?.trim(),
        )
        const serviceRows = services ?? []
        const { data: serviceTranslations } = serviceRows.length
          ? await client.from("service_translations").select("service_id, title, description").in("service_id", serviceRows.map((service) => service.id)).eq("locale", locale)
          : { data: [] }
        const byService = new Map((serviceTranslations ?? []).map((translation) => [translation.service_id, translation]))
        const missingServices = serviceRows.filter((service) => {
          const translation = byService.get(service.id)
          return (Boolean(service.title?.trim()) && !translation?.title?.trim()) ||
            (Boolean(service.description?.trim()) && !translation?.description?.trim())
        })
        if (missingBusiness || missingServices.length > 0) {
          setSaveState("saved")
          toast.error("Vertaal eerst de bedrijfs- en dienstteksten in het vertaalpaneel.")
          throw new Error("Shared translations incomplete")
        }
      }
    }
    const result = await updateWebsiteLocale(createClient(), websiteId, locale, { is_enabled: enabled })
    if (result.error) {
      setSaveState("error")
      toast.error(result.error.message)
      throw result.error
    }
    setWebsiteLocales((current) => current.map((entry) => entry.locale === locale ? { ...entry, is_enabled: enabled } : entry))
    setSaveState("saved")
    void logLanguageAudit(enabled ? "language.enabled" : "language.disabled", websiteId, locale)
    toast.success(enabled ? "Taal wordt bij de volgende publicatie zichtbaar." : "Taal is uitgeschakeld.")
  }

  const handleRemoveLocale = async (locale: SupportedWebsiteLocale) => {
    if (!hasMultilingualAccess) {
      toast.error("Talen zijn inbegrepen bij Gold of beschikbaar als add-on.")
      return
    }
    if (!websiteId) return
    setSaveState("saving")
    const result = await removeWebsiteLocale(createClient(), websiteId, locale)
    if (result.error) {
      setSaveState("error")
      toast.error(result.error.message)
      throw result.error
    }
    setWebsiteLocales((current) => current.filter((entry) => entry.locale !== locale))
    setSharedLocaleStatuses((current) => {
      const next = { ...current }
      delete next[locale]
      return next
    })
    setSectionTranslations((current) => new Map(
      [...current.entries()].filter(([key]) => !key.endsWith(`:${locale}`)),
    ))
    if (activeLocale === locale) setActiveLocale(defaultWebsiteLocale?.locale ?? DEFAULT_WEBSITE_LOCALE)
    setSaveState("saved")
    void logLanguageAudit("language.removed", websiteId, locale)
    toast.success("Taal en vertalingen zijn verwijderd.")
  }

  const handleUpdateLocale = async (
    locale: SupportedWebsiteLocale,
    updates: { display_name?: string; path_segment?: string; seo?: Record<string, unknown> },
  ) => {
    if (!hasMultilingualAccess) {
      toast.error("Talen zijn inbegrepen bij Gold of beschikbaar als add-on.")
      return
    }
    if (!websiteId) return
    setSaveState("saving")
    const result = await updateWebsiteLocale(createClient(), websiteId, locale, updates)
    if (result.error || !result.data) {
      setSaveState("error")
      toast.error(result.error?.message || "Taalinstellingen opslaan is mislukt.")
      throw result.error
    }
    setWebsiteLocales((current) => current.map((entry) => entry.locale === locale ? result.data as WebsiteLocale : entry))
    setSaveState("saved")
    void logLanguageAudit("language.updated", websiteId, locale)
    toast.success("Taalinstellingen opgeslagen.")
  }

  const handleSetDefaultLocale = async (locale: SupportedWebsiteLocale) => {
    if (!hasMultilingualAccess) {
      toast.error("Talen zijn inbegrepen bij Gold of beschikbaar als add-on.")
      return
    }
    if (!websiteId) return
    setSaveState("saving")
    const { error } = await setWebsiteDefaultLocale(createClient(), websiteId, locale)
    if (error) {
      setSaveState("error")
      toast.error(error.message)
      throw error
    }
    setWebsiteLocales((current) => current.map((entry) => ({
      ...entry,
      is_default: entry.locale === locale,
      is_enabled: entry.locale === locale ? true : entry.is_enabled,
    })))
    setSharedLocaleStatuses(Object.fromEntries(websiteLocales.map((entry) => [
      entry.locale,
      entry.locale === locale ? "complete" : "missing",
    ])) as Partial<Record<SupportedWebsiteLocale, "complete" | "missing" | "stale">>)
    setActiveLocale(locale)
    setSaveState("saved")
    void logLanguageAudit("language.updated", websiteId, locale)
    toast.success("Standaardtaal gewijzigd.")
  }

  const handleLanguageSwitcherChange = async (languageSwitcher: LanguageSwitcherConfig) => {
    if (!websiteId) return

    const nextTheme: ThemeConfig = {
      ...(themeConfig ?? getDefaultThemeConfig()),
      languageSwitcher,
    }
    setThemeConfig(nextTheme)
    setIsSaving(true)
    setSaveState("saving")

    try {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, themeConfig: nextTheme }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Taalkeuze kon niet worden opgeslagen.")

      setThemeConfig((result?.themeConfig as ThemeConfig | undefined) ?? nextTheme)
      setSaveState("saved")
      toast.success("Weergave van de taalkeuze opgeslagen.")
    } catch (error) {
      setSaveState("error")
      toast.error(error instanceof Error ? error.message : "Taalkeuze kon niet worden opgeslagen.")
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const refreshSharedLocaleStatuses = async () => {
    setSharedLocaleStatuses(await loadSharedLocaleStatuses(businessId, websiteLocales))
  }

  const handleSaveTranslation = async (section: Section, values: Record<string, unknown>) => {
    if (!hasMultilingualAccess) {
      toast.error("Talen zijn inbegrepen bij Gold of beschikbaar als add-on.")
      return
    }
    if (!websiteId || !activeWebsiteLocale || activeWebsiteLocale.is_default) return
    setIsSaving(true)
    const sourceHash = getSectionSourceHash(section)
    const result = await saveSectionTranslation(createClient(), {
      website_id: websiteId,
      section_id: section.id,
      locale: activeWebsiteLocale.locale,
      values,
      source_hash: sourceHash,
    })
    setIsSaving(false)
    if (result.error) {
      setSaveState("error")
      toast.error(result.error.message)
      throw result.error
    }
    setSectionTranslations((current) => {
      const next = new Map(current)
      next.set(`${section.id}:${activeWebsiteLocale.locale}`, { values, sourceHash })
      return next
    })
    toast.success("Vertaling opgeslagen.")
  }

  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null
  const pendingMobileSectionLabel = pendingMobileSectionType
    ? getSectionDefinition(pendingMobileSectionType)?.label ?? pendingMobileSectionType
    : ""
  const selectedSectionIndex = selectedSectionId
    ? sections.findIndex((section) => section.id === selectedSectionId)
    : -1
  const selectedWebsite = websites.find((website) => website.id === websiteId)
  const getWebsiteOptionLabel = (website: WebsiteSummary, index: number) => {
    const label = website.title || DEFAULT_SITE_TITLE
    const duplicateCount = websites.filter((candidate) => (candidate.title || DEFAULT_SITE_TITLE) === label).length
    return duplicateCount > 1 ? `${label} ${index + 1}` : label
  }
  const selectedWebsiteLiveUrl = selectedWebsite
    ? selectedWebsite.customDomain || `${selectedWebsite.slug}.${PLATFORM_DOMAIN}`
    : ""
  const selectedWebsiteLiveHref = selectedWebsiteLiveUrl
    ? selectedWebsiteLiveUrl.startsWith("http")
      ? selectedWebsiteLiveUrl
      : `https://${selectedWebsiteLiveUrl}`
    : ""
  const selectedWebsitePreviewUrl = selectedWebsite
    ? `${PLATFORM_DOMAIN}/preview/${selectedWebsite.slug}`
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
  const canUndo = historyVersion >= 0 && historyRef.current.undo.length > 0
  const canRedo = historyVersion >= 0 && historyRef.current.redo.length > 0
  const handleEditorNavigationCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!saveQueueRef.current?.pending || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = (event.target as HTMLElement).closest("a")
    const href = anchor?.getAttribute("href")
    if (!href?.startsWith("/editor") || anchor?.getAttribute("target") === "_blank") return
    event.preventDefault()
    void flushPendingSectionSaves().then((saved) => {
      if (saved) router.push(href)
      else toast.error("Navigeren gestopt", { description: "Niet alle wijzigingen konden worden opgeslagen." })
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted" onClickCapture={handleEditorNavigationCapture}>
      <div className="border-b border-border bg-background px-2 py-2 md:px-4">
        <div className="hidden w-full flex-nowrap items-center gap-2 overflow-hidden md:flex">
          <label htmlFor="website-selector" className="sr-only">
            Website
          </label>
          <div className="group relative w-36 min-w-0 shrink-0 lg:w-48 xl:w-56">
            <LayoutTemplate className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-primary" />
            <select
              id="website-selector"
              value={websiteId ?? ""}
              onChange={(event) => handleWebsiteChange(event.target.value)}
              className="h-8 w-full cursor-pointer appearance-none rounded-lg border border-input bg-gradient-to-b from-background to-muted/30 py-0 pl-8 pr-8 text-xs font-semibold text-foreground shadow-sm outline-none transition-all hover:border-primary/40 hover:shadow-md focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {websites.map((website, index) => (
                <option key={website.id} value={website.id}>
                  {getWebsiteOptionLabel(website, index)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-transform group-focus-within:rotate-180 group-focus-within:text-primary" />
          </div>
          {multilingualAvailable ? <WebsiteLanguageControl
            locales={websiteLocales}
            activeLocale={activeLocale}
            onLocaleChange={handleLocaleChange}
            onAdd={handleAddLocale}
            onToggle={handleToggleLocale}
            onRemove={handleRemoveLocale}
            onUpdate={handleUpdateLocale}
            onSetDefault={handleSetDefaultLocale}
            languageSwitcher={themeConfig?.languageSwitcher}
            onLanguageSwitcherChange={handleLanguageSwitcherChange}
            canSetDefault={!selectedWebsite?.published && sectionTranslations.size === 0}
            statuses={localeStatuses}
          /> : multilingualEnabled ? (
            <Link
              href="/editor/account/billing"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-amber-300/70 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900 shadow-sm transition-colors hover:bg-amber-100"
              title="Talen zijn inbegrepen bij Gold of beschikbaar als add-on"
            >
              <Globe2 className="h-3.5 w-3.5" />
              Talen · Gold/add-on
            </Link>
          ) : null}
          <label htmlFor="website-name" className="sr-only">
            Websitenaam
          </label>
          <input
            id="website-name"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-8 w-32 min-w-0 shrink rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 lg:w-44 xl:w-56"
            placeholder="Websitenaam"
          />
          <Button
            type="button"
            size="icon-sm"
            onClick={handleSave}
            disabled={!websiteId || isRenamingWebsite || isDeletingWebsite}
            aria-label="Websitenaam opslaan"
            title="Websitenaam opslaan"
          >
            {isRenamingWebsite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          </Button>
          <div className="flex items-center rounded-md border border-border bg-background p-0.5">
            <Button type="button" variant="ghost" size="icon-xs" onClick={handleUndo} disabled={!canUndo} aria-label="Wijziging ongedaan maken" title="Ongedaan maken (Ctrl+Z)">
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" onClick={handleRedo} disabled={!canRedo} aria-label="Wijziging opnieuw toepassen" title="Opnieuw toepassen (Ctrl+Shift+Z)">
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleCreateWebsite}
            disabled={isCreatingWebsite || isDeletingWebsite}
            aria-label="Nieuwe website"
            title="Nieuwe website"
          >
            {isCreatingWebsite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            onClick={() => setDeleteWebsiteConfirmationOpen(true)}
            disabled={!websiteId || isDeletingWebsite || isCreatingWebsite || isRenamingWebsite}
            aria-label="Website verwijderen"
            title="Website verwijderen"
          >
            {isDeletingWebsite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
          <TierBadge plan={currentPlan} prefix="Actief" className="hidden border-primary/30 bg-primary/10 text-primary 2xl:inline-flex" />
          {selectedWebsite ? (
            <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 overflow-hidden whitespace-nowrap rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
              <a
                href={selectedWebsitePreviewHref}
                target="_blank"
                rel="noreferrer"
                className="hidden shrink-0 items-center gap-1 rounded border border-border bg-background px-2 py-1 font-medium text-primary transition-colors hover:bg-accent xl:inline-flex"
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
              <span className="hidden text-muted-foreground 2xl:inline">{liveStatusDescription}</span>
              {selectedWebsite.published ? (
                <>
                  <a
                    href={selectedWebsiteLiveHref}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden min-w-0 items-center gap-1 rounded border border-border bg-background px-2 py-1 font-medium text-primary hover:bg-accent lg:inline-flex"
                    title={selectedWebsiteLiveUrl}
                  >
                    <Globe2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="max-w-28 truncate font-mono xl:max-w-[20vw]">
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
            <div className="group relative min-w-0 flex-1">
              <LayoutTemplate className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary" />
              <select
                id="website-selector-mobile"
                value={websiteId ?? ""}
                onChange={(event) => handleWebsiteChange(event.target.value)}
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-input bg-gradient-to-b from-background to-muted/30 py-0 pl-10 pr-10 text-sm font-semibold text-foreground shadow-sm outline-none transition-all hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {websites.map((website, index) => (
                  <option key={website.id} value={website.id}>
                    {getWebsiteOptionLabel(website, index)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform group-focus-within:rotate-180 group-focus-within:text-primary" />
            </div>
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

          {(canUndo || canRedo) ? (
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={handleUndo} disabled={!canUndo}>
                <Undo2 className="h-4 w-4" /> Ongedaan maken
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={handleRedo} disabled={!canRedo}>
                <Redo2 className="h-4 w-4" /> Opnieuw
              </Button>
            </div>
          ) : null}

          {multilingualAvailable ? <WebsiteLanguageControl
            locales={websiteLocales}
            activeLocale={activeLocale}
            onLocaleChange={handleLocaleChange}
            onAdd={handleAddLocale}
            onToggle={handleToggleLocale}
            onRemove={handleRemoveLocale}
            onUpdate={handleUpdateLocale}
            onSetDefault={handleSetDefaultLocale}
            languageSwitcher={themeConfig?.languageSwitcher}
            onLanguageSwitcherChange={handleLanguageSwitcherChange}
            canSetDefault={!selectedWebsite?.published && sectionTranslations.size === 0}
            statuses={localeStatuses}
            mobile
          /> : multilingualEnabled ? (
            <Link
              href="/editor/account/billing"
              className="flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 text-sm font-semibold text-amber-900 shadow-sm"
            >
              <Globe2 className="h-4 w-4" />
              Talen ontgrendelen
              <span className="ml-auto text-xs font-medium">Gold of € 2,99/mnd</span>
            </Link>
          ) : null}

          <details className="group rounded-md border border-border bg-muted/30">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium text-foreground">
              <span>Website beheren</span>
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">Naam, links en websiteacties</span>
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
                  size="icon-lg"
                  className="h-11 w-11 shrink-0"
                  onClick={handleSave}
                  disabled={!websiteId || isRenamingWebsite || isDeletingWebsite}
                  aria-label="Websitenaam opslaan"
                  title="Websitenaam opslaan"
                >
                  {isRenamingWebsite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  className="h-11 w-11 shrink-0"
                  onClick={handleCreateWebsite}
                  disabled={isCreatingWebsite || isDeletingWebsite}
                  aria-label="Nieuwe website"
                  title="Nieuwe website"
                >
                  {isCreatingWebsite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-lg"
                  className="h-11 w-11 shrink-0"
                  onClick={() => setDeleteWebsiteConfirmationOpen(true)}
                  disabled={!websiteId || isDeletingWebsite || isCreatingWebsite || isRenamingWebsite}
                  aria-label="Website verwijderen"
                  title="Website verwijderen"
                >
                  {isDeletingWebsite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
              <div>
                {selectedWebsite ? (
                  <a
                    href={selectedWebsitePreviewHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-primary shadow-sm"
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
      {isLoadingWebsite ? <EditorWorkspaceSkeleton /> : null}
      {/* Desktop layout: side-by-side panels */}
      <div className={`${isLoadingWebsite ? "hidden" : "hidden md:flex"} flex-1 overflow-hidden`}>
        {!isPreview && !isTranslationMode && (
          <SectionsSelector
            userId={userId}
            currentPlan={currentPlan}
            onSectionAddRequest={handleSectionAddRequest}
          />
        )}
        <EditorCanvas
          sections={displayedSections}
          persistSections={persistSections}
          onSectionUpdate={handleCanvasSectionUpdate}
          onSectionDelete={handleDelete}
          transitions={transitions}
          themeConfig={themeConfig}
          isPreview={isPreview || isTranslationMode}
          selectedSectionId={selectedSectionId}
          onSectionSelect={handleSectionSelect}
          device={device}
          websiteId={websiteId}
          businessId={businessId}
          businessCategory={businessCategory}
          activeLocale={activeLocale}
          isDraggingNewSectionExternal={isMobileDraggingNewSection}
          isDraggingImageExternal={isMobileDraggingImage}
          onStartTutorial={handleStartTutorial}
        />
        {!isPreview && isTranslationMode && activeWebsiteLocale ? (
          <SectionTranslationPanel
            sections={translationSourceSections}
            selectedSectionId={selectedSectionId}
            locale={activeWebsiteLocale}
            businessId={businessId}
            translations={sectionTranslations}
            onSectionSelect={setSelectedSectionId}
            onSave={handleSaveTranslation}
            onSharedSaved={refreshSharedLocaleStatuses}
            className="flex h-full w-80 shrink-0 flex-col border-l bg-background xl:w-96"
          />
        ) : !isPreview ? (
          <EditorInspector
            userId={userId}
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
        ) : null}
      </div>

      {/* Mobile layout: single panel with bottom tab bar */}
      <div className={`${isLoadingWebsite ? "hidden" : "flex md:hidden"} flex-1 overflow-hidden flex-col`}>
        {/* Panel content */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {mobilePanel === "sections" && !isPreview && !isTranslationMode && (
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
              sections={displayedSections}
              persistSections={persistSections}
              onSectionUpdate={handleCanvasSectionUpdate}
              onSectionDelete={handleDelete}
              transitions={transitions}
              themeConfig={themeConfig}
              isPreview={isPreview || isTranslationMode}
              selectedSectionId={selectedSectionId}
              onSectionSelect={handleSectionSelect}
              device={device}
              websiteId={websiteId}
              businessId={businessId}
              businessCategory={businessCategory}
              activeLocale={activeLocale}
              isDraggingNewSectionExternal={isMobileDraggingNewSection}
              isDraggingImageExternal={isMobileDraggingImage}
              onStartTutorial={handleStartTutorial}
            />
          )}
          {mobilePanel === "style" && !isPreview && isTranslationMode && activeWebsiteLocale ? (
            <SectionTranslationPanel
              sections={translationSourceSections}
              selectedSectionId={selectedSectionId}
              locale={activeWebsiteLocale}
              businessId={businessId}
              translations={sectionTranslations}
              onSectionSelect={setSelectedSectionId}
              onSave={handleSaveTranslation}
              onSharedSaved={refreshSharedLocaleStatuses}
              className="flex h-full w-full flex-col bg-background"
            />
          ) : mobilePanel === "style" && !isPreview ? (
            <EditorInspector
              userId={userId}
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
          ) : null}
          {mobilePanel === "site" && !isPreview && (
            <EditorInspector
              userId={userId}
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
              disabled={isTranslationMode}
              aria-label="Secties toevoegen"
              title="Secties toevoegen"
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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

      <AlertDialog
        open={deleteWebsiteConfirmationOpen}
        onOpenChange={(open) => {
          if (!isDeletingWebsite) setDeleteWebsiteConfirmationOpen(open)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Website definitief verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{selectedWebsite?.title || title}&quot; en alle bijbehorende secties, vertalingen en domeinkoppelingen worden verwijderd. Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingWebsite}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingWebsite}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteWebsite()
              }}
            >
              {isDeletingWebsite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isDeletingWebsite ? "Verwijderen..." : "Website verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {staleTranslationWarnings.length > 0
                ? `${staleTranslationWarnings.length} vertaling${staleTranslationWarnings.length === 1 ? " is" : "en zijn"} verouderd: ${staleTranslationWarnings.slice(0, 5).map((warning) => `${warning.locale} · ${warning.label}`).join(", ")}. Publiceer alleen als je deze hebt gecontroleerd.`
                : "De huidige opgeslagen conceptversie wordt gecontroleerd en daarna als één nieuwe live versie gepubliceerd."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => void performPublish(staleTranslationWarnings.length > 0)} disabled={isSaving}>
              {isSaving ? "Live zetten..." : staleTranslationWarnings.length > 0 ? "Gecontroleerd, toch publiceren" : "Bevestigen en live zetten"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}



