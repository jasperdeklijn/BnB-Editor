import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET ? "Bearer " + process.env.CRON_SECRET : ""
  const actual = request.headers.get("authorization") ?? ""
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(actual) || !timingSafeEqual(Buffer.from(expected),Buffer.from(actual))) return NextResponse.json({error:"Unauthorized"},{status:401})
  const admin = await createAdminClient()
  const { error } = await admin.rpc("cleanup_website_analytics")
  return NextResponse.json(error ? {error:"Cleanup failed"} : {success:true},{status:error?500:200})
}
