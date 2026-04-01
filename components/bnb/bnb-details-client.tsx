"use client"

import { useState } from "react"
import { updateBnb, type BnbDetails } from "@/lib/supabase/bnb"
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
  initialBnb: BnbDetails
}

export function BnbDetailsClient({ initialBnb }: BnbDetailsClientProps) {
  const [bnb, setBnb] = useState<BnbDetails>(initialBnb)
  const [isSaving, setIsSaving] = useState(false)

  // Local form state
  const [name, setName] = useState(bnb.name ?? "")
  const [tagline, setTagline] = useState(bnb.tagline ?? "")
  const [addressLine1, setAddressLine1] = useState(bnb.address_line1 ?? "")
  const [addressLine2, setAddressLine2] = useState(bnb.address_line2 ?? "")
  const [city, setCity] = useState(bnb.city ?? "")
  const [state, setState] = useState(bnb.state ?? "")
  const [postalCode, setPostalCode] = useState(bnb.postal_code ?? "")
  const [country, setCountry] = useState(bnb.country ?? "")
  const [checkInTime, setCheckInTime] = useState(bnb.check_in_time ?? "15:00")
  const [checkOutTime, setCheckOutTime] = useState(bnb.check_out_time ?? "11:00")
  const [maxGuests, setMaxGuests] = useState(bnb.max_guests?.toString() ?? "")
  const [languages, setLanguages] = useState(bnb.languages?.join(", ") ?? "")
  const [bookingUrl, setBookingUrl] = useState(bnb.booking_url ?? "")

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const updated = await updateBnb(bnb.id, {
        name,
        tagline: tagline || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: state || null,
        postal_code: postalCode || null,
        country: country || null,
        check_in_time: checkInTime || null,
        check_out_time: checkOutTime || null,
        max_guests: maxGuests ? parseInt(maxGuests, 10) : null,
        languages: languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        booking_url: bookingUrl || null,
      })
      setBnb(updated)
      toast.success("BnB details saved")
    } catch (err) {
      console.error(err)
      toast.error("Failed to save BnB details")
    } finally {
      setIsSaving(false)
    }
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
              <p className="text-xs text-muted-foreground">Your property name and tagline</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                <Home className="h-3.5 w-3.5 text-primary" />
                Property Name
              </Label>
              <Input
                id="name"
                placeholder="Sunset Villa BnB"
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
                placeholder="Your home away from home"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
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
              <Label htmlFor="addressLine1" className="text-sm font-medium">
                Street Address
              </Label>
              <Input
                id="addressLine1"
                placeholder="123 Harbour Lane"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2" className="text-sm font-medium">
                Address Line 2
              </Label>
              <Input
                id="addressLine2"
                placeholder="Apt, suite, floor (optional)"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">
                  City
                </Label>
                <Input
                  id="city"
                  placeholder="Amsterdam"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium">
                  State / Province
                </Label>
                <Input
                  id="state"
                  placeholder="North Holland"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-sm font-medium">
                  Postal Code
                </Label>
                <Input
                  id="postalCode"
                  placeholder="1234 AB"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
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
                <Label htmlFor="checkInTime" className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Check-in Time
                </Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutTime" className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  Check-out Time
                </Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
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
              <Label htmlFor="bookingUrl" className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Booking / Website URL
              </Label>
              <Input
                id="bookingUrl"
                type="url"
                placeholder="https://yourbooking.com"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
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
