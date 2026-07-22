"use client"

import { useState } from "react"
import {
  Send,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  CalendarDays,
  FileText,
  Phone as PhoneIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"
import { useWebsiteLocale } from "@/lib/site-i18n/provider"
import { getSectionColorVars } from "@/lib/section-colors"

export type RequestType = "contact" | "appointment" | "quote" | "whatsapp"

interface RequestFormSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

const REQUEST_TYPE_CONFIG: Record<
  RequestType,
  { label: string; icon: React.ComponentType<{ className?: string }>; buttonLabel: string }
> = {
  contact: { label: "Stuur een bericht", icon: MessageSquare, buttonLabel: "Verstuur bericht" },
  appointment: {
    label: "Plan een afspraak",
    icon: CalendarDays,
    buttonLabel: "Afspraak aanvragen",
  },
  quote: { label: "Vraag een offerte aan", icon: FileText, buttonLabel: "Offerte aanvragen" },
  whatsapp: {
    label: "WhatsApp ons",
    icon: PhoneIcon,
    buttonLabel: "Open WhatsApp",
  },
}

interface FormState {
  name: string
  email: string
  phone: string
  date: string
  service: string
  budget: string
  message: string
  company: string
}

type FieldKey = keyof FormState
type VisibleFieldKey = Exclude<FieldKey, "company">

function useRequestForm(recipientEmail?: string, requestType: RequestType = "contact", businessId?: string, websiteId?: string, locale?: string, isPreview = false, localizedError = "Er is een fout opgetreden.") {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    date: "",
    service: "",
    budget: "",
    message: "",
    company: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const update = (field: FieldKey, value: string) =>
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
        body: JSON.stringify({ ...form, recipientEmail, requestType, businessId, websiteId, locale, source: "request_form_section" }),
      })
      await res.json()
      if (!res.ok) {
        setErrorMsg(localizedError)
        setStatus("error")
      } else {
        setStatus("success")
        setForm({ name: "", email: "", phone: "", date: "", service: "", budget: "", message: "", company: "" })
      }
    } catch {
      setErrorMsg(localizedError)
      setStatus("error")
    }
  }

  return { form, update, submit, status, errorMsg }
}

export function RequestFormSection({ data, styles, isPreview, onUpdate }: RequestFormSectionProps) {
  const { messages } = useWebsiteLocale()
  const title = (data.title as string) || "Stuur een aanvraag"
  const subtitle = data.subtitle as string | undefined
  const requestType = ((data.requestType as RequestType) || "contact") satisfies RequestType
  const recipientEmail = data.recipientEmail as string | undefined
  const businessId = data.businessId as string | undefined
  const websiteId = data.websiteId as string | undefined
  const locale = data.activeLocale as string | undefined
  const whatsappNumber = data.whatsappNumber as string | undefined
  const fields = (data.fields as VisibleFieldKey[]) || ["name", "email", "phone", "message"]
  const layout = getLayoutClasses(data.layout)

  const config = REQUEST_TYPE_CONFIG[requestType] ?? REQUEST_TYPE_CONFIG.contact
  const localizedLabel = requestType === "appointment" ? messages.planAppointment : requestType === "quote" ? messages.quoteRequest : requestType === "whatsapp" ? messages.whatsappUs : messages.sendMessage
  const localizedButton = requestType === "appointment" ? messages.requestAppointment : requestType === "quote" ? messages.quoteRequest : requestType === "whatsapp" ? messages.openWhatsApp : messages.submit
  const Icon = config.icon

  const { form, update, submit, status, errorMsg } = useRequestForm(recipientEmail, requestType, businessId, websiteId, locale, isPreview, messages.error)

  const sectionStyle: React.CSSProperties = {
    ...getSectionColorVars(styles),
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  if (requestType === "whatsapp") {
    const number = whatsappNumber?.replace(/\D/g, "") || ""
    const waUrl = !isPreview && number ? `https://wa.me/${number}` : "#"

    return (
      <section
        className={`px-4 ${layout.section} sm:px-6 ${styles?.fontFamily || ""}`}
        style={sectionStyle}
      >
        <div className={`mx-auto ${layout.container} text-center`}>
          <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
            <PhoneIcon className="h-4 w-4" />
            WhatsApp
          </div>
          <EditableText as="h2" data={data} path={["title"]} value={title} isPreview={isPreview} onUpdate={onUpdate} className="mb-3 text-balance text-3xl font-bold text-amber-950 md:text-4xl" style={textStyle} />
          {subtitle && (
            <EditableText as="p" data={data} path={["subtitle"]} value={subtitle} isPreview={isPreview} onUpdate={onUpdate} className="mb-8 text-muted-foreground" style={textStyle} multiline />
          )}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              if (isPreview) event.preventDefault()
            }}
            className="inline-flex items-center gap-3 rounded-xl bg-green-500 px-8 py-4 text-base font-semibold text-white shadow hover:bg-green-600 transition-all hover:scale-[1.02]"
          >
            <PhoneIcon className="h-5 w-5" />
            App ons op WhatsApp
          </a>
          {isPreview ? <p className="mt-3 text-xs font-medium text-amber-800">{messages.whatsappPreview}</p> : null}
          {number && (
            <p className="mt-4 text-sm text-muted-foreground">
              Nummer: +{number}
            </p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section
      className={`px-4 ${layout.section} sm:px-6 ${styles?.fontFamily || ""}`}
      style={sectionStyle}
    >
      <div className={`mx-auto ${layout.layout === "split" || layout.layout === "showcase" ? "grid max-w-6xl gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-start" : layout.container}`}>
        <div className={`mb-10 ${layout.layout === "split" || layout.layout === "showcase" ? "md:mb-0 md:text-left" : layout.heading}`}>
          <div className="mb-3 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--section-accent)] px-4 py-2 text-sm font-medium text-[var(--section-accent-foreground)]">
            <Icon className="h-4 w-4" />
            {localizedLabel}
          </div>
          <EditableText
            as="h2"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className="mb-2 text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={textStyle}
          />
          {subtitle && (
            <EditableText as="p" data={data} path={["subtitle"]} value={subtitle} isPreview={isPreview} onUpdate={onUpdate} className="text-muted-foreground" style={textStyle} multiline />
          )}
        </div>

        <div className={`${layout.card} border border-border bg-[var(--section-surface)] text-[var(--section-surface-foreground)] backdrop-blur`}>
          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <p className="font-semibold">{isPreview ? messages.previewSuccess : messages.requestReceived}</p>
              <p className="text-sm text-muted-foreground">
                {isPreview ? messages.previewNoRequest : messages.contactSoon}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="hidden" aria-hidden="true">
                <Label htmlFor="req-company">Bedrijf</Label>
                <Input
                  id="req-company"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.includes("name") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="req-name">{messages.name} *</Label>
                    <Input
                      id="req-name"
                      placeholder="Jouw naam"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      maxLength={120}
                      required
                    />
                  </div>
                )}
                {fields.includes("email") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="req-email">{messages.email} *</Label>
                    <Input
                      id="req-email"
                      type="email"
                      placeholder="jouw@email.nl"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      maxLength={254}
                      required
                    />
                  </div>
                )}
              </div>

              {fields.includes("phone") && (
                <div className="space-y-1.5">
                  <Label htmlFor="req-phone">{messages.phone}</Label>
                  <Input
                    id="req-phone"
                    type="tel"
                    placeholder="+31 6 00000000"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    maxLength={40}
                  />
                </div>
              )}

              {fields.includes("service") && (
                <div className="space-y-1.5">
                  <Label htmlFor="req-service">{messages.service}</Label>
                  <Input
                    id="req-service"
                    placeholder="Welke dienst wil je aanvragen?"
                    value={form.service}
                    onChange={(e) => update("service", e.target.value)}
                    maxLength={160}
                  />
                </div>
              )}

              {fields.includes("date") && (
                <div className="space-y-1.5">
                  <Label htmlFor="req-date">{messages.date}</Label>
                  <Input
                    id="req-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => update("date", e.target.value)}
                  />
                </div>
              )}

              {fields.includes("budget") && (
                <div className="space-y-1.5">
                  <Label htmlFor="req-budget">{messages.budget}</Label>
                  <Input
                    id="req-budget"
                    placeholder="bijv. € 500 – € 1000"
                    value={form.budget}
                    onChange={(e) => update("budget", e.target.value)}
                    maxLength={80}
                  />
                </div>
              )}

              {fields.includes("message") && (
                <div className="space-y-1.5">
                  <Label htmlFor="req-message">
                    {messages.message} {requestType === "contact" ? "*" : ""}
                  </Label>
                  <Textarea
                    id="req-message"
                    placeholder="Schrijf je bericht of aanvraag hier..."
                    rows={4}
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    maxLength={3000}
                    required={requestType === "contact"}
                  />
                </div>
              )}

              {status === "error" && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              <Button type="submit" disabled={status === "loading"} className="w-full bg-[var(--section-accent)] text-[var(--section-accent-foreground)] hover:brightness-90">
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Verzenden...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {localizedButton}
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

