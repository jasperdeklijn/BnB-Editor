import Link from "next/link"
import { redirect } from "next/navigation"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { CheckPanel } from "@/components/flexstart/check-panel"
import { flexContext, loadWebsiteCheck, FlexError } from "@/lib/flexstart/server"
import type { CheckResult } from "@/lib/flexstart/shared"

export const metadata = { title: "FlexCheck | Websitecontrole" }
export default async function FlexCheckPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const params = await searchParams
  let sites: Array<{ id: string; title: string }> = []; let check: CheckResult | null = null; let selected = ""; let error = ""
  try {
    const { user, db } = await flexContext()
    const result = await db.from("websites").select("id,title").eq("user_id", user.id).order("created_at")
    if (result.error) throw result.error
    sites = result.data
    selected = sites.find((s) => s.id === params.websiteId)?.id || sites[0]?.id || ""
    if (selected) check = (await loadWebsiteCheck(db, selected, user.id)).check
  } catch (cause) {
    if (cause instanceof FlexError && cause.status === 401) redirect("/auth/login")
    error = "FlexCheck is tijdelijk niet beschikbaar. Probeer het later opnieuw."
  }
  return <EditorPageShell title="FlexCheck" description="Bekijk wat al gereed is en welke onderdelen aandacht nodig hebben." actions={<Link href="/editor/flexstart" className="text-sm text-primary underline">Bestaande website overnemen</Link>}>
    <nav className="flex flex-wrap gap-2" aria-label="Website kiezen">{sites.map((s) => <Link href={`/editor/flexcheck?websiteId=${s.id}`} key={s.id} aria-current={s.id === selected ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm ${s.id === selected ? "bg-primary text-primary-foreground" : "bg-card"}`}>{s.title}</Link>)}</nav>
    {error ? <p role="alert">{error}</p> : check ? <CheckPanel key={selected} check={check} websiteId={selected} /> : <p>Maak eerst een websiteconcept in de editor.</p>}
  </EditorPageShell>
}
