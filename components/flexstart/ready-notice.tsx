"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
export function FlexStartReadyNotice() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    const refresh = async () => {
      try {
        const response = await fetch("/api/flexstart", { signal: controller.signal, cache: "no-store" })
        if (response.ok) setReady(Boolean((await response.json()).ready?.length))
      } catch { /* Optional notification: the service page displays availability errors. */ }
    }
    void refresh()
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh() }, 60000)
    window.addEventListener("focus", refresh)
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh) }
  }, [])
  return ready ? <Link href="/editor/flexstart" role="status" className="block shrink-0 border-b bg-secondary px-4 py-2 text-center text-sm font-medium text-secondary-foreground">Je FlexStart-concept staat klaar — bekijken en beoordelen</Link> : null
}
