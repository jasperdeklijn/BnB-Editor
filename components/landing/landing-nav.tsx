"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--hero-bg)]/90 backdrop-blur border-b border-[var(--brand-blue)]/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="BnB Website Maken"
            width={160}
            height={48}
            className="h-12 w-auto"
          />
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Hoofdnavigatie">
          <Link href="#voorbeeld" onClick={handleNavClick} className="text-sm text-white/70 hover:text-[var(--brand-blue)] transition-colors">
            Voorbeeld
          </Link>
          <Link href="#functies" onClick={handleNavClick} className="text-sm text-white/70 hover:text-[var(--brand-blue)] transition-colors">
            Functies
          </Link>
          <Link href="#hoe-het-werkt" onClick={handleNavClick} className="text-sm text-white/70 hover:text-[var(--brand-blue)] transition-colors">
            Hoe het werkt
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
                    className="text-white/80 hover:text-white hover:bg-white/10"
                  >
                    Uitloggen
                  </Button>
                    <Button asChild className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] text-white hover:opacity-90">
                    <Link href="/editor">Editor</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                    <Link href="/auth/login">Inloggen</Link>
                  </Button>
                  <Button asChild className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] text-white hover:opacity-90">
                    <Link href="/auth/sign-up">Gratis proberen</Link>
                  </Button>
                </>
              )}
            </>
          )}
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
            <Link href="#functies" onClick={handleNavClick} className="text-sm text-white/80 hover:text-[var(--brand-blue)]">Functies</Link>
            <Link href="#hoe-het-werkt" onClick={handleNavClick} className="text-sm text-white/80 hover:text-[var(--brand-blue)]">Hoe het werkt</Link>
            <Link href="#voorbeeld" onClick={handleNavClick} className="text-sm text-white/80 hover:text-[var(--brand-blue)]">Voorbeeld</Link>
            <div className="flex gap-3 pt-2">
              {!isLoading && (
                <>
                  {isLoggedIn ? (
                    <>
                      <Button asChild className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] text-white flex-1">
                        <Link href="/editor">Editor</Link>
                      </Button>
                      <Button
                        onClick={handleLogout}
                        variant="ghost"
                        className="text-white/80 hover:text-white hover:bg-white/10 flex-1"
                      >
                        Uitloggen
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 flex-1">
                        <Link href="/auth/login">Inloggen</Link>
                      </Button>
                      <Button asChild className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] text-white flex-1">
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
