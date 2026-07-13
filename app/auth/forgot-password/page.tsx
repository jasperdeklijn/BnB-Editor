"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "De aanvraag kon niet worden verwerkt.")
      setMessage(result.message)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "De aanvraag kon niet worden verwerkt.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--hero-bg)] px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--hero-surface)] p-8 shadow-xl">
        <p className="mb-2 text-sm font-semibold text-[#B7D1C2]">{PLATFORM_BRAND_NAME}</p>
        <h1 className="text-2xl font-bold">Wachtwoord vergeten</h1>
        <p className="mt-2 text-sm text-white/60">
          Vul uw e-mailadres in. Als het account bestaat, sturen we een beveiligde herstellink.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">E-mailadres</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border-white/15 bg-[var(--hero-bg)] text-white"
            />
          </div>
          {message ? <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</p> : null}
          {error ? <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full bg-[#B7D1C2] text-[var(--hero-bg)] hover:bg-white">
            {loading ? "Versturen…" : "Herstellink versturen"}
          </Button>
        </form>

        <Link href="/auth/login" className="mt-6 block text-center text-sm text-white/60 hover:text-white">
          Terug naar inloggen
        </Link>
      </section>
    </main>
  )
}

