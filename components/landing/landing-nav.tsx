"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--hero-bg)]/90 backdrop-blur border-b border-[var(--brand-blue)]/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="4" width="14" height="9" rx="2" stroke="white" strokeWidth="1.5" />
              <path d="M5 4V3a3 3 0 016 0v1" stroke="white" strokeWidth="1.5" />
              <circle cx="8" cy="8.5" r="1.5" fill="white" />
            </svg>
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">BnB Editor</span>
          <span className="ml-1 rounded-full bg-[var(--brand-purple)]/20 px-2 py-0.5 text-xs font-medium text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
            Demo
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Hoofdnavigatie">
          <Link href="#functies" className="text-sm text-white/70 hover:text-[var(--brand-blue)] transition-colors">
            Functies
          </Link>
          <Link href="#hoe-het-werkt" className="text-sm text-white/70 hover:text-[var(--brand-blue)] transition-colors">
            Hoe het werkt
          </Link>
          <Link href="#voorbeeld" className="text-sm text-white/70 hover:text-[var(--brand-blue)] transition-colors">
            Voorbeeld
          </Link>
        </nav>

        {/* CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Button asChild variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
            <Link href="/auth/login">Inloggen</Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] text-white hover:opacity-90">
            <Link href="/auth/sign-up">Gratis proberen</Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex items-center justify-center rounded-md p-2 text-white/70 hover:text-white md:hidden"
          aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-[var(--brand-blue)]/20 bg-[var(--hero-bg)] px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4" aria-label="Mobiele navigatie">
            <Link href="#functies" className="text-sm text-white/80 hover:text-[var(--brand-blue)]" onClick={() => setMenuOpen(false)}>Functies</Link>
            <Link href="#hoe-het-werkt" className="text-sm text-white/80 hover:text-[var(--brand-blue)]" onClick={() => setMenuOpen(false)}>Hoe het werkt</Link>
            <Link href="#voorbeeld" className="text-sm text-white/80 hover:text-[var(--brand-blue)]" onClick={() => setMenuOpen(false)}>Voorbeeld</Link>
            <div className="flex gap-3 pt-2">
              <Button asChild variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 flex-1">
                <Link href="/auth/login">Inloggen</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] text-white flex-1">
                <Link href="/auth/sign-up">Gratis proberen</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
