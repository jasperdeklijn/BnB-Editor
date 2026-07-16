import Link from "next/link"
import Image from "next/image"
import { PLATFORM_BRAND_NAME, PLATFORM_EMAILS } from "@/lib/platform"

const legalLinks = [
  { href: "/terms", label: "Algemene voorwaarden" },
  { href: "/privacy", label: "Privacyverklaring" },
  { href: "/cookies", label: "Cookiebeleid" },
  { href: "/processor-agreement", label: "Verwerkersovereenkomst" },
  { href: "/acceptable-use", label: "Acceptable Use" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/status", label: "Status" },
]

export function SharedFooter() {
  return (
    <footer className="border-t border-white/10 bg-[var(--landing-footer)] px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-3" aria-label={`${PLATFORM_BRAND_NAME} homepage`}>
              <Image
                src="/logo_klein.png"
                alt={PLATFORM_BRAND_NAME}
                width={1536}
                height={1024}
                className="h-12 w-auto object-contain"
              />
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
            <nav className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1" aria-label="Juridische links">
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-xs text-white/60 transition-colors hover:text-white">
                  {link.label}
                </Link>
              ))}
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
