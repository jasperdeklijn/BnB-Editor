"use client"

import { useState } from "react"
import { ArrowLeft, LayoutTemplate, Trash2 } from "lucide-react"
import { SelectionEditor } from "./section-editor"
import { SiteDesignPanel } from "./site-design-panel"
import { Button } from "@/components/ui/button"
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
import { TierBadge } from "@/components/editor/tier-badge"
import { cn } from "@/lib/utils"
import type { BusinessCategory } from "@/lib/business/categories"
import type { Section, SectionStyles, Transition } from "@/lib/types"
import type { ThemeConfig } from "@/lib/themes"
import type { PlanId } from "@/lib/types/pricing"
import {
  getInitialInspectorRoute,
  navigateInspector,
  type SiteDesignDetail,
} from "@/lib/editor-inspector-navigation"
import {
  getMinimumPlanForCapability,
  getMinimumPlanForSection,
  getSectionCapabilities,
  highestRequiredPlan,
} from "@/lib/entitlements"

interface EditorInspectorProps {
  selectedSection: Section | null
  sections: Section[]
  transitions: Transition[]
  onSectionSelect?: (id: string) => void
  onOpenCanvas?: () => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onStyleUpdate: (styles: SectionStyles) => void
  onDelete: (id: string) => void
  onTransitionUpdate: (fromSectionId: string, toSectionId: string, transitionType: string) => void
  websiteId: string | null
  businessId: string | null
  businessCategory?: BusinessCategory | null
  currentPlan: PlanId
  currentTheme?: ThemeConfig | null
  onThemeChange: (config: ThemeConfig) => void
  onTemplateApplied: (websiteId?: string | null) => Promise<void> | void
  defaultTab?: "section" | "site"
  singlePanel?: "section" | "site"
  className?: string
}

export function EditorInspector({
  selectedSection,
  sections,
  transitions,
  onSectionSelect,
  onOpenCanvas,
  onUpdate,
  onStyleUpdate,
  onDelete,
  onTransitionUpdate,
  websiteId,
  businessId,
  businessCategory,
  currentPlan,
  currentTheme,
  onThemeChange,
  onTemplateApplied,
  defaultTab = "section",
  singlePanel,
  className,
}: EditorInspectorProps) {
  const [route, setRoute] = useState(() => getInitialInspectorRoute(defaultTab, singlePanel))
  const selectedSectionLabel = selectedSection
    ? getSectionInspectorLabel(selectedSection)
    : null
  const selectedSectionPlan = selectedSection
    ? highestRequiredPlan([
        getMinimumPlanForSection(selectedSection.type),
        ...getSectionCapabilities(selectedSection).map(getMinimumPlanForCapability),
      ])
    : null
  const siteDetailLabels: Record<SiteDesignDetail, string> = {
    theme: "Thema en kleuren",
    typography: "Letters en ruimte",
    templates: "Sjablonen",
    language: "Taalweergave",
  }
  const openSection = () => setRoute((current) => navigateInspector(current, { type: "OPEN_SECTION" }))
  const openSiteMenu = () => setRoute((current) => navigateInspector(current, { type: "OPEN_SITE_MENU" }))
  const openSiteDetail = (detail: SiteDesignDetail) =>
    setRoute((current) => navigateInspector(current, { type: "OPEN_SITE_DETAIL", detail }))

  const sectionPanel = (
    <SelectionEditor
      selectedSection={selectedSection}
      sections={sections}
      transitions={transitions}
      onSectionSelect={onSectionSelect}
      onOpenCanvas={onOpenCanvas}
      onUpdate={onUpdate}
      onStyleUpdate={onStyleUpdate}
      onDelete={onDelete}
      onTransitionUpdate={onTransitionUpdate}
      websiteId={websiteId}
      businessId={businessId}
      businessCategory={businessCategory}
      currentPlan={currentPlan}
      currentTheme={currentTheme}
      showHeader={false}
    />
  )

  const sitePanel = (
    <SiteDesignPanel
      websiteId={websiteId}
      businessId={businessId}
      businessCategory={businessCategory}
      currentTheme={currentTheme}
      onThemeChange={onThemeChange}
      onTemplateApplied={onTemplateApplied}
      view={route.mode === "site-detail" ? route.detail : "menu"}
      onViewChange={openSiteDetail}
      className="h-full min-h-0"
    />
  )

  const inSection = route.mode === "section"
  const inSiteMenu = route.mode === "site-menu"
  const contextTitle = inSection
    ? selectedSectionLabel
      ? `Sectie · ${selectedSectionLabel}`
      : "Sectie kiezen"
    : inSiteMenu
      ? "Website-instellingen"
      : siteDetailLabels[route.detail]

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-background", className)}>
      <div className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{contextTitle}</p>
          {inSection && selectedSectionPlan && selectedSectionPlan !== "bronze" ? (
            <TierBadge plan={selectedSectionPlan} />
          ) : null}
        </div>
        {inSection && !singlePanel ? (
          <div className="flex shrink-0 items-center gap-1">
            {selectedSection ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`${selectedSectionLabel} verwijderen`}
                    title={`${selectedSectionLabel} verwijderen`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
                    <AlertDialogAction variant="destructive" onClick={() => onDelete(selectedSection.id)}>
                      Verwijderen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <Button type="button" variant="ghost" size="xs" className="shrink-0" onClick={openSiteMenu}>
              <LayoutTemplate className="h-3.5 w-3.5" />
              Website
            </Button>
          </div>
        ) : !inSection && !(inSiteMenu && singlePanel === "site") ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="shrink-0"
            onClick={inSiteMenu && selectedSectionLabel ? openSection : openSiteMenu}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {inSiteMenu
              ? selectedSectionLabel
                ? `Terug naar ${selectedSectionLabel}`
                : "Terug"
              : "Instellingen"}
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {inSection ? sectionPanel : sitePanel}
      </div>
    </div>
  )
}

function getSectionInspectorLabel(section: Section) {
  const title = typeof section.data?.title === "string" ? section.data.title.trim() : ""
  if (title) return title
  return section.type.replaceAll("_", " ")
}
