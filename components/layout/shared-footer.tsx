import Link from "next/link"
import { PLATFORM_EMAILS } from "@/lib/platform"
import Image from "next/image"

export function SharedFooter() {
  return (
    <footer className="bg-[var(--hero-bg)]/95 border-t border-[var(--brand-blue)]/20 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <Image
              src="/logo_klein.png"
              alt="Website Maker"
              width={120}
              height={60}
              className="h-10 w-auto"
            />
            <p className="text-xs text-white/50">
              &copy; {new Date().getFullYear()} Website Maker
            </p>
          </div>

          {/* Diensten */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Diensten</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/auth/sign-up" className="text-xs text-white/50 hover:text-[var(--brand-blue)] transition-colors">
                Website maken
              </Link>
              <Link href="/auth/login" className="text-xs text-white/50 hover:text-[var(--brand-blue)] transition-colors">
                Inloggen
              </Link>
              <Link href="/auth/sign-up" className="text-xs text-white/50 hover:text-[var(--brand-blue)] transition-colors">
                Registreren
              </Link>
            </nav>
          </div>

          {/* Bedrijf */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Bedrijf</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/" className="text-xs text-white/50 hover:text-[var(--brand-blue)] transition-colors">
                Over ons
              </Link>
              <Link href="/" className="text-xs text-white/50 hover:text-[var(--brand-blue)] transition-colors">
                Contact
              </Link>
              <a href={`mailto:${PLATFORM_EMAILS.support}`} className="text-xs text-white/50 hover:text-[var(--brand-blue)] transition-colors">
                Support
              </a>
            </nav>
          </div>

          {/* Juridisch */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Juridisch</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/legal/terms" className="text-xs text-white/50 hover:text-[var(--brand-blue)] transition-colors">
                Algemene Voorwaarden
              </Link>
              <Link href="/legal/privacy" className="text-xs text-white/50 hover:text-[var(--brand-blue)] transition-colors">
                Privacyverklaring
              </Link>
              <Link href="/legal/aup" className="text-xs text-white/50 hover:text-[var(--brand-blue)] transition-colors">
                Acceptable Use Policy
              </Link>
              <Link href="/legal/takedown" className="text-xs text-white/50 hover:text-[var(--brand-blue)] transition-colors">
                Notice & Takedown
              </Link>
              <Link href="/legal/disclaimer" className="text-xs text-white/50 hover:text-[var(--brand-blue)] transition-colors">
                Disclaimer
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-[var(--brand-blue)]/10 pt-8">
          <p className="text-xs text-white/30 text-center">
            Website Maker — Platform voor het maken en hosten van jouw website
          </p>
        </div>
      </div>
    </footer>
  )
}


