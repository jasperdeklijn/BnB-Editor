"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BUSINESS_CATEGORIES } from "@/lib/business/categories"
import { createCroppedImagePreview, MAX_USER_IMAGE_SIZE } from "@/lib/user-images"

export function TransferRequestForm({ remaining }: { remaining: number }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [logoId, setLogoId] = useState<string | null>(null)
  const [id] = useState(() => crypto.randomUUID())
  const router = useRouter()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("")
    const form = new FormData(event.currentTarget)
    try {
      let imageId = logoId
      const file = form.get("logo")
      if (file instanceof File && file.size && !imageId) {
        if (file.size > MAX_USER_IMAGE_SIZE) throw new Error("Het logo mag maximaal 5 MB zijn.")
        const preview = await createCroppedImagePreview(file)
        const upload = new FormData(); upload.set("original", file); upload.set("preview", new File([preview], "preview.webp", { type: "image/webp" }))
        const response = await fetch("/api/images/upload", { method: "POST", body: upload })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Logo uploaden is mislukt.")
        imageId = result.id; setLogoId(imageId)
      }
      const fields = ["source_url", "business_name", "business_type", "services", "city", "service_area", "primary_goal", "appearance", "preferred_colors", "preserve_notes", "customer_notes"]
      const payload = Object.fromEntries(fields.map((key) => [key, String(form.get(key) || "")]))
      const response = await fetch("/api/flexstart", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id, logo_image_id: imageId, permission: form.get("permission") === "on" }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Aanvragen is mislukt.")
      router.push(`/editor/flexstart?request=${result.id}`); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Aanvragen is mislukt.") }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
    <div><h2 className="text-lg font-semibold">Bestaande website overnemen</h2>
      <p className="mt-2 text-sm text-muted-foreground">De eerste 100 klanten krijgen FlexStart gratis, met één correctieronde. Eén aanvraag per klantaccount. Nog {remaining} {remaining === 1 ? "plek" : "plekken"}; je plek wordt bij aanvragen vastgelegd.</p>
      <p className="mt-2 text-sm text-muted-foreground">Je websitepakket en eventuele domeinkosten vallen buiten deze gratis overstapservice. Toestemming voor een klantcase is niet verplicht.</p></div>
    <fieldset disabled={busy || remaining === 0} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-medium sm:col-span-2">Huidige website-URL<Input name="source_url" type="url" required maxLength={2000} placeholder="https://jouwbedrijf.nl" /></label>
      <label className="space-y-2 text-sm font-medium">Bedrijfsnaam<Input name="business_name" required maxLength={160} /></label>
      <label className="space-y-2 text-sm font-medium">Branche<select name="business_type" className="h-10 w-full rounded-md border bg-background px-3">{BUSINESS_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <label className="space-y-2 text-sm font-medium sm:col-span-2">Belangrijkste diensten<Textarea name="services" required maxLength={3000} /></label>
      <label className="space-y-2 text-sm font-medium">Plaats<Input name="city" required maxLength={160} /></label>
      <label className="space-y-2 text-sm font-medium">Werkgebied<Input name="service_area" required maxLength={1000} placeholder="Bijvoorbeeld Utrecht en omgeving" /></label>
      <label className="space-y-2 text-sm font-medium">Belangrijkste doel<select name="primary_goal" className="h-10 w-full rounded-md border bg-background px-3"><option value="requests">Aanvragen ontvangen</option><option value="calls">Gebeld worden</option><option value="bookings">Boekingen ontvangen</option></select></label>
      <label className="space-y-2 text-sm font-medium">Gewenste kleuren (optioneel)<Input name="preferred_colors" maxLength={500} placeholder="Bijvoorbeeld donkergroen en crème" /></label>
      <label className="space-y-2 text-sm font-medium">Gewenste uitstraling (optioneel)<Textarea name="appearance" maxLength={2000} placeholder="Rustig, persoonlijk, zakelijk…" /></label>
      <label className="space-y-2 text-sm font-medium">Logo (optioneel, maximaal 5 MB)<Input name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={() => setLogoId(null)} /></label>
      <label className="space-y-2 text-sm font-medium sm:col-span-2">Wat moet behouden blijven? (optioneel)<Textarea name="preserve_notes" maxLength={3000} /></label>
      <label className="space-y-2 text-sm font-medium sm:col-span-2">Opmerkingen (optioneel)<Textarea name="customer_notes" maxLength={4000} /></label>
      <label className="flex items-start gap-3 text-sm sm:col-span-2"><input name="permission" type="checkbox" required className="mt-1 h-4 w-4 shrink-0" />Ik ben eigenaar of heb toestemming om de teksten en afbeeldingen van deze website over te nemen.</label>
      <Button type="submit" className="sm:col-span-2">{busy ? "Aanvraag versturen…" : "Gratis overstap aanvragen"}</Button>
    </fieldset>
    {remaining === 0 && <p role="status" className="text-sm">Alle 100 gratis plekken zijn bezet. Je kunt momenteel geen nieuwe gratis aanvraag indienen.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
