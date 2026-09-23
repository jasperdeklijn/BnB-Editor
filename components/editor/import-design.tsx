"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileJson, Loader2, Monitor, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImportPreviewFrame } from "./import-preview-frame"
import { getImportImages, ImportValidationError, MAX_IMPORT_BYTES, normalizeImport, parseImport, type ImportDocument } from "@/lib/import/schema"

type Selection = { document: ImportDocument; raw: string; design: ReturnType<typeof normalizeImport>; id: string }
export function ImportDesign({ canCreate = false }: { canCreate?: boolean }) {
  const router = useRouter()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [permission, setPermission] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [busy, setBusy] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [imageStates, setImageStates] = useState<Array<"loading" | "loaded" | "failed">>([])
  const generation = useRef(0)
  const submitting = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!selection || !permission) { setImageStates([]); return }
    const urls = getImportImages(selection.document)
    setImageStates(urls.map(() => "loading"))
    const cleanups = urls.map((url, index) => {
      const image = new Image()
      image.referrerPolicy = "no-referrer"
      let active = true
      const done = (state: "loaded" | "failed") => {
        if (active) setImageStates((current) => current.map((value, i) => i === index ? state : value))
      }
      const timeout = window.setTimeout(() => done("failed"), 12000)
      image.onload = () => { window.clearTimeout(timeout); done("loaded") }
      image.onerror = () => { window.clearTimeout(timeout); done("failed") }
      image.src = url
      return () => { active = false; window.clearTimeout(timeout); image.onload = null; image.onerror = null; image.src = "" }
    })
    return () => cleanups.forEach((cleanup) => cleanup())
  }, [selection, permission])

  async function selectFile(file?: File) {
    const currentGeneration = ++generation.current
    setSelection(null); setCreatedId(null); setIssues([]); setPermission(false)
    if (!file) return
    try {
      if (!file.name.toLowerCase().endsWith(".json")) throw new Error("Kies een .json-bestand.")
      if (file.size > MAX_IMPORT_BYTES) throw new Error("Het JSON-bestand mag maximaal 2 MB zijn.")
      const raw = await file.text()
      const document = parseImport(raw)
      if (currentGeneration !== generation.current) return
      setSelection({ document, raw, design: normalizeImport(document, () => crypto.randomUUID()), id: crypto.randomUUID() })
    } catch (error) {
      if (currentGeneration === generation.current) setIssues(error instanceof ImportValidationError ? error.issues : [error instanceof Error ? error.message : "Bestand kon niet worden gelezen."])
    }
  }
  function cancel() {
    generation.current++
    setSelection(null); setIssues([]); setPermission(false); setCreatedId(null)
    if (input.current) input.current.value = ""
  }
  async function createDesign() {
    if (!selection || !permission || submitting.current) return
    submitting.current = true
    setBusy(true); setIssues([])
    try {
      const response = await fetch("/api/websites/import", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Import-Permission": "confirmed", "X-Import-Design-Id": selection.id },
        body: selection.raw,
      })
      const result = await response.json()
      if (!response.ok) {
        setIssues(Array.isArray(result.issues) ? result.issues : [result.error || "Importeren is mislukt."])
        return
      }
      setCreatedId(result.websiteId)
      router.push(`/editor?websiteId=${result.websiteId}`)
    } catch {
      setIssues(["De verbinding is onderbroken. Probeer opnieuw; dezelfde bevestiging maakt geen tweede ontwerp."])
    } finally { setBusy(false); submitting.current = false }
  }
  const imageCount = selection ? getImportImages(selection.document).length : 0
  const imagePending = imageStates.length !== imageCount || imageStates.includes("loading")
  const imageFailed = imageStates.includes("failed")
  return <main className="mx-auto w-full max-w-7xl space-y-6 overflow-y-auto p-4 sm:p-8">
    <div className="rounded-2xl border bg-card p-5 sm:p-8">
      <div className="flex items-center gap-3"><FileJson className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Import JSON</h1></div>
      <p className="mt-3 max-w-3xl text-muted-foreground">{canCreate
        ? "Importeer je eigen website als nieuw, bewerkbaar concept. Je bestaande ontwerpen en live website blijven behouden."
        : "Controleer een FlexPagina-bestand met de echte websiteweergave. Dit voorbeeld slaat niets op in een account."}</p>
      <label htmlFor="import-file" className="mt-5 block text-sm font-semibold">FlexPagina JSON-bestand (maximaal 2 MB)</label>
      <input ref={input} id="import-file" type="file" accept=".json,application/json" disabled={busy}
        className="mt-2 block w-full rounded-lg border p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
        onChange={(event) => void selectFile(event.target.files?.[0])} />
      {issues.length > 0 && <div role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="font-semibold">Controleer je import</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
      </div>}
      {selection && <>
        <h2 className="mt-5 text-lg font-semibold">{selection.document.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{selection.document.sections.length} secties · {imageCount} afbeeldingen · nieuw concept</p>
        <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">{selection.document.sections.map((section, i) => <li key={section.key}>{i + 1}. {section.type}</li>)}</ol>
        <p className="mt-4 text-sm text-muted-foreground">Alle geaccepteerde secties blijven bewerkbaar. Lay-outs volgen de FlexPagina-componenten; externe knoppen zijn in dit voorbeeld uitgeschakeld. Niet-ondersteunde onderdelen worden geweigerd.</p>
        <label className="mt-5 flex items-start gap-3 text-sm">
          <input type="checkbox" checked={permission} disabled={busy || Boolean(createdId)} className="mt-1 h-4 w-4 shrink-0 accent-primary"
            onChange={(event) => setPermission(event.target.checked)} />
          Ik ben eigenaar van deze website of heb toestemming om de inhoud en afbeeldingen te hergebruiken. Laad het voorbeeld.
        </label>
        {permission && imageCount > 0 && <div className="mt-4 text-sm" aria-live="polite">
          <p>Afbeeldingen worden bij opslaan veilig naar je eigen afbeeldingsbibliotheek gekopieerd.</p>
          <ul className="mt-2 space-y-1">{Array.from({ length: imageCount }, (_, i) => <li key={i}>
            Afbeelding {i + 1}: {imageStates[i] === "loaded" ? "voorbeeld geladen" : imageStates[i] === "failed" ? "niet geladen — controleer de URL of annuleer" : "controleren…"}
          </li>)}</ul>
        </div>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {canCreate && !createdId && <Button onClick={() => void createDesign()} disabled={!permission || busy || imagePending || imageFailed}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Nieuw concept aanmaken
          </Button>}
          {createdId && <Link href={`/editor?websiteId=${createdId}`} className="font-semibold text-primary">Concept aangemaakt — open de editor</Link>}
          <Button variant="outline" onClick={cancel} disabled={busy}>Annuleren</Button>
          {busy && <span role="status" className="text-sm text-muted-foreground">Afbeeldingen verwerken en concept opslaan…</span>}
        </div>
      </>}
      <div className="mt-5 text-sm"><Link href={canCreate ? "/editor" : "/"} className="text-primary underline">{canCreate ? "Terug naar mijn ontwerpen" : "Terug naar FlexPagina"}</Link></div>
    </div>
    {selection && permission && <section aria-label="Voorbeeld van het nieuwe ontwerp" className="space-y-3">
      <div className="flex items-center gap-2"><h2 className="mr-auto font-semibold">Voorbeeld</h2>
        <Button variant={mobile ? "outline" : "default"} size="sm" onClick={() => setMobile(false)} aria-pressed={!mobile}><Monitor className="mr-2 h-4 w-4" />Desktop</Button>
        <Button variant={mobile ? "default" : "outline"} size="sm" onClick={() => setMobile(true)} aria-pressed={mobile}><Smartphone className="mr-2 h-4 w-4" />Mobiel</Button>
      </div>
      <ImportPreviewFrame key={selection.id} design={selection.design} mobile={mobile} />
    </section>}
  </main>
}

