import "server-only"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashSecret } from "./server"

export const portalCookie = "fp_request_session"
export const privateHeaders = {"Cache-Control":"private, no-store, max-age=0","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow"}
export async function portalAccess() {
  const token = (await cookies()).get(portalCookie)?.value
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Uw toegang is verlopen. Vraag de ondernemer om een nieuwe link.")
  const admin = await createAdminClient()
  const { data: session } = await admin.from("customer_request_sessions").select("access_id,expires_at").eq("session_hash",hashSecret(token)).single()
  if (!session || new Date(session.expires_at).getTime()<=Date.now()) throw new Error("Uw toegang is verlopen.")
  const { data: access } = await admin.from("customer_request_access").select("id,request_id,email,expires_at,revoked_at").eq("id",session.access_id).single()
  if (!access || access.revoked_at || new Date(access.expires_at).getTime()<=Date.now()) throw new Error("Uw toegang is verlopen.")
  const { data: request } = await admin.from("contact_requests").select("id,business_id,name,email,service,message,preferred_date,status,created_at,locale").eq("id",access.request_id).single()
  if (!request || request.email.toLowerCase()!==access.email.toLowerCase()) throw new Error("Uw toegang is verlopen.")
  return {admin,access,request,sessionHash:hashSecret(token)}
}
export async function portalVersion(id: string) {
  const context = await portalAccess()
  const { data: quote } = await context.admin.from("quotes").select("id,number").eq("request_id",context.request.id).eq("business_id",context.request.business_id).single()
  if (!quote) throw new Error("Offerte niet gevonden.")
  const { data: version } = await context.admin.from("quote_versions").select("id,quote_id,status,valid_until,snapshot,pdf_base64,version").eq("id",id).eq("quote_id",quote.id).neq("status","draft").single()
  if (!version) throw new Error("Offerte niet gevonden.")
  return {...context,quote,version}
}
