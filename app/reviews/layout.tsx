export const metadata = { title: "Recensies | FlexPagina", robots: { index: false, follow: false }, referrer: "no-referrer" as const }
export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-muted px-4 py-10 text-foreground"><div className="mx-auto w-full max-w-2xl space-y-6">{children}</div></main>
}
