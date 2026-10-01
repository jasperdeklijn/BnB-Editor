import Link from "next/link"
import { getEditorGroup, matchesEditorRoute } from "@/lib/editor-navigation"
import { cn } from "@/lib/utils"

export function EditorSubnavigation({ pathname }: { pathname: string | null }) {
  const group = getEditorGroup(pathname)
  if (group?.id === "website" && pathname !== "/editor") return (
    <nav aria-label="Website" className="shrink-0 border-b border-border bg-background px-3 py-1 md:px-8">
      <Link href="/editor" className="inline-flex min-h-11 items-center text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">Terug naar editor</Link>
    </nav>
  )
  if (!group?.tabs.length) return null

  return (
    <nav aria-label={group.label} className="shrink-0 border-b border-border bg-background px-3 py-1 sm:px-4 md:px-8">
      <div className={cn("mx-auto grid w-full max-w-6xl gap-1 sm:flex sm:gap-2", group.tabs.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
        {group.tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} aria-current={matchesEditorRoute(pathname, tab.href) ? "page" : undefined}
            className={cn("inline-flex min-h-11 min-w-0 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-4",
              matchesEditorRoute(pathname, tab.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
