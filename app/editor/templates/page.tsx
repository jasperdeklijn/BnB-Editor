"use client"

import { useState } from "react"
import { TemplateSelector } from "@/components/templates/template-selector"
import type { BusinessCategory } from "@/lib/business/categories"
import { useRouter } from "next/navigation"

export default function TemplatesPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectTemplate = async (category: BusinessCategory) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Template toepassen is mislukt")
      }

      router.push("/editor")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Template toepassen is mislukt"
      setError(message)
      console.error("Failed to apply template:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      {isLoading && (
        <div className="mx-auto mb-6 max-w-4xl rounded-lg border bg-white p-4 text-sm text-muted-foreground shadow-sm">
          Sjabloon wordt toegepast...
        </div>
      )}
      {error && (
        <div className="mx-auto mb-6 max-w-4xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      <TemplateSelector onSelect={handleSelectTemplate} />
    </div>
  )
}
