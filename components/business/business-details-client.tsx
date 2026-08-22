"use client"

import { useState } from "react"
import { updateBusiness, type Business } from "@/lib/supabase/business"
import { BUSINESS_CATEGORIES, type BusinessCategory } from "@/lib/business/categories"
import { Button } from "@/components/ui/button"
import { useEditorLayout } from "@/components/editor/editor-layout-context"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusMessage } from "@/components/ui/status-message"
import {
  MapPin,
  Globe,
  FileText,
  Loader2,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  Clock,
  Link as LinkIcon,
  Briefcase,
} from "lucide-react"

interface BusinessDetailsClientProps {
  initialBusiness: Business
}

export function BusinessDetailsClient({ initialBusiness }: BusinessDetailsClientProps) {
  const [business, setBusiness] = useState<Business>(initialBusiness)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const { setIsSaving: setHeaderSaving, setSaveState } = useEditorLayout()

  const [name, setName] = useState(business.name ?? "")
  const [category, setCategory] = useState<BusinessCategory>(
    (business.category as BusinessCategory) ?? "general_service",
  )
  const [tagline, setTagline] = useState(business.tagline ?? "")
  const [description, setDescription] = useState(business.description ?? "")
  const [street, setStreet] = useState(business.street ?? "")
  const [city, setCity] = useState(business.city ?? "")
  const [postal, setPostal] = useState(business.postal ?? "")
  const [country, setCountry] = useState(business.country ?? "NL")
  const [phone, setPhone] = useState(business.phone ?? "")
  const [chamberOfCommerceNumber, setChamberOfCommerceNumber] = useState(business.chamber_of_commerce_number ?? "")
  const [vatNumber, setVatNumber] = useState(business.vat_number ?? "")
  const [contactEmail, setContactEmail] = useState(business.contact_email ?? "")
  const [whatsapp, setWhatsapp] = useState(business.whatsapp ?? "")
  const [websiteUrl, setWebsiteUrl] = useState(business.website_url ?? "")
  const [openingNote, setOpeningNote] = useState(business.opening_note ?? "")

  const handleCategorySelect = (nextCategory: BusinessCategory) => {
    setCategory(nextCategory)
    window.dispatchEvent(
      new CustomEvent("business-category-change", {
        detail: { category: nextCategory },
      }),
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    setHeaderSaving(true)
    setStatus(null)
    let failed = false
    try {
      const updated = await updateBusiness(business.id, {
        name,
        category,
        tagline: tagline || null,
        description: description || null,
        street: street || null,
        city: city || null,
        postal: postal || null,
        country: country || null,
        phone: phone || null,
        chamber_of_commerce_number: chamberOfCommerceNumber || null,
        vat_number: vatNumber || null,
        contact_email: contactEmail || null,
        whatsapp: whatsapp || null,
        website_url: websiteUrl || null,
        opening_note: openingNote || null,
      })
      setBusiness(updated)
      setStatus({ tone: "success", text: "Gegevens opgeslagen." })
    } catch (err) {
      console.error(err)
      failed = true
      setStatus({ tone: "error", text: "Opslaan mislukt. Probeer het opnieuw." })
    } finally {
      setIsSaving(false)
      setHeaderSaving(false)
      if (failed) setSaveState("error")
    }
  }

  return (
    <EditorPageShell
      title="Bedrijfsgegevens"
      description="Beheer de basisinformatie, contactgegevens en online aanwezigheid van uw bedrijf."
      maxWidth="2xl"
    >
        {status ? <StatusMessage tone={status.tone}>{status.text}</StatusMessage> : null}
        {/* Category */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Type bedrijf</h2>
              <p className="text-xs text-muted-foreground">
                Kies de categorie die het beste bij uw bedrijf past
              </p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BUSINESS_CATEGORIES.map((cat) => {
                const isSelected = category === cat.value
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategorySelect(cat.value)}
                    className={[
                      "flex flex-col gap-0.5 rounded-lg border px-4 py-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/8 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-secondary/40",
                    ].join(" ")}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={[
                        "text-sm font-medium leading-snug",
                        isSelected ? "text-primary" : "text-foreground",
                      ].join(" ")}
                    >
                      {cat.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      {cat.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* General info */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Algemene informatie</h2>
              <p className="text-xs text-muted-foreground">Naam en omschrijving van uw bedrijf</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Bedrijfsnaam
              </Label>
              <Input
                id="name"
                placeholder="Kapper Jan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Tagline
              </Label>
              <Input
                id="tagline"
                placeholder="Vakmanschap op zijn best"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Een korte zin die bezoekers direct vertelt wat u doet
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Beschrijving
              </Label>
              <Textarea
                id="description"
                placeholder="Vertel bezoekers meer over uw bedrijf, werkwijze of aanpak..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary"><FileText className="h-4 w-4" /></div>
            <div>
              <h2 className="font-semibold text-foreground">Registratiegegevens</h2>
              <p className="text-xs text-muted-foreground">Optionele wettelijke bedrijfsnummers</p>
            </div>
          </div>
          <div className="grid gap-5 p-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="chamberOfCommerceNumber">KvK-nummer</Label>
              <Input id="chamberOfCommerceNumber" inputMode="numeric" maxLength={20} value={chamberOfCommerceNumber} onChange={(event) => setChamberOfCommerceNumber(event.target.value)} placeholder="12345678" />
              <p className="text-xs text-muted-foreground">Bij Nederlandse bedrijven: acht cijfers.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatNumber">Btw-nummer</Label>
              <Input id="vatNumber" maxLength={32} value={vatNumber} onChange={(event) => setVatNumber(event.target.value)} placeholder="NL123456789B01" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Adres</h2>
              <p className="text-xs text-muted-foreground">
                Vestigingsadres, ook gebruikt voor Google Maps en lokale SEO
              </p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="street" className="text-sm font-medium">
                Straat en huisnummer
              </Label>
              <Input
                id="street"
                placeholder="Dorpsstraat 12"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">
                  Plaats
                </Label>
                <Input
                  id="city"
                  placeholder="Amsterdam"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal" className="text-sm font-medium">
                  Postcode
                </Label>
                <Input
                  id="postal"
                  placeholder="1234 AB"
                  value={postal}
                  onChange={(e) => setPostal(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Land
              </Label>
              <Input
                id="country"
                placeholder="Nederland"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Contactgegevens</h2>
              <p className="text-xs text-muted-foreground">
                Telefoon, e-mail en WhatsApp — zichtbaar op uw website
              </p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-3.5 w-3.5 text-primary" />
                Telefoonnummer
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+31 6 12345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-3.5 w-3.5 text-primary" />
                E-mailadres
              </Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="info@mijnbedrijf.nl"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Wordt ook gebruikt als ontvangstadres voor contactformulieren
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-3.5 w-3.5 text-primary" />
                WhatsApp-nummer
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+31 6 12345678"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optioneel — laat leeg als u geen WhatsApp-knop wilt
              </p>
            </div>
          </div>
        </div>

        {/* Availability / Opening note */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Beschikbaarheid</h2>
              <p className="text-xs text-muted-foreground">
                Openingstijden of afspraakvenster als vrije tekst
              </p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="openingNote" className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Openingstijden / beschikbaarheid
              </Label>
              <Textarea
                id="openingNote"
                placeholder="Ma – Vr: 09:00–17:00&#10;Za: op afspraak&#10;Zo: gesloten"
                value={openingNote}
                onChange={(e) => setOpeningNote(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Vrij in te vullen — een online boekingsmodule volgt later
              </p>
            </div>
          </div>
        </div>

        {/* Online presence */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <LinkIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Online aanwezigheid</h2>
              <p className="text-xs text-muted-foreground">
                Externe website, boekingslink of contactpagina
              </p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Website, boekings- of contactlink
              </Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://mijnbedrijf.nl/afspraak"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optioneel — verschijnt als extra knop op uw website
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opslaan…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Opslaan
              </>
            )}
          </Button>
        </div>
    </EditorPageShell>
  )
}
