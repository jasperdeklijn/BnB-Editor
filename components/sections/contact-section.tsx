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
import { useWebsiteLocale } from "@/lib/site-i18n/provider"
import { getSectionColorVars } from "@/lib/section-colors"

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

function useContactForm(recipientEmail?: string, businessId?: string, websiteId?: string, locale?: string, isPreview = false, localizedError = "Er is een fout opgetreden.") {
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "", message: "", company: "" })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")
    if (isPreview) {
      setStatus("success")
      return
    }
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, recipientEmail, businessId, websiteId, locale, requestType: "contact", source: "contact_section" }),
      })
      await res.json()
      if (!res.ok) {
        setErrorMsg(localizedError)
        setStatus("error")
      } else {
        setStatus("success")
        setForm({ name: "", email: "", phone: "", message: "", company: "" })
      }
    } catch {
      setErrorMsg(localizedError)
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
  locale?: string
  accentColor?: string
  buttonLabel?: string
  compact?: boolean
  isPreview?: boolean
}

function ContactForm({ recipientEmail, businessId, websiteId, locale, accentColor, buttonLabel = "Verstuur bericht", compact, isPreview = false }: ContactFormProps) {
  const { messages } = useWebsiteLocale()
  const { form, update, submit, status, errorMsg } = useContactForm(recipientEmail, businessId, websiteId, locale, isPreview, messages.error)

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle className="h-10 w-10 text-green-500" />
        <p className="font-semibold">{isPreview ? messages.previewSuccess : messages.success}</p>
        <p className="text-sm text-muted-foreground">
          {isPreview ? messages.previewNoRequest : messages.contactSoon}
        </p>
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
          <Label htmlFor="contact-name">{messages.name} *</Label>
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
          <Label htmlFor="contact-email">{messages.email} *</Label>
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
        <Label htmlFor="contact-phone">{messages.phone}</Label>
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
        <Label htmlFor="contact-message">{messages.message} *</Label>
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
        style={{ backgroundColor: accentColor || "var(--section-accent)", borderColor: accentColor || "var(--section-accent)", color: "var(--section-accent-foreground)" }}
      >
        {status === "loading" ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {messages.submitting}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {buttonLabel === "Verstuur bericht" ? messages.submit : buttonLabel}
          </span>
        )}
      </Button>
    </form>
  )
}

// ─── Info Block ───────────────────────────────────────────────────────────────

function InfoBlock({ address, phone, email, textStyle }: { address?: string; phone?: string; email?: string; textStyle?: React.CSSProperties }) {
  const { messages } = useWebsiteLocale()
  return (
    <div className="space-y-5">
      {address && (
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--section-accent)]">
            <MapPin className="h-4 w-4 text-[var(--section-accent-foreground)]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--section-accent)]">{messages.address}</p>
            <p className="mt-0.5 text-sm" style={textStyle}>{address}</p>
          </div>
        </div>
      )}
      {phone && (
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--section-accent)]">
            <Phone className="h-4 w-4 text-[var(--section-accent-foreground)]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--section-accent)]">{messages.phone}</p>
            <p className="mt-0.5 text-sm" style={textStyle}>{phone}</p>
          </div>
        </div>
      )}
      {email && (
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--section-accent)]">
            <Mail className="h-4 w-4 text-[var(--section-accent-foreground)]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--section-accent)]">{messages.email}</p>
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
    ...getSectionColorVars(styles),
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
          <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} locale={data.activeLocale as string} isPreview={isPreview} />
        </div>
      </div>
    </section>
  )
}

// ─── Layout: Split (dark left panel + white form) ────────────────────────────

function SplitLayout({ data, isPreview, styles, onUpdate }: ContactLayoutProps) {
  const { messages } = useWebsiteLocale()
  return (
    <section className={`overflow-hidden ${styles?.fontFamily || ""}`} style={getSectionColorVars(styles)}>
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
                <MapPin className="h-4 w-4 flex-shrink-0 text-[var(--section-accent)]" />
                <EditableText data={data} path={["address"]} value={data.address as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm" multiline />
              </div>
            )}
            {(data.phone as string) && (
              <div className="flex items-center gap-3 text-white/80">
                <Phone className="h-4 w-4 flex-shrink-0 text-[var(--section-accent)]" />
                <EditableText data={data} path={["phone"]} value={data.phone as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm" />
              </div>
            )}
            {(data.email as string) && (
              <div className="flex items-center gap-3 text-white/80">
                <Mail className="h-4 w-4 flex-shrink-0 text-[var(--section-accent)]" />
                <EditableText data={data} path={["email"]} value={data.email as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm" />
              </div>
            )}
          </div>
        </div>
        {/* Right form */}
        <div className="flex flex-1 flex-col justify-center bg-[var(--section-surface)] px-8 py-12 text-[var(--section-surface-foreground)] md:px-12">
          <h3 className="mb-6 text-xl font-semibold">{messages.sendMessage}</h3>
          <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} locale={data.activeLocale as string} isPreview={isPreview} />
        </div>
      </div>
    </section>
  )
}

// ─── Layout: Minimal (clean, text-forward) ───────────────────────────────────

function MinimalLayout({ data, isPreview, styles, onUpdate }: ContactLayoutProps) {
  const { messages } = useWebsiteLocale()
  const sectionStyle: React.CSSProperties = {
    ...getSectionColorVars(styles),
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }
  return (
    <section className={`px-4 py-16 sm:px-6 md:py-24 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--section-accent)]">{messages.contact}</p>
        <EditableText as="h2" data={data} path={["title"]} value={data.title as string} isPreview={isPreview} onUpdate={onUpdate} className="mb-4 text-3xl font-bold text-amber-950 md:text-5xl" style={textStyle} />
        <EditableText as="p" data={data} path={["subtitle"]} value={(data.subtitle as string) || "We horen graag van je."} isPreview={isPreview} onUpdate={onUpdate} className="mb-10 text-muted-foreground" style={textStyle} multiline />
        {/* Inline contact info row */}
        <div className="mb-10 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          {(data.phone as string) && (
            <a href={`tel:${data.phone}`} className="flex items-center gap-1.5 transition-colors hover:text-[var(--section-accent)]">
              <Phone className="h-3.5 w-3.5" />
              <EditableText data={data} path={["phone"]} value={data.phone as string} isPreview={isPreview} onUpdate={onUpdate} />
            </a>
          )}
          {(data.email as string) && (
            <a href={`mailto:${data.email}`} className="flex items-center gap-1.5 transition-colors hover:text-[var(--section-accent)]">
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
        <div className="rounded-2xl border border-border bg-[var(--section-surface)] p-6 text-left text-[var(--section-surface-foreground)] shadow-sm backdrop-blur">
          <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} locale={data.activeLocale as string} isPreview={isPreview} compact />
        </div>
      </div>
    </section>
  )
}

// ─── Layout: Card (centered card with shadow) ────────────────────────────────

function CardLayout({ data, isPreview, styles, onUpdate }: ContactLayoutProps) {
  const { messages } = useWebsiteLocale()
  const sectionStyle: React.CSSProperties = {
    ...getSectionColorVars(styles),
    backgroundColor: styles?.backgroundColor || "#fef9f0",
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  return (
    <section className={`px-4 py-16 sm:px-6 md:py-24 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-3xl bg-[var(--section-surface)] text-[var(--section-surface-foreground)] shadow-xl">
          <div className="grid md:grid-cols-5">
            {/* Info sidebar */}
            <div className="flex flex-col justify-between bg-[var(--section-accent)] px-8 py-10 text-[var(--section-accent-foreground)] md:col-span-2">
              <div>
                <EditableText as="h2" data={data} path={["title"]} value={data.title as string} isPreview={isPreview} onUpdate={onUpdate} className="mb-3 text-2xl font-bold" />
                <EditableText as="p" data={data} path={["subtitle"]} value={(data.subtitle as string) || "Wij zijn beschikbaar om je vragen te beantwoorden."} isPreview={isPreview} onUpdate={onUpdate} className="mb-8 text-sm opacity-80" multiline />
                <div className="space-y-4">
                  {(data.phone as string) && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-70" />
                      <EditableText data={data} path={["phone"]} value={data.phone as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm opacity-90" />
                    </div>
                  )}
                  {(data.email as string) && (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-70" />
                      <EditableText data={data} path={["email"]} value={data.email as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm opacity-90" />
                    </div>
                  )}
                  {(data.address as string) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-70" />
                      <EditableText data={data} path={["address"]} value={data.address as string} isPreview={isPreview} onUpdate={onUpdate} className="text-sm opacity-90" multiline />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 flex items-center gap-2 opacity-70">
                <Clock className="h-4 w-4" />
                <span className="text-xs">{messages.openingHours}: 8:00–22:00</span>
              </div>
            </div>
            {/* Form */}
            <div className="px-8 py-10 md:col-span-3">
              <h3 className="mb-6 text-lg font-semibold">{messages.sendMessage}</h3>
              <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} locale={data.activeLocale as string} isPreview={isPreview} accentColor={styles?.accentColor || "#b45309"} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Layout: Fullwidth (hero-style banner + centered form below) ─────────────

function FullwidthLayout({ data, isPreview, styles, onUpdate }: ContactLayoutProps) {
  const { messages } = useWebsiteLocale()

  return (
    <section className={`${styles?.fontFamily || ""}`} style={getSectionColorVars(styles)}>
      {/* Hero banner */}
      <div
        className="relative flex items-center justify-center px-4 py-20 text-center text-[var(--section-accent-foreground)]"
        style={{
          backgroundColor: styles?.accentColor || styles?.backgroundColor || "var(--section-accent)",
          backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {styles?.backgroundImage && (
          <div className="absolute inset-0 bg-black/50" />
        )}
        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm backdrop-blur-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            {messages.contact}
          </div>
          <EditableText as="h2" data={data} path={["title"]} value={data.title as string} isPreview={isPreview} onUpdate={onUpdate} className="mb-4 text-4xl font-bold md:text-5xl" />
          <EditableText as="p" data={data} path={["subtitle"]} value={(data.subtitle as string) || "We staan voor je klaar."} isPreview={isPreview} onUpdate={onUpdate} className="mx-auto max-w-md opacity-80" multiline />
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm opacity-80">
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
      <div className="bg-[var(--section-surface)] px-4 py-12 text-[var(--section-surface-foreground)] sm:px-6">
        <div className="mx-auto max-w-2xl">
          <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} locale={data.activeLocale as string} isPreview={isPreview} />
        </div>
      </div>
    </section>
  )
}

// ─── Layout: Centered (icon-forward symmetric layout) ────────────────────────

function CenteredLayout({ data, isPreview, styles, onUpdate }: ContactLayoutProps) {
  const { messages } = useWebsiteLocale()
  const sectionStyle: React.CSSProperties = {
    ...getSectionColorVars(styles),
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
            { icon: MapPin, label: messages.address, value: data.address as string },
            { icon: Phone, label: messages.phone, value: data.phone as string },
            { icon: Mail, label: messages.email, value: data.email as string },
          ]
            .filter((item) => !!item.value)
            .map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-3 rounded-2xl border border-border p-6 text-center text-[var(--section-surface-foreground)] shadow-sm backdrop-blur"
                style={{ backgroundColor: "var(--section-surface)" }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--section-accent)]">
                  <Icon className="h-5 w-5 text-[var(--section-accent-foreground)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--section-accent)]">{label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{value}</p>
                </div>
              </div>
            ))}
        </div>
        {/* Form */}
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-[var(--section-surface)] p-8 text-[var(--section-surface-foreground)] shadow-sm backdrop-blur">
          <ContactForm recipientEmail={data.recipientEmail as string} businessId={data.businessId as string} websiteId={data.websiteId as string} locale={data.activeLocale as string} isPreview={isPreview} />
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


