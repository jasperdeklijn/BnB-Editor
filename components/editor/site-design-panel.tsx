"use client"

import { useMemo, useState, type ReactNode } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, Eye, LayoutTemplate, Loader2, Palette, RotateCcw, Sparkles } from "lucide-react"
import { ThemePanel } from "@/components/themes/theme-panel"
import { TemplatePreviewCard } from "@/components/templates/template-preview-card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatusMessage } from "@/components/ui/status-message"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { BUSINESS_CATEGORIES, type BusinessCategory } from "@/lib/business/categories"
import { getAllTemplatePresets, type TemplatePreset } from "@/components/templates/category-presets"
import type { ThemeConfig } from "@/lib/themes"

type TemplateCheckpoint = {
  websiteId: string
  businessId: string | null
  sections: Array<{
    id: string
    type: string
    content: Record<string, unknown>
    styles: Record<string, unknown>
    position: number
  }>
  transitions: Array<{
    from_section_id: string
    to_section_id: string
    transition: Record<string, unknown> | null
  }>
  services: Array<{
    id: string
    business_id: string
    title: string
    description: string
    price: string
    duration: string
    capacity: number | null
    image_urls: unknown[]
    tags: unknown[]
    position: number
    is_featured: boolean
  }>
}

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
  const [previewTemplate, setPreviewTemplate] = useState<TemplatePreset | null>(null)
  const [confirmTemplate, setConfirmTemplate] = useState<TemplatePreset | null>(null)
  const [lastCheckpoint, setLastCheckpoint] = useState<TemplateCheckpoint | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<BusinessCategory>>(
    () => new Set(BUSINESS_CATEGORIES.map((category) => category.value)),
  )
  const [isApplying, setIsApplying] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [status, setStatus] = useState<{ tone: "success" | "error"; content: ReactNode } | null>(null)
  const sitePanelOptions = [
    { value: "themes", label: "Thema aanpassen" },
    { value: "templates", label: "Sjabloon kiezen" },
  ]

  const templateGroups = useMemo(() => {
    const presets = getAllTemplatePresets()
    const orderedCategories = businessCategory
      ? [
          ...BUSINESS_CATEGORIES.filter((category) => category.value === businessCategory),
          ...BUSINESS_CATEGORIES.filter((category) => category.value !== businessCategory),
        ]
      : BUSINESS_CATEGORIES

    return orderedCategories
      .map((category) => ({
        category,
        templates: presets.filter((template) => template.category === category.value),
      }))
      .filter((group) => group.templates.length > 0)
  }, [businessCategory])

  const toggleCategory = (category: BusinessCategory) => {
    setCollapsedCategories((current) => {
      const next = new Set(current)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const applyTemplate = async () => {
    if (!confirmTemplate) return

    setIsApplying(true)
    setStatus(null)

    try {
      const response = await fetch("/api/templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: confirmTemplate.category,
          websiteId,
          businessId,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result?.error || "Sjabloon toepassen is mislukt.")
      }

      const checkpoint = result?.checkpoint as TemplateCheckpoint | undefined
      if (checkpoint) {
        setLastCheckpoint(checkpoint)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(`template-checkpoint:${checkpoint.websiteId}`, JSON.stringify(checkpoint))
        }
      }

      setStatus({
        tone: "success",
        content: (
          <div className="flex flex-col gap-2">
            <span>Sjabloon toegepast. Er is een herstelpunt gemaakt voor de vorige inhoud.</span>
            {checkpoint ? (
              <Button type="button" variant="outline" size="xs" className="w-fit" onClick={() => restoreCheckpoint(checkpoint)} disabled={isRestoring}>
                <RotateCcw className="h-3 w-3" />
                {isRestoring ? "Terugzetten..." : "Vorige inhoud terugzetten"}
              </Button>
            ) : null}
          </div>
        ),
      })
      setConfirmTemplate(null)
      await onTemplateApplied(result?.websiteId ?? websiteId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sjabloon toepassen is mislukt."
      setStatus({ tone: "error", content: message })
    } finally {
      setIsApplying(false)
    }
  }

  const restoreCheckpoint = async (checkpoint = lastCheckpoint) => {
    if (!checkpoint) return

    setIsRestoring(true)
    setStatus(null)

    try {
      const response = await fetch("/api/templates/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpoint }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result?.error || "Herstellen is mislukt.")
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`template-checkpoint:${checkpoint.websiteId}`)
      }
      setLastCheckpoint(null)
      setStatus({ tone: "success", content: "Vorige inhoud is teruggezet." })
      await onTemplateApplied(result?.websiteId ?? checkpoint.websiteId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Herstellen is mislukt."
      setStatus({ tone: "error", content: message })
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="border-b border-border bg-background px-3 py-3 sm:px-4">
          <div className="mb-3 flex min-w-0 items-center gap-2 md:mb-3">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">Site ontwerp</span>
          </div>
          <label htmlFor="site-design-mobile-mode" className="sr-only">
            Site ontwerp onderdeel
          </label>
          <select
            id="site-design-mobile-mode"
            value={activeTab}
            onChange={(event) => setActiveTab(event.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 md:hidden"
          >
            {sitePanelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <TabsList className="hidden w-full grid-cols-2 md:grid">
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
            {status.content}
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
                  Eerst bekijken, daarna bevestigen
                </div>
                Een sjabloon opent eerst als voorbeeld. Pas na uw bevestiging vervangen we de huidige secties en voorbeeldinhoud.
              </div>

              {templateGroups.map((group) => {
                const isCollapsed = collapsedCategories.has(group.category.value)

                return (
                  <div key={group.category.value} className="overflow-hidden rounded-md border border-border bg-background">
                    <button
                      type="button"
                      onClick={() => toggleCategory(group.category.value)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border bg-secondary/40 px-3 py-2 text-left transition-colors hover:bg-secondary"
                      aria-expanded={!isCollapsed}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{group.category.label}</span>
                          {group.category.value === businessCategory ? (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">
                              Aanbevolen
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{group.category.description}</p>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isCollapsed ? "-rotate-90" : "rotate-0")} />
                    </button>

                    {!isCollapsed ? (
                      <div className="space-y-3 p-3">
                        {group.templates.map((template) => (
                          <TemplatePreviewCard
                            key={template.id}
                            template={template}
                            isSelected={previewTemplate?.id === template.id || confirmTemplate?.id === template.id}
                            actionLabel="Voorbeeld bekijken"
                            onSelect={(selectedTemplate) => {
                              setStatus(null)
                              setPreviewTemplate(selectedTemplate)
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <AlertDialog open={Boolean(previewTemplate)} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{previewTemplate ? `${previewTemplate.name} bekijken` : "Sjabloon bekijken"}</AlertDialogTitle>
            <AlertDialogDescription>
              Bekijk eerst welke bedrijfsgegevens, voorbeelditems en pagina-indeling dit sjabloon toevoegt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {previewTemplate ? (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <Eye className="h-4 w-4 text-primary" />
                  Voorbeeldinhoud
                </div>
                <p className="font-medium text-foreground">{previewTemplate.businessDefaults.name}</p>
                <p className="text-xs text-muted-foreground">{previewTemplate.businessDefaults.tagline}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {previewTemplate.businessDefaults.description}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pagina-indeling</p>
                  <div className="flex flex-wrap gap-1.5">
                    {previewTemplate.sections.map((section) => (
                      <span key={`${previewTemplate.id}-preview-${section.position}-${section.type}`} className="rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                        {section.type.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Voorbeelditems</p>
                  <div className="space-y-2">
                    {previewTemplate.services.slice(0, 3).map((service) => (
                      <div key={`${previewTemplate.id}-preview-${service.title}`} className="text-xs">
                        <p className="font-medium text-foreground">{service.title}</p>
                        <p className="text-muted-foreground">{service.price || service.description}</p>
                      </div>
                    ))}
                    {previewTemplate.services.length > 3 ? (
                      <p className="text-xs font-medium text-muted-foreground">
                        +{previewTemplate.services.length - 3} meer
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Sluiten</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                onClick={() => {
                  setConfirmTemplate(previewTemplate)
                  setPreviewTemplate(null)
                }}
              >
                Dit sjabloon gebruiken
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(confirmTemplate)} onOpenChange={(open) => !open && setConfirmTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huidige inhoud vervangen?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTemplate
                ? `${confirmTemplate.name} vervangt de huidige secties en voorbeelditems van deze website. We maken eerst een herstelpunt, zodat u dit direct kunt terugzetten.`
                : "Dit sjabloon vervangt de huidige website-inhoud."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmTemplate ? (
            <div className="space-y-3">
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Dit verandert de huidige website
                </div>
                <p className="text-xs leading-relaxed">
                  Teksten, secties en voorbeelditems die nu op deze website staan worden vervangen door het gekozen sjabloon.
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Wordt toegepast na bevestiging
              </div>
              <div className="flex flex-wrap gap-1.5">
                {confirmTemplate.sections.map((section) => (
                  <span key={`${confirmTemplate.id}-${section.position}-${section.type}`} className="rounded bg-background px-2 py-1 text-xs text-muted-foreground">
                    {section.type.replace("_", " ")}
                  </span>
                ))}
              </div>
              </div>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplying}>Annuleren</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button type="button" onClick={applyTemplate} disabled={isApplying}>
                {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Ja, vervang mijn huidige site
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
