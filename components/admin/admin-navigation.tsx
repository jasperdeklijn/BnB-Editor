"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, ClipboardList, Globe2, LayoutDashboard, Mail, Users, ArrowLeft, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/admin", label: "Overzicht", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Klanten", icon: Users },
  { href: "/admin/websites", label: "Websites", icon: Globe2 },
  { href: "/admin/flexstart", label: "FlexStart", icon: ClipboardList },
  { href: "/admin/mailbox", label: "Supportmailbox", icon: Mail },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/leads/settings", label: "Lead-automatisering", icon: Settings },
  { href: "/admin/agents", label: "AI-agentteam", icon: Bot },
  { href: "/admin/audit-logs", label: "Auditlogs", icon: ClipboardList },
]

export function AdminNavigation() {
  const pathname = usePathname()
  const active = links.filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href
  const navigation = <nav aria-label="Beheernavigatie" className="grid gap-1">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", active === href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}><Icon className="size-4 shrink-0" aria-hidden="true" />{label}</Link>)}<Link href="/editor" className="mt-3 flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-4" aria-hidden="true" />Naar de editor</Link></nav>
  return <>
    <aside className="sticky top-20 hidden h-[calc(100dvh-5rem)] w-56 shrink-0 overflow-y-auto border-r bg-card p-4 lg:block">{navigation}</aside>
    <details key={pathname} className="border-b bg-card p-3 lg:hidden"><summary className="cursor-pointer rounded-lg p-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">Beheermenu · {links.find((link) => link.href === active)?.label ?? "Beheer"}</summary><div className="pt-3">{navigation}</div></details>
  </>
}
