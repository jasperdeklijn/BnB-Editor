"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Gebruik minimaal 8 tekens.")
      return
    }
    if (password !== repeatPassword) {
      setError("De wachtwoorden komen niet overeen.")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError("Het wachtwoord kon niet worden gewijzigd. Open de herstellink opnieuw.")
      return
    }
    router.push("/editor")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--hero-bg)] px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--hero-surface)] p-8 shadow-xl">
        <h1 className="text-2xl font-bold">Nieuw wachtwoord instellen</h1>
        <p className="mt-2 text-sm text-white/60">Kies een nieuw wachtwoord van minimaal 8 tekens.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">Nieuw wachtwoord</Label>
            <Input id="password" type="password" required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="border-white/15 bg-[var(--hero-bg)] text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repeat-password" className="text-white/80">Wachtwoord herhalen</Label>
            <Input id="repeat-password" type="password" required autoComplete="new-password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} className="border-white/15 bg-[var(--hero-bg)] text-white" />
          </div>
          {error ? <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full bg-[#B7D1C2] text-[var(--hero-bg)] hover:bg-white">
            {loading ? "Opslaan…" : "Wachtwoord opslaan"}
          </Button>
        </form>
      </section>
    </main>
  )
}

