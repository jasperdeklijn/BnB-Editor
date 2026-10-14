"use client"

import { useRef, useState, type FormEvent } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Check, Copy, ExternalLink, FileJson, Globe2, Loader2, Monitor, Search, Smartphone, Trash2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as Dialog from "@radix-ui/react-dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ImportValidationError, MAX_IMPORT_BYTES, parseImport } from "@/lib/import/schema"
import { demoMetadataSchema, demoSlugSchema, demoUrl, prepareDemo, suggestDemoSlug, type DemoDesign, type DemoSummary } from "@/lib/demos/shared"
import { PLATFORM_DOMAIN } from "@/lib/platform"

const ImportPreviewFrame = dynamic(() => import("@/components/editor/import-preview-frame").then((module) => module.ImportPreviewFrame), {
  loading: () => <p role="status" className="p-8 text-center text-muted-foreground">Voorbeeld laden…</p>,
})
const domain = PLATFORM_DOMAIN.toLowerCase().replace(/^www\./, "")
type Selection = { id: string; filename: string; raw: string; design: DemoDesign }
type Preview = { title: string; design: DemoDesign }

export function DemoDashboard({ demos, loadError }: { demos: DemoSummary[]; loadError: string }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const fileGeneration = useRef(0)
  const pending = useRef(false)
  const previewTrigger = useRef<HTMLButtonElement | null>(null)
  const deleteTrigger = useRef<HTMLButtonElement | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [reviewed, setReviewed] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [notice, setNotice] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "live" | "draft">("all")
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [mobile, setMobile] = useState(false)
  const [deleting, setDeleting] = useState<DemoSummary | null>(null)
  const liveCount = demos.filter((demo) => demo.published).length
  const visible = demos.filter((demo) => (filter === "all" || demo.published === (filter === "live"))
    && `${demo.title} ${demo.slug} ${demo.source_filename}`.toLocaleLowerCase("nl-NL").includes(query.trim().toLocaleLowerCase("nl-NL")))
  const canSave = selection && demoMetadataSchema.safeParse({ id: selection.id, title, slug, source_filename: selection.filename, published: false }).success

  async function selectFile(file?: File) {
    if (pending.current) return
    const generation = ++fileGeneration.current
    setSelection(null); setIssues([]); setNotice(""); setReviewed(false)
    if (!file) return
    setBusy("file")
    try {
      if (!file.name.toLowerCase().endsWith(".json")) throw new Error("Kies een .json-bestand.")
      if (file.size > MAX_IMPORT_BYTES) throw new Error("Het JSON-bestand mag maximaal 2 MB zijn.")
      const raw = await file.text()
      const document = parseImport(raw)
      if (generation !== fileGeneration.current) return
      const id = crypto.randomUUID()
      setSelection({ id, filename: file.name, raw, design: prepareDemo(document, () => crypto.randomUUID()) })
      setTitle(document.title); setSlug(suggestDemoSlug(document.title))
    } catch (error) {
      if (generation === fileGeneration.current) setIssues(error instanceof ImportValidationError ? error.issues : [error instanceof Error ? error.message : "Bestand kon niet worden gelezen."])
    } finally { if (generation === fileGeneration.current) setBusy(null) }
  }

  async function request(url: string, init?: RequestInit) {
    const response = await fetch(url, init)
    const result = await response.json()
    if (!response.ok) {
      throw new Error(Array.isArray(result.issues) ? result.issues.join("\n") : result.error || "De actie is mislukt.")
    }
    return result
  }

  async function save(published: boolean) {
    if (!selection || !canSave || pending.current || (published && !reviewed)) return
    pending.current = true
    setBusy("save"); setIssues([]); setNotice("")
    try {
      await request("/api/admin/demos", { method: "POST", headers: {
        "Content-Type": "application/json",
        "X-Demo-Metadata": encodeURIComponent(JSON.stringify({ id: selection.id, title: title.trim(), slug, source_filename: selection.filename, published })),
      }, body: selection.raw })
      setNotice(published ? "Je demo staat live. Je kunt de link nu delen." : "Je demo is opgeslagen als concept.")
      setSelection(null); setTitle(""); setSlug(""); setReviewed(false)
      if (input.current) input.current.value = ""
      router.refresh()
    } catch (error) { setIssues([error instanceof Error ? error.message : "Opslaan is mislukt."]) }
    finally { pending.current = false; setBusy(null) }
  }

  async function changeStatus(demo: DemoSummary) {
    if (pending.current) return
    pending.current = true; setBusy(demo.id); setIssues([]); setNotice("")
    try {
      await request(`/api/admin/demos/${demo.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !demo.published }) })
      setNotice(demo.published ? "De demo is offline gehaald." : "De demo staat live.")
      router.refresh()
    } catch (error) { setIssues([error instanceof Error ? error.message : "De status kon niet worden gewijzigd."]) }
    finally { pending.current = false; setBusy(null) }
  }

  async function openPreview(demo: DemoSummary) {
    if (pending.current) return
    pending.current = true; setBusy(demo.id); setIssues([])
    try {
      const result = await request(`/api/admin/demos/${demo.id}`)
      setMobile(false); setPreview({ title: demo.title, design: result.design })
    } catch (error) { setIssues([error instanceof Error ? error.message : "Het voorbeeld kon niet worden geladen."]) }
    finally { pending.current = false; setBusy(null) }
  }

  async function removeDemo(demo: DemoSummary) {
    if (pending.current) return
    pending.current = true; setBusy(demo.id); setIssues([]); setNotice("")
    try {
      await request(`/api/admin/demos/${demo.id}`, { method: "DELETE" })
      setNotice("De demo is verwijderd."); setDeleting(null); router.refresh()
    } catch (error) { setIssues([error instanceof Error ? error.message : "Verwijderen is mislukt."]) }
    finally { pending.current = false; setBusy(null) }
  }

  async function copyLink(demo: DemoSummary) {
    try { await navigator.clipboard.writeText(demoUrl(demo.slug)); setNotice(`Link van ${demo.title} gekopieerd.`) }
    catch { setIssues(["De link kon niet worden gekopieerd. Kopieer het adres via Open demo."]) }
  }

  function previewSelection() {
    if (!selection) return
    setMobile(false); setPreview({ title: title || selection.design.title, design: selection.design }); setReviewed(true)
  }

  return <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-8">
    <header>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Alleen beheerders</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Demowebsites</h1>
      <p className="mt-2 text-sm text-muted-foreground">Importeer een JSON-export en deel je demo op een eigen subdomein.</p>
      <div className="mt-4 flex gap-5 text-sm"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-green-600" />{liveCount} live</span><span className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-slate-400" />{demos.length - liveCount} concept</span></div>
    </header>

    {loadError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">{loadError}<Button variant="outline" className="ml-3" onClick={() => router.refresh()}>Opnieuw laden</Button></div>}
    {issues.length > 0 && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p className="font-semibold">Controleer je demo</p><ul className="mt-2 list-disc space-y-1 pl-5">{issues.map((issue, i) => <li className="whitespace-pre-line break-words" key={i}>{issue}</li>)}</ul></div>}
    <p role="status" aria-live="polite" className={notice ? "rounded-xl border bg-secondary p-4 text-sm" : "sr-only"}>{notice}</p>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="Demo-overzicht" className="order-last min-w-0 space-y-4 xl:order-first">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
          <label className="relative min-w-40 flex-1"><span className="sr-only">Zoek een demo</span><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" /><input type="search" placeholder="Zoek een demo…" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
          <div className="flex gap-1" aria-label="Filter op status">{([["all", "Alle demo’s"], ["live", "Live"], ["draft", "Concept"]] as const).map(([value, label]) => <Button key={value} variant={filter === value ? "secondary" : "ghost"} size="sm" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}</div>
        </div>

        {visible.map((demo) => <article key={demo.id} className="overflow-hidden rounded-2xl border bg-card p-4">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="relative flex h-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-secondary sm:w-44 2xl:w-60">
              <Globe2 className="size-10 text-primary/40" aria-hidden="true" />
              {demo.thumbnail_url && <img src={demo.thumbnail_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" onError={(event) => { event.currentTarget.style.display = "none" }} />}
              <span className="absolute bottom-0 left-0 right-0 truncate bg-card/95 px-3 py-2 text-xs font-medium">{demo.title}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3"><h2 className="min-w-0 flex-1 break-words text-lg font-semibold">{demo.title}</h2><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${demo.published ? "bg-green-100 text-green-800" : "bg-secondary text-muted-foreground"}`}>{demo.published ? "● Live" : "● Concept"}</span></div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{demo.source_filename}</p>
              {demo.published ? <a href={demoUrl(demo.slug)} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-primary underline underline-offset-4">{demo.slug}.{domain}</a> : <p className="mt-3 break-all text-sm text-muted-foreground">{demo.slug}.{domain} · nog niet gepubliceerd</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {demo.published && <Button asChild size="sm"><a href={demoUrl(demo.slug)} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 size-4" />Open demo</a></Button>}
                {demo.published && <Button variant="outline" size="sm" onClick={() => void copyLink(demo)}><Copy className="mr-2 size-4" />Kopieer link</Button>}
                <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={(event) => { previewTrigger.current = event.currentTarget; void openPreview(demo) }}>Voorbeeld</Button>
                <Button variant={demo.published ? "ghost" : "default"} size="sm" disabled={Boolean(busy)} onClick={() => void changeStatus(demo)}>{busy === demo.id && <Loader2 className="mr-2 size-4 animate-spin" />}{demo.published ? "Haal offline" : "Zet live"}</Button>
                <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-destructive" aria-label={`${demo.title} verwijderen`} disabled={Boolean(busy)} onClick={(event) => { deleteTrigger.current = event.currentTarget; setDeleting(demo) }}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          </div>
        </article>)}
        {!visible.length && !loadError && <div className="rounded-2xl border border-dashed p-12 text-center"><Globe2 className="mx-auto size-9 text-primary/50" /><h2 className="mt-4 font-semibold">{demos.length ? "Geen demo’s gevonden" : "Je eerste demo begint hier"}</h2><p className="mt-2 text-sm text-muted-foreground">{demos.length ? "Pas je zoekopdracht of filter aan." : "Upload een JSON-export, bekijk het voorbeeld en zet je demo live."}</p></div>}
      </section>

      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void save(true) }} className="order-first min-w-0 rounded-2xl border bg-card p-5 sm:p-6 xl:order-last">
        <h2 className="text-xl font-semibold">Nieuwe demo</h2>
        <ol className="mt-5 flex justify-between gap-2 text-xs text-muted-foreground">{["Importeren", "Controleren", "Live"].map((step, index) => <li key={step} className="flex items-center gap-1.5"><span className={`flex size-6 items-center justify-center rounded-full border ${selection && index < 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{index + 1}</span>{step}</li>)}</ol>
        <div onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) void selectFile(event.dataTransfer.files[0]) }} className={`mt-5 rounded-xl border-2 border-dashed p-6 text-center ${dragging ? "border-primary bg-secondary" : "border-border"}`}>
          <Upload aria-hidden="true" className="mx-auto size-8 text-primary" /><p className="mt-3 text-sm font-semibold">Sleep je JSON-export hier</p><p className="my-2 text-xs text-muted-foreground">of</p>
          <Button type="button" variant="outline" disabled={Boolean(busy) || Boolean(loadError)} onClick={() => input.current?.click()}>Bestand kiezen</Button>
          <input ref={input} type="file" aria-label="JSON-export kiezen" accept=".json,application/json" className="sr-only" tabIndex={-1} disabled={Boolean(busy) || Boolean(loadError)} onChange={(event) => void selectFile(event.target.files?.[0])} />
          <p className="mt-3 text-xs text-muted-foreground">FlexPagina JSON v1 / v2 · maximaal 2 MB</p>
        </div>
        {busy === "file" && <p role="status" className="mt-3 text-sm">Bestand controleren…</p>}
        {selection && <div className="mt-3 flex items-center gap-3 rounded-lg border p-3"><FileJson aria-hidden="true" className="size-6 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm">{selection.filename}</p><p className="mt-1 flex items-center gap-1 text-xs text-green-700"><Check className="size-3" />Gecontroleerd · {selection.design.pages?.length ?? 1} pagina’s</p></div></div>}
        <label htmlFor="demo-title" className="mt-5 block text-sm font-medium">Demonaam</label>
        <input id="demo-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} disabled={!selection || Boolean(busy)} required className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" placeholder="Bijvoorbeeld B&B De Lindenhof" />
        <label htmlFor="demo-slug" className="mt-4 block text-sm font-medium">Subdomein</label>
        <div className="mt-2 flex overflow-hidden rounded-lg border focus-within:ring-2 focus-within:ring-ring"><input id="demo-slug" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} maxLength={63} disabled={!selection || Boolean(busy)} required aria-describedby="demo-slug-help" className="h-11 min-w-0 flex-1 bg-background px-3 text-sm outline-none disabled:opacity-50" placeholder="demo-lindenhof" /><span className="flex items-center border-l bg-muted px-2 text-xs text-muted-foreground">.{domain}</span></div>
        <p id="demo-slug-help" className="mt-2 text-xs text-muted-foreground">Begin met demo-. Gebruik letters, cijfers en streepjes.</p>
        {slug && !demoSlugSchema.safeParse(slug).success && <p className="mt-2 text-xs text-destructive">Vul een geldig subdomein in, bijvoorbeeld demo-lindenhof.</p>}
        <div className="mt-5 rounded-lg bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">Bekijk je demo voordat je deze deelt. Alleen pagina’s die in de export voor publicatie zijn aangevinkt, komen live. Afbeeldingen gebruiken de HTTPS-links uit je export.</div>
        <div className="mt-5 grid gap-2">
          <Button type="button" variant="outline" disabled={!selection || Boolean(busy)} onClick={(event) => { previewTrigger.current = event.currentTarget; previewSelection() }}><Monitor className="mr-2 size-4" />Voorbeeld bekijken</Button>
          <Button type="submit" disabled={!canSave || !reviewed || Boolean(busy) || Boolean(loadError)}>{busy === "save" && <Loader2 className="mr-2 size-4 animate-spin" />}Demo live zetten</Button>
          <Button type="button" variant="ghost" disabled={!canSave || Boolean(busy) || Boolean(loadError)} onClick={() => void save(false)}>Opslaan als concept</Button>
        </div>
        {selection && !reviewed && <p className="mt-2 text-center text-xs text-muted-foreground">Open eerst het voorbeeld om te publiceren.</p>}
        <p className="mt-5 text-xs text-muted-foreground">Beheer je demo’s los van klantwebsites.</p>
      </form>
    </div>

    <Dialog.Root open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null) }}>
      <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <Dialog.Content onCloseAutoFocus={(event) => { event.preventDefault(); previewTrigger.current?.focus() }} className="fixed left-1/2 top-1/2 z-50 flex max-h-[95dvh] w-[min(1400px,96vw)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-xl border bg-card p-4 shadow-xl sm:p-6">
        <div className="pr-8"><Dialog.Title className="text-xl font-semibold">{preview?.title}</Dialog.Title><Dialog.Description className="mt-2 text-sm text-muted-foreground">Controleer de inhoud en pagina’s. Externe knoppen zijn in dit voorbeeld uitgeschakeld.</Dialog.Description></div>
        <Dialog.Close asChild><Button variant="ghost" size="icon" className="absolute right-3 top-3" aria-label="Voorbeeld sluiten"><X className="size-4" /></Button></Dialog.Close>
        <div className="flex gap-2"><Button type="button" size="sm" variant={mobile ? "outline" : "default"} aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor className="mr-2 size-4" />Desktop</Button><Button type="button" size="sm" variant={mobile ? "default" : "outline"} aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone className="mr-2 size-4" />Mobiel</Button></div>
        <div className="min-h-0 overflow-auto">{preview && <ImportPreviewFrame design={preview.design} mobile={mobile} />}</div>
      </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !busy) setDeleting(null) }}>
      <AlertDialogContent onCloseAutoFocus={(event) => { event.preventDefault(); deleteTrigger.current?.focus() }}><AlertDialogHeader><AlertDialogTitle>Demo verwijderen?</AlertDialogTitle><AlertDialogDescription>{deleting?.title} wordt verwijderd. De gedeelde link werkt daarna niet meer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={Boolean(busy)}>Annuleren</AlertDialogCancel><AlertDialogAction disabled={Boolean(busy)} onClick={(event) => { event.preventDefault(); if (deleting) void removeDemo(deleting) }} className="bg-destructive text-white hover:bg-destructive/90">Verwijderen</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </main>
}
