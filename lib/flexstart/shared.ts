import { z } from "zod"
import type { Section } from "../types"
import type { ThemeConfig } from "../themes/types"

export const TRANSFER_STATUSES = {
  requested: "Aangevraagd", processing: "In behandeling", checking: "Controle",
  ready: "Klaar voor jou", corrections: "Correctie gevraagd", approved: "Goedgekeurd", published: "Gepubliceerd",
} as const
export type TransferStatus = keyof typeof TRANSFER_STATUSES
export const STATUS_HELP: Record<TransferStatus, string> = {
  requested: "We hebben je website ontvangen.", processing: "We verwerken de inhoud en uitstraling.",
  checking: "FlexPagina controleert het concept.", ready: "Je kunt het nieuwe ontwerp bekijken.",
  corrections: "Je opmerkingen worden verwerkt.", approved: "Je ontwerp is goedgekeurd. Rond de publicatiecontrole af.",
  published: "Je nieuwe website staat online.",
}
export function isSourceUrl(value: string) {
  try {
    const url = new URL(value)
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && !url.port
      && url.hostname.includes(".") && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/i.test(url.hostname)
      && !/\.(local|localhost|internal)$/i.test(url.hostname) && !/^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname)
  } catch { return false }
}
const line = (max: number) => z.string().trim().max(max)
export const transferSchema = z.object({
  id: z.string().uuid(), source_url: line(2000).refine(isSourceUrl, "Vul een openbaar websiteadres met http:// of https:// in."),
  business_name: line(160).min(1, "Vul je bedrijfsnaam in."), business_type: line(80).min(1),
  services: line(3000).min(1, "Beschrijf je belangrijkste diensten."), city: line(160).min(1, "Vul je plaats in."),
  service_area: line(1000).min(1, "Vul je werkgebied in."), primary_goal: z.enum(["calls", "requests", "bookings"]),
  appearance: line(2000), preferred_colors: line(500), preserve_notes: line(3000), customer_notes: line(4000),
  logo_image_id: z.string().uuid().nullable(), permission: z.literal(true),
}).strict()
export type TransferInput = z.infer<typeof transferSchema>
export interface TransferRequest extends Omit<TransferInput, "permission"> {
  user_id: string; status: TransferStatus; website_id: string | null; revision: number;
  permission_confirmed_at: string; created_at: string; updated_at: string; ready_at: string | null;
  approved_at: string | null; approved_version: string | null; review_requested_at: string | null;
  reviewed_at: string | null; reviewed_version: string | null; review_findings: string;
  published_at: string | null;
}
export interface TransferFeedback { id: string; message: string; created_at: string; resolved_at: string | null }
export type PreviewDesign = { title: string; theme: ThemeConfig; sections: Section[] }
export type CheckItem = { id: string; label: string; state: "ready" | "recommended" | "required"; detail: string; href: string }
export interface CheckResult { items: CheckItem[]; ready: number; total: number; canPublish: boolean; version: string }
export interface TransferDetail {
  request: TransferRequest; feedback: TransferFeedback[]; design: PreviewDesign | null;
  check: CheckResult | null; internalNotes?: string; logoUrl: string | null;
}
