"use client"

import { useState } from "react"
import { TemplateSelector } from "@/components/templates/template-selector"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
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
    <EditorPageShell
      title="Sjablonen"
      description="Kies een startpunt met passende secties en voorbeeldinhoud voor uw bedrijfstype."
      maxWidth="4xl"
    >
      {isLoading && (
        <div className="rounded-xl border border-border bg-white p-4 text-sm text-muted-foreground shadow-sm">
          Sjabloon wordt toegepast...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      <TemplateSelector onSelect={handleSelectTemplate} />
    </EditorPageShell>
  )
}
