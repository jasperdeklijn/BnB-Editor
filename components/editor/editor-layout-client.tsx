"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { EditorHeader } from "./editor-header"
import { usePathname, useRouter } from "next/navigation"
import { EditorLayoutProvider, type EditorSaveState } from "./editor-layout-context"
import { CalendarDays, ImageIcon, Globe, Home, Briefcase, LayoutTemplate, Search, CreditCard, User } from "lucide-react"
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
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory | string | null>(initialBusinessCategory)
  const offeringCopy = getOfferingCopy(businessCategory)

  const pageTitles: Record<string, string> = {
    "/editor": "Website Maker",
    "/editor/business": "Bedrijfsgegevens",
    "/editor/images": "Afbeeldingen",
    "/editor/services": offeringCopy.title,
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
    "/editor/calendar": <CalendarDays className="h-4 w-4" />,
    "/editor/domains": <Globe className="h-4 w-4" />,
    "/editor/seo": <Search className="h-4 w-4" />,
    "/editor/account/profile": <User className="h-4 w-4" />,
    "/editor/account/billing": <CreditCard className="h-4 w-4" />,
  }

  const pageTitle = pageTitles[pathname ?? "/editor"] ?? "Editor"
  const pageIcon = pageIcons[pathname ?? "/editor"]
  const showEditorActions = pathname === "/editor"
  const showBackButton = pathname !== "/editor" && pathname?.startsWith("/editor")

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
    ],
  )

  return (
    <EditorLayoutProvider value={layoutValue}>
      <div className="flex h-screen flex-col overflow-hidden">
        <EditorHeader
          pageTitle={pageTitle}
          titleIcon={pageIcon}
          infoText={infoText}
          actionLabel={actionLabel}
          actionIcon={actionIcon}
          onAction={onAction}
          actionLoading={actionLoading}
          showEditorActions={showEditorActions}
          showBackButton={showBackButton}
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
        />
        <div className={`min-h-0 flex-1 ${pathname === "/editor" ? "overflow-hidden" : "overflow-auto"}`}>
          {children}
        </div>
      </div>
    </EditorLayoutProvider>
  )
}



