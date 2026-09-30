import {randomBytes} from "node:crypto"
import {NextResponse} from "next/server"
import {createAdminClient} from "@/lib/supabase/admin"
import {hashSecret} from "@/lib/quotes/server"
import {portalCookie,privateHeaders} from "@/lib/quotes/portal"
import {checkRateLimit,getRateLimitKey} from "@/lib/rate-limit"

// Fragment-based links keep the secret out of request URLs and HTTP access logs.
export async function POST(request:Request) {
  if(request.headers.get("origin")!==new URL(request.url).origin)return new Response(null,{status:403,headers:privateHeaders})
  const limit=await checkRateLimit(getRateLimitKey(request,"portal-session"),30,60000)
  if(!limit.allowed)return new Response(null,{status:limit.reason?503:429,headers:privateHeaders})
  const body=await request.text()
  if(body.length>256)return new Response(null,{status:400,headers:privateHeaders})
  let token:unknown
  try{token=JSON.parse(body).token}catch{return new Response(null,{status:400,headers:privateHeaders})}
  if(typeof token!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(token))return new Response(null,{status:400,headers:privateHeaders})
  const admin=await createAdminClient()
  const {data:access}=await admin.from("customer_request_access").select("id,expires_at").eq("token_hash",hashSecret(token)).is("revoked_at",null).gt("expires_at",new Date().toISOString()).single()
  const response=NextResponse.json({success:!!access},{status:access?200:403,headers:privateHeaders})
  response.cookies.delete(portalCookie)
  if(!access)return response
  const session=randomBytes(32).toString("base64url")
  const {error}=await admin.from("customer_request_sessions").insert({session_hash:hashSecret(session),access_id:access.id,expires_at:new Date(Math.min(Date.now()+86400000,new Date(access.expires_at).getTime())).toISOString()})
  if(error)return NextResponse.json({success:false},{status:503,headers:privateHeaders})
  response.cookies.set(portalCookie,session,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:86400})
  return response
}
