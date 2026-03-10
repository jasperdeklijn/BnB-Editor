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

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/editor")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Er is een fout opgetreden")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full" style={{ background: "var(--hero-bg)" }}>
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden p-12">
        <div
          className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--brand-blue)" }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--brand-purple)" }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-md text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)]">
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="4" width="14" height="9" rx="2" stroke="white" strokeWidth="1.5" />
              <path d="M5 4V3a3 3 0 016 0v1" stroke="white" strokeWidth="1.5" />
              <circle cx="8" cy="8.5" r="1.5" fill="white" />
            </svg>
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white text-balance">
            {"Welkom terug bij "}
            <span className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] bg-clip-text text-transparent">
              BnB Website Maken
            </span>
          </h1>
          <p className="text-white/60 leading-relaxed">
            Bouw prachtige websites voor jouw bed & breakfast. Bewerk, publiceer en beheer alles vanuit één plek.
          </p>

          <div className="mt-10 rounded-xl border border-[var(--brand-blue)]/20 overflow-hidden shadow-2xl shadow-[var(--brand-blue)]/10">
            <img
              src="/placeholder.svg?height=300&width=500"
              alt="BnB Website Maken voorbeeld dashboard"
              className="w-full"
              width={500}
              height={300}
            />
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center lg:hidden">
            <Image
              src="/logo.png"
              alt="BnB Website Maken"
              width={180}
              height={50}
              className="h-12 w-auto"
            />
          </div>

          <div
            className="rounded-2xl border p-8"
            style={{
              background: "var(--hero-surface)",
              borderColor: "rgba(99,102,241,0.2)",
            }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Inloggen</h2>
              <p className="mt-1 text-sm text-white/50">
                Vul je e-mailadres en wachtwoord in om door te gaan
              </p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
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
                  className="border-[var(--brand-blue)]/20 bg-[var(--hero-bg)] text-white placeholder:text-white/30 focus-visible:ring-[var(--brand-purple)]"
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
                  className="border-[var(--brand-blue)]/20 bg-[var(--hero-bg)] text-white placeholder:text-white/30 focus-visible:ring-[var(--brand-purple)]"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] text-white font-semibold hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? "Bezig met inloggen..." : "Inloggen"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-white/50">
              {"Nog geen account? "}
              <Link
                href="/auth/sign-up"
                className="font-medium text-[var(--brand-purple)] hover:text-[var(--brand-blue)] transition-colors underline underline-offset-4"
              >
                Account aanmaken
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-white/30">
            <Link href="/" className="hover:text-white/60 transition-colors">
              Terug naar de homepage
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
