"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { postReview } from "./review-form"
export function ReviewTokenForm({ action }: { action: "confirm" | "withdraw" }) {
  const [token, setToken] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [done, setDone] = useState(false)
  useEffect(() => { setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") || ""); window.history.replaceState(null, "", window.location.pathname) }, [])
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{action === "confirm" ? "Bevestig je e-mailadres om je recensie ter beoordeling in te dienen." : "Trek je toestemming in. Je recensie wordt daarna niet meer op de website getoond."}</p>
    {message && <p role={done ? "status" : "alert"} className="text-sm">{message}</p>}
    {!done && <Button disabled={!token || busy} onClick={async () => { setBusy(true); try { await postReview({ action, token }); setDone(true); setMessage(action === "confirm" ? "E-mailadres bevestigd. Je recensie wacht op beoordeling." : "Je toestemming is ingetrokken. Je recensie wordt niet meer getoond.") } catch (error) { setMessage((error as Error).message) } finally { setBusy(false) } }}>{busy ? "Bezig…" : action === "confirm" ? "E-mailadres bevestigen" : "Toestemming intrekken"}</Button>}
    {!token && <p className="text-sm text-muted-foreground">Open de volledige link uit je e-mail.</p>}
  </div>
}
