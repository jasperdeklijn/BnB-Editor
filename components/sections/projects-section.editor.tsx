"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SectionImagePicker } from "@/components/editor/section-image-picker"
import { SectionLinkSelect } from "@/components/editor/section-link-select"
import { RepeatingItemActions, moveRepeatingItem } from "@/components/editor/repeating-item-actions"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { createProject, readProjects, type ProjectItem } from "@/lib/projects"

export function ProjectsSectionEditor({ section, updateField, userId, sectionTargetOptions }: SectionEditorProps) {
  const projects = readProjects(section.data.projects)
  const save = (next: ProjectItem[]) => updateField("projects", next)
  const update = (index: number, patch: Partial<ProjectItem>) => save(projects.map((project, current) => current === index ? { ...project, ...patch } : project))
  return <div className="space-y-4">
    <label className="block space-y-1 text-xs font-medium"><span>Sectietitel</span><Input value={String(section.data.title ?? "")} maxLength={200} onChange={(event) => updateField("title", event.target.value)} /></label>
    <label className="block space-y-1 text-xs font-medium"><span>Introductie</span><Textarea value={String(section.data.subtitle ?? "")} maxLength={1000} onChange={(event) => updateField("subtitle", event.target.value)} /></label>
    {projects.map((project, index) => <details key={project.id} open={projects.length === 1 || undefined} className="rounded-lg border border-border bg-background p-3">
      <summary className="cursor-pointer text-sm font-semibold">{project.title || `Project ${index + 1}`}</summary>
      <div className="mt-3 space-y-3">
        <RepeatingItemActions itemLabel={`Project ${index + 1}`} index={index} count={projects.length} onMove={(direction) => save(moveRepeatingItem(projects, index, direction))} onDuplicate={() => save([...projects.slice(0, index + 1), { ...project, id: crypto.randomUUID() }, ...projects.slice(index + 1)])} onDelete={() => save(projects.filter((_, current) => current !== index))} />
        <label className="block space-y-1 text-xs font-medium"><span>Projectnaam</span><Input value={project.title} maxLength={200} onChange={(event) => update(index, { title: event.target.value })} /></label>
        <label className="block space-y-1 text-xs font-medium"><span>Beschrijving</span><Textarea value={project.description} maxLength={5000} onChange={(event) => update(index, { description: event.target.value })} /></label>
        {userId ? <SectionImagePicker userId={userId} label={`Foto voor ${project.title || "project"}`} value={project.image} onSelect={(image) => update(index, { image })} /> : null}
        <label className="block space-y-1 text-xs font-medium"><span>Afbeeldingsadres</span><Input value={project.image} placeholder="https://…" onChange={(event) => update(index, { image: event.target.value })} /></label>
        {project.image ? <Button type="button" variant="ghost" size="sm" onClick={() => update(index, { image: "", imageAlt: "" })}>Foto verwijderen</Button> : null}
        <label className="block space-y-1 text-xs font-medium"><span>Beschrijving van de foto</span><Input value={project.imageAlt} maxLength={500} onChange={(event) => update(index, { imageAlt: event.target.value })} /></label>
        <label className="block space-y-1 text-xs font-medium"><span>Categorie (optioneel)</span><Input value={project.category} placeholder="Bijvoorbeeld renovatie" maxLength={100} onChange={(event) => update(index, { category: event.target.value })} /></label>
        <label className="block space-y-1 text-xs font-medium"><span>Plaats (optioneel)</span><Input value={project.location} maxLength={100} onChange={(event) => update(index, { location: event.target.value })} /></label>
        <label className="block space-y-1 text-xs font-medium"><span>Jaartal (optioneel)</span><Input value={project.year} maxLength={40} placeholder="Bijvoorbeeld 2026" onChange={(event) => update(index, { year: event.target.value })} /></label>
        <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={project.ctaEnabled} onChange={(event) => update(index, { ctaEnabled: event.target.checked })} />Knop naar project tonen</label>
        {project.ctaEnabled ? <div className="space-y-2">
          <label className="block space-y-1 text-xs font-medium"><span>Knoptekst</span><Input value={project.ctaText} placeholder="Bekijk project" maxLength={100} onChange={(event) => update(index, { ctaText: event.target.value })} /></label>
          <SectionLinkSelect value={project.ctaHref} onChange={(ctaHref) => update(index, { ctaHref })} options={sectionTargetOptions} ariaLabel={`Bestemming van project ${index + 1}`} />
        </div> : null}
      </div>
    </details>)}
    {!projects.length ? <p className="text-xs text-muted-foreground">Voeg uw eerste project toe en kies een foto uit de beeldbank.</p> : null}
    <Button type="button" variant="outline" className="w-full" onClick={() => save([...projects, createProject(crypto.randomUUID())])}><Plus className="h-4 w-4" />Project toevoegen</Button>
    <p className="text-xs text-muted-foreground">Kies bij Indeling hoe uw projecten worden weergegeven. Zonder link blijft een project een presentatie op deze pagina.</p>
  </div>
}
