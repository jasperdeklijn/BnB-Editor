"use client"

import { useState } from "react"
import type { BusinessCategory } from "@/lib/business/categories"
import { BUSINESS_CATEGORIES } from "@/lib/business/categories"
import { TEMPLATE_PRESETS } from "./category-presets"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, ChevronRight } from "lucide-react"

interface TemplateSelectorProps {
  onSelect?: (category: BusinessCategory) => void
  onClose?: () => void
}

export function TemplateSelector({ onSelect, onClose }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>(null)

  const handleSelect = (category: BusinessCategory) => {
    setSelectedCategory(category)
    if (onSelect) {
      onSelect(category)
    }
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUSINESS_CATEGORIES.map((category) => {
          const template = TEMPLATE_PRESETS[category.value]
          const isSelected = selectedCategory === category.value

          return (
            <Card
              key={category.value}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? "ring-2 ring-primary bg-secondary" : "hover:shadow-md"
              }`}
              onClick={() => handleSelect(category.value)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{category.label}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                </div>
                {isSelected && (
                  <div className="ml-4 flex-shrink-0">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>

              {template && (
                <div className="mb-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">VOORBEELD DIENSTEN:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.services.slice(0, 3).map((service, idx) => (
                      <span key={idx} className="inline-block px-2 py-1 bg-secondary rounded text-xs text-secondary-foreground">
                        {service.title}
                      </span>
                    ))}
                    {template.services.length > 3 && (
                      <span className="inline-block px-2 py-1 text-xs text-muted-foreground">+{template.services.length - 3} meer</span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {selectedCategory && (
        <div className="mt-8 flex gap-4 justify-end">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Sluiten
            </Button>
          )}
          <Button
            onClick={() => {
              // This will be handled by parent component
              onSelect?.(selectedCategory)
            }}
            className="gap-2"
          >
            Doorgaan <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
