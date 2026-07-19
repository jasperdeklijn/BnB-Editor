import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function SectionCanvasSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-lg border border-border bg-background", className)}>
      <Skeleton className="h-44 w-full rounded-none sm:h-56" />
      <div className="space-y-3 p-5 sm:p-7">
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="mt-4 h-9 w-28" />
      </div>
    </div>
  )
}

export function SectionEditorSkeleton() {
  return (
    <div className="h-full w-full space-y-5 overflow-hidden p-4 md:p-6" role="status" aria-label="Sectie-editor laden">
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <span className="sr-only">Sectie-editor wordt geladen</span>
    </div>
  )
}

export function EditorWorkspaceSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-0 flex-1 overflow-hidden bg-muted", className)} role="status" aria-label="Editor laden">
      <aside className="hidden w-64 shrink-0 space-y-3 border-r border-border bg-background p-4 md:block">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-4 w-2/3" />
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="flex gap-3 rounded-lg border border-border p-3">
            <Skeleton className="h-9 w-9 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden p-3 sm:p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <SectionCanvasSkeleton />
          <div className="grid gap-4 sm:grid-cols-2">
            <SectionCanvasSkeleton className="hidden sm:block" />
            <SectionCanvasSkeleton className="hidden sm:block" />
          </div>
        </div>
      </main>

      <aside className="hidden w-80 shrink-0 border-l border-border bg-background xl:block">
        <SectionEditorSkeleton />
      </aside>
      <span className="sr-only">Website-editor wordt geladen</span>
    </div>
  )
}
