"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"
import { MARKETING_TEST_LABEL } from "@/lib/marketing"

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setIsLoggedIn(!!data.session)
      } catch (error) {
        console.error("Error checking session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setIsLoggedIn(false)
      router.push("/")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const handleNavClick = () => setMenuOpen(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--landing-border)] bg-white/92 backdrop-blur">
      <a href="#inhoud" className="sr-only rounded-full bg-white px-5 py-3 font-semibold text-[var(--landing-primary-dark)] focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:outline-2 focus:outline-offset-2">Naar de inhoud</a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-3" aria-label={`${PLATFORM_BRAND_NAME} homepage`}>
            <Image
              src="/logo_klein.png"
              alt={PLATFORM_BRAND_NAME}
              width={1536}
              height={1024}
              priority
              className="h-12 w-auto object-contain"
            />
            <span className="rounded-full border border-[var(--landing-border)] bg-[var(--landing-primary-light)] px-2.5 py-1 text-xs font-semibold text-[var(--landing-primary-dark)]">
              {MARKETING_TEST_LABEL}
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Hoofdnavigatie">
          <Link href="/#voorbeeld" onClick={handleNavClick} className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
            Bekijk demo
          </Link>
          <Link href="/website-maken" onClick={handleNavClick} className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
            Website maken
          </Link>
          <Link href="/voorbeelden" onClick={handleNavClick} className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
            Voorbeeldsites
          </Link>
          <Link href="/pricing" onClick={handleNavClick} className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
            Prijzen
          </Link>
          <Link href="/#faq" onClick={handleNavClick} className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
            FAQ
          </Link>
        </nav>

        {/* CTA */}
        <div className="hidden items-center gap-3 lg:flex">
          {!isLoading && (
            <>
              {isLoggedIn ? (
                <>

                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="text-slate-700 hover:bg-[var(--landing-primary-light)] hover:text-[var(--landing-primary-dark)]"
                  >
                    Uitloggen
                  </Button>
                    <Button asChild className="rounded-full bg-[var(--landing-primary)] text-white shadow-sm hover:bg-[var(--landing-primary-dark)]">
                    <Link href="/editor">Editor</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" className="text-slate-700 hover:bg-[var(--landing-primary-light)] hover:text-[var(--landing-primary-dark)]">
                    <Link href="/auth/login">Inloggen</Link>
                  </Button>
                  <Button asChild className="rounded-full bg-[var(--landing-primary)] text-white shadow-sm hover:bg-[var(--landing-primary-dark)]">
                    <Link href="/auth/sign-up">Testversie proberen</Link>
                  </Button>
                </>
              )}
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex items-center justify-center rounded-md p-2 text-[var(--landing-secondary)] hover:bg-[var(--landing-primary-light)] lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
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
        <div className="border-t border-[var(--landing-border)] bg-white px-6 py-4 lg:hidden">
          <nav id="landing-mobile-menu" className="flex flex-col gap-4" aria-label="Mobiele navigatie">
            <Link href="/website-maken" onClick={handleNavClick} className="text-sm font-medium text-slate-700 hover:text-[var(--landing-primary)]">Website maken</Link>
            <Link href="/voorbeelden" onClick={handleNavClick} className="text-sm font-medium text-slate-700 hover:text-[var(--landing-primary)]">Voorbeeldsites</Link>
            <Link href="/#voorbeeld" onClick={handleNavClick} className="text-sm font-medium text-slate-700 hover:text-[var(--landing-primary)]">Bekijk demo</Link>
            <Link href="/pricing" onClick={handleNavClick} className="text-sm font-medium text-slate-700 hover:text-[var(--landing-primary)]">Prijzen</Link>
            <Link href="/#faq" onClick={handleNavClick} className="text-sm font-medium text-slate-700 hover:text-[var(--landing-primary)]">FAQ</Link>
            <div className="flex gap-3 pt-2">
              {!isLoading && (
                <>
                  {isLoggedIn ? (
                    <>
                      <Button asChild className="flex-1 rounded-full bg-[var(--landing-primary)] text-white hover:bg-[var(--landing-primary-dark)]">
                        <Link href="/editor">Editor</Link>
                      </Button>
                      <Button
                        onClick={handleLogout}
                        variant="ghost"
                        className="flex-1 text-slate-700 hover:bg-[var(--landing-primary-light)] hover:text-[var(--landing-primary-dark)]"
                      >
                        Uitloggen
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="ghost" className="flex-1 text-slate-700 hover:bg-[var(--landing-primary-light)] hover:text-[var(--landing-primary-dark)]">
                        <Link href="/auth/login">Inloggen</Link>
                      </Button>
                      <Button asChild className="flex-1 rounded-full bg-[var(--landing-primary)] text-white hover:bg-[var(--landing-primary-dark)]">
                        <Link href="/auth/sign-up">Testversie proberen</Link>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
