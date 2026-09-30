import "server-only"
import {createAdminClient} from "@/lib/supabase/admin"
import {quoteWritesEnabled,sendRequestLink} from "./server"

export async function deliverRequestReceipt(requestId:string,businessId:string) {
  if(!quoteWritesEnabled())return
  const admin=await createAdminClient()
  const {data:business}=await admin.from("businesses").select("request_portal_receipt_enabled").eq("id",businessId).single()
  if(!business?.request_portal_receipt_enabled)return
  try {
    await sendRequestLink(requestId,true)
  }catch{
    // Submission remains successful. The owner can resend from the inbox.
    console.error("[request-portal] Receipt could not be delivered",{requestId})
  }
}
