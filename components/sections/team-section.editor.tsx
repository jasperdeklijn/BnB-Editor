"use client"

import { ImageIcon, Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RepeatingItemActions, moveRepeatingItem } from "@/components/editor/repeating-item-actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import type { TeamMember } from "@/components/sections/team-section"

const starterMembers: TeamMember[] = [
  { id: "member-1", name: "Sanne de Vries", title: "Oprichter", bio: "Vertel kort wat dit teamlid doet en waar diegene goed in is.", image: "" },
  { id: "member-2", name: "Noah Jansen", title: "Specialist", bio: "Een korte, persoonlijke introductie maakt je team herkenbaar.", image: "" },
]

export function TeamSectionEditor({ section, updateField }: SectionEditorProps) {
  const members = Array.isArray(section.data.members) ? (section.data.members as TeamMember[]) : starterMembers
  const saveMembers = (next: TeamMember[]) => updateField("members", next)
  const updateMember = (index: number, values: Partial<TeamMember>) => saveMembers(members.map((member, memberIndex) => memberIndex === index ? { ...member, ...values } : member))
  const duplicateMember = (index: number) => {
    const copy = { ...members[index], id: `member-${Date.now()}` }
    saveMembers([...members.slice(0, index + 1), copy, ...members.slice(index + 1)])
  }

  return (
    <Card className="space-y-4 p-4">
      <Label className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />Team</Label>
      <Input placeholder="Maak kennis met ons team" value={(section.data.title as string) || ""} onChange={(event) => updateField("title", event.target.value)} />
      <Input placeholder="De mensen achter ons bedrijf" value={(section.data.subtitle as string) || ""} onChange={(event) => updateField("subtitle", event.target.value)} />

      <div className="space-y-3">
        {members.map((member, index) => (
          <div key={member.id ?? index} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">Teamlid {index + 1}</span>
              <RepeatingItemActions itemLabel={`Teamlid ${index + 1}`} index={index} count={members.length} onMove={(direction) => saveMembers(moveRepeatingItem(members, index, direction))} onDuplicate={() => duplicateMember(index)} onDelete={() => saveMembers(members.filter((_, memberIndex) => memberIndex !== index))} />
            </div>
            <Input placeholder="Naam" value={member.name || ""} onChange={(event) => updateMember(index, { name: event.target.value })} />
            <Input placeholder="Functie of titel" value={member.title || ""} onChange={(event) => updateMember(index, { title: event.target.value })} />
            <textarea placeholder="Korte introductie" value={member.bio || ""} onChange={(event) => updateMember(index, { bio: event.target.value })} className="min-h-20 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm" />
            <div>
              <Label className="mb-1.5 flex items-center gap-1 text-xs"><ImageIcon className="h-3 w-3" />Afbeeldingslink</Label>
              <Input placeholder="https://..." value={member.image || ""} onChange={(event) => updateMember(index, { image: event.target.value })} />
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={() => saveMembers([...members, { id: `member-${Date.now()}`, name: "Nieuw teamlid", title: "", bio: "", image: "" }])}><Plus className="mr-2 h-4 w-4" />Teamlid toevoegen</Button>
      <p className="text-xs text-muted-foreground">Voeg zoveel teamleden toe als nodig. Kies bovenaan bij Indeling een andere weergave.</p>
    </Card>
  )
}
