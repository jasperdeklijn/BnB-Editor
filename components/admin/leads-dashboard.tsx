"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, ChevronUp, Clipboard, ExternalLink, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LEAD_STATUSES, type LeadRecord, type LeadStatus } from "@/lib/leads/types"

const BRANCHES = [
  "kapper",
  "hovenier",
  "schoonheidssalon",
  "nagelstudio",
  "fysiotherapeut",
  "tandarts",
  "schildersbedrijf",
  "loodgieter",
  "elektricien",
  "aannemer",
  "restaurant",
  "bed and breakfast",
  "camping",
  "coach",
  "fotograaf",
]

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nieuw",
  interesting: "Interessant",
  contacted: "Benaderd",
  not_interested: "Niet geïnteresseerd",
  customer: "Klant",
  ignored: "Genegeerd",
}

type SearchResult = {
  found: number
  saved: number
  created: number
  updated: number
  failed: number
}

function getScoreStyle(score: number) {
  if (score >= 81) return "border-red-300/30 bg-red-300/15 text-red-100"
  if (score >= 61) return "border-orange-300/30 bg-orange-300/15 text-orange-100"
  if (score >= 31) return "border-yellow-300/30 bg-yellow-300/15 text-yellow-100"
  return "border-emerald-300/30 bg-emerald-300/15 text-emerald-100"
}

function AnalysisBadge({ value, children }: { value: boolean; children: React.ReactNode }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${value ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/5 text-white/55"}`}>
      {value ? "Wel" : "Geen"} {children}
    </span>
  )
}

export function LeadsDashboard({ initialLeads }: { initialLeads: LeadRecord[] }) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [city, setCity] = useState("Uden")
  const [category, setCategory] = useState("kapper")
  const [limit, setLimit] = useState(25)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sort, setSort] = useState("score_desc")
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(initialLeads.map((lead) => [lead.id, lead.notes ?? ""])))
  const [savingId, setSavingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    setLeads(initialLeads)
    setNotes(Object.fromEntries(initialLeads.map((lead) => [lead.id, lead.notes ?? ""])))
  }, [initialLeads])

  const cities = useMemo(() => [...new Set(leads.map((lead) => lead.city).filter((value): value is string => Boolean(value)))].sort(), [leads])
  const categories = useMemo(() => [...new Set(leads.map((lead) => lead.category).filter((value): value is string => Boolean(value)))].sort(), [leads])

  const filteredLeads = useMemo(() => {
    const result = leads.filter((lead) =>
      (statusFilter === "all" || lead.status === statusFilter) &&
      (cityFilter === "all" || lead.city === cityFilter) &&
      (categoryFilter === "all" || lead.category === categoryFilter),
    )

    return result.sort((a, b) => {
      if (sort === "score_asc") return a.lead_score - b.lead_score
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return b.lead_score - a.lead_score
    })
  }, [leads, statusFilter, cityFilter, categoryFilter, sort])

  async function searchLeads(event: React.FormEvent) {
    event.preventDefault()
    setSearchError("")
    setSearchResult(null)

    if (city.trim().length < 2 || category.trim().length < 2 || limit < 1 || limit > 25) {
      setSearchError("Vul een geldige plaats, branche en een aantal van 1 tot 25 in.")
      return
    }

    setSearching(true)
    try {
      const response = await fetch("/api/admin/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, category, limit }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Leads zoeken is mislukt.")
      setSearchResult(data as SearchResult)
      router.refresh()
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Leads zoeken is mislukt.")
    } finally {
      setSearching(false)
    }
  }

  async function updateLead(id: string, update: { status?: LeadStatus; notes?: string }) {
    setSavingId(id)
    setFeedback("")
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Wijziging opslaan is mislukt.")

      setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ...data.lead } : lead))
      setFeedback("Wijziging opgeslagen.")
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Wijziging opslaan is mislukt.")
    } finally {
      setSavingId(null)
    }
  }

  async function copyOutreach(lead: LeadRecord) {
    if (!lead.outreach_draft) return
    await navigator.clipboard.writeText(lead.outreach_draft)
    setFeedback(`Outreach-concept van ${lead.company_name} gekopieerd.`)
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Zoek nieuwe leads</h2>
          <p className="mt-1 text-sm text-white/60">Openbare bedrijfsgegevens worden geanalyseerd. Outreach wordt alleen als handmatig te controleren concept opgeslagen.</p>
        </div>

        <form onSubmit={searchLeads} className="grid gap-4 md:grid-cols-[1fr_1fr_120px_auto] md:items-end">
          <label className="space-y-2 text-sm font-medium">
            <span>Plaats</span>
            <Input value={city} onChange={(event) => setCity(event.target.value)} maxLength={80} required className="border-white/15 bg-black/10 text-white" />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Branche</span>
            <Input list="lead-branches" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} required className="border-white/15 bg-black/10 text-white" />
            <datalist id="lead-branches">{BRANCHES.map((branch) => <option key={branch} value={branch} />)}</datalist>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Aantal</span>
            <Input type="number" min={1} max={25} value={limit} onChange={(event) => setLimit(Number(event.target.value))} required className="border-white/15 bg-black/10 text-white" />
          </label>
          <Button type="submit" disabled={searching} className="bg-[#B7D1C2] text-[var(--hero-bg)] hover:bg-white">
            {searching ? <Loader2 className="animate-spin" /> : <Search />}
            {searching ? "Analyseren…" : "Zoek leads"}
          </Button>
        </form>

        {searching && <p className="mt-4 text-sm text-white/60">Bedrijven en websites worden opgehaald en in kleine batches geanalyseerd. Dit kan enkele minuten duren.</p>}
        {searchError && <p role="alert" className="mt-4 rounded-lg border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-100">{searchError}</p>}
        {searchResult && (
          <p role="status" className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            {searchResult.found} leads gevonden; {searchResult.created} nieuw opgeslagen en {searchResult.updated} bijgewerkt{searchResult.failed > 0 ? `, ${searchResult.failed} niet verwerkt` : ""}.
          </p>
        )}
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Leadoverzicht</h2>
            <p className="mt-1 text-sm text-white/60">{filteredLeads.length} van {leads.length} leads zichtbaar</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={LEAD_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] }))} />
            <FilterSelect label="Plaats" value={cityFilter} onChange={setCityFilter} options={cities.map((value) => ({ value, label: value }))} />
            <FilterSelect label="Branche" value={categoryFilter} onChange={setCategoryFilter} options={categories.map((value) => ({ value, label: value }))} />
            <FilterSelect label="Sortering" value={sort} onChange={setSort} includeAll={false} options={[{ value: "score_desc", label: "Hoogste score" }, { value: "score_asc", label: "Laagste score" }, { value: "newest", label: "Nieuwste eerst" }]} />
          </div>
        </div>

        {feedback && <p role="status" className="mb-4 text-sm text-white/70">{feedback}</p>}

        {filteredLeads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center text-white/60">
            {leads.length === 0 ? "Er zijn nog geen leads. Start hierboven een handmatige zoekopdracht." : "Geen leads passen bij deze filters."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-white/55">
                <tr>
                  <th className="px-4 py-3">Bedrijf</th>
                  <th className="px-4 py-3">Branche</th>
                  <th className="px-4 py-3">Plaats</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Reden</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 align-top">
                {filteredLeads.map((lead) => {
                  const expanded = expandedLeadId === lead.id
                  return (
                    <LeadRows
                      key={lead.id}
                      lead={lead}
                      expanded={expanded}
                      notes={notes[lead.id] ?? ""}
                      saving={savingId === lead.id}
                      onToggle={() => setExpandedLeadId(expanded ? null : lead.id)}
                      onStatus={(status) => updateLead(lead.id, { status })}
                      onNotesChange={(value) => setNotes((current) => ({ ...current, [lead.id]: value }))}
                      onSaveNotes={() => updateLead(lead.id, { notes: notes[lead.id]?.trim() || "" })}
                      onCopy={() => copyOutreach(lead)}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options, includeAll = true }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; includeAll?: boolean }) {
  return (
    <label className="space-y-1 text-xs font-medium text-white/60">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-white/15 bg-[var(--hero-bg)] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/30">
        {includeAll && <option value="all">Alle</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function LeadRows({ lead, expanded, notes, saving, onToggle, onStatus, onNotesChange, onSaveNotes, onCopy }: { lead: LeadRecord; expanded: boolean; notes: string; saving: boolean; onToggle: () => void; onStatus: (status: LeadStatus) => void; onNotesChange: (value: string) => void; onSaveNotes: () => void; onCopy: () => void }) {
  return (
    <>
      <tr className="hover:bg-white/[0.03]">
        <td className="px-4 py-4">
          <p className="font-semibold text-white">{lead.company_name}</p>
          {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" className="mt-1 block max-w-48 truncate text-xs text-[var(--brand-blue)] hover:underline">{lead.website}</a> : <span className="mt-1 block text-xs text-white/40">Geen website</span>}
        </td>
        <td className="px-4 py-4 text-white/70">{lead.category || "—"}</td>
        <td className="px-4 py-4 text-white/70">{lead.city || "—"}</td>
        <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-3 py-1 font-bold ${getScoreStyle(lead.lead_score)}`}>{lead.lead_score}</span></td>
        <td className="max-w-sm px-4 py-4 text-white/65"><p className="line-clamp-3">{lead.reason || "Nog geen reden beschikbaar."}</p></td>
        <td className="px-4 py-4">
          <select value={lead.status} disabled={saving} onChange={(event) => onStatus(event.target.value as LeadStatus)} aria-label={`Status van ${lead.company_name}`} className="h-9 rounded-md border border-white/15 bg-[var(--hero-bg)] px-2 text-sm text-white">
            {LEAD_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
        </td>
        <td className="px-4 py-4 text-right">
          <Button type="button" variant="ghost" size="icon" onClick={onToggle} className="text-white hover:bg-white/10 hover:text-white" aria-label={`${expanded ? "Sluit" : "Open"} details van ${lead.company_name}`}>
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-black/10">
          <td colSpan={7} className="px-5 py-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold">Websiteanalyse</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AnalysisBadge value={lead.has_website}>website</AnalysisBadge>
                    <AnalysisBadge value={lead.has_https}>HTTPS</AnalysisBadge>
                    <AnalysisBadge value={lead.has_mobile_meta}>mobiele meta</AnalysisBadge>
                    <AnalysisBadge value={lead.has_contact_form}>contactformulier</AnalysisBadge>
                    <AnalysisBadge value={lead.has_clear_cta}>duidelijke CTA</AnalysisBadge>
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm text-white/65 sm:grid-cols-2">
                    <div><dt className="text-white/40">PageSpeed mobiel</dt><dd>{lead.pagespeed_score ?? "Niet beschikbaar"}</dd></div>
                    <div><dt className="text-white/40">Google-beoordeling</dt><dd>{lead.google_rating ?? "—"} ({lead.google_reviews_count ?? 0} reviews)</dd></div>
                    <div><dt className="text-white/40">SEO-titel</dt><dd>{lead.seo_title || "Ontbreekt"}</dd></div>
                    <div><dt className="text-white/40">Meta-omschrijving</dt><dd>{lead.seo_description || "Ontbreekt"}</dd></div>
                    <div><dt className="text-white/40">Telefoon</dt><dd>{lead.phone || "—"}</dd></div>
                  </dl>
                </div>
                <div>
                  <label htmlFor={`notes-${lead.id}`} className="text-sm font-semibold">Interne notitie</label>
                  <Textarea id={`notes-${lead.id}`} value={notes} onChange={(event) => onNotesChange(event.target.value)} maxLength={5_000} placeholder="Voeg een interne notitie toe…" className="mt-2 min-h-28 border-white/15 bg-black/10 text-white" />
                  <Button type="button" size="sm" disabled={saving} onClick={onSaveNotes} className="mt-2 bg-white/10 text-white hover:bg-white/20">
                    {saving ? <Loader2 className="animate-spin" /> : <Check />}
                    Notitie opslaan
                  </Button>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Outreach-concept</h3>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/15 p-4 font-sans text-sm leading-6 text-white/70">{lead.outreach_draft || "Nog geen outreach-concept beschikbaar."}</pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" disabled={!lead.outreach_draft} onClick={onCopy} className="bg-[#B7D1C2] text-[var(--hero-bg)] hover:bg-white"><Clipboard /> Kopieer outreach tekst</Button>
                  {lead.website && <Button asChild type="button" variant="outline" size="sm" className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"><a href={lead.website} target="_blank" rel="noreferrer"><ExternalLink /> Open website</a></Button>}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
