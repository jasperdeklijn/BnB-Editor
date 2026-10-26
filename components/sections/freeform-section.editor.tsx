"use client"

import { Input } from "@/components/ui/input"
import { SectionElementsEditor } from "@/components/editor/section-elements-editor"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"

export function FreeformSectionEditor({ section, updateField, updateFields, userId }: SectionEditorProps) {
  return <div className="space-y-4"><label className="block space-y-1 text-xs font-medium"><span>Naam van deze sectie</span><Input value={String(section.data.title ?? "")} onChange={(event) => updateField("title", event.target.value)} /></label><SectionElementsEditor data={section.data} onUpdate={updateFields} free userId={userId} /></div>
}
