import Link from "next/link"
import Image from "next/image"

export function LandingFooter() {
  return (
    <footer className="bg-[var(--hero-bg)] border-t border-[var(--brand-blue)]/20 px-6 py-12">
      <div className="mx-auto max-w-6xl flex flex-col items-center gap-6 md:flex-row md:justify-between">
        {/* Brand */}
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="Website Maker"
            width={140}
            height={40}
            className="h-10 w-auto"
          />
        </div>

        {/* Links */}
        <nav className="flex gap-6" aria-label="Footer navigatie">
          <Link href="/auth/sign-up" className="text-sm text-white/40 hover:text-[var(--brand-blue)] transition-colors">
            Registreren
          </Link>
          <Link href="/auth/login" className="text-sm text-white/40 hover:text-[var(--brand-blue)] transition-colors">
            Inloggen
          </Link>
          <Link href="#functies" className="text-sm text-white/40 hover:text-[var(--brand-blue)] transition-colors">
            Functies
          </Link>
        </nav>

        <p className="text-xs text-white/25">
          &copy; {new Date().getFullYear()} Website Maker
        </p>
      </div>
    </footer>
  )
}

