"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Check, Loader2, RefreshCw, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AgentNetwork } from "@/components/admin/agent-network"

type Settings = {
  agents_enabled: boolean
  observe_only: boolean
  support_enabled: boolean
  marketing_enabled: boolean
  daily_budget_eur: number | string
  budget_reservation_eur: number | string
  daily_run_limit: number
  max_jobs_per_dispatch: number
  support_model: string
  marketing_model: string
  model_allowlist: string[]
}

type ArtifactContent = { subject?: string; body?: string; confidence?: string; confidenceReasons?: string[]; missingInformation?: string[]; sourceExcerpt?: string; knowledgeAnswerIds?: string[] }
type Artifact = { id: string; title: string; content: ArtifactContent; version: number }
type Approval = { id: string; job_id: string; status: string; risk_level: string; requested_at: string; expires_at: string | null; artifact: Artifact | null }
type Job = { id: string; job_type: string; status: string; attempt_count: number; max_attempts: number; created_at: string; last_error_message: string | null }
type Run = { id: string; agent_type: string; status: string; total_tokens: number | null; estimated_cost: number | null; created_at: string }

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" }).format(new Date(value))
}

export function AgentTeamDashboard({ initialSettings, approvals, jobs, runs }: { initialSettings: Settings; approvals: Approval[]; jobs: Job[]; runs: Run[] }) {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string }>>(() => Object.fromEntries(approvals.map((approval) => [approval.id, { subject: approval.artifact?.content.subject ?? "", body: approval.artifact?.content.body ?? "" }])))
  const [notice, setNotice] = useState<{ error?: string; success?: string }>({})
  const [online, setOnline] = useState(true)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    updateOnline()
    window.addEventListener("online", updateOnline)
    window.addEventListener("offline", updateOnline)
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) router.refresh() }, 30_000)
    return () => {
      window.removeEventListener("online", updateOnline)
      window.removeEventListener("offline", updateOnline)
      window.clearInterval(timer)
    }
  }, [router])

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current }
      for (const approval of approvals) {
        if (!next[approval.id]) next[approval.id] = { subject: approval.artifact?.content.subject ?? "", body: approval.artifact?.content.body ?? "" }
      }
      return next
    })
  }, [approvals])

  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Actie mislukt.")
    return data
  }

  function action(work: () => Promise<void>) {
    setNotice({})
    startTransition(async () => {
      try {
        await work()
        router.refresh()
      } catch (error) {
        setNotice({ error: error instanceof Error ? error.message : "Actie mislukt." })
      }
    })
  }

  function saveSettings() {
    const enablesExecution = initialSettings.observe_only && !settings.observe_only
    if (enablesExecution && !window.confirm("Je schakelt echte uitvoering na menselijke goedkeuring in. Wil je doorgaan?")) return
    action(async () => {
      await request("/api/admin/agents/settings", {
        method: "PATCH",
        body: JSON.stringify({
          agents_enabled: settings.agents_enabled,
          observe_only: settings.observe_only,
          support_enabled: settings.support_enabled,
          marketing_enabled: settings.marketing_enabled,
          daily_budget_eur: Number(settings.daily_budget_eur),
          budget_reservation_eur: Number(settings.budget_reservation_eur),
          daily_run_limit: Number(settings.daily_run_limit),
          max_jobs_per_dispatch: Number(settings.max_jobs_per_dispatch),
          support_model: settings.support_model,
          marketing_model: settings.marketing_model,
          confirm_execution_enable: enablesExecution ? true : undefined,
        }),
      })
      setNotice({ success: "Agentinstellingen zijn opgeslagen." })
    })
  }

  const pendingApprovals = approvals.filter((approval) => approval.status === "pending")
  const failedJobs = jobs.filter((job) => ["failed", "dead_letter"].includes(job.status))
  const knownCost = runs.reduce((sum, run) => sum + (run.estimated_cost === null ? 0 : Number(run.estimated_cost)), 0)
  const unknownCosts = runs.filter((run) => run.estimated_cost === null).length

  return (
    <div className="space-y-8">
      <section className={`rounded-2xl border p-5 sm:p-6 ${settings.observe_only ? "border-amber-300/30 bg-amber-300/10" : "border-emerald-300/30 bg-emerald-300/10"}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="font-semibold">{settings.observe_only ? "Observe-only actief" : "Uitvoering na goedkeuring actief"}</h2>
            <p className="mt-1 text-sm text-white/65">{settings.observe_only ? "Goedkeuren registreert de beslissing, maar verstuurt geen mail." : "Een goedgekeurd supportartefact wordt exact één keer door de executor aangeboden."}</p>
          </div>
        </div>
      </section>

      {notice.error && <p role="alert" className="rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{notice.error}</p>}
      {notice.success && <p role="status" className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">{notice.success}</p>}
      {!online && <p role="status" className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/65">Offline: gegevens worden niet vernieuwd en acties kunnen mislukken.</p>}

      <AgentNetwork settings={settings} jobs={jobs} />

      <section id="settings" className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-xl font-semibold">Besturing en begrenzing</h2><p className="mt-1 text-sm text-white/50">Nieuwe installaties blijven uitgeschakeld en observe-only.</p></div>
          <Button disabled={pending} onClick={saveSettings}><Save className="mr-2 size-4" />Opslaan</Button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["agents_enabled", "Agentteam actief"], ["observe_only", "Observe-only"], ["support_enabled", "Supportagent"], ["marketing_enabled", "Marketingagent"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/10 p-4 text-sm">
              <span>{label}</span><input type="checkbox" checked={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.checked }))} className="size-5 accent-emerald-500" />
            </label>
          ))}
          <label className="text-sm"><span className="mb-2 block text-white/60">Daglimiet runs</span><Input type="number" min={1} max={10000} value={settings.daily_run_limit} onChange={(event) => setSettings((current) => ({ ...current, daily_run_limit: Number(event.target.value) }))} /></label>
          <label className="text-sm"><span className="mb-2 block text-white/60">Budget per dag (EUR)</span><Input type="number" min={0} step="0.01" value={settings.daily_budget_eur} onChange={(event) => setSettings((current) => ({ ...current, daily_budget_eur: event.target.value }))} /></label>
          <label className="text-sm"><span className="mb-2 block text-white/60">Reservering per run (EUR)</span><Input type="number" min={0.01} step="0.01" value={settings.budget_reservation_eur} onChange={(event) => setSettings((current) => ({ ...current, budget_reservation_eur: event.target.value }))} /></label>
          <label className="text-sm"><span className="mb-2 block text-white/60">Taken per dispatch</span><Input type="number" min={1} max={10} value={settings.max_jobs_per_dispatch} onChange={(event) => setSettings((current) => ({ ...current, max_jobs_per_dispatch: Number(event.target.value) }))} /></label>
          <label className="text-sm"><span className="mb-2 block text-white/60">Supportmodel</span><select className="h-10 w-full rounded-md border border-white/15 bg-[#132019] px-3" value={settings.support_model} onChange={(event) => setSettings((current) => ({ ...current, support_model: event.target.value }))}>{settings.model_allowlist.map((model) => <option key={model}>{model}</option>)}</select></label>
        </div>
      </section>

      <section id="approvals">
        <div className="mb-4"><h2 className="text-xl font-semibold">Goedkeuringswachtrij</h2><p className="mt-1 text-sm text-white/50">De inhoud en hash van de gekozen versie zijn aan de beslissing gebonden.</p></div>
        {pendingApprovals.length === 0 ? <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">Geen openstaande goedkeuringen.</p> : (
          <div className="space-y-4">{pendingApprovals.map((approval) => {
            const artifact = approval.artifact
            const draft = drafts[approval.id]
            if (!artifact || !draft) return null
            return <article key={approval.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-white/40">Risico {approval.risk_level} · versie {artifact.version}</p><h3 className="mt-1 font-semibold">{artifact.title}</h3></div><time className="text-xs text-white/45">{formatDate(approval.requested_at)}</time></div>
              <div className="mt-4 grid gap-3 text-sm lg:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/10 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-white/40">Bronfragment</p><p className="mt-2 whitespace-pre-wrap text-white/70">{artifact.content.sourceExcerpt || "Bronfragment niet beschikbaar."}</p></div>
                <div className="rounded-xl border border-white/10 bg-black/10 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-white/40">Onderbouwing</p><p className="mt-2">Confidence: {artifact.content.confidence || "onbekend"}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-white/60">{(artifact.content.confidenceReasons ?? []).map((reason) => <li key={reason}>{reason}</li>)}</ul><p className="mt-2 text-xs text-white/40">Kennisbronnen: {artifact.content.knowledgeAnswerIds?.length ?? 0}</p></div>
              </div>
              <div className="mt-4 space-y-3"><Input aria-label="Onderwerp" value={draft.subject} onChange={(event) => setDrafts((current) => ({ ...current, [approval.id]: { ...draft, subject: event.target.value } }))} /><Textarea aria-label="Antwoord" className="min-h-48" value={draft.body} onChange={(event) => setDrafts((current) => ({ ...current, [approval.id]: { ...draft, body: event.target.value } }))} /></div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button disabled={pending} onClick={() => action(async () => { await request(`/api/admin/agents/approvals/${approval.id}/approve`, { method: "POST", body: JSON.stringify({ confirm: true }) }); setNotice({ success: settings.observe_only ? "Goedkeuring is geregistreerd (observe-only)." : "Goedkeuring is uitgevoerd." }) })}><Check className="mr-2 size-4" />Goedkeuren</Button>
                <Button variant="secondary" disabled={pending} onClick={() => action(async () => { await request(`/api/admin/agents/artifacts/${artifact.id}/revise`, { method: "POST", body: JSON.stringify(draft) }); setNotice({ success: "Nieuwe artefactversie is gemaakt; keur die versie afzonderlijk goed." }) })}><Save className="mr-2 size-4" />Nieuwe versie</Button>
                <Button variant="destructive" disabled={pending} onClick={() => action(async () => { await request(`/api/admin/agents/approvals/${approval.id}/reject`, { method: "POST", body: JSON.stringify({ confirm: true }) }) })}><X className="mr-2 size-4" />Afwijzen</Button>
              </div>
            </article>
          })}</div>
        )}
      </section>

      <section id="history" className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6"><h2 className="text-xl font-semibold">Recente taken</h2><ul className="mt-4 divide-y divide-white/10">{jobs.slice(0, 12).map((job) => <li key={job.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{job.job_type}</p><p className="text-xs text-white/45">{formatDate(job.created_at)} · poging {job.attempt_count}/{job.max_attempts}</p></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{job.status}</span></li>)}</ul></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6"><h2 className="text-xl font-semibold">Verbruik</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-black/10 p-4"><span className="text-xs text-white/45">Runs (24 uur)</span><strong className="mt-1 block text-2xl">{runs.length}</strong></div><div className="rounded-xl bg-black/10 p-4"><span className="text-xs text-white/45">Bekende kosten</span><strong className="mt-1 block text-2xl">€ {knownCost.toFixed(2)}</strong></div></div>{unknownCosts > 0 && <p className="mt-3 text-xs text-amber-100/75">Kosten zijn voor {unknownCosts} run(s) niet beschikbaar; er wordt geen waarde verzonnen.</p>}</div>
      </section>

      {failedJobs.length > 0 && <section className="rounded-2xl border border-red-300/20 bg-red-300/5 p-5 sm:p-6"><h2 className="text-xl font-semibold">Herstelbare taken</h2><div className="mt-4 space-y-3">{failedJobs.map((job) => <div key={job.id} className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{job.job_type} · {job.status}</p><p className="mt-1 text-xs text-white/45">{job.last_error_message || "Geen foutdetail beschikbaar."}</p></div><Button variant="secondary" disabled={pending} onClick={() => action(async () => { await request(`/api/admin/agents/jobs/${job.id}/retry`, { method: "POST", body: JSON.stringify({ confirm: true }) }) })}>{pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}Opnieuw proberen</Button></div>)}</div></section>}
    </div>
  )
}
