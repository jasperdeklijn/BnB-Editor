import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashSecret } from "@/lib/quotes/server"
import { portalCookie, privateHeaders } from "@/lib/quotes/portal"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"

export async function GET(request: Request, {params}:{params:Promise<{token:string}>}) {
  const {token} = await params
  const response = NextResponse.redirect(new URL("/aanvraag",request.url),303)
  Object.entries(privateHeaders).forEach(([key,value])=>response.headers.set(key,value))
  response.cookies.delete(portalCookie)
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return response
  const limit = await checkRateLimit(getRateLimitKey(request,"portal-link"),30,60000)
  if (!limit.allowed) return new Response("Probeer het later opnieuw.",{status:limit.reason?503:429,headers:privateHeaders})
  const admin = await createAdminClient()
  const {data:access} = await admin.from("customer_request_access").select("id,expires_at").eq("token_hash",hashSecret(token)).is("revoked_at",null).gt("expires_at",new Date().toISOString()).single()
  if (!access) return response
  const session = randomBytes(32).toString("base64url")
  const {error} = await admin.from("customer_request_sessions").insert({session_hash:hashSecret(session),access_id:access.id,expires_at:new Date(Math.min(Date.now()+86400000,new Date(access.expires_at).getTime())).toISOString()})
  if (!error) response.cookies.set(portalCookie,session,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:86400})
  return response
}
