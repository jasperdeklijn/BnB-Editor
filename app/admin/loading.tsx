export default function AdminLoading() {
  return <div role="status" className="space-y-5 p-6"><p className="text-sm text-muted-foreground">Beheergegevens laden…</p><div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((id) => <div key={id} className="h-36 rounded-xl border bg-card motion-safe:animate-pulse" />)}</div></div>
}
