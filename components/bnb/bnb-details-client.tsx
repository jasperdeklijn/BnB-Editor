"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  ArrowLeft,
  Home,
  MapPin,
  Clock,
  Users,
  Globe,
  Languages,
  FileText,
  Loader2,
  CheckCircle2,
  Building2,
} from "lucide-react"
import Link from "next/link"

interface BnbDetailsClientProps {
  userId: string
  initialMeta: Record<string, unknown>
}

type BnbDetails = {
  bnb_name: string
  bnb_tagline: string
  bnb_description: string
  bnb_street: string
  bnb_city: string
  bnb_postal: string
  bnb_country: string
  bnb_checkin: string
  bnb_checkout: string
  bnb_max_guests: string
  bnb_languages: string
  bnb_website: string
}

export function BnbDetailsClient({ userId, initialMeta }: BnbDetailsClientProps) {
  const meta = initialMeta as Partial<BnbDetails>

  const [bnbName, setBnbName] = useState(meta.bnb_name ?? "")
  const [tagline, setTagline] = useState(meta.bnb_tagline ?? "")
  const [description, setDescription] = useState(meta.bnb_description ?? "")
  const [street, setStreet] = useState(meta.bnb_street ?? "")
  const [city, setCity] = useState(meta.bnb_city ?? "")
  const [postal, setPostal] = useState(meta.bnb_postal ?? "")
  const [country, setCountry] = useState(meta.bnb_country ?? "")
  const [checkin, setCheckin] = useState(meta.bnb_checkin ?? "15:00")
  const [checkout, setCheckout] = useState(meta.bnb_checkout ?? "11:00")
  const [maxGuests, setMaxGuests] = useState(meta.bnb_max_guests ?? "")
  const [languages, setLanguages] = useState(meta.bnb_languages ?? "")
  const [website, setWebsite] = useState(meta.bnb_website ?? "")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      data: {
        bnb_name: bnbName,
        bnb_tagline: tagline,
        bnb_description: description,
        bnb_street: street,
        bnb_city: city,
        bnb_postal: postal,
        bnb_country: country,
        bnb_checkin: checkin,
        bnb_checkout: checkout,
        bnb_max_guests: maxGuests,
        bnb_languages: languages,
        bnb_website: website,
      },
    })

    setIsSaving(false)

    if (error) {
      toast.error("Failed to save BnB details")
      return
    }

    toast.success("BnB details saved")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-4 border-b border-border bg-[var(--editor-header)] px-4 py-3 md:px-8">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-[var(--editor-header-fg)]/80 hover:bg-[var(--editor-header-fg)]/10 hover:text-[var(--editor-header-fg)]"
        >
          <Link href="/editor">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editor
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-[var(--editor-header-fg)]" />
          <h1 className="text-lg font-semibold text-[var(--editor-header-fg)]">BnB Details</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 md:px-8 space-y-6">

        {/* General info card */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">General Information</h2>
              <p className="text-xs text-muted-foreground">Your property name and description</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="bnbName" className="flex items-center gap-2 text-sm font-medium">
                <Home className="h-3.5 w-3.5 text-primary" />
                Property Name
              </Label>
              <Input
                id="bnbName"
                placeholder="Sunset Villa BnB"
                value={bnbName}
                onChange={(e) => setBnbName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Tagline
              </Label>
              <Input
                id="tagline"
                placeholder="Your home away from home"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Tell guests what makes your BnB special..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {/* Address card */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Address</h2>
              <p className="text-xs text-muted-foreground">Where is your property located?</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="street" className="text-sm font-medium">Street Address</Label>
              <Input
                id="street"
                placeholder="123 Harbour Lane"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">City</Label>
                <Input
                  id="city"
                  placeholder="Amsterdam"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal" className="text-sm font-medium">Postal Code</Label>
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
                Country
              </Label>
              <Input
                id="country"
                placeholder="Netherlands"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Policies card */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Policies &amp; Capacity</h2>
              <p className="text-xs text-muted-foreground">Check-in times and guest limits</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkin" className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Check-in Time
                </Label>
                <Input
                  id="checkin"
                  type="time"
                  value={checkin}
                  onChange={(e) => setCheckin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout" className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  Check-out Time
                </Label>
                <Input
                  id="checkout"
                  type="time"
                  value={checkout}
                  onChange={(e) => setCheckout(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxGuests" className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-3.5 w-3.5 text-primary" />
                Maximum Guests
              </Label>
              <Input
                id="maxGuests"
                type="number"
                min="1"
                placeholder="8"
                value={maxGuests}
                onChange={(e) => setMaxGuests(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
        </div>

        {/* Contact & languages card */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <Languages className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Languages &amp; Booking</h2>
              <p className="text-xs text-muted-foreground">Languages spoken and booking link</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="languages" className="flex items-center gap-2 text-sm font-medium">
                <Languages className="h-3.5 w-3.5 text-primary" />
                Languages Spoken
              </Label>
              <Input
                id="languages"
                placeholder="English, Dutch, French"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate with commas</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Booking / Website URL
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourbooking.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/editor">Cancel</Link>
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Save Details
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
