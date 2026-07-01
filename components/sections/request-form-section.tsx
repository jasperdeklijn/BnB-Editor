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
}

type FieldKey = keyof FormState

function useRequestForm(recipientEmail?: string, requestType: RequestType = "contact", businessId?: string, websiteId?: string) {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    date: "",
    service: "",
    budget: "",
    message: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const update = (field: FieldKey, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, recipientEmail, requestType, businessId, websiteId, source: "request_form_section" }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error || "Er is een fout opgetreden.")
        setStatus("error")
      } else {
        setStatus("success")
        setForm({ name: "", email: "", phone: "", date: "", service: "", budget: "", message: "" })
      }
    } catch {
      setErrorMsg("Er is een fout opgetreden. Probeer het opnieuw.")
      setStatus("error")
    }
  }

  return { form, update, submit, status, errorMsg }
}

const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Naam",
  email: "E-mailadres",
  phone: "Telefoonnummer",
  date: "Gewenste datum",
  service: "Gewenste dienst",
  budget: "Budget",
  message: "Bericht",
}

export function RequestFormSection({ data, styles, isPreview, onUpdate }: RequestFormSectionProps) {
  const title = (data.title as string) || "Stuur een aanvraag"
  const subtitle = data.subtitle as string | undefined
  const requestType = ((data.requestType as RequestType) || "contact") satisfies RequestType
  const recipientEmail = data.recipientEmail as string | undefined
  const businessId = data.businessId as string | undefined
  const websiteId = data.websiteId as string | undefined
  const whatsappNumber = data.whatsappNumber as string | undefined
  const fields = (data.fields as FieldKey[]) || ["name", "email", "phone", "message"]
  const layout = getLayoutClasses(data.layout)

  const config = REQUEST_TYPE_CONFIG[requestType] ?? REQUEST_TYPE_CONFIG.contact
  const Icon = config.icon

  const { form, update, submit, status, errorMsg } = useRequestForm(recipientEmail, requestType, businessId, websiteId)

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  if (requestType === "whatsapp") {
    const number = whatsappNumber?.replace(/\D/g, "") || ""
    const waUrl = number ? `https://wa.me/${number}` : "#"

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
            className="inline-flex items-center gap-3 rounded-xl bg-green-500 px-8 py-4 text-base font-semibold text-white shadow hover:bg-green-600 transition-all hover:scale-[1.02]"
          >
            <PhoneIcon className="h-5 w-5" />
            App ons op WhatsApp
          </a>
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
          <div className="mb-3 inline-flex items-center justify-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
            <Icon className="h-4 w-4" />
            {config.label}
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

        <div className={`${layout.card} border border-border bg-white/70 backdrop-blur`}>
          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <p className="font-semibold">Aanvraag ontvangen!</p>
              <p className="text-sm text-muted-foreground">
                We nemen zo snel mogelijk contact met je op.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.includes("name") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="req-name">{FIELD_LABELS.name} *</Label>
                    <Input
                      id="req-name"
                      placeholder="Jouw naam"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      required
                    />
                  </div>
                )}
                {fields.includes("email") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="req-email">{FIELD_LABELS.email} *</Label>
                    <Input
                      id="req-email"
                      type="email"
                      placeholder="jouw@email.nl"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              {fields.includes("phone") && (
                <div className="space-y-1.5">
                  <Label htmlFor="req-phone">{FIELD_LABELS.phone}</Label>
                  <Input
                    id="req-phone"
                    type="tel"
                    placeholder="+31 6 00000000"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </div>
              )}

              {fields.includes("service") && (
                <div className="space-y-1.5">
                  <Label htmlFor="req-service">{FIELD_LABELS.service}</Label>
                  <Input
                    id="req-service"
                    placeholder="Welke dienst wil je aanvragen?"
                    value={form.service}
                    onChange={(e) => update("service", e.target.value)}
                  />
                </div>
              )}

              {fields.includes("date") && (
                <div className="space-y-1.5">
                  <Label htmlFor="req-date">{FIELD_LABELS.date}</Label>
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
                  <Label htmlFor="req-budget">{FIELD_LABELS.budget}</Label>
                  <Input
                    id="req-budget"
                    placeholder="bijv. € 500 – € 1000"
                    value={form.budget}
                    onChange={(e) => update("budget", e.target.value)}
                  />
                </div>
              )}

              {fields.includes("message") && (
                <div className="space-y-1.5">
                  <Label htmlFor="req-message">
                    {FIELD_LABELS.message} {requestType === "contact" ? "*" : ""}
                  </Label>
                  <Textarea
                    id="req-message"
                    placeholder="Schrijf je bericht of aanvraag hier..."
                    rows={4}
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
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

              <Button type="submit" disabled={status === "loading"} className="w-full">
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Verzenden...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {config.buttonLabel}
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

