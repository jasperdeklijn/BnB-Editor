"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useEditorLayout } from "@/components/editor/editor-layout-context"
import { TierBadge } from "@/components/editor/tier-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusMessage } from "@/components/ui/status-message"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { EntitlementViolation } from "@/lib/entitlements"
import { getActiveWebsiteId, setActiveWebsiteId } from "@/lib/active-website"
import { PLATFORM_DOMAIN } from "@/lib/platform"

type DomainStatus = "provisioning" | "active" | "add_failed" | "removal_pending" | "removal_failed"

type WebsiteDomain = {
  id: string
  domain: string
  isPrimary: boolean
  status: DomainStatus
  lastError: string | null
  createdAt: string
}

type DomainWebsite = {
  id: string
  title: string
  slug: string
  domains: WebsiteDomain[]
  isPublished: boolean
}

interface DomainDashboardProps {
  websites: DomainWebsite[]
}

type VerifyState = { status: "checking" | "connected" | "error"; message: string }
type Message = { type: "success" | "error"; text: string } | null

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    void navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Kopieren naar klembord"
      title="Kopieren"
    >
      {copied ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

function UrlCard({ label, icon, url, badge, children }: {
  label: string
  icon: React.ReactNode
  url: string
  badge?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {badge}
        </div>
        <div className="flex items-center gap-1">
          <span className="truncate font-mono text-sm text-muted-foreground">{url}</span>
          <CopyButton value={`https://${url}`} />
          <a href={`https://${url}`} target="_blank" rel="noopener noreferrer" className="ml-1 shrink-0 text-muted-foreground hover:text-foreground" aria-label="Open in nieuw tabblad">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </div>
  )
}

function domainStatusLabel(status: DomainStatus) {
  if (status === "active") return "Actief"
  if (status === "provisioning") return "Wordt toegevoegd"
  if (status === "add_failed") return "Toevoegen mislukt"
  if (status === "removal_pending") return "Wordt verwijderd"
  return "Verwijderen mislukt"
}

export function DomainDashboard({ websites }: DomainDashboardProps) {
  const initialWebsite = websites.find((website) => website.isPublished) || websites[0]
  const [websiteList, setWebsiteList] = useState(websites)
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(initialWebsite?.id ?? "")
  const [newDomain, setNewDomain] = useState("")
  const [busyDomainId, setBusyDomainId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [verifyStates, setVerifyStates] = useState<Record<string, VerifyState>>({})
  const [message, setMessage] = useState<Message>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishViolations, setPublishViolations] = useState<EntitlementViolation[]>([])
  const { setIsSaving, setSaveState } = useEditorLayout()

  useEffect(() => {
    const rememberedWebsiteId = getActiveWebsiteId()
    const rememberedWebsite = websites.find((website) => website.id === rememberedWebsiteId)
    if (rememberedWebsite) {
      setSelectedWebsiteId(rememberedWebsite.id)
    } else if (initialWebsite) {
      setActiveWebsiteId(initialWebsite.id)
    }
  }, [initialWebsite, websites])

  const selectedWebsite = useMemo(
    () => websiteList.find((website) => website.id === selectedWebsiteId) || websiteList[0],
    [selectedWebsiteId, websiteList],
  )
  const previewUrl = selectedWebsite ? `preview-${selectedWebsite.slug}.${PLATFORM_DOMAIN}` : ""
  const liveUrl = selectedWebsite ? `${selectedWebsite.slug}.${PLATFORM_DOMAIN}` : ""

  const replaceDomains = (websiteId: string, domains: WebsiteDomain[]) => {
    setWebsiteList((current) => current.map((website) => website.id === websiteId ? { ...website, domains } : website))
  }

  const refreshDomains = async (websiteId: string) => {
    const response = await fetch(`/api/domain?websiteId=${encodeURIComponent(websiteId)}`)
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result?.error || "Domeinen konden niet opnieuw worden geladen.")
    replaceDomains(websiteId, result.domains as WebsiteDomain[])
  }

  const failSave = (text: string) => {
    setMessage({ type: "error", text })
    setSaveState("error")
    setIsSaving(false)
  }

  const handleWebsiteSelect = (websiteId: string) => {
    setActiveWebsiteId(websiteId)
    setSelectedWebsiteId(websiteId)
    setNewDomain("")
    setVerifyStates({})
    setMessage(null)
    setPublishViolations([])
  }

  const handleAddDomain = async () => {
    if (!selectedWebsite || !newDomain.trim()) return
    setIsAdding(true)
    setIsSaving(true)
    setMessage(null)
    const response = await fetch("/api/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId: selectedWebsite.id, domain: newDomain }),
    })
    const result = await response.json().catch(() => ({}))
    setIsAdding(false)

    if (!response.ok) {
      if (result?.domain) {
        replaceDomains(selectedWebsite.id, [...selectedWebsite.domains.filter((item) => item.id !== result.domain.id), result.domain])
      }
      failSave(result?.error || "Domein kon niet worden toegevoegd.")
      return
    }

    await refreshDomains(selectedWebsite.id).catch(() => undefined)
    setNewDomain("")
    setMessage({ type: "success", text: `${result.domain.domain} is aan Vercel toegevoegd.` })
    setIsSaving(false)
  }

  const handleDomainAction = async (domain: WebsiteDomain, action: "retryAdd" | "makePrimary") => {
    if (!selectedWebsite) return
    setBusyDomainId(domain.id)
    setIsSaving(true)
    setMessage(null)
    const response = await fetch(`/api/domain/${encodeURIComponent(domain.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    const result = await response.json().catch(() => ({}))
    setBusyDomainId(null)
    if (!response.ok) {
      await refreshDomains(selectedWebsite.id).catch(() => undefined)
      failSave(result?.error || "Domeinactie is mislukt.")
      return
    }
    await refreshDomains(selectedWebsite.id)
    setMessage({ type: "success", text: action === "makePrimary" ? `${domain.domain} is nu het primaire domein.` : `${domain.domain} is alsnog toegevoegd.` })
    setIsSaving(false)
  }

  const handleRemoveDomain = async (domain: WebsiteDomain) => {
    if (!selectedWebsite) return
    setBusyDomainId(domain.id)
    setIsSaving(true)
    setMessage(null)
    replaceDomains(selectedWebsite.id, selectedWebsite.domains.map((item) => item.id === domain.id ? { ...item, status: "removal_pending", lastError: null } : item))

    const response = await fetch(`/api/domain/${encodeURIComponent(domain.id)}`, { method: "DELETE" })
    const result = await response.json().catch(() => ({}))
    setBusyDomainId(null)
    await refreshDomains(selectedWebsite.id).catch(() => undefined)
    if (!response.ok) {
      failSave(result?.error || "Domein kon niet worden verwijderd.")
      return
    }
    setMessage({ type: "success", text: `${domain.domain} is verwijderd uit de website en het Vercel-project.` })
    setIsSaving(false)
  }

  const handleVerify = async (domain: WebsiteDomain) => {
    if (!selectedWebsite) return
    setVerifyStates((current) => ({ ...current, [domain.id]: { status: "checking", message: "" } }))
    const response = await fetch(`/api/domain/verify?domain=${encodeURIComponent(domain.domain)}&websiteId=${encodeURIComponent(selectedWebsite.id)}`)
    const result = await response.json().catch(() => ({}))
    const connected = response.ok && result.connected
    setVerifyStates((current) => ({
      ...current,
      [domain.id]: {
        status: connected ? "connected" : "error",
        message: connected ? "Domein verwijst correct naar Vercel." : result?.message || result?.error || "Domein lijkt nog niet verbonden.",
      },
    }))
  }

  const handlePublishChange = async (published: boolean) => {
    if (!selectedWebsite) return
    setIsPublishing(true)
    setIsSaving(true)
    setMessage(null)
    setPublishViolations([])
    const response = await fetch("/api/websites/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId: selectedWebsite.id, published }),
    })
    const result = await response.json().catch(() => ({}))
    setIsPublishing(false)
    if (!response.ok) {
      if (result?.code === "ENTITLEMENT_VIOLATIONS" && Array.isArray(result?.violations)) setPublishViolations(result.violations)
      failSave(result?.error || "Live status kon niet worden bijgewerkt.")
      return
    }
    setWebsiteList((current) => current.map((website) => ({
      ...website,
      isPublished: published ? website.id === selectedWebsite.id : website.id === selectedWebsite.id ? false : website.isPublished,
    })))
    setMessage({ type: "success", text: published ? "Deze website staat nu live." : "Deze website staat niet meer live." })
    setIsSaving(false)
  }

  if (!selectedWebsite) return null

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-4">
        <Label htmlFor="website-domain-selector">Website</Label>
        <select id="website-domain-selector" value={selectedWebsite.id} onChange={(event) => handleWebsiteSelect(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
          {websiteList.map((website) => <option key={website.id} value={website.id}>{website.title} ({website.slug}){website.isPublished ? " - live" : ""}</option>)}
        </select>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase text-foreground">Uw URLs</h2>
        <div className="space-y-3">
          <UrlCard label="Preview URL" icon={<Eye className="h-4 w-4" />} url={previewUrl} badge={<span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">Preview</span>}>
            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>De preview is alleen zichtbaar voor u wanneer u bent ingelogd.</span></div>
          </UrlCard>
          <UrlCard label="Live URL" icon={<Globe className="h-4 w-4" />} url={liveUrl} badge={<span className={selectedWebsite.isPublished ? "rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary" : "rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"}>{selectedWebsite.isPublished ? "Live" : "Niet live"}</span>}>
            <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-medium text-foreground">Live publiceren</p><p className="text-xs text-muted-foreground">Er kan maar een website tegelijk live staan.</p></div>
              <div className="flex items-center gap-2">{isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}<Switch checked={selectedWebsite.isPublished} onCheckedChange={handlePublishChange} disabled={isPublishing} aria-label="Live status wijzigen" /></div>
            </div>
            {publishViolations.length > 0 ? <div className="mt-3 space-y-2 rounded-md border border-warning/30 bg-warning/10 p-3"><p className="text-xs font-semibold">Deze onderdelen blokkeren live publiceren</p>{publishViolations.map((violation, index) => <div key={`${violation.code}-${index}`} className="flex items-center justify-between gap-3 text-xs"><span className="truncate">{violation.label}</span><TierBadge plan={violation.requiredPlan} prefix="Vereist" /></div>)}</div> : null}
          </UrlCard>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase text-foreground">Eigen domeinen</h2>
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-3 text-xs text-secondary-foreground">
            <p className="font-semibold text-foreground">Belangrijk voordat u een domein koppelt</p>
            <p className="mt-1">U beheert DNS bij uw eigen provider. SSL wordt automatisch geregeld; DNS-wijzigingen kunnen tot 24 uur nodig hebben.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-domain">Domeinnaam toevoegen</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="new-domain" value={newDomain} onChange={(event) => setNewDomain(event.target.value)} placeholder="mijnbedrijf.nl" className="font-mono" onKeyDown={(event) => { if (event.key === "Enter") void handleAddDomain() }} />
              <Button onClick={handleAddDomain} disabled={isAdding || !newDomain.trim()} size="sm">{isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Toevoegen</Button>
            </div>
            <p className="text-xs text-muted-foreground">Gebruik het hoofddomein zonder <code className="font-mono">https://</code> of <code className="font-mono">www</code>.</p>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            {selectedWebsite.domains.length === 0 ? <div className="rounded-md border border-dashed border-border px-4 py-6 text-center"><Globe className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-2 text-sm font-medium">Nog geen eigen domeinen</p></div> : null}
            {selectedWebsite.domains.map((domain) => {
              const verify = verifyStates[domain.id]
              const busy = busyDomainId === domain.id || domain.status === "removal_pending"
              const failedAdd = domain.status === "add_failed" || domain.status === "provisioning"
              const failedRemoval = domain.status === "removal_failed"
              return (
                <div key={domain.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="truncate font-mono text-sm">{domain.domain}</span>{domain.isPrimary ? <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"><Star className="h-3 w-3" />Primair</span> : null}<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{domainStatusLabel(domain.status)}</span></div>
                      {domain.lastError ? <p className="mt-2 text-xs text-destructive">{domain.lastError}</p> : null}
                      {verify?.message ? <div className="mt-2"><StatusMessage tone={verify.status === "connected" ? "success" : "error"}>{verify.message}</StatusMessage></div> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {domain.status === "active" ? <Button variant="outline" size="sm" onClick={() => void handleVerify(domain)} disabled={verify?.status === "checking" || busy}>{verify?.status === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : verify?.status === "connected" ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}Controleren</Button> : null}
                      {domain.status === "active" && !domain.isPrimary ? <Button variant="outline" size="sm" onClick={() => void handleDomainAction(domain, "makePrimary")} disabled={busy}><Star className="h-4 w-4" />Primair maken</Button> : null}
                      {failedAdd ? <Button variant="outline" size="sm" onClick={() => void handleDomainAction(domain, "retryAdd")} disabled={busy}><RefreshCw className="h-4 w-4" />Opnieuw</Button> : null}
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline" size="sm" disabled={busy}><Trash2 className="h-4 w-4" />{failedRemoval ? "Opnieuw verwijderen" : "Verwijderen"}</Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Domein verwijderen?</AlertDialogTitle><AlertDialogDescription>Dit verwijdert {domain.domain} uit deze website en uit het Vercel-project. DNS-records bij uw provider blijven bestaan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuleren</AlertDialogCancel><AlertDialogAction onClick={() => void handleRemoveDomain(domain)}>Verwijderen</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {message ? <StatusMessage tone={message.type}>{message.text}</StatusMessage> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase text-foreground">DNS configuratie</h2>
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Voeg deze records toe bij uw domeinprovider en controleer daarna elk domein afzonderlijk.</p>
          <DnsTable rows={[{ type: "A", host: "@", value: "76.76.21.21", purpose: "Hoofddomein" }, { type: "CNAME", host: "www", value: "cname.vercel-dns-0.com", purpose: "www-adres" }]} />
        </div>
      </section>
    </div>
  )
}

function DnsTable({ rows }: { rows: { type: string; host: string; value: string; purpose: string }[] }) {
  return <div className="overflow-x-auto rounded-md border border-border"><table className="w-full text-xs"><thead><tr className="border-b border-border bg-muted/50"><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Naam</th><th className="px-3 py-2 text-left">Waarde</th><th className="px-3 py-2 text-left">Gebruik</th><th className="w-8 px-3 py-2" /></tr></thead><tbody>{rows.map((row) => <tr key={`${row.type}-${row.host}`} className="border-b border-border last:border-0"><td className="px-3 py-2 font-mono">{row.type}</td><td className="px-3 py-2 font-mono">{row.host}</td><td className="px-3 py-2 font-mono">{row.value}</td><td className="px-3 py-2 text-muted-foreground">{row.purpose}</td><td className="px-3 py-2"><CopyButton value={row.value} /></td></tr>)}</tbody></table></div>
}
