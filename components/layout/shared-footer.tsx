import Link from "next/link"
import { PLATFORM_BRAND_INITIALS, PLATFORM_BRAND_NAME, PLATFORM_EMAILS } from "@/lib/platform"

export function SharedFooter() {
  return (
    <footer className="border-t border-white/10 bg-[var(--landing-footer)] px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-3" aria-label={`${PLATFORM_BRAND_NAME} homepage`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-[var(--landing-primary-dark)]">
                {PLATFORM_BRAND_INITIALS}
              </span>
              <span className="text-base font-bold">{PLATFORM_BRAND_NAME}</span>
            </Link>
            <p className="text-xs text-white/60">
              &copy; {new Date().getFullYear()} {PLATFORM_BRAND_NAME}
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Product</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/auth/sign-up" className="text-xs text-white/60 transition-colors hover:text-white">
                Website maken
              </Link>
              <Link href="/auth/login" className="text-xs text-white/60 transition-colors hover:text-white">
                Inloggen
              </Link>
              <Link href="/pricing" className="text-xs text-white/60 transition-colors hover:text-white">
                Prijzen
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Bedrijf</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/" className="text-xs text-white/60 transition-colors hover:text-white">
                Over ons
              </Link>
              <a href={`mailto:${PLATFORM_EMAILS.support}`} className="text-xs text-white/60 transition-colors hover:text-white">
                Support
              </a>
              <a href={`mailto:${PLATFORM_EMAILS.info}`} className="text-xs text-white/60 transition-colors hover:text-white">
                Contact
              </a>
            </nav>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Juridisch</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/legal/terms" className="text-xs text-white/60 transition-colors hover:text-white">
                Algemene Voorwaarden
              </Link>
              <Link href="/legal/privacy" className="text-xs text-white/60 transition-colors hover:text-white">
                Privacyverklaring
              </Link>
              <Link href="/legal/aup" className="text-xs text-white/60 transition-colors hover:text-white">
                Acceptable Use Policy
              </Link>
              <Link href="/legal/takedown" className="text-xs text-white/60 transition-colors hover:text-white">
                Notice & Takedown
              </Link>
              <Link href="/legal/disclaimer" className="text-xs text-white/60 transition-colors hover:text-white">
                Disclaimer
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <p className="text-center text-xs text-white/45">
            {PLATFORM_BRAND_NAME} - platform voor het maken en hosten van jouw website
          </p>
        </div>
      </div>
    </footer>
  )
}
