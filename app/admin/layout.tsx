import Link from "next/link"
import { AdminNavigation } from "@/components/admin/admin-navigation"
import { requireAdmin } from "@/lib/admin/server"

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return <div className="min-h-screen bg-muted text-foreground">
    <a href="#admin-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">Naar inhoud</a>
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between gap-4 border-b bg-card px-4 sm:px-6"><Link href="/admin" className="font-bold text-primary">FlexPagina <span className="ml-2 text-sm font-normal text-muted-foreground">Beheer</span></Link><Link href="/editor" className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring">Naar de editor</Link></header>
    <div className="flex flex-col lg:flex-row"><AdminNavigation /><div id="admin-content" tabIndex={-1} className="min-w-0 flex-1">{children}</div></div>
  </div>
}
