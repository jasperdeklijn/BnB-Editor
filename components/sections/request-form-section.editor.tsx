"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Mail, Type } from "lucide-react"
import { TierBadge } from "@/components/editor/tier-badge"
import { planMeetsRequirement } from "@/lib/entitlements"

const requestTypes = [
  { value: "contact", label: "Bericht" },
  { value: "appointment", label: "Afspraak" },
  { value: "quote", label: "Offerte" },
  { value: "whatsapp", label: "WhatsApp" },
] as const

const formFields = [
  { value: "name", label: "Naam" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefoon" },
  { value: "date", label: "Datum" },
  { value: "service", label: "Dienst" },
  { value: "budget", label: "Budget" },
  { value: "message", label: "Bericht" },
] as const

export function RequestFormSectionEditor({ section, updateField, currentPlan }: SectionEditorProps) {
  const currentFields: string[] = (section.data as any).fields || ["name", "email", "phone", "message"]
  const requestType = ((section.data as any).requestType || "contact") as string

  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5" />
        Inhoud
      </Label>
      <div>
        <Label className="text-xs mb-1.5 block">Titel</Label>
        <Input
          placeholder="Stuur een aanvraag"
          value={(section.data as any).title || ""}
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Ondertitel</Label>
        <Input
          placeholder="Vul het formulier in, wij nemen contact op"
          value={(section.data as any).subtitle || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Type aanvraag</Label>
        <div className="grid grid-cols-2 gap-2">
          {requestTypes.map((type) => {
            const isActive = requestType === type.value
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updateField("requestType", type.value)}
                className={`rounded-lg border p-2 text-xs font-medium transition-all ${
                  isActive ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {type.label}
                  {type.value !== "contact" ? <TierBadge plan="silver" className="px-1.5 py-0 text-[9px]" /> : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      {requestType !== "contact" && !planMeetsRequirement(currentPlan, "silver") ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900">
          Dit type aanvraag vereist Silver. Instellen en testen kan nu; live zetten vereist een upgrade.
        </p>
      ) : null}
      {requestType === "whatsapp" ? (
        <div>
          <Label className="text-xs mb-1.5 block">WhatsApp-nummer</Label>
          <Input
            placeholder="31612345678"
            value={(section.data as any).whatsappNumber || ""}
            onChange={(e) => updateField("whatsappNumber", e.target.value)}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">Zonder + of spaties, bijv. 31612345678</p>
        </div>
      ) : null}
      <div>
        <Label className="flex items-center gap-2 text-xs mb-1.5">
          <Mail className="h-3 w-3" />
          Ontvanger e-mail
        </Label>
        <Input
          type="email"
          placeholder="jouw@email.nl"
          value={(section.data as any).recipientEmail || ""}
          onChange={(e) => updateField("recipientEmail", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Formuliervelden</Label>
        <div className="grid grid-cols-2 gap-2">
          {formFields.map((field) => {
            const isActive = currentFields.includes(field.value)
            return (
              <button
                key={field.value}
                type="button"
                onClick={() => {
                  const next = isActive
                    ? currentFields.filter((value) => value !== field.value)
                    : [...currentFields, field.value]
                  updateField("fields", next)
                }}
                className={`rounded-lg border p-2 text-xs font-medium transition-all ${
                  isActive ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 opacity-50"
                }`}
              >
                {field.label}
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
