import Link from "next/link"

export function LandingFooter() {
  return (
    <footer className="bg-[var(--hero-bg)] border-t border-white/10 px-6 py-12">
      <div className="mx-auto max-w-6xl flex flex-col items-center gap-6 md:flex-row md:justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand-blue)]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="4" width="14" height="9" rx="2" stroke="white" strokeWidth="1.5" />
              <path d="M5 4V3a3 3 0 016 0v1" stroke="white" strokeWidth="1.5" />
              <circle cx="8" cy="8.5" r="1.5" fill="white" />
            </svg>
          </div>
          <span className="font-semibold text-white">BnB Editor</span>
          <span className="rounded-full bg-[var(--brand-purple)]/20 px-2 py-0.5 text-xs text-[var(--brand-purple)]">
            Testing demo
          </span>
        </div>

        {/* Links */}
        <nav className="flex gap-6" aria-label="Footer navigation">
          <Link href="/auth/sign-up" className="text-sm text-white/40 hover:text-white transition-colors">
            Sign up
          </Link>
          <Link href="/auth/login" className="text-sm text-white/40 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="#features" className="text-sm text-white/40 hover:text-white transition-colors">
            Features
          </Link>
        </nav>

        <p className="text-xs text-white/25">
          &copy; {new Date().getFullYear()} BnB Editor — Testing environment
        </p>
      </div>
    </footer>
  )
}
