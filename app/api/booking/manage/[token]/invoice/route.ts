import { NextRequest, NextResponse } from "next/server"

import { getCustomerBookingView } from "@/lib/booking/customer-access"
import { ensureIssuedInvoicePdf, markInvoiceDownloaded } from "@/lib/booking/invoicing"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limit = checkRateLimit(getRateLimitKey(request, "customer_invoice_pdf"), 20, 10 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: "Te veel PDF-verzoeken." }, { status: 429 })
  const { token } = await params
  const view = await getCustomerBookingView(token)
  if (!view) return NextResponse.json({ error: "Deze boekingslink is ongeldig of verlopen." }, { status: 404 })
  const invoiceId = request.nextUrl.searchParams.get("invoiceId") || ""
  if (!view.invoices.some((invoice) => invoice.id === invoiceId)) return NextResponse.json({ error: "Factuur niet gevonden." }, { status: 404 })
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
