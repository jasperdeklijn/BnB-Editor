"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { LeadAgentSettings } from "@/lib/leads/types"

function lines(values: string[]) {
  return values.join("\n")
}

function parseLines(value: string) {
  return value
    .split(/[\n,;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function LeadAgentSettingsForm({ initialSettings }: { initialSettings: LeadAgentSettings }) {
  const [enabled, setEnabled] = useState(initialSettings.enabled)
  const [cities, setCities] = useState(lines(initialSettings.cities))
  const [categories, setCategories] = useState(lines(initialSettings.categories))
  const [weeklyLimit, setWeeklyLimit] = useState(initialSettings.weekly_limit)
  const [emailEnabled, setEmailEnabled] = useState(initialSettings.email_notifications_enabled)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch("/api/admin/leads/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          cities: parseLines(cities),
          categories: parseLines(categories),
          weeklyLimit,
          emailNotificationsEnabled: emailEnabled,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Instellingen opslaan is mislukt.")
      setCities(lines(data.settings.cities))
      setCategories(lines(data.settings.categories))
      setMessage("Automatiseringsinstellingen opgeslagen.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Instellingen opslaan is mislukt.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <label className="flex items-start justify-between gap-6">
          <span>
            <span className="block font-semibold">Wekelijkse lead-agent</span>
            <span className="mt-1 block text-sm text-muted-foreground">Voer iedere maandag om 09:00 uur Nederlandse tijd automatisch één zoekronde uit.</span>
          </span>
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="mt-1 h-5 w-5 accent-primary" />
        </label>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <label htmlFor="lead-cities" className="font-semibold">Plaatsen</label>
          <p className="mt-1 text-sm text-muted-foreground">Eén plaats per regel, maximaal 25.</p>
          <Textarea id="lead-cities" value={cities} onChange={(event) => setCities(event.target.value)} required className="mt-3 min-h-52 border-border bg-muted text-foreground" />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <label htmlFor="lead-categories" className="font-semibold">Branches</label>
          <p className="mt-1 text-sm text-muted-foreground">Eén branche per regel, maximaal 25.</p>
          <Textarea id="lead-categories" value={categories} onChange={(event) => setCategories(event.target.value)} required className="mt-3 min-h-52 border-border bg-muted text-foreground" />
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="font-semibold">Maximaal nieuwe leads per week</span>
            <span className="block text-sm text-muted-foreground">Instelbaar van 1 tot 25. Handmatig gevonden nieuwe leads tellen mee voor deze weeklimiet.</span>
            <Input type="number" min={1} max={25} value={weeklyLimit} onChange={(event) => setWeeklyLimit(Number(event.target.value))} className="max-w-32 border-border bg-muted text-foreground" />
          </label>
          <label className="flex items-start justify-between gap-6 rounded-xl border border-border bg-muted p-4">
            <span>
              <span className="block font-semibold">E-mailnotificatie</span>
              <span className="mt-1 block text-sm text-muted-foreground">Stuur na de run een samenvatting naar de adressen in <code>ADMIN_EMAILS</code>. Leads ontvangen nooit e-mail.</span>
            </span>
            <input type="checkbox" checked={emailEnabled} onChange={(event) => setEmailEnabled(event.target.checked)} className="mt-1 h-5 w-5 accent-primary" />
          </label>
        </div>
      </section>

      {error && <p role="alert" className="rounded-lg border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
        {saving ? <Loader2 className="animate-spin" /> : <Check />}
        {saving ? "Opslaan…" : "Instellingen opslaan"}
      </Button>
    </form>
  )
}
