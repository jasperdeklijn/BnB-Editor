"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { useEditorLayout } from "./editor-layout-context"

export function useEditorFormNavigation(dirty: boolean, busy: boolean) {
  const { registerNavigationGuard } = useEditorLayout()
  useEffect(() => registerNavigationGuard(() => {
    if (busy) { toast.info("Wacht tot de wijzigingen zijn opgeslagen."); return false }
    return !dirty || window.confirm("U heeft niet-opgeslagen wijzigingen. De pagina verlaten en deze wijzigingen verliezen?")
  }), [registerNavigationGuard, dirty, busy])

  useEffect(() => {
    if (!dirty && !busy) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [dirty, busy])
}
