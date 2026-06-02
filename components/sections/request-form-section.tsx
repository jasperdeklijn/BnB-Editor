"use client"

import { useState } from "react"
import { Send, CheckCircle, AlertCircle, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { SectionStyles } from "@/lib/types"

export type RequestType = "contact" | "appointment" | "quote" | "whatsapp"

interface RequestFormSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

interface FormState {
  name: string
  email: string
  phone: string
  message: string
  date: string
  service: string
  budget: string
}

function useRequestForm(recipientEmail?: string, requestType?: RequestType) {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    message: "",
    date: "",
    service: "",
    budget: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, recipientEmail, requestType }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error || "Er is een fout opgetreden.")
        setStatus("error")
      } else {
        setStatus("success")
        setForm({ name: "", email: "", phone: "", message: "", date: "", service: "", budget: "" })
      }
    } catch {
      setErrorMsg("Er is een fout opgetreden. Probeer het opnieuw.")
      setStatus("error")
    }
  }

  return { form, update, submit, status, errorMsg }
}

type Field = "name" | "email" | "phone" | "date" | "service" | "message" | "budget"

const DEFAULT_FIELDS_BY_TYPE: Record<RequestType, Field[]> = {
  contact: ["name", "email", "phone", "message"],
  appointment: ["name", "email", "phone", "date", "service", "message"],
  quote: ["name", "email", "phone", "service", "budget", "message"],
  whatsapp: ["name", "phone"],
}

function RequestForm({
  requestType,
  recipientEmail,
  fields,
  accentColor,
  whatsappNumber,
}: {
  requestType: RequestType
  recipientEmail?: string
  fields: Field[]
  accentColor?: string
  whatsappNumber?: string
}) {
  const { form, update, submit, status, errorMsg } = useRequestForm(recipientEmail, requestType)

  if (requestType === "whatsapp") {
    const number = (whatsappNumber || "").replace(/\D/g, "")
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <MessageSquare className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Stuur ons een WhatsApp bericht</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Snel contact via WhatsApp. We reageren zo spoedig mogelijk.
          </p>
        </div>
        <a
          href={number ? `https://wa.me/${number}` : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Open WhatsApp
        </a>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle className="h-10 w-10 text-green-500" />
        <p className="font-semibold">Aanvraag verstuurd!</p>
        <p className="text-sm text-muted-foreground">
          We nemen zo snel mogelijk contact met je op.
        </p>
      </div>
    )
  }

  const fieldLabels: Record<Field, string> = {
    name: "Naam *",
    email: "E-mailadres *",
    phone: "Telefoonnummer",
    date: "Gewenste datum",
    service: "Dienst / onderwerp",
    message: "Bericht",
    budget: "Budget (indicatie)",
  }
  const fieldTypes: Record<Field, string> = {
    name: "text",
    email: "email",
    phone: "tel",
    date: "date",
    service: "text",
    message: "textarea",
    budget: "text",
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields
          .filter((f) => f !== "message" && fieldTypes[f] !== "textarea")
          .map((field) => (
            <div key={field} className={`space-y-1.5 ${fields.filter((f) => fieldTypes[f] !== "textarea").length % 2 !== 0 && field === fields.find((f) => fieldTypes[f] !== "textarea") ? "sm:col-span-2" : ""}`}>
              <Label htmlFor={`req-${field}`}>{fieldLabels[field]}</Label>
              <Input
                id={`req-${field}`}
                type={fieldTypes[field]}
                placeholder={field === "date" ? "" : `Jouw ${fieldLabels[field].toLowerCase().replace(" *", "")}`}
                value={(form as any)[field]}
                onChange={(e) => update(field as keyof FormState, e.target.value)}
                required={field === "name" || field === "email"}
              />
            </div>
          ))}
      </div>
      {fields.includes("message") && (
        <div className="space-y-1.5">
          <Label htmlFor="req-message">{fieldLabels.message}</Label>
          <Textarea
            id="req-message"
            placeholder="Schrijf hier je bericht..."
            rows={4}
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
          />
        </div>
      )}
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
            Versturen...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {requestType === "appointment" ? "Afspraak aanvragen" : requestType === "quote" ? "Offerte aanvragen" : "Verstuur bericht"}
          </span>
        )}
      </Button>
    </form>
  )
}

export function RequestFormSection({ data, styles }: RequestFormSectionProps) {
  const title = (data.title as string) || "Aanvraag doen"
  const subtitle = (data.subtitle as string) || ""
  const requestType: RequestType = (data.requestType as RequestType) || "contact"
  const recipientEmail = (data.recipientEmail as string) || ""
  const whatsappNumber = (data.whatsappNumber as string) || ""
  const fields: Field[] = (data.fields as Field[]) || DEFAULT_FIELDS_BY_TYPE[requestType]

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    fontFamily: styles?.fontFamily,
  }
  const textStyle: React.CSSProperties = styles?.textColor ? { color: styles.textColor } : {}

  const typeLabels: Record<RequestType, string> = {
    contact: "Contact",
    appointment: "Afspraak",
    quote: "Offerte",
    whatsapp: "WhatsApp",
  }

  return (
    <section className="px-4 py-16 sm:px-6 md:py-24" style={sectionStyle}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
            {typeLabels[requestType]}
          </p>
          <h2
            className="text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={textStyle}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-3 text-muted-foreground" style={textStyle}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-white/90 p-8 shadow-sm backdrop-blur">
          <RequestForm
            requestType={requestType}
            recipientEmail={recipientEmail}
            fields={fields}
            whatsappNumber={whatsappNumber}
          />
        </div>
      </div>
    </section>
  )
}
