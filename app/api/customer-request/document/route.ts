import { portalAccess, portalVersion, privateHeaders } from "@/lib/quotes/portal"
import { ensureIssuedInvoicePdf } from "@/lib/booking/invoicing"
import { z } from "zod"

export async function GET(request:Request) {
  try {
    const params=new URL(request.url).searchParams
    const id=z.string().uuid().parse(params.get("id"))
    let bytes:Uint8Array
    if(params.get("type")==="invoice") {
      const {admin,access,request:inquiry}=await portalAccess()
      const {data:entries,error:entryError}=await admin.from("calendar_entries").select("id").eq("contact_request_id",access.request_id).eq("business_id",inquiry.business_id)
      if(entryError || !entries?.length) throw new Error("Niet gevonden")
      const {data:invoice}=await admin.from("booking_invoices").select("id").eq("id",id).eq("business_id",inquiry.business_id).in("calendar_entry_id",entries.map(e=>e.id)).in("status",["issued","credited"]).single()
      if(!invoice) throw new Error("Niet gevonden")
      bytes=(await ensureIssuedInvoicePdf(id)).bytes
      await admin.from("booking_invoices").update({first_downloaded_at:new Date().toISOString()}).eq("id",id).is("first_downloaded_at",null)
    } else { const {version}=await portalVersion(id); if(!version.pdf_base64) throw new Error("Niet gevonden"); bytes=Buffer.from(version.pdf_base64,"base64") }
    return new Response(new Uint8Array(bytes),{headers:{...privateHeaders,"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=document.pdf"}})
  } catch {return new Response("Document niet beschikbaar.",{status:404,headers:privateHeaders})}
}
