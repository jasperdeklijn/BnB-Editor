import Link from "next/link"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CustomerSearch({ query = "", action = "/admin/customers", days, filter }: { query?: string; action?: string; days?: number; filter?: string }) {
  return <form method="get" action={action} className="flex flex-col gap-3 sm:flex-row">
    {days ? <input type="hidden" name="days" value={days} /> : null}
    {filter ? <input type="hidden" name="filter" value={filter} /> : null}
    <label className="relative min-w-0 flex-1"><span className="sr-only">Zoek klant, e-mailadres, website of domein</span><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" /><Input name="q" type="search" defaultValue={query} placeholder="Zoek klant, e-mailadres, website of domein" maxLength={200} className="h-11 bg-background pl-10" /></label>
    <Button type="submit" className="h-11">Zoeken</Button>{query ? <Button variant="outline" asChild className="h-11"><Link href={`${action}?${new URLSearchParams({ ...(days ? { days: String(days) } : {}), ...(filter ? { filter } : {}) })}`}>Wissen</Link></Button> : null}
  </form>
}
