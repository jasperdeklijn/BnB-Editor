import type { BusinessCategory } from "@/lib/business/categories"
import type { Section, Transition } from "@/lib/types"
import type { ReactNode } from "react"

export interface SectionTargetOption {
  label: string
  value: string
}

export interface SectionEditorProps {
  section: Section
  sections: Section[]
  transitions: Transition[]
  websiteId?: string | null
  businessId?: string | null
  businessCategory?: BusinessCategory | null
  sectionTargetOptions: SectionTargetOption[]
  updateField: (field: string, value: any) => void
  updateFields: (values: Record<string, unknown>) => void
  updateListItemField: (field: string, index: number, key: string, value: unknown, fallback?: any[]) => void
  updateNestedListItemField: (
    field: string,
    index: number,
    nestedField: string,
    nestedIndex: number,
    value: unknown,
    fallback?: any[],
  ) => void
  updateStringListItem: (field: string, index: number, value: string, fallback?: string[]) => void
}

export type SectionEditorComponent = (props: SectionEditorProps) => ReactNode
