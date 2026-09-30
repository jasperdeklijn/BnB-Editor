import "server-only"
import { createHash, randomBytes } from "node:crypto"
import nodemailer from "nodemailer"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertCurrentUserRuntimeEntitlement } from "@/lib/runtime-entitlements"
import { calculateBookingFinancials } from "@/lib/booking/pricing"
import { PLATFORM_BASE_URL } from "@/lib/platform"
import { createQuotePdf } from "./pdf"
import type { QuoteVersion } from "./types"
import { portalCopy, portalLocale } from "./i18n"
import { checkRateLimit } from "@/lib/rate-limit"

export const hashSecret = (value: string) => createHash("sha256").update(value).digest("hex")
export const quoteWritesEnabled = () => process.env.QUOTES_ENABLED === "true"
export function requireQuoteWrites() { if (!quoteWritesEnabled()) throw new Error("Offertes zijn nog niet geactiveerd.") }
export const versionColumns = "id,quote_id,version,revision,status,snapshot,valid_until,offered_at,decided_at,decision_name,decision_note"
const uuid = z.string().uuid()
export async function ownerContext(write = false) {
  if (write) requireQuoteWrites()
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error("Niet ingelogd.")
  if (write) await assertCurrentUserRuntimeEntitlement(db, "booking_management")
  return { db, user }
}
export async function ownerQuote(id: string, write = false) {
  const { db, user } = await ownerContext(write)
  const { data: quote, error } = await db.from("quotes").select("id,business_id,request_id,number").eq("id", uuid.parse(id)).single()
  if (error || !quote) throw new Error("Offerte niet gevonden.")
  return { db, user, quote }
}
export async function ownerVersion(id: string, write = false) {
  const { db, user } = await ownerContext(write)
  const { data, error } = await db.from("quote_versions").select(versionColumns).eq("id", uuid.parse(id)).single()
  if (error || !data) throw new Error("Offerteversie niet gevonden.")
  const { quote } = await ownerQuote(data.quote_id)
  return { db, user, quote, version: data as unknown as QuoteVersion }
}
const party = z.object({
  name: z.string().max(200).optional(), legal_name: z.string().max(200).optional(),
  email: z.union([z.string().email().max(254),z.literal("")]), address_line1: z.string().max(200), address_line2: z.string().max(200).optional(),
  postal_code: z.string().max(30), city: z.string().max(100), country_code: z.string().length(2),
  vat_id: z.string().max(50).optional(), kvk_number: z.string().max(50).optional(), iban: z.string().max(50).optional(),
})
export const draftSchema = z.object({
  title: z.string().trim().min(1).max(200), terms: z.string().max(8000), seller: party, customer: party,
  lines: z.array(z.object({id: z.string().max(100).optional(),description: z.string().max(200),quantity_milli:z.number(),unit_price_minor:z.number(),discount_minor:z.number(),vat_rate_basis_points:z.number()})).min(1).max(100),
})
export async function saveQuote(id: string, revision: number, input: unknown, until: string) {
  const { version, quote } = await ownerVersion(id, true)
  const values = draftSchema.parse(input)
  const { db } = await ownerContext()
  const { data: request } = await db.from("contact_requests").select("email,locale").eq("id",quote.request_id).single()
  if (values.customer.email.toLowerCase() !== request?.email.toLowerCase()) throw new Error("Gebruik het e-mailadres van de aanvraag. Wijzig contactgegevens eerst in de aanvraag.")
  const expiry = new Date(until)
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now()) throw new Error("Kies een toekomstige geldigheidsdatum.")
  if (version.status !== "draft") throw new Error("Alleen concepten kunnen worden gewijzigd.")
  const locale=portalLocale(request?.locale)
  const snapshot = { ...values, ...calculateBookingFinancials(values.lines), locale, decisionStatement:portalCopy(locale).statement }
  const admin = await createAdminClient()
  const { error } = await admin.rpc("transition_quote",{p_id:id,p_revision:revision,p_action:"save",p_snapshot:snapshot,p_until:expiry.toISOString()})
  if (error) throw new Error("Opslaan mislukt. Vernieuw de pagina en controleer uw gegevens.")
}
export async function offerQuote(id: string, revision: number) {
  const { quote, version } = await ownerVersion(id,true)
  draftSchema.parse(version.snapshot)
  if (!version.snapshot.customer.name?.trim() || !version.snapshot.seller.legal_name?.trim()) throw new Error("Vul de naam van klant en bedrijf in.")
  z.string().email().parse(version.snapshot.customer.email)
  if (!version.valid_until || new Date(version.valid_until).getTime()<=Date.now()) throw new Error("Sla eerst een geldige offerte op.")
  const bytes = await createQuotePdf(version.snapshot, `O-${quote.number}-v${version.version}`, version.valid_until)
  const admin = await createAdminClient()
  const { error } = await admin.rpc("transition_quote",{p_id:id,p_revision:revision,p_action:"offer",p_pdf:Buffer.from(bytes).toString("base64"),p_hash:createHash("sha256").update(bytes).digest("hex")})
  if (error) throw new Error("Aanbieden mislukt. Vernieuw de pagina.")
}
export async function sendPortalMail(to: string, subject: string, text: string, attachment?: {filename:string; content:Buffer}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error("SMTP is niet ingesteld.")
  const transport = nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT)||465,secure:process.env.SMTP_SECURE!=="false",auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:15000,socketTimeout:30000})
  try { await transport.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to,subject,text,attachments:attachment?[{...attachment,contentType:"application/pdf"}]:[]}) }
  finally { transport.close() }
}
export async function createRequestLink(requestId: string) {
  const admin = await createAdminClient()
  const { data: request, error } = await admin.from("contact_requests").select("id,email").eq("id",requestId).single()
  if (error || !request) throw new Error("Aanvraag niet gevonden.")
  z.string().email().parse(request.email)
  const token = randomBytes(32).toString("base64url")
  const { error: insertError } = await admin.from("customer_request_access").insert({request_id:requestId,email:request.email,token_hash:hashSecret(token),expires_at:new Date(Date.now()+90*86400000).toISOString()})
  if (insertError) throw new Error("Klantlink kon niet worden gemaakt.")
  const base=process.env.CUSTOMER_PORTAL_BASE_URL?.trim() || PLATFORM_BASE_URL
  const url=new URL("/aanvraag",base)
  if(url.protocol!=="https:" && !(url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname)))throw new Error("Stel een veilige klantpagina-URL in.")
  url.hash=`access=${token}`
  return { url:url.toString(),email:request.email }
}
export async function emailQuote(id: string) {
  const { version, quote } = await ownerVersion(id,true)
  if (version.status!=="offered" || !version.valid_until || new Date(version.valid_until).getTime()<=Date.now()) throw new Error("Alleen een geldig aangeboden offerte kan worden verzonden.")
  const admin = await createAdminClient()
  const limit=await checkRateLimit(`quote-mail:${id}`,3,600000)
  if(!limit.allowed) throw new Error(limit.reason?"E-mail tijdelijk niet beschikbaar.":"Wacht even voordat u opnieuw verstuurt.")
  // A crashed worker can be retried after ten minutes; no automatic resend after an uncertain SMTP outcome.
  await admin.from("quote_deliveries").update({status:"failed",finished_at:new Date().toISOString()}).eq("version_id",id).eq("status","sending").lt("created_at",new Date(Date.now()-600000).toISOString())
  const { data: delivery,error } = await admin.from("quote_deliveries").insert({version_id:id,recipient:version.snapshot.customer.email}).select("id").single()
  if(error) throw new Error("Deze offerte wordt al verzonden.")
  try {
    const link = await createRequestLink(quote.request_id)
    const { data: pdf } = await admin.from("quote_versions").select("pdf_base64").eq("id",id).single()
    if (!pdf?.pdf_base64) throw new Error("PDF ontbreekt.")
    const copy=portalCopy(version.snapshot.locale)
    await sendPortalMail(link.email,`${copy.quoteSubject} · O-${quote.number} · ${version.snapshot.seller.legal_name}`,`${copy.receiptBody}\n${link.url}`,{filename:`offerte-${quote.number}-v${version.version}.pdf`,content:Buffer.from(pdf.pdf_base64,"base64")})
    const { error: finishError } = await admin.from("quote_deliveries").update({status:"sent",finished_at:new Date().toISOString()}).eq("id",delivery.id)
    if (finishError) throw new Error("Verzending niet te bevestigen; controleer de mailbox voordat u opnieuw verstuurt.")
  } catch(error) { await admin.from("quote_deliveries").update({status:"failed",finished_at:new Date().toISOString()}).eq("id",delivery.id); throw error }
}

export async function sendRequestLink(requestId:string,receipt=false) {
  const admin=await createAdminClient()
  const {data:request}=await admin.from("contact_requests").select("id,business_id,email,locale").eq("id",requestId).single()
  if(!request?.business_id) throw new Error("Aanvraag niet gevonden.")
  const limit=await checkRateLimit(`portal-link-mail:${requestId}`,3,600000)
  if(!limit.allowed) throw new Error(limit.reason?"E-mail tijdelijk niet beschikbaar.":"Wacht even voordat u opnieuw verstuurt.")
  const key=receipt?`portal-receipt:${requestId}`:`portal-invitation:${requestId}:${randomBytes(12).toString("hex")}`
  const {data:delivery,error}=await admin.from("contact_request_messages").insert({contact_request_id:requestId,business_id:request.business_id,direction:"outbound",recipient_email:request.email,subject:"Volg uw aanvraag",body:"Persoonlijke klantlink per e-mail",delivery_status:"queued",idempotency_key:key}).select("id").single()
  if(error?.code==="23505"&&receipt)return
  if(error||!delivery)throw new Error("Klantlinkverzending kon niet worden gestart.")
  try {
    const link=await createRequestLink(requestId)
    const copy=portalCopy(request.locale)
    await sendPortalMail(link.email,receipt?copy.received:copy.receiptSubject,`${copy.receiptBody}\n${link.url}`)
    const {error:finishError}=await admin.from("contact_request_messages").update({delivery_status:"sent",sent_at:new Date().toISOString()}).eq("id",delivery.id)
    if(finishError)throw new Error("Verzendresultaat onbekend; controleer de mailbox.")
  }catch(error){await admin.from("contact_request_messages").update({delivery_status:"failed",error_message:"Klantlink niet verzonden of resultaat onbekend. Controleer voordat u opnieuw verstuurt."}).eq("id",delivery.id);throw error}
}
