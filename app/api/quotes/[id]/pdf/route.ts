import { ownerVersion } from "@/lib/quotes/server"
import { createQuotePdf } from "@/lib/quotes/pdf"
import { privateHeaders } from "@/lib/quotes/portal"

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params,{db,version,quote}=await ownerVersion(id)
    const {data}=await db.from("quote_versions").select("pdf_base64").eq("id",id).single()
    const bytes=data?.pdf_base64?Buffer.from(data.pdf_base64,"base64"):await createQuotePdf(version.snapshot,`CONCEPT O-${quote.number}-v${version.version}`,version.valid_until||new Date().toISOString())
    return new Response(new Uint8Array(bytes),{headers:{...privateHeaders,"Content-Type":"application/pdf","Content-Disposition":`inline; filename=offerte-${quote.number}.pdf`}})
  } catch {return new Response("Document niet beschikbaar. Sla eerst het concept op.",{status:404,headers:privateHeaders})}
}
