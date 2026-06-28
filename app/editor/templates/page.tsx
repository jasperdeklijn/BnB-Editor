"use client"

import { useState } from "react"
import { TemplateSelector } from "@/components/templates/template-selector"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { useEditorLayout } from "@/components/editor/editor-layout-context"
import { StatusMessage } from "@/components/ui/status-message"
import type { BusinessCategory } from "@/lib/business/categories"
import { useRouter } from "next/navigation"

export default function TemplatesPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setIsSaving, setSaveState } = useEditorLayout()

  const handleSelectTemplate = async (category: BusinessCategory) => {
    setIsLoading(true)
    setIsSaving(true)
    setError(null)
    let failed = false

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
      failed = true
      const message = error instanceof Error ? error.message : "Template toepassen is mislukt"
      setError(message)
      console.error("Failed to apply template:", error)
    } finally {
      setIsLoading(false)
      setIsSaving(false)
      if (failed) setSaveState("error")
    }
  }

  return (
    <EditorPageShell
      title="Sjablonen"
      description="Kies een startpunt met passende secties en voorbeeldinhoud voor uw bedrijfstype."
      maxWidth="4xl"
    >
      {isLoading && (
        <StatusMessage tone="info">Sjabloon wordt toegepast...</StatusMessage>
      )}
      {error && (
        <StatusMessage tone="error">{error}</StatusMessage>
      )}
      <TemplateSelector onSelect={handleSelectTemplate} />
    </EditorPageShell>
  )
}
