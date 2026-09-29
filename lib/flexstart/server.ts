import "server-only"
import { ZodError } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/security"
import { runFlexCheck } from "./check"
import type { PreviewDesign, TransferDetail, TransferRequest } from "./shared"

export class FlexError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
export async function flexContext(adminOnly = false) {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) throw new FlexError("Log eerst in.", 401)
  const admin = isAdmin(user)
  if (adminOnly && !admin) throw new FlexError("Geen beheerderstoegang.", 403)
  const db = await createAdminClient()
  return { user, admin, db, client }
}
export async function ownedTransfer(db: SupabaseClient, id: string, userId: string, admin: boolean) {
  let query = db.from("website_transfer_requests").select("*").eq("id", id)
  if (!admin) query = query.eq("user_id", userId)
  const { data, error } = await query.maybeSingle()
  if (error) throw new FlexError("FlexStart is tijdelijk niet beschikbaar.", 503)
  if (!data) throw new FlexError("Aanvraag niet gevonden.", 404)
  return data as TransferRequest
}
export async function loadWebsiteCheck(db: SupabaseClient, websiteId: string, ownerId: string) {
  const { data: website, error } = await db.from("websites").select("id,user_id,business_id,title,theme_config,seo,draft_version,published,slug")
    .eq("id", websiteId).eq("user_id", ownerId).maybeSingle()
  if (error || !website) throw new FlexError("Concept niet gevonden.", 404)
  const [sections, business, services, destinations, domains, evidence] = await Promise.all([
    db.from("website_sections").select("id,type,content,styles").eq("website_id", websiteId).order("position"),
    website.business_id ? db.from("businesses").select("name,city,email,phone").eq("id", website.business_id).eq("user_id", ownerId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    website.business_id ? db.from("services").select("id,title,description,price,image_urls,position,metadata").eq("business_id", website.business_id).order("position") : Promise.resolve({ data: [], error: null }),
    db.from("website_form_destinations").select("section_id,recipient_email").eq("website_id", websiteId),
    db.from("website_domains").select("status").eq("website_id", websiteId).eq("status", "active"),
    db.from("website_check_evidence").select("tested_version,tested_at").eq("website_id", websiteId).maybeSingle(),
  ])
  if ([sections, business, services, destinations, domains, evidence].some((r) => r.error)) throw new FlexError("De websitecontrole kon niet worden geladen.", 503)
  const design: PreviewDesign = { title: website.title, theme: website.theme_config ?? {}, sections: (sections.data ?? []).map((s) => ({ id: s.id, type: s.type, data: { ...s.content, businessId: website.business_id, websiteId,
    ...(s.type === "services" ? { services: services.data ?? [] } : {}) }, styles: s.styles ?? {} })) }
  const formIds = design.sections.filter((s) => ["contact", "request_form"].includes(s.type)).map((s) => s.id)
  const destination = destinations.data?.find((d) => formIds.includes(d.section_id))?.recipient_email || business.data?.email || ""
  const check = runFlexCheck({ website, business: business.data, sections: design.sections, services: services.data ?? [],
    hasDestination: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination), domainActive: !!domains.data?.length, testedVersion: evidence.data?.tested_version })
  return { website, design, check, destination }
}
export async function loadTransferDetail(db: SupabaseClient, request: TransferRequest, admin: boolean): Promise<TransferDetail> {
  const [feedback, notes, logo, site] = await Promise.all([
    db.from("website_transfer_feedback").select("id,message,created_at,resolved_at").eq("transfer_request_id", request.id).order("created_at"),
    admin ? db.from("website_transfer_private").select("internal_notes").eq("transfer_request_id", request.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    request.logo_image_id ? db.from("user_images").select("original_path").eq("id", request.logo_image_id).eq("user_id", request.user_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    request.website_id ? loadWebsiteCheck(db, request.website_id, request.user_id) : Promise.resolve(null),
  ])
  if (feedback.error || notes.error || logo.error) throw new FlexError("De aanvraag kon niet volledig worden geladen.", 503)
  return { request, feedback: feedback.data ?? [], design: site?.design ?? null, check: site?.check ?? null,
    ...(admin ? { internalNotes: notes.data?.internal_notes ?? "" } : {}),
    logoUrl: logo.data ? db.storage.from("user-images").getPublicUrl(logo.data.original_path).data.publicUrl : null }
}
export async function readBody(request: Request, maxBytes = 65536) {
  const reader = request.body?.getReader()
  if (!reader) throw new FlexError("Gegevens ontbreken.")
  const chunks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > maxBytes) { await reader.cancel(); throw new FlexError("Het bestand is te groot.", 413) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks).toString("utf8")
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) throw new FlexError("Ongeldige herkomst.", 403)
}
export function flexResponse(error: unknown) {
  if (error instanceof FlexError) return Response.json({ error: error.message }, { status: error.status })
  if (error instanceof SyntaxError || error instanceof ZodError) return Response.json({ error: "Ongeldige gegevens. Controleer de invoer." }, { status: 400 })
  return Response.json({ error: "Opslaan is mislukt. Vernieuw de pagina en probeer opnieuw." }, { status: 500 })
}
