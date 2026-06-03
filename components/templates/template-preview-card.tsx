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
    <Card className={`overflow-hidden transition-all ${isSelected ? "ring-2 ring-blue-500" : ""}`}>
      {/* Header with template name */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-50 p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
      </div>

      {/* Business info preview */}
      <div className="p-4 border-b bg-white">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bedrijfsgegevens</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{template.businessDefaults.name}</p>
            <p className="text-xs text-gray-600">{template.businessDefaults.tagline}</p>
          </div>
        </div>
      </div>

      {/* Services preview */}
      <div className="p-4 border-b bg-gray-50">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Voorbeeld diensten</p>
        <div className="space-y-2">
          {template.services.slice(0, 3).map((service, idx) => (
            <div key={idx} className="text-sm">
              <p className="font-medium text-gray-900">{service.title}</p>
              <p className="text-xs text-gray-600">{service.description}</p>
              {service.price && <p className="text-xs font-semibold text-gray-700 mt-0.5">{service.price}</p>}
            </div>
          ))}
          {template.services.length > 3 && (
            <p className="text-xs text-gray-600 font-medium pt-2">
              +{template.services.length - 3} meer diensten
            </p>
          )}
        </div>
      </div>

      {/* Sections preview */}
      <div className="p-4 border-b bg-white">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Pagina secties</p>
        <div className="flex flex-wrap gap-1">
          {template.sections.map((section, idx) => (
            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-medium">
              {section.type}
            </span>
          ))}
        </div>
      </div>

      {/* Action button */}
      <div className="p-4 bg-gray-50">
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
