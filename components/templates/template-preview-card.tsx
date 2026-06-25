"use client"

import type { TemplatePreset } from "./category-presets"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

interface TemplatePreviewCardProps {
  template: TemplatePreset
  isSelected?: boolean
  onSelect?: (template: TemplatePreset) => void
}

export function TemplatePreviewCard({
  template,
  isSelected = false,
  onSelect,
}: TemplatePreviewCardProps) {
  return (
    <Card className={`overflow-hidden transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}>
      {/* Header with template name */}
      <div className="bg-secondary p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
      </div>

      {/* Business info preview */}
      <div className="p-4 border-b border-border bg-white">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bedrijfsgegevens</p>
            <p className="text-sm font-semibold text-foreground mt-1">{template.businessDefaults.name}</p>
            <p className="text-xs text-muted-foreground">{template.businessDefaults.tagline}</p>
          </div>
        </div>
      </div>

      {/* Services preview */}
      <div className="p-4 border-b border-border bg-muted">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Voorbeeld diensten</p>
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
              +{template.services.length - 3} meer diensten
            </p>
          )}
        </div>
      </div>

      {/* Sections preview */}
      <div className="p-4 border-b border-border bg-white">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Pagina secties</p>
        <div className="flex flex-wrap gap-1">
          {template.sections.map((section, idx) => (
            <span key={idx} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded font-medium">
              {section.type}
            </span>
          ))}
        </div>
      </div>

      {/* Action button */}
      <div className="p-4 bg-muted">
        <Button
          onClick={() => onSelect?.(template)}
          className="w-full gap-2"
          variant={isSelected ? "default" : "outline"}
        >
          {isSelected ? "Geselecteerd" : "Selecteren"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
