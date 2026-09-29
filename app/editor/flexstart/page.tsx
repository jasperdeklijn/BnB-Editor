import Link from "next/link"
import { redirect } from "next/navigation"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { TransferRequestForm } from "@/components/flexstart/request-form"
import { TransferDetail } from "@/components/flexstart/transfer-detail"
import { flexContext, loadTransferDetail, FlexError } from "@/lib/flexstart/server"
import type { TransferRequest, TransferDetail as Detail } from "@/lib/flexstart/shared"

export const metadata = { title: "FlexStart — website overnemen" }
export default async function FlexStartPage() {
  let detail: Detail | null = null; let remaining = 0; let error = ""
  try {
    const { user, db } = await flexContext()
    const [requests, offer] = await Promise.all([
      db.from("website_transfer_requests").select("*").eq("user_id", user.id).maybeSingle(),
      db.from("website_transfer_offer").select("claimed").eq("singleton", true).single(),
    ])
    if (requests.error || offer.error) throw new Error("unavailable")
    remaining = Math.max(0, 100 - offer.data.claimed)
    if (requests.data) detail = await loadTransferDetail(db, requests.data as TransferRequest, false)
  } catch (cause) {
    if (cause instanceof FlexError && cause.status === 401) redirect("/auth/login")
    error = "FlexStart is tijdelijk niet beschikbaar. Probeer het later opnieuw."
  }
  return <EditorPageShell title="FlexStart — website overnemen" description="Geef ons je huidige website. Wij zetten een vernieuwde versie klaar; jij houdt de controle." maxWidth="full" actions={<Link href="/editor/flexcheck" className="text-sm text-primary underline">Mijn website controleren</Link>}>
    {error ? <p role="alert" className="rounded-xl border bg-card p-4">{error}</p> : detail ? <TransferDetail key={`${detail.request.id}-${detail.request.revision}`} detail={detail} /> : <div className="mx-auto w-full max-w-4xl"><TransferRequestForm remaining={remaining} /></div>}
  </EditorPageShell>
}
