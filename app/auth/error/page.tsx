import Link from "next/link"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6" style={{ background: "var(--hero-bg)" }}>
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-[var(--brand-purple)] shadow-lg shadow-red-500/20">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" />
            <path d="M12 8v4M12 16h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <div
          className="rounded-2xl border p-8"
          style={{
            background: "var(--hero-surface)",
            borderColor: "rgba(239,68,68,0.2)",
          }}
        >
          <h1 className="text-2xl font-bold text-white mb-2">
            Er is iets misgegaan
          </h1>
          {params?.error ? (
            <p className="text-white/50 leading-relaxed mb-6">
              {"Foutcode: "}
              <code className="rounded bg-red-500/10 px-2 py-0.5 text-sm text-red-400 border border-red-500/20">
                {params.error}
              </code>
            </p>
          ) : (
            <p className="text-white/50 leading-relaxed mb-6">
              Er is een onbekende fout opgetreden. Probeer het opnieuw.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Opnieuw inloggen
            </Link>
            <Link
              href="/"
              className="text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Terug naar de homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
