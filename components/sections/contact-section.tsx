"use client"

import type React from "react"
import { useState } from "react"
import { Mail, MapPin, Phone, Send, CheckCircle, AlertCircle, MessageSquare, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { normalizeSectionLayout } from "@/lib/section-layouts"

export type ContactLayout =
  | "classic"
  | "split"
  | "minimal"
  | "card"
  | "fullwidth"
  | "centered"

const contactLayoutMap = {
  classic: "classic",
  split: "split",
  showcase: "fullwidth",
  compact: "minimal",
  card: "card",
  banner: "centered",
} as const

interface ContactSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

type ContactLayoutProps = {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

interface FormState {
  name: string
  email: string
  phone: string
  message: string
  company: string
}

function useContactForm(recipientEmail?: string, businessId?: string, websiteId?: string) {
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "", message: "", company: "" })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, recipientEmail, businessId, websiteId, requestType: "contact", source: "contact_section" }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error || "Er is een fout opgetreden.")
        setStatus("error")
      } else {
        setStatus("success")
        setForm({ name: "", email: "", phone: "", message: "", company: "" })
      }
    } catch {
      setErrorMsg("Er is een fout opgetreden. Probeer het opnieuw.")
      setStatus("error")
    }
  }

  return { form, update, submit, status, errorMsg }
}

// ─── Shared Form Fields ───────────────────────────────────────────────────────

interface ContactFormProps {
  recipientEmail?: string
  businessId?: string
  websiteId?: string
  accentColor?: string
  buttonLabel?: string
  compact?: boolean
}

function ContactForm({ recipientEmail, businessId, websiteId, accentColor, buttonLabel = "Verstuur bericht", compact }: ContactFormProps) {
  const { form, update, submit, status, errorMsg } = useContactForm(recipientEmail, businessId, websiteId)

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle className="h-10 w-10 text-green-500" />
        <p className="font-semibold">Bericht verzonden!</p>
        <p className="text-sm text-muted-foreground">We nemen zo snel mogelijk contact met je op.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="contact-company">Bedrijf</Label>
        <Input
          id="contact-company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={form.company}
          onChange={(e) => update("company", e.target.value)}
        />
      </div>
      <div className={`grid gap-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">Naam *</Label>
          <Input
            id="contact-name"
            placeholder="Jouw naam"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">E-mail *</Label>
          <Input
            id="contact-email"
            type="email"
            placeholder="jouw@email.nl"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            maxLength={254}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-phone">Telefoonnummer</Label>
        <Input
          id="contact-phone"
          type="tel"
          placeholder="+31 6 00000000"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          maxLength={40}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Bericht *</Label>
        <Textarea
          id="contact-message"
          placeholder="Schrijf je bericht hier..."
          rows={compact ? 3 : 4}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          maxLength={3000}
          required
        />
      </div>
      {status === "error" && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}
      <Button
        type="submit"
        disabled={status === "loading"}
        className="w-full"
        style={accentColor ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
      >
        {status === "loading" ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Verzenden...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {buttonLabel}
          </span>
        )}
      </Button>
    </form>
  )
}

// ─── Info Block ───────────────────────────────────────────────────────────────

function InfoBlock({ address, phone, email, textStyle }: { address?: string; phone?: string; email?: string; textStyle?: React.CSSProperties }) {
  return (
    <div className="space-y-5">
      {address && (
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
            <MapPin className="h-4 w-4 text-amber-700" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700" style={textStyle}>Adres</p>
            <p className="mt-0.5 text-sm" style={textStyle}>{address}</p>
          </div>
        </div>
      )}
      {phone && (
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Phone className="h-4 w-4 text-amber-700" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700" style={textStyle}>Telefoon</p>
            <p className="mt-0.5 text-sm" style={textStyle}>{phone}</p>
          </div>
        </div>
      )}
      {email && (
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Mail className="h-4 w-4 text-amber-700" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700" style={textStyle}>E-mail</p>
            <p className="mt-0.5 text-sm" style={textStyle}>{email}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Layout: Classic (2-col info + form) ────────────────────────────────────

function ClassicLayout({ data, isPreview, styles, onUpdate }: ContactLayoutProps) {
  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  return (
    <section className={`bg-background px-4 py-12 sm:px-6 md:py-20 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-6xl">
        <EditableText as="h2" data={data} path={["title"]} value={data.title as string} isPreview={isPreview} onUpdate={onUpdate} className="mb-10 text-balance text-center text-3xl font-bold text-amber-950 md:text-4xl" style={textStyle} />
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <EditableText as="p" data={data} path={["subtitle"]} value={(data.subtitle as string) || "Neem gerust contact met ons op. We helpen je graag verder."} isPreview={isPreview} onUpdate={onUpdate} className="mb-6 text-muted-foreground" style={textStyle} multiline />
            <InfoBlock address={data.address as string} phone={data.phone as string} email={data.email as string} textStyle={textStyle} />
          </div>
          <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} />
        </div>
      </div>
    </section>
  )
}

// ─── Layout: Split (dark left panel + white form) ────────────────────────────

function SplitLayout({ data, isPreview, styles, onUpdate }: ContactLayoutProps) {
  return (
    <section className={`overflow-hidden ${styles?.fontFamily || ""}`}>
      <div className="flex flex-col md:flex-row min-h-[520px]">
        {/* Left dark panel */}
        <div
          className="flex flex-col justify-center px-8 py-12 md:w-2/5 md:px-12"
          style={{ backgroundColor: styles?.backgroundColor || "#1c1410" }}
        >
          <EditableText as="h2" data={data} path={["title"]} value={data.title as string} isPreview={isPreview} onUpdate={onUpdate} className="mb-4 text-3xl font-bold text-white md:text-4xl" style={styles?.textColor ? { color: styles.textColor } : undefined} />
          <EditableText as="p" data={data} path={["subtitle"]} value={(data.subtitle as string) || "We staan voor je klaar."} isPreview={isPreview} onUpdate={onUpdate} className="mb-8 text-sm text-white/70" multiline />
          <div className="space-y-5">
            {(data.address as string) && (
              <div className="flex items-center gap-3 text-white/80">
                <MapPin className="h-4 w-4 flex-shrink-0 text-amber-400" />
                <EditableText data={data} path={["address"]} value={data.address as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm" multiline />
              </div>
            )}
            {(data.phone as string) && (
              <div className="flex items-center gap-3 text-white/80">
                <Phone className="h-4 w-4 flex-shrink-0 text-amber-400" />
                <EditableText data={data} path={["phone"]} value={data.phone as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm" />
              </div>
            )}
            {(data.email as string) && (
              <div className="flex items-center gap-3 text-white/80">
                <Mail className="h-4 w-4 flex-shrink-0 text-amber-400" />
                <EditableText data={data} path={["email"]} value={data.email as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm" />
              </div>
            )}
          </div>
        </div>
        {/* Right form */}
        <div className="flex flex-1 flex-col justify-center bg-white px-8 py-12 md:px-12">
          <h3 className="mb-6 text-xl font-semibold text-gray-900">Stuur een bericht</h3>
          <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} />
        </div>
      </div>
    </section>
  )
}

// ─── Layout: Minimal (clean, text-forward) ───────────────────────────────────

function MinimalLayout({ data, isPreview, styles, onUpdate }: ContactLayoutProps) {
  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  return (
    <section className={`px-4 py-16 sm:px-6 md:py-24 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">Contact</p>
        <EditableText as="h2" data={data} path={["title"]} value={data.title as string} isPreview={isPreview} onUpdate={onUpdate} className="mb-4 text-3xl font-bold text-amber-950 md:text-5xl" style={textStyle} />
        <EditableText as="p" data={data} path={["subtitle"]} value={(data.subtitle as string) || "We horen graag van je."} isPreview={isPreview} onUpdate={onUpdate} className="mb-10 text-muted-foreground" style={textStyle} multiline />
        {/* Inline contact info row */}
        <div className="mb-10 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          {(data.phone as string) && (
            <a href={`tel:${data.phone}`} className="flex items-center gap-1.5 hover:text-amber-700 transition-colors">
              <Phone className="h-3.5 w-3.5" />
              <EditableText data={data} path={["phone"]} value={data.phone as string} isPreview={isPreview} onUpdate={onUpdate} />
            </a>
          )}
          {(data.email as string) && (
            <a href={`mailto:${data.email}`} className="flex items-center gap-1.5 hover:text-amber-700 transition-colors">
              <Mail className="h-3.5 w-3.5" />
              <EditableText data={data} path={["email"]} value={data.email as string} isPreview={isPreview} onUpdate={onUpdate} />
            </a>
          )}
          {(data.address as string) && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <EditableText data={data} path={["address"]} value={data.address as string} isPreview={isPreview} onUpdate={onUpdate} multiline />
            </span>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-white/80 p-6 text-left shadow-sm backdrop-blur">
          <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} compact />
        </div>
      </div>
    </section>
  )
}

// ─── Layout: Card (centered card with shadow) ────────────────────────────────

function CardLayout({ data, isPreview, styles, onUpdate }: ContactLayoutProps) {
  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor || "#fef9f0",
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  return (
    <section className={`px-4 py-16 sm:px-6 md:py-24 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
          <div className="grid md:grid-cols-5">
            {/* Info sidebar */}
            <div className="flex flex-col justify-between bg-amber-700 px-8 py-10 md:col-span-2">
              <div>
                <EditableText as="h2" data={data} path={["title"]} value={data.title as string} isPreview={isPreview} onUpdate={onUpdate} className="mb-3 text-2xl font-bold text-white" style={textStyle} />
                <EditableText as="p" data={data} path={["subtitle"]} value={(data.subtitle as string) || "Wij zijn beschikbaar om je vragen te beantwoorden."} isPreview={isPreview} onUpdate={onUpdate} className="mb-8 text-sm text-amber-100" multiline />
                <div className="space-y-4">
                  {(data.phone as string) && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-200" />
                      <EditableText data={data} path={["phone"]} value={data.phone as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm text-amber-100" />
                    </div>
                  )}
                  {(data.email as string) && (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-200" />
                      <EditableText data={data} path={["email"]} value={data.email as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm text-amber-100" />
                    </div>
                  )}
                  {(data.address as string) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-200" />
                      <EditableText data={data} path={["address"]} value={data.address as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm text-amber-100" multiline />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 flex items-center gap-2 text-amber-200">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Ma–Zo, 8:00–22:00</span>
              </div>
            </div>
            {/* Form */}
            <div className="px-8 py-10 md:col-span-3">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">Stuur ons een bericht</h3>
              <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} accentColor="#b45309" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Layout: Fullwidth (hero-style banner + centered form below) ─────────────

function FullwidthLayout({ data, isPreview, styles, onUpdate }: ContactLayoutProps) {
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  return (
    <section className={`${styles?.fontFamily || ""}`}>
      {/* Hero banner */}
      <div
        className="relative flex items-center justify-center px-4 py-20 text-center"
        style={{
          backgroundColor: styles?.backgroundColor || "#78350f",
          backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {styles?.backgroundImage && (
          <div className="absolute inset-0 bg-black/50" />
        )}
        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            Contacteer ons
          </div>
          <EditableText as="h2" data={data} path={["title"]} value={data.title as string} isPreview={isPreview} onUpdate={onUpdate} className="mb-4 text-4xl font-bold text-white md:text-5xl" style={textStyle} />
          <EditableText as="p" data={data} path={["subtitle"]} value={(data.subtitle as string) || "We staan voor je klaar."} isPreview={isPreview} onUpdate={onUpdate} className="mx-auto max-w-md text-white/80" multiline />
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-white/80">
            {(data.phone as string) && (
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /><EditableText data={data} path={["phone"]} value={data.phone as string} isPreview={isPreview} onUpdate={onUpdate} /></span>
            )}
            {(data.email as string) && (
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /><EditableText data={data} path={["email"]} value={data.email as string} isPreview={isPreview} onUpdate={onUpdate} /></span>
            )}
          </div>
        </div>
      </div>
      {/* Form below */}
      <div className="bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} />
        </div>
      </div>
    </section>
  )
}

// ─── Layout: Centered (icon-forward symmetric layout) ────────────────────────

function CenteredLayout({ data, isPreview, styles, onUpdate }: ContactLayoutProps) {
  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  return (
    <section className={`px-4 py-16 sm:px-6 md:py-20 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <EditableText as="h2" data={data} path={["title"]} value={data.title as string} isPreview={isPreview} onUpdate={onUpdate} className="mb-3 text-3xl font-bold text-amber-950 md:text-4xl" style={textStyle} />
          <EditableText as="p" data={data} path={["subtitle"]} value={(data.subtitle as string) || "Neem contact met ons op."} isPreview={isPreview} onUpdate={onUpdate} className="text-muted-foreground" style={textStyle} multiline />
        </div>
        {/* 3-col info cards */}
        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: MapPin, label: "Adres", value: data.address as string },
            { icon: Phone, label: "Telefoon", value: data.phone as string },
            { icon: Mail, label: "E-mail", value: data.email as string },
          ]
            .filter((item) => !!item.value)
            .map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white/70 p-6 text-center shadow-sm backdrop-blur"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Icon className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{value}</p>
                </div>
              </div>
            ))}
        </div>
        {/* Form */}
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-white/80 p-8 shadow-sm backdrop-blur">
          <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} />
        </div>
      </div>
    </section>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ContactSection({ data, isPreview, styles, onUpdate }: ContactSectionProps) {
  const layout = (contactLayoutMap[normalizeSectionLayout(data.layout)] ?? "classic") as ContactLayout

  switch (layout) {
    case "split":
      return <SplitLayout data={data} isPreview={isPreview} styles={styles} onUpdate={onUpdate} />
    case "minimal":
      return <MinimalLayout data={data} isPreview={isPreview} styles={styles} onUpdate={onUpdate} />
    case "card":
      return <CardLayout data={data} isPreview={isPreview} styles={styles} onUpdate={onUpdate} />
    case "fullwidth":
      return <FullwidthLayout data={data} isPreview={isPreview} styles={styles} onUpdate={onUpdate} />
    case "centered":
      return <CenteredLayout data={data} isPreview={isPreview} styles={styles} onUpdate={onUpdate} />
    case "classic":
    default:
      return <ClassicLayout data={data} isPreview={isPreview} styles={styles} onUpdate={onUpdate} />
  }
}


