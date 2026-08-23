import { Skeleton } from "@/components/ui/skeleton"
import { EditorPageShell } from "@/components/editor/editor-page-shell"

export default function ReservationsLoading() {
  return (
    <EditorPageShell title="Reserveringen" description="Alle reserveringen en statussen laden." maxWidth="full">
      <div className="grid gap-4" aria-label="Reserveringen laden">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24" />)}
        </div>
        <Skeleton className="h-28" />
        <Skeleton className="h-96" />
      </div>
    </EditorPageShell>
  )
}
