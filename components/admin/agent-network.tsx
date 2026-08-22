"use client"

import { useMemo, useState } from "react"
import { Bot, ClipboardCheck, Headphones, Megaphone } from "lucide-react"

type AgentNetworkSettings = {
  agents_enabled: boolean
  support_enabled: boolean
  marketing_enabled: boolean
}

type AgentNetworkJob = {
  id: string
  job_type: string
  status: string
  created_at: string
}

type NetworkStatus = "active" | "blocked" | "queued" | "idle" | "disabled"
type AgentKey = "manager" | "support" | "marketing" | "operations"

type AgentNode = {
  key: AgentKey
  name: string
  role: string
  status: NetworkStatus
  statusLabel: string
  task: string
  activeConnection: boolean
  icon: typeof Bot
}

const ACTIVE_JOB_STATUSES = new Set(["claimed", "running", "waiting_for_dependency", "awaiting_approval", "executing"])
const BLOCKED_JOB_STATUSES = new Set(["failed", "dead_letter"])

const statusStyles: Record<NetworkStatus, string> = {
  active: "border-emerald-300/45 bg-emerald-300/10 text-emerald-50",
  blocked: "border-red-300/40 bg-red-300/10 text-red-50",
  queued: "border-amber-300/35 bg-amber-300/10 text-amber-50",
  idle: "border-white/15 bg-[#17271f] text-white",
  disabled: "border-white/10 bg-black/15 text-white/55",
}

const statusDotStyles: Record<NetworkStatus, string> = {
  active: "bg-emerald-300",
  blocked: "bg-red-300",
  queued: "bg-amber-300",
  idle: "bg-white/45",
  disabled: "bg-white/20",
}

function newestJob(jobs: AgentNetworkJob[], jobType: string) {
  return jobs.find((job) => job.job_type === jobType) ?? null
}

function specialistState(enabled: boolean, job: AgentNetworkJob | null, labels: {
  active: string
  queued: string
  completed: string
  blocked: string
  idle: string
}) {
  if (!enabled) return { status: "disabled" as const, statusLabel: "Uitgeschakeld", task: "Deze specialist is uitgeschakeld.", activeConnection: false }
  if (!job) return { status: "idle" as const, statusLabel: "Beschikbaar", task: labels.idle, activeConnection: false }
  if (ACTIVE_JOB_STATUSES.has(job.status)) return { status: "active" as const, statusLabel: "Actieve overdracht", task: labels.active, activeConnection: true }
  if (BLOCKED_JOB_STATUSES.has(job.status)) return { status: "blocked" as const, statusLabel: "Actie nodig", task: labels.blocked, activeConnection: false }
  if (job.status === "queued") return { status: "queued" as const, statusLabel: "In wachtrij", task: labels.queued, activeConnection: false }
  if (job.status === "completed") return { status: "idle" as const, statusLabel: "Beschikbaar", task: labels.completed, activeConnection: false }
  return { status: "idle" as const, statusLabel: "Beschikbaar", task: labels.idle, activeConnection: false }
}

function buildAgentNodes(settings: AgentNetworkSettings, jobs: AgentNetworkJob[]): AgentNode[] {
  const support = specialistState(settings.agents_enabled && settings.support_enabled, newestJob(jobs, "support.reply"), {
    active: "Een supportantwoord wordt overgedragen of wacht op een beslissing.",
    queued: "Een nieuwe supportmail wacht op verwerking.",
    completed: "De laatste supporttaak is afgerond.",
    blocked: "Een supporttaak is mislukt en vraagt controle.",
    idle: "Nog geen supporttaak ontvangen.",
  })
  const marketing = specialistState(settings.agents_enabled && settings.marketing_enabled, newestJob(jobs, "marketing.lead_search"), {
    active: "De wekelijkse leadzoektocht wordt verwerkt.",
    queued: "Een leadzoektocht wacht op verwerking.",
    completed: "De laatste leadzoektocht is afgerond.",
    blocked: "Een leadzoektocht is mislukt en vraagt controle.",
    idle: "Nog geen marketingtaak ontvangen.",
  })
  const operations = specialistState(settings.agents_enabled, newestJob(jobs, "platform.daily_summary"), {
    active: "Het dagelijkse operationele overzicht wordt samengesteld.",
    queued: "Het dagelijkse overzicht wacht op verwerking.",
    completed: "Het laatste dagelijkse overzicht is afgerond.",
    blocked: "Het dagelijkse overzicht kon niet worden gemaakt.",
    idle: "Nog geen dagsamenvatting ontvangen.",
  })
  const specialists = [support, marketing, operations]
  const activeCount = specialists.filter((agent) => agent.activeConnection).length
  const blockedCount = specialists.filter((agent) => agent.status === "blocked").length
  const queuedCount = specialists.filter((agent) => agent.status === "queued").length
  const managerStatus: NetworkStatus = !settings.agents_enabled ? "disabled" : blockedCount > 0 ? "blocked" : activeCount > 0 ? "active" : queuedCount > 0 ? "queued" : "idle"
  const managerTask = !settings.agents_enabled
    ? "De centrale kill switch staat uit. Er worden geen taken geclaimd."
    : blockedCount > 0
      ? `${blockedCount} specialist${blockedCount === 1 ? " vraagt" : "en vragen"} om controle.`
      : activeCount > 0
        ? `${activeCount} actieve overdracht${activeCount === 1 ? "" : "en"} wordt bewaakt.`
        : queuedCount > 0
          ? `${queuedCount} taak${queuedCount === 1 ? " staat" : "taken staan"} klaar voor dispatch.`
          : "Geen actieve overdrachten. De manager bewaakt de wachtrij."

  return [
    { key: "manager", name: "Manager", role: "Routering en bewaking", status: managerStatus, statusLabel: managerStatus === "disabled" ? "Kill switch actief" : managerStatus === "blocked" ? "Actie nodig" : managerStatus === "active" ? "Coördineert" : managerStatus === "queued" ? "Wachtrij aanwezig" : "Beschikbaar", task: managerTask, activeConnection: activeCount > 0, icon: Bot },
    { key: "support", name: "Support", role: "Antwoordvoorstellen", ...support, icon: Headphones },
    { key: "marketing", name: "Marketing", role: "Leadonderzoek", ...marketing, icon: Megaphone },
    { key: "operations", name: "Operations", role: "Dagoverzicht", ...operations, icon: ClipboardCheck },
  ]
}

function AgentNodeButton({ node, selected, className, onSelect }: { node: AgentNode; selected: boolean; className?: string; onSelect: () => void }) {
  const Icon = node.icon
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${node.name}: ${node.statusLabel}. ${node.task}`}
      onClick={onSelect}
      className={`w-56 rounded-2xl border p-4 text-left shadow-lg shadow-black/10 transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 ${statusStyles[node.status]} ${selected ? "ring-2 ring-white/70" : "hover:border-white/35"} ${className ?? ""}`}
    >
      <span className="flex items-start gap-3">
        <span className="rounded-xl bg-white/10 p-2"><Icon className="size-5" aria-hidden="true" /></span>
        <span className="min-w-0">
          <span className="block font-semibold">{node.name}</span>
          <span className="mt-0.5 block text-xs opacity-65">{node.role}</span>
        </span>
      </span>
      <span className="mt-3 flex items-center gap-2 text-xs font-medium">
        <span className={`size-2 rounded-full ${statusDotStyles[node.status]}`} aria-hidden="true" />
        {node.statusLabel}
      </span>
    </button>
  )
}

export function AgentNetwork({ settings, jobs }: { settings: AgentNetworkSettings; jobs: AgentNetworkJob[] }) {
  const nodes = useMemo(() => buildAgentNodes(settings, jobs), [settings, jobs])
  const [selectedKey, setSelectedKey] = useState<AgentKey>("manager")
  const selected = nodes.find((node) => node.key === selectedKey) ?? nodes[0]
  const manager = nodes[0]
  const support = nodes[1]
  const marketing = nodes[2]
  const operations = nodes[3]

  return (
    <section aria-labelledby="agent-network-heading" className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="agent-network-heading" className="text-xl font-semibold">Agent-spinnenweb</h2>
          <p className="mt-1 text-sm text-white/50">Alleen echte lopende overdrachten krijgen een verbindingslijn.</p>
        </div>
        <p className="text-xs text-white/45">Selecteer een agent voor de actuele taak.</p>
      </div>

      <div className="relative mt-5 hidden h-[460px] overflow-hidden rounded-2xl border border-white/10 bg-black/10 md:block">
        <svg viewBox="0 0 1000 460" className="absolute inset-0 size-full" role="img" aria-labelledby="agent-network-svg-title agent-network-svg-description">
          <title id="agent-network-svg-title">Actieve overdrachten binnen het AI-agentteam</title>
          <desc id="agent-network-svg-description">De manager staat centraal. Alleen specialisten met een actieve taak zijn met de manager verbonden.</desc>
          {support.activeConnection && <line x1="500" y1="230" x2="180" y2="105" className="stroke-emerald-300/70" strokeWidth="3" />}
          {marketing.activeConnection && <line x1="500" y1="230" x2="820" y2="105" className="stroke-emerald-300/70" strokeWidth="3" />}
          {operations.activeConnection && <line x1="500" y1="230" x2="500" y2="385" className="stroke-emerald-300/70" strokeWidth="3" />}
        </svg>
        <AgentNodeButton node={support} selected={selectedKey === support.key} onSelect={() => setSelectedKey(support.key)} className="absolute left-[18%] top-[23%] -translate-x-1/2 -translate-y-1/2" />
        <AgentNodeButton node={marketing} selected={selectedKey === marketing.key} onSelect={() => setSelectedKey(marketing.key)} className="absolute left-[82%] top-[23%] -translate-x-1/2 -translate-y-1/2" />
        <AgentNodeButton node={manager} selected={selectedKey === manager.key} onSelect={() => setSelectedKey(manager.key)} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        <AgentNodeButton node={operations} selected={selectedKey === operations.key} onSelect={() => setSelectedKey(operations.key)} className="absolute left-1/2 top-[84%] -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="mt-5 space-y-3 md:hidden" aria-label="Agentstatussen">
        {nodes.map((node) => <AgentNodeButton key={node.key} node={node} selected={selectedKey === node.key} onSelect={() => setSelectedKey(node.key)} className="w-full" />)}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">{selected.name}</p>
          <span className="text-xs text-white/50">{selected.statusLabel}</span>
        </div>
        <p className="mt-1 text-sm text-white/70">{selected.task}</p>
      </div>
    </section>
  )
}
