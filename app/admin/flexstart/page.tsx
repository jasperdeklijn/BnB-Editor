import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { SharedHeader } from "@/components/layout/shared-header"
import { TransferDetail } from "@/components/flexstart/transfer-detail"
import { flexContext, loadTransferDetail, FlexError } from "@/lib/flexstart/server"
import { TRANSFER_STATUSES, type TransferRequest, type TransferDetail as Detail } from "@/lib/flexstart/shared"

export const metadata = { title: "FlexStart | Beheer", robots: { index: false, follow: false } }
export default async function AdminFlexStartPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const params = await searchParams
  let requests: TransferRequest[] = []; let detail: Detail | null = null; let error = ""
  try {
    const { db } = await flexContext(true)
    const result = await db.from("website_transfer_requests").select("*").order("created_at").limit(100)
    if (result.error) throw result.error
    requests = result.data as TransferRequest[]
    const selected = requests.find((r) => r.id === params.request)
    if (selected) detail = await loadTransferDetail(db, selected, true)
  } catch (cause) {
    if (cause instanceof FlexError && cause.status === 401) redirect("/auth/login")
    if (cause instanceof FlexError && cause.status === 403) notFound()
    error = "FlexStart kon niet worden geladen. Controleer de serverconfiguratie en FlexStart-migratie."
  }
  return <div className="min-h-screen bg-muted text-foreground"><SharedHeader title="FlexStart beheer" /><main className="mx-auto max-w-[1600px] space-y-6 p-3 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Overstapverzoeken</h1><p className="mt-2 text-sm text-muted-foreground">Eerste 100 klanten gratis. Bereid het ontwerp voor met de bestaande URL-naar-JSON-procedure.</p></div><Link href="/admin" className="text-sm text-primary underline">Terug naar beheer</Link></div>
    {error ? <p role="alert">{error}</p> : <>
      <nav aria-label="Overstapverzoeken" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{requests.map((r) => <Link key={r.id} href={`/admin/flexstart?request=${r.id}`} aria-current={r.id === detail?.request.id ? "page" : undefined} className={`min-w-0 rounded-xl border bg-card p-4 ${r.id === detail?.request.id ? "ring-2 ring-primary" : ""}`}>
        <p className="font-semibold">{r.business_name}</p><p className="mt-1 break-all text-xs text-muted-foreground">{r.source_url}</p><p className="mt-2 text-sm">{TRANSFER_STATUSES[r.status]} · {r.business_type}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("nl-NL")}{r.website_id ? " · Concept gekoppeld" : ""}{r.review_requested_at && !r.reviewed_at ? " · Review aangevraagd" : ""}</p>
      </Link>)}</nav>
      {!requests.length && <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Er zijn nog geen overstapverzoeken.</p>}
      {detail && <TransferDetail key={`${detail.request.id}-${detail.request.revision}`} detail={detail} admin />}
    </>}
  </main></div>
}
