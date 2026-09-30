import { randomInt, randomUUID } from "node:crypto"
import { z } from "zod"
import { portalAccess, portalVersion, privateHeaders } from "@/lib/quotes/portal"
import { hashSecret, requireQuoteWrites, sendPortalMail } from "@/lib/quotes/server"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { portalCopy } from "@/lib/quotes/i18n"

const inputSchema = z.discriminatedUnion("action",[
  z.object({action:z.literal("code"),versionId:z.string().uuid(),decision:z.enum(["accepted","declined"])}),
  z.object({action:z.literal("decide"),codeId:z.string().uuid(),code:z.string().regex(/^\d{6}$/),name:z.string().trim().min(2).max(200),note:z.string().max(2000),confirmed:z.literal(true)}),
  z.object({action:z.literal("message"),body:z.string().trim().min(1).max(8000),key:z.string().uuid()}),
])
export async function POST(request:Request) {
  if (request.headers.get("origin")!==new URL(request.url).origin) return Response.json({error:"Ongeldige herkomst."},{status:403,headers:privateHeaders})
  try {
    requireQuoteWrites()
    const raw = await request.text()
    if (raw.length>12000) return Response.json({error:"Bericht te groot."},{status:413,headers:privateHeaders})
    const input = inputSchema.parse(JSON.parse(raw))
    const context = await portalAccess()
    for (const key of [getRateLimitKey(request,`portal-${input.action}`),`portal-${input.action}:${context.access.id}`]) {
      const limit = await checkRateLimit(key,input.action==="code"?3:15,600000)
      if (!limit.allowed) return Response.json({error:limit.reason?"Tijdelijk niet beschikbaar.":"Te veel pogingen. Probeer later opnieuw."},{status:limit.reason?503:429,headers:privateHeaders})
    }
    if (input.action==="code") {
      const {version} = await portalVersion(input.versionId)
      if (version.status!=="offered" || new Date(version.valid_until).getTime()<=Date.now()) throw new Error("Deze offerte is niet meer beschikbaar.")
      const code = String(randomInt(100000,1000000)), id=randomUUID()
      const {error} = await context.admin.from("quote_decision_codes").insert({id,access_id:context.access.id,version_id:version.id,decision:input.decision,code_hash:hashSecret(`${id}:${code}`),expires_at:new Date(Date.now()+600000).toISOString()})
      if (error) throw new Error("Code kon niet worden gemaakt.")
      const copy=portalCopy(context.request.locale)
      await sendPortalMail(context.access.email,copy.codeSubject,`${copy.codePurpose}: ${copy[input.decision]}. ${copy.codeBody}: ${code}`)
      return Response.json({codeId:id},{headers:privateHeaders})
    }
    if (input.action==="decide") {
      const {data,error} = await context.admin.rpc("decide_quote",{p_session:context.sessionHash,p_code_id:input.codeId,p_hash:hashSecret(`${input.codeId}:${input.code}`),p_name:input.name,p_note:input.note})
      if (error || data!=="ok") throw new Error(error?"De keuze kon niet worden opgeslagen.":data)
      // Persisted decision is authoritative even when notification delivery fails.
      const {data:business} = await context.admin.from("businesses").select("email").eq("id",context.request.business_id).single()
      if (business?.email) { try { await sendPortalMail(business.email,"Klant heeft gereageerd op offerte",`Er is een reactie op de offerte van ${context.request.name}. Open Offertes in de editor voor de keuze en vervolgstap.`) } catch { /* visible in quotes even without mail */ } }
    } else {
      const {error} = await context.admin.from("contact_request_messages").upsert({contact_request_id:context.request.id,business_id:context.request.business_id,direction:"inbound",sender_email:context.access.email,sender_name:context.request.name,subject:"Bericht via klantpagina",body:input.body,delivery_status:"received",customer_visible:true,idempotency_key:`portal:${context.request.id}:${input.key}`},{onConflict:"idempotency_key",ignoreDuplicates:true})
      if (error) throw new Error("Bericht kon niet worden opgeslagen.")
      await context.admin.from("contact_requests").update({last_activity_at:new Date().toISOString()}).eq("id",context.request.id)
    }
    return Response.json({success:true},{headers:privateHeaders})
  } catch(error) { return Response.json({error:error instanceof z.ZodError?"Controleer uw invoer.":error instanceof Error?error.message:"Actie mislukt."},{status:400,headers:privateHeaders}) }
}
