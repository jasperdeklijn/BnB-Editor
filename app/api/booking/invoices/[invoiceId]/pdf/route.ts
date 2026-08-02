import { NextResponse } from "next/server"

import { ensureIssuedInvoicePdf, markInvoiceDownloaded } from "@/lib/booking/invoicing"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request, context: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await context.params
  const limit = checkRateLimit(getRateLimitKey(request, "booking_invoice_pdf"), 30, 5 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: "Te veel PDF-verzoeken." }, { status: 429 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: invoice } = await supabase.from("booking_invoices").select("id").eq("id", invoiceId).maybeSingle()
  if (!invoice) return NextResponse.json({ error: "Factuur niet gevonden." }, { status: 404 })
  try {
    const result = await ensureIssuedInvoicePdf(invoiceId)
    await markInvoiceDownloaded(invoiceId)
    const filename = `${(result.invoice.invoice_number || "factuur").replace(/[^A-Za-z0-9-]/g, "_")}.pdf`
    return new NextResponse(Buffer.from(result.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "Factuur-PDF kon niet worden geladen." }, { status: 500 })
  }
}
