"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, LayoutTemplate, Loader2, Palette, Sparkles } from "lucide-react"
import { ThemePanel } from "@/components/themes/theme-panel"
import { TemplatePreviewCard } from "@/components/templates/template-preview-card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatusMessage } from "@/components/ui/status-message"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { BusinessCategory } from "@/lib/business/categories"
import { getAllTemplatePresets, type TemplatePreset } from "@/components/templates/category-presets"
import type { ThemeConfig } from "@/lib/themes"

interface SiteDesignPanelProps {
  websiteId: string | null
  businessId: string | null
  businessCategory?: BusinessCategory | null
  currentTheme?: ThemeConfig | null
  onThemeChange: (config: ThemeConfig) => void
  onTemplateApplied: (websiteId?: string | null) => Promise<void> | void
  className?: string
}

export function SiteDesignPanel({
  websiteId,
  businessId,
  businessCategory,
  currentTheme,
  onThemeChange,
  onTemplateApplied,
  className,
}: SiteDesignPanelProps) {
  const [activeTab, setActiveTab] = useState("themes")
  const [pendingTemplate, setPendingTemplate] = useState<TemplatePreset | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null)

  const templates = useMemo(() => {
    const presets = getAllTemplatePresets()
    if (!businessCategory) return presets
    return [
      ...presets.filter((template) => template.category === businessCategory),
      ...presets.filter((template) => template.category !== businessCategory),
    ]
  }, [businessCategory])

  const applyTemplate = async () => {
    if (!pendingTemplate) return

    setIsApplying(true)
    setStatus(null)

    try {
      const response = await fetch("/api/templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: pendingTemplate.category,
          websiteId,
          businessId,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result?.error || "Sjabloon toepassen is mislukt.")
      }

      setStatus({ tone: "success", text: "Sjabloon toegepast op de website." })
      setPendingTemplate(null)
      await onTemplateApplied(result?.websiteId ?? websiteId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sjabloon toepassen is mislukt."
      setStatus({ tone: "error", text: message })
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="border-b border-border bg-background px-3 py-3 sm:px-4">
          <div className="mb-3 flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">Site ontwerp</span>
          </div>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="themes" className="gap-1 text-xs">
              <Palette className="h-3.5 w-3.5" />
              Thema
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1 text-xs">
              <LayoutTemplate className="h-3.5 w-3.5" />
              Sjablonen
            </TabsTrigger>
          </TabsList>
        </div>

        {status ? (
          <StatusMessage tone={status.tone} className="m-3 mb-0 sm:mx-4">
            {status.text}
          </StatusMessage>
        ) : null}

        <TabsContent value="themes" className="min-h-0 flex-1 overflow-hidden">
          <ThemePanel
            websiteId={websiteId}
            businessCategory={businessCategory ?? undefined}
            currentTheme={currentTheme}
            onThemeChange={onThemeChange}
            className="h-full min-h-0"
          />
        </TabsContent>

        <TabsContent value="templates" className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full min-h-0">
            <div className="space-y-3 p-3 sm:p-4">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Past de hele site aan
                </div>
                Een sjabloon vervangt de huidige secties en voorbeeld diensten van deze website.
              </div>

              {templates.map((template) => (
                <TemplatePreviewCard
                  key={template.id}
                  template={template}
                  isSelected={pendingTemplate?.id === template.id}
                  actionLabel="Toepassen"
                  onSelect={setPendingTemplate}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <AlertDialog open={Boolean(pendingTemplate)} onOpenChange={(open) => !open && setPendingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sjabloon toepassen op deze website?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTemplate
                ? `${pendingTemplate.name} vervangt ${pendingTemplate.sections.length} secties en ${pendingTemplate.services.length} voorbeeld diensten op de geselecteerde website.`
                : "Dit sjabloon vervangt de huidige website-inhoud."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingTemplate ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Wordt toegepast
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pendingTemplate.sections.map((section) => (
                  <span key={`${pendingTemplate.id}-${section.position}-${section.type}`} className="rounded bg-background px-2 py-1 text-xs text-muted-foreground">
                    {section.type.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplying}>Annuleren</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button type="button" onClick={applyTemplate} disabled={isApplying}>
                {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Toepassen
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
