"use client"

import { useState } from "react"
import { updateBusiness, type Business } from "@/lib/supabase/business"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  MapPin,
  Clock,
  Users,
  Globe,
  Languages,
  FileText,
  Loader2,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
} from "lucide-react"
import Link from "next/link"

interface BusinessDetailsClientProps {
  initialBusiness: Business
}

export function BusinessDetailsClient({ initialBusiness }: BusinessDetailsClientProps) {
  const [business, setBusiness] = useState<Business>(initialBusiness)
  const [isSaving, setIsSaving] = useState(false)

  const [name, setName] = useState(business.name ?? "")
  const [tagline, setTagline] = useState(business.tagline ?? "")
  const [description, setDescription] = useState(business.description ?? "")
  const [street, setStreet] = useState(business.street ?? "")
  const [city, setCity] = useState(business.city ?? "")
  const [postal, setPostal] = useState(business.postal ?? "")
  const [country, setCountry] = useState(business.country ?? "")
  const [phone, setPhone] = useState(business.phone ?? "")
  const [contactEmail, setContactEmail] = useState(business.contact_email ?? "")
  const [whatsapp, setWhatsapp] = useState(business.whatsapp ?? "")
  const [websiteUrl, setWebsiteUrl] = useState(business.website_url ?? "")
  const [languages, setLanguages] = useState(business.languages ?? "")

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updated = await updateBusiness(business.id, {
        name,
        tagline: tagline || null,
        description: description || null,
        street: street || null,
        city: city || null,
        postal: postal || null,
        country: country || null,
        phone: phone || null,
        contact_email: contactEmail || null,
        whatsapp: whatsapp || null,
        website_url: websiteUrl || null,
        languages: languages || null,
      })
      setBusiness(updated)
      toast.success("Bedrijfsgegevens opgeslagen")
    } catch (err) {
      console.error(err)
      toast.error("Opslaan mislukt")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10 md:px-8 space-y-6">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Beschrijving
              </Label>
              <Textarea
                id="description"
                placeholder="Vertel bezoekers over uw bedrijf..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
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
              <p className="text-xs text-muted-foreground">Waar is uw bedrijf gevestigd?</p>
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
              <p className="text-xs text-muted-foreground">Telefoon, e-mail en WhatsApp</p>
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
            </div>
          </div>
        </div>

        {/* Extra */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <Languages className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Talen &amp; website</h2>
              <p className="text-xs text-muted-foreground">Gesproken talen en externe website</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="languages" className="flex items-center gap-2 text-sm font-medium">
                <Languages className="h-3.5 w-3.5 text-primary" />
                Gesproken talen
              </Label>
              <Input
                id="languages"
                placeholder="Nederlands, Engels"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Kommagescheiden</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Website of boekings-URL
              </Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://mijnbedrijf.nl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/editor">Annuleren</Link>
          </Button>
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
      </main>
    </div>
  )
}
