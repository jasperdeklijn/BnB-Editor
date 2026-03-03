import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6" style={{ background: "var(--hero-bg)" }}>
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] shadow-lg shadow-[var(--brand-purple)]/20">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>

        <div
          className="rounded-2xl border p-8"
          style={{
            background: "var(--hero-surface)",
            borderColor: "rgba(99,102,241,0.2)",
          }}
        >
          <h1 className="text-2xl font-bold text-white mb-2">
            Bedankt voor het aanmelden!
          </h1>
          <p className="text-white/50 leading-relaxed mb-6">
            We hebben een bevestigingsmail gestuurd naar jouw e-mailadres. Klik op de link in de e-mail om je account te activeren.
          </p>

          <div className="rounded-xl border border-[var(--brand-blue)]/20 bg-[var(--hero-bg)] p-4">
            <p className="text-sm text-white/40">
              Geen e-mail ontvangen? Controleer je spamfolder of probeer het opnieuw.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-white/30">
          <Link href="/auth/login" className="hover:text-white/60 transition-colors underline underline-offset-4">
            Naar inloggen
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/" className="hover:text-white/60 transition-colors underline underline-offset-4">
            Terug naar de homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
