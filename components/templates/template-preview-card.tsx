"use client"

import type { TemplatePreset } from "./category-presets"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Eye, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getOfferingCopy } from "@/lib/business/categories"

interface TemplatePreviewCardProps {
  template: TemplatePreset
  isSelected?: boolean
  onSelect?: (template: TemplatePreset) => void
  actionLabel?: string
}

export function TemplatePreviewCard({
  template,
  isSelected = false,
  onSelect,
  actionLabel = "Selecteren",
}: TemplatePreviewCardProps) {
  const offeringCopy = getOfferingCopy(template.category)

  return (
    <Card className={cn("overflow-hidden transition-all", isSelected ? "ring-2 ring-primary" : "")}>
      <div className="border-b border-border bg-secondary p-4">
        <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{template.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
          </div>
          {isSelected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
        </div>
        <TemplateMiniPreview template={template} />
      </div>

      <div className="border-b border-border bg-white p-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bedrijfsgegevens</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{template.businessDefaults.name}</p>
            <p className="text-xs text-muted-foreground">{template.businessDefaults.tagline}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-muted p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {offeringCopy.previewLabel}
        </p>
        <div className="space-y-2">
          {template.services.slice(0, 3).map((service, idx) => (
            <div key={idx} className="text-sm">
              <p className="font-medium text-foreground">{service.title}</p>
              <p className="text-xs text-muted-foreground">{service.description}</p>
              {service.price && <p className="text-xs font-semibold text-foreground mt-0.5">{service.price}</p>}
            </div>
          ))}
          {template.services.length > 3 && (
            <p className="text-xs text-muted-foreground font-medium pt-2">
              +{template.services.length - 3} meer {offeringCopy.plural}
            </p>
          )}
        </div>
      </div>

      <div className="border-b border-border bg-white p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pagina secties</p>
        <div className="flex flex-wrap gap-1">
          {template.sections.map((section, idx) => (
            <span key={idx} className="rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              {section.type.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-muted p-4">
        <Button
          onClick={() => onSelect?.(template)}
          className="w-full gap-2"
          variant={isSelected ? "default" : "outline"}
        >
          {isSelected ? "Geselecteerd" : actionLabel}
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}

function TemplateMiniPreview({ template }: { template: TemplatePreset }) {
  const hero = template.sections.find((section) => section.type === "hero")
  const hasGallery = template.sections.some((section) => section.type === "gallery")
  const hasServices = template.sections.some((section) => section.type === "services")

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background shadow-sm">
      <div className="flex h-7 items-center justify-between border-b border-border px-3">
        <div className="h-2 w-20 rounded bg-primary/70" />
        <div className="flex gap-1.5">
          <div className="h-1.5 w-6 rounded bg-muted-foreground/30" />
          <div className="h-1.5 w-6 rounded bg-muted-foreground/30" />
          <div className="h-1.5 w-6 rounded bg-muted-foreground/30" />
        </div>
      </div>
      <div className="grid gap-2 p-3">
        <div className="grid gap-3 rounded bg-primary/10 p-3 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded bg-primary/70" />
            <div className="h-2 w-full rounded bg-primary/25" />
            <div className="h-2 w-2/3 rounded bg-primary/25" />
          </div>
          <div className="min-h-12 rounded bg-primary/20" />
        </div>
        <div className={cn("grid gap-2", hasServices ? "grid-cols-3" : "grid-cols-2")}>
          {template.services.slice(0, hasServices ? 3 : 2).map((service) => (
            <div key={service.title} className="rounded border border-border bg-white p-2">
              <div className="mb-1.5 h-2 w-2/3 rounded bg-foreground/50" />
              <div className="h-1.5 w-full rounded bg-muted-foreground/20" />
            </div>
          ))}
        </div>
        {hasGallery ? (
          <div className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-8 rounded bg-muted-foreground/20" />
            ))}
          </div>
        ) : null}
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {hero?.type ? "Live structuur preview" : "Template preview"}
        </div>
      </div>
    </div>
  )
}
