import { z } from "zod"
import nodemailer from "nodemailer"
import { flexContext, flexResponse, FlexError, loadWebsiteCheck, sameOrigin } from "@/lib/flexstart/server"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request)
    const { user, db } = await flexContext()
    const { id } = await context.params
    if (!z.string().uuid().safeParse(id).success) throw new FlexError("Ongeldige website.")
    // Only the customer can send this test; an admin must ask the customer to run it.
    const current = await loadWebsiteCheck(db, id, user.id)
    if (current.check.items.find((i) => i.id === "form")?.state !== "ready") throw new FlexError("Stel eerst het contactformulier en ontvangstadres in.")
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) throw new FlexError("E-mail is nog niet ingesteld.", 503)
    const limit = await checkRateLimit(`flexcheck:test:${user.id}`, 3, 3600000)
    if (limit.reason === "unavailable") throw new FlexError("De beveiligingscontrole is tijdelijk niet beschikbaar. Probeer later opnieuw.", 503)
    if (!limit.allowed) throw new FlexError("Maximaal drie testaanvragen per uur.", 429)
    const { error: clearError } = await db.from("website_check_evidence").upsert({ website_id: id, tested_version: null, tested_at: null })
    if (clearError) throw clearError
    const { data: inquiry, error } = await db.from("contact_requests").insert({
      website_id: id, business_id: current.website.business_id, user_id: user.id, request_type: "contact", name: "FlexCheck testaanvraag",
      email: user.email || "", phone: "", service: "", preferred_date: "", budget: "", message: "Dit is een testaanvraag vanuit FlexCheck. Controleer of dit bericht in je inbox en e-mail is aangekomen.",
      recipient_email: current.destination, source: "flexcheck_test", status: "new",
    }).select("id").single()
    if (error || !inquiry) throw new FlexError("De testaanvraag kon niet worden opgeslagen.", 500)
    const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000, socketTimeout: 15000 })
    try {
      const result = await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: current.destination,
        subject: `FlexCheck testaanvraag — ${current.website.title}`, text: `Dit is een testaanvraag voor ${current.website.title}.\nKenmerk: ${inquiry.id}\nControleer ook de aanvragen-inbox in FlexPagina. Er is geen boeking aangemaakt.` })
      if (!result.accepted?.length || result.rejected?.length) throw new Error("Niet geaccepteerd")
    } catch { throw new FlexError("De aanvraag staat in je inbox, maar de testmail is niet geaccepteerd. Controleer de e-mailinstellingen en probeer opnieuw.", 502) }
    const { error: evidenceError } = await db.from("website_check_evidence").upsert({ website_id: id, tested_version: current.check.version, tested_at: new Date().toISOString() })
    if (evidenceError) throw new FlexError("De mail is verzonden, maar het testresultaat kon niet worden opgeslagen.", 500)
    return Response.json({ success: true, message: "De testaanvraag staat in Aanvragen en de mailserver heeft de e-mail geaccepteerd. Controleer ook de ontvangst in je mailbox." })
  } catch (error) { return flexResponse(error) }
}
