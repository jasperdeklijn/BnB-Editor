import Link from "next/link"
import Image from "next/image"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"

interface SharedHeaderProps {
  title?: string
}

export function SharedHeader({ title }: SharedHeaderProps) {
  return (
    <header className="bg-[var(--hero-bg)]/95 backdrop-blur border-b border-[var(--brand-blue)]/20 sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Image
            src="/logo_klein.png"
            alt={PLATFORM_BRAND_NAME}
            width={1536}
            height={1024}
            className="h-12 w-auto object-contain"
          />
        </Link>

        {/* Title or Nav */}
        {title && (
          <h1 className="text-lg font-semibold text-white">{title}</h1>
        )}

        {/* Links */}
        <nav className="flex items-center gap-6" aria-label="Hoofdnavigatie">
          <Link
            href="/"
            className="text-sm text-white/70 hover:text-[var(--brand-blue)] transition-colors"
          >
            Home
          </Link>
        </nav>
      </div>
    </header>
  )
}

