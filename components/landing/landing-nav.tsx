"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"

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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const href = e.currentTarget.getAttribute("href") || ""
    const targetId = href.replace("#", "")
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setMenuOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--landing-border)] bg-white/92 backdrop-blur">
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
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Hoofdnavigatie">
          <Link href="#voorbeeld" onClick={handleNavClick} className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
            Voorbeeld
          </Link>
          <Link href="#functies" onClick={handleNavClick} className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
            Functies
          </Link>
          <Link href="#hoe-het-werkt" onClick={handleNavClick} className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
            Hoe het werkt
          </Link>
          <Link href="#prijzen" onClick={handleNavClick} className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
            Prijzen
          </Link>
          <Link href="/about" className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
            Over ons
          </Link>
        </nav>

        {/* CTA */}
        <div className="hidden items-center gap-3 md:flex">
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
                    <Link href="/auth/sign-up">Gratis proberen</Link>
                  </Button>
                </>
              )}
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex items-center justify-center rounded-md p-2 text-[var(--landing-secondary)] hover:bg-[var(--landing-primary-light)] md:hidden"
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
        <div className="border-t border-[var(--landing-border)] bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4" aria-label="Mobiele navigatie">
            <Link href="#functies" onClick={handleNavClick} className="text-sm font-medium text-slate-700 hover:text-[var(--landing-primary)]">Functies</Link>
            <Link href="#hoe-het-werkt" onClick={handleNavClick} className="text-sm font-medium text-slate-700 hover:text-[var(--landing-primary)]">Hoe het werkt</Link>
            <Link href="#voorbeeld" onClick={handleNavClick} className="text-sm font-medium text-slate-700 hover:text-[var(--landing-primary)]">Voorbeeld</Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-700 hover:text-[var(--landing-primary)]">Prijzen</Link>
            <Link href="/about" className="text-sm font-medium text-slate-700 hover:text-[var(--landing-primary)]">Over ons</Link>
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
                        <Link href="/auth/sign-up">Gratis proberen</Link>
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

