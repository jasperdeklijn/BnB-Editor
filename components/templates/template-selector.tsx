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
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Kies uw bedrijfstype</h1>
        <p className="text-gray-600">
          Selecteer het bedrijfstype dat het beste bij u past. We zorgen voor een sjabloon met relevante secties en content.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUSINESS_CATEGORIES.map((category) => {
          const template = TEMPLATE_PRESETS[category.value]
          const isSelected = selectedCategory === category.value

          return (
            <Card
              key={category.value}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:shadow-md"
              }`}
              onClick={() => handleSelect(category.value)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{category.label}</h3>
                  <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                </div>
                {isSelected && (
                  <div className="ml-4 flex-shrink-0">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>

              {template && (
                <div className="mb-4 pt-4 border-t">
                  <p className="text-xs font-medium text-gray-500 mb-2">VOORBEELD DIENSTEN:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.services.slice(0, 3).map((service, idx) => (
                      <span key={idx} className="inline-block px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                        {service.title}
                      </span>
                    ))}
                    {template.services.length > 3 && (
                      <span className="inline-block px-2 py-1 text-xs text-gray-600">+{template.services.length - 3} meer</span>
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
