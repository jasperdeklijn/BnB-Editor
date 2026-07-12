"use client"

import { LayoutTemplate, SlidersHorizontal } from "lucide-react"
import { SelectionEditor } from "./section-editor"
import { SiteDesignPanel } from "./site-design-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { BusinessCategory } from "@/lib/business/categories"
import type { Section, SectionStyles, Transition } from "@/lib/types"
import type { ThemeConfig } from "@/lib/themes"
import type { PlanId } from "@/lib/types/pricing"

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
      className="h-full min-h-0"
    />
  )

  if (singlePanel) {
    return (
      <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
        {singlePanel === "section" ? sectionPanel : sitePanel}
      </div>
    )
  }

  return (
    <Tabs defaultValue={defaultTab} className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <div className="border-b border-border bg-background px-3 py-2 sm:px-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="section" className="gap-1 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Sectie
          </TabsTrigger>
          <TabsTrigger value="site" className="gap-1 text-xs">
            <LayoutTemplate className="h-3.5 w-3.5" />
            Site
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="section" className="min-h-0 flex-1 overflow-hidden">
        {sectionPanel}
      </TabsContent>
      <TabsContent value="site" className="min-h-0 flex-1 overflow-hidden">
        {sitePanel}
      </TabsContent>
    </Tabs>
  )
}
