import { NextRequest, NextResponse } from "next/server"

import { getCustomerBookingView } from "@/lib/booking/customer-access"
import { validateBookingReplacementById } from "@/lib/booking/lifecycle"
import { deliverBookingNotifications } from "@/lib/booking/notifications"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"

function value(input: unknown, maximum = 2000) {
  return (typeof input === "string" ? input.trim() : "").slice(0, maximum)
}

async function dispatch(entryId: string) {
  try {
    return await deliverBookingNotifications(entryId)
  } catch (error) {
    console.error("[booking] Customer lifecycle notification failed", error)
    return { sent: 0, failed: 1, skipped: 0 }
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const view = await getCustomerBookingView(token)
  if (!view) return NextResponse.json({ error: "Deze boekingslink is ongeldig of verlopen." }, { status: 404 })
  return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limit = checkRateLimit(getRateLimitKey(request, "booking_manage"), 12, 10 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: "Te veel pogingen. Probeer het later opnieuw." }, { status: 429 })

  const { token } = await params
  const view = await getCustomerBookingView(token)
  if (!view) return NextResponse.json({ error: "Deze boekingslink is ongeldig of verlopen." }, { status: 404 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 })
  const admin = await createAdminClient()

  try {
    if (body.action === "cancel") {
      if (!view.canCancel) return NextResponse.json({ error: "De annuleringstermijn is verstreken." }, { status: 409 })
      const { data: entryId, error } = await admin.rpc("cancel_customer_booking", { p_entry_id: view.entry.id })
      if (error || !entryId) {
        return NextResponse.json({ error: error?.message.includes("CUTOFF") ? "De annuleringstermijn is verstreken." : "Annuleren is niet gelukt." }, { status: 409 })
      }
      const notification = await dispatch(entryId)
      return NextResponse.json({ success: true, notification })
    }

    if (body.action === "request_reschedule") {
      if (!view.canRequestReschedule) return NextResponse.json({ error: "Een verplaatsingsverzoek is niet meer mogelijk." }, { status: 409 })
      const startAt = value(body.startAt, 80)
      const endAt = value(body.endAt, 80)
      const validatedEntry = await validateBookingReplacementById(view.entry.id, startAt, endAt)
      const { error } = await admin.from("booking_change_requests").insert({
        calendar_entry_id: view.entry.id,
        business_id: validatedEntry.business_id,
        request_kind: "reschedule_request",
        requested_by: "customer",
        proposed_start_at: startAt,
        proposed_end_at: endAt,
        customer_message: value(body.message, 1000),
      })
      if (error) {
        return NextResponse.json({ error: error.code === "23505" ? "Er staat al een verplaatsingsverzoek open." : "Het verzoek kon niet worden opgeslagen." }, { status: 409 })
      }
      const notification = await dispatch(view.entry.id)
      return NextResponse.json({ success: true, notification })
    }

    if (body.action === "accept_alternative") {
      const requestId = value(body.requestId, 80)
      const proposal = view.changeRequests.find((item) => item.id === requestId && item.status === "pending" && item.requested_by === "owner" && item.request_kind === "alternative_proposal")
      if (!proposal) return NextResponse.json({ error: "Dit voorstel is niet meer beschikbaar." }, { status: 409 })
      await validateBookingReplacementById(view.entry.id, proposal.proposed_start_at, proposal.proposed_end_at)
      const { data: entryId, error } = await admin.rpc("apply_booking_change_request", { p_request_id: proposal.id, p_actor: "customer", p_resolved_by: null })
      if (error || !entryId) return NextResponse.json({ error: error?.message.includes("SLOT_UNAVAILABLE") ? "Dit tijdstip is niet meer beschikbaar." : "Het voorstel kon niet worden geaccepteerd." }, { status: 409 })
      const notification = await dispatch(entryId)
      return NextResponse.json({ success: true, notification })
    }

    return NextResponse.json({ error: "Onbekende actie." }, { status: 400 })
  } catch (error) {
    console.error("[booking] Customer lifecycle action failed", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "De actie is niet gelukt." }, { status: 400 })
  }
}
