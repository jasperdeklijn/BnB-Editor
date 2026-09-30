import type { BookingFinancialLine, InvoiceParty } from "@/lib/booking/pricing"

export type QuoteStatus = "draft" | "offered" | "accepted" | "declined" | "withdrawn" | "superseded"
export interface QuoteSnapshot {
  locale?: string
  seller: InvoiceParty
  customer: InvoiceParty
  lines: BookingFinancialLine[]
  subtotalMinor: number
  vatTotalMinor: number
  totalMinor: number
  terms: string
  title: string
}
export interface QuoteVersion {
  id: string
  quote_id: string
  version: number
  revision: number
  status: QuoteStatus
  snapshot: QuoteSnapshot
  valid_until: string | null
  offered_at: string | null
  decided_at: string | null
  decision_name: string | null
  decision_note: string | null
}
export const quoteLabels: Record<QuoteStatus | "expired", string> = {
  draft: "Concept", offered: "Aangeboden", accepted: "Geaccepteerd", declined: "Afgewezen",
  withdrawn: "Ingetrokken", superseded: "Vervangen", expired: "Verlopen",
}
export function quoteStatus(version: Pick<QuoteVersion, "status" | "valid_until">) {
  return version.status === "offered" && version.valid_until && new Date(version.valid_until).getTime() <= Date.now() ? "expired" : version.status
}
export const decisionStatement = "Ik bevestig mijn keuze voor deze offerteversie en de bijbehorende voorwaarden. Akkoord bevestigt nog geen nieuw tijdslot."
