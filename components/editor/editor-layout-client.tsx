"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { EditorHeader } from "./editor-header"
import { FlexStartReadyNotice } from "@/components/flexstart/ready-notice"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { EditorLayoutProvider, type EditorSaveState, type EditorNavigationGuard } from "./editor-layout-context"
import { EditorSubnavigation } from "./editor-subnavigation"
import { getEditorGroup, withEditorWebsite } from "@/lib/editor-navigation"
import { getActiveWebsiteId, setActiveWebsiteId } from "@/lib/active-website"
import { toast } from "sonner"
import { CalendarDays, ImageIcon, Globe, Home, Briefcase, LayoutTemplate, Search, CreditCard, User, ClipboardList, MessageSquareText } from "lucide-react"
import { DEFAULT_SITE_TITLE } from "@/lib/business-naming"
import { getOfferingCopy, type BusinessCategory } from "@/lib/business/categories"

interface EditorLayoutClientProps {
  children: React.ReactNode
  avatarUrl: string | null
  displayName: string | null
  initialBusinessCategory?: BusinessCategory | null
}

export function EditorLayoutClient({
  children,
  avatarUrl,
  displayName,
  initialBusinessCategory = null,
}: EditorLayoutClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requestedWebsiteId = searchParams.get("websiteId")
  useEffect(() => {
    if (requestedWebsiteId) setActiveWebsiteId(requestedWebsiteId)
  }, [requestedWebsiteId])
  const activeGroup = getEditorGroup(pathname)
  const navigationGuardRef = useRef<EditorNavigationGuard | null>(null)
  const navigationPendingRef = useRef(false)
  const registerNavigationGuard = useCallback((guard: EditorNavigationGuard) => {
    navigationGuardRef.current = guard
    return () => {
      if (navigationGuardRef.current === guard) navigationGuardRef.current = null
    }
  }, [])
  const handleNavigationCapture = (event: MouseEvent<HTMLDivElement>) => {
    const guard = navigationGuardRef.current
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = (event.target as HTMLElement).closest("a")
    const href = anchor?.getAttribute("href")
    const linkPath = href?.split(/[?#]/, 1)[0]
    if (!href || !linkPath || (linkPath !== "/editor" && !linkPath.startsWith("/editor/")) || anchor?.target === "_blank" || anchor?.hasAttribute("download")) return
    const destination = withEditorWebsite(href, getActiveWebsiteId())
    if (!guard && destination === href) return
    event.preventDefault()
    if (navigationPendingRef.current) return
    navigationPendingRef.current = true
    void (async () => {
      try {
        if (!guard || await guard()) router.push(destination)
      } catch {
        toast.error("Navigeren gestopt", { description: "Niet alle wijzigingen konden worden opgeslagen." })
      } finally {
        navigationPendingRef.current = false
      }
    })()
  }
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory | string | null>(initialBusinessCategory)
  const offeringCopy = getOfferingCopy(businessCategory)

  const pageTitles: Record<string, string> = {
    "/editor/flexstart": "FlexStart",
    "/editor/flexcheck": "FlexCheck",
    "/editor": "Website Maker",
    "/editor/business": "Bedrijfsgegevens",
    "/editor/images": "Afbeeldingen",
    "/editor/services": offeringCopy.title,
    "/editor/reviews": "Recensies",
    "/editor/quotes": "Offertes", "/editor/requests": "Aanvragen",
    "/editor/reservations": "Reserveringen",
    "/editor/calendar": businessCategory === "bnb" ? "Boekingskalender" : "Afsprakenkalender",
    "/editor/domains": "Domeininstellingen",
    "/editor/seo": "SEO & Analytics",
    "/editor/account/profile": "Profiel",
    "/editor/account/billing": "Facturering",
  }

  const pageIcons: Record<string, React.ReactNode> = {
    "/editor": <LayoutTemplate className="h-4 w-4" />,
    "/editor/business": <Home className="h-4 w-4" />,
    "/editor/images": <ImageIcon className="h-4 w-4" />,
    "/editor/services": <Briefcase className="h-4 w-4" />,
    "/editor/reviews": <MessageSquareText className="h-4 w-4" />,
    "/editor/requests": <MessageSquareText className="h-4 w-4" />,
    "/editor/reservations": <ClipboardList className="h-4 w-4" />,
    "/editor/calendar": <CalendarDays className="h-4 w-4" />,
    "/editor/domains": <Globe className="h-4 w-4" />,
    "/editor/seo": <Search className="h-4 w-4" />,
    "/editor/account/profile": <User className="h-4 w-4" />,
    "/editor/account/billing": <CreditCard className="h-4 w-4" />,
  }

  const pageTitle = activeGroup?.label ?? pageTitles[pathname ?? "/editor"] ?? "Editor"
  const pageIcon = pageIcons[pathname ?? "/editor"]
  const showEditorActions = pathname === "/editor"

  const noop = useCallback(() => {}, [])
  const [headerTitle, setHeaderTitle] = useState(DEFAULT_SITE_TITLE)
  const [isPreview, setIsPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveState, setSaveState] = useState<EditorSaveState>("saved")
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [onPublish, setOnPublish] = useState<() => void>(() => noop)
  const [onLogout, setOnLogout] = useState<() => void>(() => noop)
  const [actionLabel, setActionLabel] = useState<string | undefined>()
  const [onAction, setOnAction] = useState<(() => void) | undefined>()
  const [actionIcon, setActionIcon] = useState<React.ReactNode>()
  const [actionLoading, setActionLoading] = useState(false)
  const [infoText, setInfoText] = useState<string | undefined>()

  useEffect(() => {
    const handleCategoryChange = (event: Event) => {
      const detail = (event as CustomEvent<{ category?: BusinessCategory | string | null }>).detail
      setBusinessCategory(detail?.category ?? null)
    }

    window.addEventListener("business-category-change", handleCategoryChange)

    return () => {
      window.removeEventListener("business-category-change", handleCategoryChange)
    }
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })
      if (response.ok) {
        router.push("/auth/login")
      }
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }, [router])

  const setNavbarSaving = useCallback((value: boolean) => {
    setIsSaving(value)
    if (value) {
      setSaveState("saving")
      return
    }

    setSaveState((current) => (current === "error" ? "error" : "saved"))
  }, [])

  const layoutValue = useMemo(
    () => ({
      title: headerTitle,
      setTitle: setHeaderTitle,
      isPreview,
      setIsPreview,
      isSaving,
      setIsSaving: setNavbarSaving,
      saveState,
      setSaveState,
      device,
      setDevice,
      onPublish,
      setOnPublish,
      onLogout,
      setOnLogout,
      actionLabel,
      onAction,
      actionIcon,
      actionLoading,
      setActionLabel,
      setOnAction,
      setActionIcon,
      setActionLoading,
      infoText,
      setInfoText,
      registerNavigationGuard,
    }),
    [
      actionIcon,
      actionLabel,
      actionLoading,
      headerTitle,
      infoText,
      isPreview,
      isSaving,
      saveState,
      device,
      onAction,
      onPublish,
      onLogout,
      setNavbarSaving,
      registerNavigationGuard,
    ],
  )

  return (
    <EditorLayoutProvider value={layoutValue}>
      <div className="flex h-screen flex-col overflow-hidden" onClickCapture={handleNavigationCapture}>
        <EditorHeader
          pageTitle={pageTitle}
          titleIcon={pageIcon}
          infoText={infoText}
          actionLabel={actionLabel}
          actionIcon={actionIcon}
          onAction={onAction}
          actionLoading={actionLoading}
          showEditorActions={showEditorActions}
          isPreview={isPreview}
          onPreviewToggle={() => setIsPreview((value) => !value)}
          onPublish={onPublish}
          onLogout={onLogout === noop ? handleLogout : onLogout}
          isSaving={isSaving}
          saveState={saveState}
          device={device}
          onDeviceChange={setDevice}
          avatarUrl={avatarUrl}
          displayName={displayName}
          offeringLabel={offeringCopy.title}
          calendarLabel={businessCategory === "bnb" ? "Boekingskalender" : "Afsprakenkalender"}
          pathname={pathname}
        />
        <EditorSubnavigation pathname={pathname} />
        <FlexStartReadyNotice />
        <div className={`min-h-0 flex-1 ${pathname === "/editor" ? "overflow-hidden" : "overflow-auto"}`}>
          {children}
        </div>
      </div>
    </EditorLayoutProvider>
  )
}



