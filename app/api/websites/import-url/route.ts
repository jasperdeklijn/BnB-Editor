import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { readBody, sameOrigin, FlexError } from "@/lib/flexstart/server"
import { readSourcePages, MAX_SOURCE_PAGES } from "@/lib/import/source-site"
import { generateWebsiteImport, websiteAiConfigured } from "@/lib/import/ai-website"

export const runtime="nodejs"
export const maxDuration=120
const input=z.object({action:z.enum(["discover","generate"]),url:z.string().url().max(2048),permission:z.literal(true),pages:z.array(z.string().url().max(2048)).max(MAX_SOURCE_PAGES).optional()}).strict()
export async function POST(request:Request) {
  const client=await createClient()
  const {data:{user},error}=await client.auth.getUser()
  if(error || !user)return Response.json({error:"Log in om een website over te zetten."},{status:401})
  try {
    sameOrigin(request)
    if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"Gebruik JSON-invoer."},{status:415})
    const body=input.parse(JSON.parse(await readBody(request,32768)))
    const limit=await checkRateLimit(`website_url_${body.action}:${user.id}`,body.action==="generate"?3:10,3600000)
    if(limit.reason==="unavailable")return Response.json({error:"De aanvraagcontrole is tijdelijk niet beschikbaar. Probeer later opnieuw."},{status:503})
    if(!limit.allowed)return Response.json({error:"Te veel aanvragen. Probeer het over een uur opnieuw."},{status:429})
    if(body.action==="generate" && !websiteAiConfigured())return Response.json({error:"AI-import is nog niet ingesteld. Configureer de AI Gateway op de server."},{status:503})
    const signal=AbortSignal.any([request.signal,AbortSignal.timeout(110000)])
    const pages=await readSourcePages(body.url,body.action==="generate"?body.pages:undefined,AbortSignal.any([signal,AbortSignal.timeout(45000)]))
    if(body.action==="discover") {
      const home=pages[0]
      return Response.json({url:home.url,title:home.title,pages:[{url:home.url,label:home.title,isHome:true},...home.links.filter(link=>link.url.replace(/\/$/,"")!==home.url.replace(/\/$/,"")).map(link=>({...link,isHome:false}))],maxPages:MAX_SOURCE_PAGES,aiReady:websiteAiConfigured()},{headers:{"Cache-Control":"no-store"}})
    }
    const result=await generateWebsiteImport(pages,signal)
    return Response.json(result,{headers:{"Cache-Control":"no-store"}})
  } catch(error) {
    if(error instanceof FlexError)return Response.json({error:error.message},{status:error.status})
    if(error instanceof z.ZodError || error instanceof SyntaxError)return Response.json({error:"Controleer het websiteadres, de paginakeuze en de toestemming."},{status:400})
    if(request.signal.aborted || error instanceof Error && error.name==="TimeoutError")return Response.json({error:"De analyse duurde te lang. Kies minder pagina's en probeer opnieuw."},{status:408})
    // Provider/network internals can include credential-bearing request metadata.
    const safe=error instanceof Error && !error.name.startsWith("AI_") ? error.message : "De AI kon geen geldig FlexPagina-ontwerp maken. Probeer opnieuw."
    return Response.json({error:safe},{status:422})
  }
}
