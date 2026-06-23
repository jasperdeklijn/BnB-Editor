"use client"

import { useState } from "react"
import { TemplateSelector } from "@/components/templates/template-selector"
import type { BusinessCategory } from "@/lib/business/categories"
import { useRouter } from "next/navigation"

export default function TemplatesPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectTemplate = async (category: BusinessCategory) => {
    setIsLoading(true)

    try {
      // The actual template application logic would be here
      // For now, just redirect to the main editor
      // In a full implementation, this would:
      // 1. Create or update the business with the category
      // 2. Generate sections from the template
      // 3. Create demo services
      // 4. Populate the website with the template sections
      // 5. Redirect to the editor

      // Temporary redirect - the actual integration would happen via an API route
      router.push("/editor")
    } catch (error) {
      console.error("Failed to apply template:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <TemplateSelector onSelect={handleSelectTemplate} />
    </div>
  )
}
