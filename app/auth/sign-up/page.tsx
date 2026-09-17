"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PLATFORM_BRAND_INITIALS, PLATFORM_BRAND_NAME } from "@/lib/platform"
import { TERMS_DOWNLOAD_PATH, TERMS_VERSION } from "@/lib/legal/terms-version"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedTerms) {
      setError("Ga akkoord met de algemene voorwaarden om een account aan te maken.")
      return
    }
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Wachtwoorden komen niet overeen")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            terms_accepted: true,
            terms_version: TERMS_VERSION,
          },
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/onboarding`,
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error && error.message.includes("Database error")
        ? "Registreren is tijdelijk niet mogelijk. Vernieuw de pagina en probeer het opnieuw. Neem contact op met support als dit blijft gebeuren."
        : error instanceof Error ? error.message : "Er is een fout opgetreden")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full" style={{ background: "var(--hero-bg)" }}>
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden p-12">
        <div
          className="absolute top-1/3 left-1/3 h-80 w-80 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--brand-purple)" }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-1/3 right-1/3 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--brand-blue)" }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-md text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B7D1C2]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#1d2c24" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="#1d2c24" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="#1d2c24" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white text-balance">
            {"Begin met bouwen aan jouw "}
            <span className="text-[#B7D1C2]">
              website
            </span>
            {" met "}
            <span className="text-[#B7D1C2]">{PLATFORM_BRAND_NAME}</span>
          </h1>
          <p className="text-white/60 leading-relaxed">
            Maak een gratis account aan en ontdek hoe makkelijk het is om een professionele website voor jouw kleine bedrijf te maken.
          </p>

          <div className="mt-10 overflow-hidden rounded-xl border border-[#B7D1C2]/20 shadow-xl shadow-black/10">
            <Image
              src="/auth/signup-visual.webp"
              alt="Illustratie van een bedrijfswebsite op desktop en mobiel, in warme groene tinten"
              className="h-auto w-full"
              width={1536}
              height={1024}
              sizes="(min-width: 1280px) 448px, 40vw"
            />
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B7D1C2] text-sm font-bold text-[var(--hero-bg)]">
              {PLATFORM_BRAND_INITIALS}
            </span>
            <span className="text-base font-bold text-white">{PLATFORM_BRAND_NAME}</span>
          </div>

          <div
            className="rounded-2xl border p-8"
            style={{
              background: "var(--hero-surface)",
              borderColor: "rgba(168,85,247,0.2)",
            }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Account aanmaken</h2>
              <p className="mt-1 text-sm text-white/50">
                Vul onderstaande gegevens in om een account aan te maken
              </p>
            </div>

            <form onSubmit={handleSignUp} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-sm font-medium text-white/80">
                  E-mailadres
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="naam@voorbeeld.nl"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-[#B7D1C2]/25 bg-[var(--hero-bg)] text-white placeholder:text-white/40 focus-visible:ring-[#B7D1C2]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-sm font-medium text-white/80">
                  Wachtwoord
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-[#B7D1C2]/25 bg-[var(--hero-bg)] text-white placeholder:text-white/40 focus-visible:ring-[#B7D1C2]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="repeat-password" className="text-sm font-medium text-white/80">
                  Wachtwoord herhalen
                </Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="border-[#B7D1C2]/25 bg-[var(--hero-bg)] text-white placeholder:text-white/40 focus-visible:ring-[#B7D1C2]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <input
                    id="accept-terms"
                    name="acceptTerms"
                    type="checkbox"
                    required
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    disabled={isLoading}
                    aria-describedby="terms-download"
                    className="mt-1 h-4 w-4 shrink-0 accent-[#B7D1C2] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B7D1C2]"
                  />
                  <label htmlFor="accept-terms" className="text-sm leading-6 text-white/80">
                    Ik ga akkoord met de{" "}
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#B7D1C2] underline underline-offset-4 hover:text-white">
                      algemene voorwaarden<span className="sr-only"> (opent in een nieuw tabblad)</span>
                    </Link>.
                  </label>
                </div>
                <p id="terms-download" className="pl-7 text-xs leading-5 text-white/60">
                  <a href={TERMS_DOWNLOAD_PATH} download className="text-[#B7D1C2] underline underline-offset-4 hover:text-white">
                    Download de voorwaarden (tekstbestand)
                  </a>
                </p>
              </div>

              {error && (
                <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-[#B7D1C2] text-[var(--hero-bg)] font-semibold hover:bg-white transition-colors"
                disabled={isLoading}
              >
                {isLoading ? "Account wordt aangemaakt..." : "Account aanmaken"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-white/50">
              {"Heb je al een account? "}
              <Link
                href="/auth/login"
                className="font-medium text-[#B7D1C2] hover:text-white transition-colors underline underline-offset-4"
              >
                Inloggen
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-white/60">
            <Link href="/" className="hover:text-white transition-colors">
              Terug naar de homepage
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

