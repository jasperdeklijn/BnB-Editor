"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { randomUUID } from "node:crypto"
import { validateBookingReplacement } from "@/lib/booking/lifecycle"
import { createAdminClient } from "@/lib/supabase/admin"
import { ownerContext, ownerQuote, ownerVersion, saveQuote, offerQuote, emailQuote, sendRequestLink } from "@/lib/quotes/server"

export async function quoteAction(input: {action:string;id?:string;revision?:number;snapshot?:unknown;until?:string;requestId?:string;entryId?:string;message?:string;key?:string;email?:string;serviceId?:string;startAt?:string;endAt?:string}) {
  try {
    const {user,db}=await ownerContext(true)
    const admin=await createAdminClient()
    let quoteId=input.id
    if(input.action==="start"||input.action==="revise") {
      const {data,error}=await admin.rpc("start_quote",{p_owner:user.id,p_request:input.requestId?z.string().uuid().parse(input.requestId):null,p_entry:input.entryId?z.string().uuid().parse(input.entryId):null,p_new_version:input.action==="revise"})
      if(error) throw new Error(error.message)
      quoteId=data
    } else if(input.action==="schedule") {
      const {quote}=await ownerQuote(input.id!,true)
      const serviceId=z.string().uuid().parse(input.serviceId),startAt=z.string().datetime().parse(input.startAt),endAt=z.string().datetime().parse(input.endAt)
      await validateBookingReplacement({id:randomUUID(),business_id:quote.business_id,service_id:serviceId,contact_request_id:quote.request_id,entry_type:"appointment",status:"pending",source:"manual",title:"",customer_name:"",customer_email:"",customer_phone:"",start_at:startAt,end_at:endAt,all_day:false,timezone:"Europe/Amsterdam",internal_notes:"",metadata:{},created_at:new Date().toISOString(),updated_at:new Date().toISOString()},startAt,endAt)
      const {data,error}=await admin.rpc("schedule_quote",{p_quote:quote.id,p_owner:user.id,p_service:serviceId,p_start:startAt,p_end:endAt})
      if(error)throw new Error(error.message)
      revalidatePath("/editor/calendar");revalidatePath("/aanvraag")
      return {success:true as const,href:`/editor/calendar?booking=${data}`}
    } else if(input.action==="save") await saveQuote(input.id!,input.revision!,input.snapshot,input.until!)
    else if(input.action==="offer") await offerQuote(input.id!,input.revision!)
    else if(input.action==="email") await emailQuote(input.id!)
    else if(input.action==="withdraw") {
      await ownerVersion(input.id!,true)
      const {error}=await admin.rpc("transition_quote",{p_id:input.id,p_revision:input.revision,p_action:"withdraw"})
      if(error) throw new Error("Intrekken mislukt. Vernieuw de pagina.")
    } else if(input.action==="invoice") {
      await ownerVersion(input.id!,true)
      const {data,error}=await admin.rpc("invoice_from_quote",{p_version:input.id,p_owner:user.id})
      if(error) throw new Error(error.message)
      const {data:invoice}=await db.from("booking_invoices").select("calendar_entry_id").eq("id",data).single()
      return {success:true as const,href:`/editor/calendar?booking=${invoice?.calendar_entry_id}`}
    } else if(input.action==="receipt-setting") {
      const {data:business,error}=await db.from("businesses").update({request_portal_receipt_enabled:input.message==="true"}).eq("user_id",user.id).eq("id",z.string().uuid().parse(input.id)).select("id").single()
      if(error||!business) throw new Error("Instelling kon niet worden opgeslagen.")
    } else if(["link","revoke","message","contact"].includes(input.action)) {
      let requestId=input.requestId
      if(input.id) requestId=(await ownerQuote(input.id,true)).quote.request_id
      const {data:request}=await db.from("contact_requests").select("id,business_id,email").eq("id",z.string().uuid().parse(requestId)).single()
      if(!request) throw new Error("Aanvraag niet gevonden.")
      if(input.action==="revoke" || input.action==="contact") {
        const {error}=await admin.from("customer_request_access").update({revoked_at:new Date().toISOString()}).eq("request_id",request.id).is("revoked_at",null)
        if(error) throw new Error("Toegang kon niet worden ingetrokken.")
        if(input.action==="contact") {
          const email=z.string().email().max(254).parse(input.email)
          const {error:contactError}=await admin.from("contact_requests").update({email}).eq("id",request.id).eq("business_id",request.business_id)
          if(contactError) throw new Error("E-mailadres kon niet worden opgeslagen.")
        }
      } else if(input.action==="link") {
        await sendRequestLink(request.id)
      } else {
        const body=z.string().trim().min(1).max(8000).parse(input.message)
        const key=z.string().uuid().parse(input.key)
        const {error}=await admin.from("contact_request_messages").upsert({contact_request_id:request.id,business_id:request.business_id,direction:"outbound",subject:"Bericht op uw klantpagina",body,customer_visible:true,delivery_status:"received",idempotency_key:`owner-portal:${request.id}:${key}`},{onConflict:"idempotency_key",ignoreDuplicates:true})
        if(error) throw new Error("Bericht kon niet worden geplaatst.")
      }
    } else throw new Error("Onbekende actie.")
    revalidatePath("/editor/quotes");revalidatePath("/editor/requests");revalidatePath("/editor/calendar");revalidatePath("/aanvraag")
    return {success:true as const,quoteId}
  } catch(error) {return {success:false as const,error:error instanceof z.ZodError?"Controleer uw invoer.":error instanceof Error?error.message:"Actie mislukt."}}
}
