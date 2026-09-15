import "server-only"
import { createHash, randomBytes } from "node:crypto"
import nodemailer from "nodemailer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getUserSubscription } from "@/lib/subscriptions"
import { PLATFORM_BASE_URL, PLATFORM_EMAILS } from "@/lib/platform"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { hasReviewCollectionAccess, reviewLimit, validateReview } from "./shared"

export class ReviewError extends Error { constructor(message: string, public status = 400) { super(message) } }
export const hashReviewToken = (token: string) => createHash("sha256").update(token).digest("hex")
const token = () => randomBytes(32).toString("hex")
export function reviewBaseUrl() {
  const url = new URL(process.env.REVIEWS_BASE_URL || PLATFORM_BASE_URL)
  if ((url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) || url.username || url.password) throw new ReviewError("Recensies zijn tijdelijk niet beschikbaar.", 503)
  return url.origin
}
export function requireWebsiteId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new ReviewError("Ongeldige website.")
  return value
}
export async function reviewRateLimit(request: Request, action: string, limit = 8, key?: string) {
  const result = await checkRateLimit(key ? `reviews:${action}:${hashReviewToken(key)}` : getRateLimitKey(request, `reviews:${action}`), limit, 60 * 60 * 1000)
  if (!result.allowed) throw new ReviewError(result.reason === "unavailable" ? "Recensies zijn tijdelijk niet beschikbaar. Probeer later opnieuw." : "Te veel pogingen. Probeer het later opnieuw.", result.reason === "unavailable" ? 503 : 429)
}
export async function collectionContext(websiteId: string) {
  const admin = await createAdminClient()
  const { data: available, error } = await admin.rpc("review_collection_live", { p_website: websiteId })
  if (error) throw new ReviewError("Recensies zijn tijdelijk niet beschikbaar.", 503)
  if (!available) throw new ReviewError("Deze website verzamelt momenteel geen recensies.", 404)
  const { data: website, error: websiteError } = await admin.from("websites").select("id,business_id,live_snapshot").eq("id", websiteId).single()
  if (websiteError || !website?.business_id) throw new ReviewError("Website niet beschikbaar.", 404)
  const title = typeof website.live_snapshot?.website?.title === "string" ? website.live_snapshot.website.title : "de website"
  return { admin, website: { id: website.id, business_id: website.business_id, title } }
}
export async function publicReviews(websiteId: string, limit: unknown) {
  const { admin, website } = await collectionContext(websiteId)
  const { data, error } = await admin.rpc("public_customer_reviews", { p_website: websiteId, p_limit: reviewLimit(limit) })
  if (error) throw new ReviewError("Recensies konden niet worden geladen.", 503)
  return { title: website.title, reviews: data ?? [], collectionUrl: `${reviewBaseUrl()}/reviews/${websiteId}` }
}
export async function reviewOwner(websiteId: string) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new ReviewError("Log opnieuw in.", 401)
  const { data: website, error } = await client.from("websites").select("id,business_id,title").eq("id", websiteId).eq("user_id", user.id).single()
  if (error || !website) throw new ReviewError("Website niet gevonden.", 404)
  const subscription = await getUserSubscription(client, user.id)
  return { client, user, website, canCollect: hasReviewCollectionAccess(subscription) }
}
export async function ownerReviews(websiteId: string, page = 1) {
  const { client, canCollect } = await reviewOwner(websiteId)
  const offset = (Math.max(1, Math.min(10000, Math.floor(page))) - 1) * 25
  const [rows, pending, archive, events] = await Promise.all([
    client.from("customer_reviews").select("id,display_name,email,rating,body,status,created_at,confirmed_at,delivery_status", { count: "exact" }).eq("website_id", websiteId).order("created_at", { ascending: false }).order("id").range(offset, offset + 24),
    client.from("customer_reviews").select("id", { count: "exact", head: true }).eq("website_id", websiteId).eq("status", "pending"),
    client.from("review_legacy_archive").select("website_id").eq("website_id", websiteId).maybeSingle(),
    client.from("review_events").select("id,review_id,action,reason,created_at").eq("website_id", websiteId).order("created_at", { ascending: false }).limit(25),
  ])
  if (rows.error || pending.error || archive.error || events.error) throw new ReviewError("Recensies konden niet worden geladen. Probeer later opnieuw.", 503)
  return { reviews: rows.data ?? [], total: rows.count ?? 0, pending: pending.count ?? 0, canCollect, hasLegacy: Boolean(archive.data), events: events.data ?? [], collectionUrl: `${reviewBaseUrl()}/reviews/${websiteId}` }
}
async function sendReviewEmail(email: string, websiteTitle: string, confirmation: string | null, withdrawal: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error("Mail unavailable")
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000, socketTimeout: 15000 })
  const base = reviewBaseUrl()
  await transport.sendMail({ from: process.env.SMTP_FROM || PLATFORM_EMAILS.info, to: email,
    subject: confirmation ? "Bevestig je recensie" : "Je recensie intrekken",
    text: `Je recensie voor ${websiteTitle}.\n\n${confirmation ? `Bevestig binnen 24 uur je e-mailadres via:\n${base}/reviews/confirm#token=${confirmation}\n\nNa bevestiging wordt je recensie beoordeeld. Dit bevestigt je e-mailadres, niet een aankoop.\n\n` : ""}Je toestemming intrekken kan via deze persoonlijke link (1 jaar geldig):\n${base}/reviews/withdraw#token=${withdrawal}\n\nBewaar deze link. Je kunt via de recensiepagina een nieuwe intreklink aanvragen. Heb je geen recensie geschreven? Gebruik de intreklink om de aanvraag te verwijderen.` })
}
export async function submitReview(request: Request, input: Record<string, unknown>) {
  const websiteId = requireWebsiteId(input.websiteId)
  await reviewRateLimit(request, "submit")
  if (input.company) return
  let values: ReturnType<typeof validateReview>
  try { values = validateReview(input) } catch (error) { throw new ReviewError((error as Error).message) }
  await reviewRateLimit(request, "email", 3, `${websiteId}:${values.email}`)
  reviewBaseUrl() // Validate mail-link configuration before accepting a submission.
  const { admin, website } = await collectionContext(websiteId)
  const { error: expiryError } = await admin.rpc("expire_unconfirmed_reviews")
  if (expiryError) throw new ReviewError("Recensies zijn tijdelijk niet beschikbaar.", 503)
  const confirmation = token(), withdrawal = token()
  const { data: inserted, error } = await admin.from("customer_reviews").insert({ ...values, website_id: websiteId, business_id: website.business_id,
    confirmation_hash: hashReviewToken(confirmation), confirmation_expires_at: new Date(Date.now() + 86400000).toISOString(),
    withdrawal_hash: hashReviewToken(withdrawal), withdrawal_expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
  }).select("id").single()
  if (error?.code === "23505") return // Do not overwrite an existing customer's words or disclose their address.
  if (error || !inserted) throw new ReviewError("Je recensie kon niet worden opgeslagen.", 503)
  let delivery = "sent"
  try { await sendReviewEmail(values.email, website.title, confirmation, withdrawal) } catch { delivery = "failed" }
  const { error: deliveryError } = await admin.from("customer_reviews").update({ delivery_status: delivery }).eq("id", inserted.id)
  if (deliveryError) throw new ReviewError("Opgeslagen. Vraag zo nodig een nieuwe bevestigingsmail aan.", 503)
  if (delivery === "failed") throw new ReviewError("Je recensie is opgeslagen, maar de e-mail kon niet worden verzonden. Vraag later een nieuwe bevestigingsmail aan.", 503)
}
export async function resendReviewEmail(request: Request, input: Record<string, unknown>) {
  const websiteId = requireWebsiteId(input.websiteId)
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  if (!email || email.length > 254) throw new ReviewError("Vul je e-mailadres in.")
  await reviewRateLimit(request, "resend", 6)
  await reviewRateLimit(request, "email", 3, `${websiteId}:${email}`)
  const withdrawalOnly = input.action === "withdrawal-email"
  const admin = await createAdminClient()
  // Withdrawal is available even after unpublishing, switching mode, or downgrading.
  if (!withdrawalOnly) await collectionContext(websiteId)
  const { data: row, error } = await admin.from("customer_reviews").select("id,status,created_at").eq("website_id", websiteId).eq("email", email).neq("status", "withdrawn").maybeSingle()
  if (error) throw new ReviewError("E-mail kan tijdelijk niet worden aangevraagd.", 503)
  if (!row || (!withdrawalOnly && (row.status !== "unconfirmed" || Date.parse(row.created_at) < Date.now() - 7 * 86400000))) return
  const confirmation = withdrawalOnly ? null : token(), withdrawal = token()
  const hashes: Record<string, unknown> = { withdrawal_hash: hashReviewToken(withdrawal), withdrawal_expires_at: new Date(Date.now() + 365 * 86400000).toISOString(), delivery_status: "pending" }
  if (confirmation) Object.assign(hashes, { confirmation_hash: hashReviewToken(confirmation), confirmation_expires_at: new Date(Date.now() + 86400000).toISOString() })
  const { data: updated, error: updateError } = await admin.from("customer_reviews").update(hashes).eq("id", row.id).eq("status", row.status).select("id").maybeSingle()
  if (updateError) throw new ReviewError("E-mail kan tijdelijk niet worden aangevraagd.", 503)
  if (!updated) return
  let delivery = "sent"
  try { await sendReviewEmail(email, "de website", confirmation, withdrawal) } catch { delivery = "failed" }
  const { error: deliveryError } = await admin.from("customer_reviews").update({ delivery_status: delivery }).eq("id", row.id).eq("withdrawal_hash", hashReviewToken(withdrawal))
  if (deliveryError) throw new ReviewError("E-mailstatus tijdelijk niet beschikbaar.", 503)
  // Generic response protects whether an address has reviewed this business.
}
export async function applyReviewToken(request: Request, input: Record<string, unknown>) {
  await reviewRateLimit(request, "token", 20)
  if (typeof input.token !== "string" || !/^[a-f0-9]{64}$/.test(input.token) || !["confirm", "withdraw"].includes(String(input.action))) throw new ReviewError("Ongeldige link.")
  const admin = await createAdminClient()
  const { data, error } = await admin.rpc("review_token_action", { p_hash: hashReviewToken(input.token), p_action: input.action })
  if (error) throw new ReviewError("De actie kon niet worden uitgevoerd.", 503)
  if (!data) throw new ReviewError("Deze link is verlopen, al gebruikt of de verzameling is gepauzeerd. Vraag zo nodig een nieuwe link aan.", 409)
}
export async function moderateReview(request: Request, input: Record<string, unknown>) {
  const websiteId = requireWebsiteId(input.websiteId)
  const { user, canCollect } = await reviewOwner(websiteId)
  await reviewRateLimit(request, `moderate:${user.id}`, 100)
  if (input.action !== "delete" && !canCollect) throw new ReviewError("Recensies beheren vereist Gold.", 403)
  const id = requireWebsiteId(input.id)
  if (!["published", "pending", "rejected", "delete"].includes(String(input.action))) throw new ReviewError("Ongeldige actie.")
  if (typeof input.reason !== "string" || input.reason.trim().length < 3 || input.reason.length > 500) throw new ReviewError("Geef een reden van 3–500 tekens.")
  const admin = await createAdminClient()
  const { data, error } = await admin.rpc("moderate_customer_review", { p_id: id, p_website: websiteId, p_actor: user.id,
    p_action: input.action, p_reason: input.reason.trim(), p_expected: input.expectedStatus })
  if (error || !data) throw new ReviewError("Actie niet uitgevoerd. Vernieuw de lijst en controleer of de verzameling live staat.", 409)
}
export async function exportReviews(websiteId: string) {
  const { client } = await reviewOwner(websiteId)
  const rows: unknown[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await client.from("customer_reviews").select("id,display_name,email,rating,body,status,consent_at,confirmed_at,created_at,withdrawn_at").eq("website_id", websiteId).order("id").range(from, from + 499)
    if (error) throw new ReviewError("Export mislukt.", 503)
    rows.push(...(data ?? [])); if ((data?.length ?? 0) < 500) break
  }
  const { data: legacy, error } = await client.from("review_legacy_archive").select("sections,translations,archived_at").eq("website_id", websiteId).maybeSingle()
  if (error) throw new ReviewError("Export mislukt.", 503)
  return { reviews: rows, legacy }
}
export async function deleteLegacyReviews(request: Request, input: Record<string, unknown>) {
  const websiteId = requireWebsiteId(input.websiteId)
  const { user } = await reviewOwner(websiteId)
  await reviewRateLimit(request, `legacy-delete:${user.id}`, 10)
  const admin = await createAdminClient()
  const { error } = await admin.from("review_legacy_archive").delete().eq("website_id", websiteId)
  if (error) throw new ReviewError("Het archief kon niet worden verwijderd.", 503)
}
