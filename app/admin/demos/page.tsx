import { DemoDashboard } from "@/components/admin/demo-dashboard"
import { adminDatabase, allRows } from "@/lib/admin/server"
import { demoSummaryColumns } from "@/lib/demos/server"
import type { DemoSummary } from "@/lib/demos/shared"

export const metadata = { title: "Demowebsites | Beheer" }

export default async function DemosPage() {
  const db = await adminDatabase()
  let demos: DemoSummary[] = []
  let error = ""
  try {
    demos = await allRows<DemoSummary>((from, to) => db.from("demo_websites").select(demoSummaryColumns)
      .order("created_at", { ascending: false }).order("id").range(from, to))
  } catch {
    error = "De demo’s konden niet worden geladen. Controleer de serverconfiguratie en of de demo-migratie is geïnstalleerd."
  }
  return <DemoDashboard demos={demos} loadError={error} />
}
